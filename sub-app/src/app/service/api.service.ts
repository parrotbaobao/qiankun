import { Injectable } from '@angular/core'; // Angular 依赖注入
import { HttpClient } from '@angular/common/http'; // HttpClient（当前文件里未使用，可删）
import { fetchEventSource } from '@microsoft/fetch-event-source'; // SSE 客户端（基于 fetch）
import { Observable } from 'rxjs'; // RxJS Observable，用于把流式输出暴露给组件订阅

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

@Injectable({
  providedIn: 'root', 
})
export class APIService {
  private static readonly url = 'http://localhost:1234/v1/chat/completions'; 

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

  constructor(private http: HttpClient) {} // 注入 HttpClient（当前未使用，可删）

  // 根据字符返回停顿时间（ms）：标点/换行停顿更久
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

  // SSE + 打字机：返回 Observable（累计文本） + abort（中止）
  public typewriterSse(options: TypewriterOptions): any {
    const ctrl = new AbortController(); // 取消控制器（当前未传给 fetchEventSource 的 signal，建议补上）

    const {
      body, // 请求体
      charsPerTick = 2, // 旧的 tick 参数（你当前没用）
      tickMs = 16, // 旧的 tick 参数（你当前没用）
      pickText = (s) => s, // 默认：ev.data 直接作为增量文本
      retry = true, // 默认：错误时自动重连（throw 触发库重试）
    } = options; // 解构 options

    const text$ = new Observable<string>((subscriber) => {
      const queue: string[] = []; // 字符队列：存放还没显示的字符
      let pumping = false; // 是否正在“吐字”
      let display = ''; // 当前已经渲染出来的完整文本
      let streamClosed = false; // SSE 是否已结束（onclose 时置为 true）

      // ======= 打字机内部状态（基于时间预算的节奏控制） =======
      let charBudget = 0; // “字符预算”：dt * speed 累积后决定本帧吐多少字符
      let lastFrameTs = performance.now(); // 上一帧时间戳
      let nextUiFlushTs = 0; // 下一次允许刷新 UI 的时间戳（用于限频）

      // 尝试结束：只有“流结束 + 队列空 + 不在吐字”才 complete
      const maybeFinish = () => {
        if (streamClosed && queue.length === 0 && !pumping) {
          subscriber.complete(); // 通知订阅者：完成
        }
      };

      // 打字机效果：启动一个 requestAnimationFrame 循环，持续从队列吐字
      const pump = () => {
        pumping = true; // 标记进入吐字状态

        const frame = (ts: number) => {
          // 队列吐空：停止吐字并尝试收尾（可能 SSE 已结束）
          if (queue.length === 0) {
            pumping = false; // 标记停止吐字
            maybeFinish(); // 如果流也结束了，就 complete
            return; // 结束本次循环
          }

          // dt 防抖：切后台回来 dt 可能很大，限制最大 50ms 避免一口气吐太多
          const dtMs = Math.min(50, ts - lastFrameTs); // 本帧时间差（ms）从上一帧到这一帧过了多少毫秒
          lastFrameTs = ts; // 更新上一帧时间戳

          // 自适应速度 + 抖动：更像真人打字
          const baseSpeed = this.getAdaptiveSpeed(queue.length); // 根据队列长度决定基础速度
          const jitterFactor = 1 + (Math.random() * 2 - 1) * this.jitter; // 速度抖动因子：1±jitter
          const speed = baseSpeed * jitterFactor; // 本帧速度（chars/sec）

          // 时间预算累积：dt(s) * speed(chars/s) => 本帧可吐的字符预算
          charBudget += (dtMs / 1000) * speed; // 累积预算

          // 本帧实际吐多少字符：预算取整 + 限制每帧上限避免“跳字”
          let charsToEmit = Math.min(Math.floor(charBudget), this.maxCharsPerFrame); // 本帧要吐的字符数
          charBudget -= charsToEmit; // 扣除已使用预算

          let piece = ''; // 本帧要追加的一小段字符串
          let pause = 0; // 本帧最大停顿（遇到标点会变大）

          // 从队列取出 charsToEmit 个字符拼起来
          while (charsToEmit-- > 0 && queue.length) {
            const ch = queue.shift()!; // 取一个字符
            piece += ch; // 拼接到本帧片段
            pause = Math.max(pause, this.getPause(ch)); // 计算标点停顿（取最大）
          }

          display += piece; // 把本帧片段追加到总显示文本

          // UI 限频刷新：避免每帧都触发 Angular 变更检测导致卡顿
          if (ts >= nextUiFlushTs) {
            subscriber.next(display); // 推送“累计文本”给订阅者
            nextUiFlushTs = ts + this.uiFlushIntervalMs; // 约束下一次刷新时间
          }

          // 标点停顿：遇到标点/换行会暂停一小段再继续（更像 ChatGPT）
          if (pause > 0) {
            setTimeout(() => requestAnimationFrame(frame), pause); // 先停顿，再进入下一帧
          } else {
            requestAnimationFrame(frame); // 请在下一帧绘制前调用 frame(ts)
          }
        };

        requestAnimationFrame(frame); // 启动第一帧，请在下一帧绘制前调用 frame(ts)
      };

      // 入队：把增量 chunk 拆成字符推入队列，并确保 pump 已启动
      const enqueue = (chunk: string) => {
        if (!chunk) {
          maybeFinish(); // chunk 为空时：可能只是无内容事件；尝试收尾（不强制结束）
          return;
        }

        for (const ch of chunk) {
          queue.push(ch); // 每个字符入队
        }

        if (!pumping) {
          pump(); // 如果当前没在吐字，就启动吐字循环
        }
      };

      // 建立 SSE 连接：持续收到 onmessage
      fetchEventSource(APIService.url, {
        method: 'POST', // 这里固定 POST（可用 options.method 替换）
        headers: {
          'Content-Type': 'application/json', // 请求体为 JSON
          Accept: 'text/event-stream', // 希望服务端返回 SSE
        },
        body:
          body == null
            ? undefined // 没有 body 就不传
            : typeof body === 'string'
              ? body // string 直接用
              : JSON.stringify(body), // object 转 JSON 字符串

        // 建议补上：signal: ctrl.signal（否则 abort 可能不生效）
        // signal: ctrl.signal,

        onmessage(ev) {
          try {
            const content = pickText(ev.data); // 从 ev.data 提取增量文本
            enqueue(content); // 入队并触发吐字
          } catch (e) {
            subscriber.error(e); // 解析/处理失败直接 error
          }
        },

        onclose() {
          streamClosed = true; // SSE 连接关闭：标记流已结束
          maybeFinish(); // 不直接 complete，等队列吐空后再 complete
        },

        onerror(err) {
          if (retry) throw err; // retry=true：抛出让库自动重连
          subscriber.error(err); // 否则：直接 error 结束
        },
      });

      // Observable 取消订阅时：中止连接（建议配合 signal 才能真正中止 fetch）
      return () => ctrl.abort();
    });

    return {
      text$, // 订阅 text$ 获取累计输出文本
      abort: () => ctrl.abort(), // 手动停止
    };
  }
}
