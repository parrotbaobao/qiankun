import { fetchEventSource } from '@microsoft/fetch-event-source';
import { Observable, Subscriber } from 'rxjs';

// 打字机 + SSE 的可配置参数
export type TypewriterOptions = {
  method?: 'GET' | 'POST'; // HTTP 方法（你当前实际固定 POST，可保留以便扩展）
  headers?: Record<string, string>; // 请求头（你当前也固定写了，可保留以便扩展）
  body?: any; // 请求体（对象会 JSON.stringify）

  /** 打字机速度：每 tick 吐多少字符（你当前已不用 tick 方式，可删或保留兼容） */
  charsPerTick?: number;

  /** tick 间隔（ms）（你当前已用 requestAnimationFrame，可删或保留兼容） */
  tickMs?: number;

  /**
   * 从 SSE 的 ev.data 里提取“增量文本”
   * - 如果服务端直接发纯文本：return evData
   * - 如果服务端发 JSON：JSON.parse 后取 delta 字段
   */
  pickText?: (evData: string) => string; // 把 ev.data => “本次增量文本”

  /** 是否自动重连；默认 true（取决于 fetch-event-source 的重试机制） */
  retry?: boolean; // true：throw err 让库重试；false：直接 error 结束
};

export class TypewriterSession {
  private static readonly url = 'http://localhost:5555/v1/chat/completions';

  // 标点停顿（ms）：让打字更像真人/ChatGPT
  private pauseMs = {
    comma: 60, // 逗号/顿号/分号/冒号的短停顿
    sentence: 130, // 句号/问号/感叹号的长停顿
    newline: 170, // 换行的更长停顿
  };

  private baseCharsPerSecond = 38; // 基础速度：每秒吐多少字符（越大越快）
  private maxCharsPerSecond = 130; // 队列积压时的最高速度（防止积压导致很慢）
  private uiFlushIntervalMs = 50; // UI 刷新间隔（ms）：降低 Angular 频繁更新压力
  private maxCharsPerFrame = 22; // 每帧最多吐多少字符：避免一帧吐太多出现“跳字”
  private jitter = 0.12; // 速度抖动比例：让速度略微随机，更像真人打字
  private ctrl = new AbortController(); // 取消控制器（✅ 现在会传给 fetchEventSource 的 signal）
  private queue: string[] = []; // 字符队列：存放还没显示的字符
  private streamClosed = false; // SSE 是否已结束（onclose 时置为 true）
  private isPumping = false; // 是否正在“吐字”
  private display = ''; // 当前已经渲染出来的完整文本
  private lastFrameTs = performance.now(); // 上一帧时间戳
  private nextUiFlushTs = 0; // 下一次允许刷新 UI 的时间戳（用于限频）
  private charBudget = 0; // “字符预算”：dt * speed 累积后决定本帧吐多少字符
  private wasHidden = document.hidden; // 记录上一次可见性：只在 hidden->visible 时补齐
  private subscriber?: Subscriber<string>; // ✅ 修正：不要赋值 undefined，直接可选即可
  private options: TypewriterOptions;
  timerId: any;
  rafId: any;

  constructor(options: TypewriterOptions) {
    this.options = options;
  }

  // SSE + 打字机：返回 Observable（累计文本） + abort（中止）
  public start(): any {
    const { body, pickText = (s) => s, retry = true } = this.options; // 解构 options
    this.ctrl = new AbortController(); // 取消控制器（✅ 现在会传给 fetchEventSource 的 signal）
    this.queue = []; // 字符队列：存放还没显示的字符
    this.streamClosed = false; // SSE 是否已结束（onclose 时置为 true）
    this.isPumping = false; // 是否正在“吐字”
    this.display = ''; // 当前已经渲染出来的完整文本
    this.lastFrameTs = performance.now(); // 上一帧时间戳
    this.nextUiFlushTs = 0; // 下一次允许刷新 UI 的时间戳（用于限频）
    this.charBudget = 0; // “字符预算”：dt * speed 累积后决定本帧吐多少字符
    this.wasHidden = document.hidden; // 记录上一次可见性：只在 hidden->visible 时补齐

    const text$ = new Observable<string>((subscriber) => {
      this.subscriber = subscriber;
      // ✅ 记录上一次可见性：只在 hidden -> visible 的边沿触发“一次性补齐”
      document.addEventListener('visibilitychange', this.onVisibilityChange);

      this.fetchEventSource(body, retry);

      // Observable 取消订阅时：中止连接（配合 signal 才能真正中止 fetch）
      return () => {
        if (this.timerId) clearTimeout(this.timerId);
        if (this.rafId) cancelAnimationFrame(this.rafId);
        document.removeEventListener(
          'visibilitychange',
          this.onVisibilityChange,
        );
        this.ctrl.abort();
      };
    });

    return {
      text$, // 订阅 text$ 获取累计输出文本
      abort: () => this.ctrl.abort(), // 手动停止
    };
  }

  private fetchEventSource(
    body: BodyInit | null | undefined,
    retry: boolean,
  ): void {
    // 建立 SSE 连接：持续收到 onmessage
    fetchEventSource(TypewriterSession.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream', // 希望服务端返回 SSE
      },
      body:
        body === null
          ? undefined // 没有 body 就不传
          : typeof body === 'string'
            ? body // string 直接用
            : JSON.stringify(body), // object 转 JSON 字符串

      signal: this.ctrl.signal, //像 fetchEventSource / fetch 这类库会监听 signal

      onmessage: (ev) => {
        try {
          const data = ev?.data;
          if (!data || data === '[DONE]') return;
          const jsonData = JSON.parse(data);
          const content = jsonData?.choices[0]?.delta?.content;
          this.enqueue(content); // 入队并触发吐字（前台）/积压（后台）
        } catch (e) {
          this.subscriber?.error(e); // 解析/处理失败直接 error
        }
      },

      onclose: () => {
        this.streamClosed = true; // SSE 连接关闭：标记流已结束
        this.maybeFinish(); // 不直接 complete，等队列吐空后再 complete
      },

      onerror: (err) => {
        if (retry) throw err; // retry=true：抛出让库自动重连
        this.subscriber?.error(err); // 否则：直接 error 结束
      },
    });
  }

  // 尝试结束：只有“流结束 + 队列空 + 不在吐字”才 complete
  private maybeFinish(): void {
    if (this.streamClosed && !this.queue?.length) {
      this.subscriber?.complete();
    }
  }

  /**
   * ✅ 核心能力：切到后台时不吐字、不 next，只累积 queue；
   * ✅ 回到前台时（hidden->visible），一次性把 this.queue 拼进 display，并 next(display) 一次
   * 这样就能实现：用户切走页签回来，“答案一次性更新到最新”
   */

  private fastForward = () => {
    if (!this.queue?.length) {
      return;
    }
    this.charBudget = 0;
    this.lastFrameTs = performance.now();
    this.display += this.queue.join('');
    this.queue = [];
    this.subscriber?.next(this.display);
    this.maybeFinish();
    if (!this.streamClosed && !this.isPumping) {
      this.pump();
    }
  };

  // 打字机效果：启动一个 requestAnimationFrame 循环，持续从队列吐字
  private pump = () => {
    this.isPumping = true; // 标记进入吐字状态
    const frame = (ts: number) => {
      /**
       * ✅ 如果页签不可见：停止吐字（isPumping=false），不再 next
       * 后台期间只会 enqueue（积压队列），等“从 hidden 切回 visible”再 fastForward 一次性补齐
       */
      if (document.hidden) {
        this.isPumping = false; // 停止吐字
        return;
      }
      if (!this.queue?.length) {
        this.isPumping = false;
        this.maybeFinish();
        return;
      }

      const dtMs = Math.min(50, ts - this.lastFrameTs); // 本帧时间差
      this.lastFrameTs = ts;

      const baseSpeed = this.getAdaptiveSpeed(this.queue.length); // 根据队列长度决定基础速度
      // 以 1 为中心、幅度可控、正负对称 的随机倍率，用来让节奏/速度/延迟产生自然抖动，同时保持整体均值接近基准值
      const jitterFactor = 1 + (Math.random() * 2 - 1) * this.jitter;
      const speed = baseSpeed * jitterFactor; // 是每秒字符数

      // 时间预算累积：dt(s) * speed(chars/s) => 本帧可吐的字符预算
      this.charBudget += (dtMs / 1000) * speed; // 累积预算

      let charsToEmit = Math.min(
        Math.floor(this.charBudget),
        this.maxCharsPerFrame,
      ); // 本帧要吐的字符数
      this.charBudget -= charsToEmit; // 扣除已使用预算

      let pause = 0; // 本帧最大停顿（遇到标点会变大）

      // 从队列取出 charsToEmit 个字符拼起来
      while (charsToEmit-- > 0 && this.queue.length) {
        const ch = this.queue.shift()!; // 取一个字符
        const p = this.getPause(ch);
        this.display += ch; // 把本帧片段追加到总显示文本

        if (p > 0) {
          pause = p;
          this.subscriber?.next(this.display); // 先把标点显示出去
          this.nextUiFlushTs = ts + this.uiFlushIntervalMs;
          this.timerId = setTimeout(() => requestAnimationFrame(frame), pause);
          return;
        }
      }

      // UI 限频刷新：避免每帧都触发 Angular 变更检测导致卡顿
      if (ts >= this.nextUiFlushTs) {
        if (!document.hidden) {
          this.subscriber?.next(this.display); // 推送“累计文本”给订阅者
        }
        this.nextUiFlushTs = ts + this.uiFlushIntervalMs; // 约束下一次刷新时间
      }

      if (pause > 0) {
        this.timerId = setTimeout(
          () => (this.rafId = requestAnimationFrame(frame)),
          pause,
        ); // 先停顿，再进入下一帧
      } else {
        this.rafId = requestAnimationFrame(frame); // 请在下一帧绘制前调用 frame(ts)
      }
    };

    requestAnimationFrame(frame);
  };

  private onVisibilityChange = () => {
    const nowHidden = document.hidden;
    if (nowHidden) {
      this.isPumping = false;
      this.wasHidden = true;
      return;
    }

    if (this.wasHidden && !nowHidden) {
      this.fastForward();
    }
    this.wasHidden = nowHidden; // 更新状态
  };

  private enqueue(content: string): void {
    if (!content) {
      this.maybeFinish(); // chunk 为空时：可能只是无内容事件；尝试收尾（不强制结束）
      return;
    }
    for (const ch of content) {
      this.queue.push(ch); // 每个字符入队
    }
    if (!document.hidden && !this.isPumping) {
      this.pump();
    }
  }
  private getPause = (ch: string) => {
    if (ch === '\n') return this.pauseMs.newline; // 换行：更长停顿
    if ('。.!！？?'.includes(ch)) return this.pauseMs.sentence; // 句末标点：长停顿
    if ('，,；;：:'.includes(ch)) return this.pauseMs.comma; // 逗号类：短停顿
    return 0; // 普通字符：不停顿
  };

  // 队列越长 => 速度越快：避免队列积压导致“永远吐不完”
  private getAdaptiveSpeed = (queueLen: number) => {
    if (queueLen > 600) return this.maxCharsPerSecond; // 极长积压：直接上限速度
    if (queueLen > 300) return Math.min(this.maxCharsPerSecond, 95); // 中等积压：加速
    if (queueLen > 120) return Math.min(this.maxCharsPerSecond, 65); // 轻度积压：略加速
    return this.baseCharsPerSecond; // 队列短：基础速度（更自然）
  };
}
