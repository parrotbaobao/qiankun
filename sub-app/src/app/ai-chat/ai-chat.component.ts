import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
} from '@angular/core';
import { APIService } from '../service/api.service';
import { Subscription } from 'rxjs';

interface Message {
  from: 'user' | 'ai';
  text: string;
}

@Component({
  selector: 'app-ai-chat',
  templateUrl: './ai-chat.component.html',
  styleUrls: ['./ai-chat.component.scss'],
})
export class AiChatComponent implements OnInit {
  @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLDivElement>;
  text = '';
  private sub?: Subscription;
  private abortFn?: () => void;
  private buffer = '';
  private visibilityHandler = () => {
    if (!document.hidden) {
      this.flush(true); // 回到前台一次性刷新并滚动
    }
  };
  private currentAssistantMsg: any;
  text$: any;
  lastLen = 0;
  constructor(
    private APIService: APIService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.scrollToBottom(false);
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }
  visible = false;
  inputText = '';
  messages: any[] = [{ from: 'ai', text: '你好，我是简单聊天对话框。' }];

  public send() {
    // 先停掉上一次
    this.sub?.unsubscribe();
    this.abortFn?.();
    const text = (this.inputText || '').trim();
    if (!text) {
      return;
    }
    this.messages.push({ from: 'user', text });
    this.currentAssistantMsg = {
      id: crypto.randomUUID(),
      from: 'ai',
      text: '',
      status: 'streaming',
      createdAt: Date.now(),
    };
    this.scrollToBottom(false);
    this.sendToAI(text);
  }

  private sendToAI(text: string): void {
    this.buffer = '';
    this.lastLen = 0;
    const options = {
      body: {
        model: 'google/gemma-3-4b',
        stream: true,
        temperature: 0.2,
        messages: [{ role: 'user', content: text }],
      },
      charsPerTick: 2,
      tickMs: 16,
      // 如果 ev.data 是 JSON，就在这里取 delta
      pickText: (data: any) => {
        let obj;
        let content = '';
        try {
          obj = JSON.parse(data);
          content = obj?.choices[0]?.delta?.content;
        } catch (error) {
          this.currentAssistantMsg.status = 'DONE';
        }
        return content;
      },
    };
    this.inputText = ''; //清空对话框
    const { text$, abort } = this.APIService.typewriterSse(options);
    this.abortFn = abort;
    this.messages.push(this.currentAssistantMsg);

    this.sub = text$.subscribe({
      next: (t: string) => {
        if (!t) return;

        let delta = '';
        if (t.length >= this.lastLen) {
          // t 是全量：取增量
          delta = t.slice(this.lastLen);
          this.lastLen = t.length;
        } else {
          // t 是增量：直接用
          delta = t;
          this.lastLen = 0;
        }

        if (delta) this.onChunk(delta);

        // 前台实时模式才滚动
        if (!document.hidden) this.scrollToBottom(false);
      },
      error: (e: any) => console.error(e),
      complete: () => {
        if (this.currentAssistantMsg) {
          this.currentAssistantMsg.status = 'DONE';
        }
      },
    });
  }

  stop() {
    this.sub?.unsubscribe();
    this.abortFn?.();
  }

  ngOnDestroy() {
    this.stop();
    document.removeEventListener('visibilitychange', this.visibilityHandler);
  }

  private flush(needScroll = false): void {
    if (!this.buffer) return;
    const chunk = this.buffer;
    this.buffer = '';
    this.appendToUI(chunk);
    if (needScroll) {
      requestAnimationFrame(() => this.scrollToBottom(true));
    }
  }

  // 新收到的一段增量文本（chunk 或 buffer）”合并到你页面上正在显示的那条 AI 回复里（或合并到消息列表里），触发视图更新
  private appendToUI(chunk: string): void {
    if (!this.currentAssistantMsg) return;
    this.currentAssistantMsg.text += chunk;
    this.cdr.detectChanges();
  }

  private onChunk(chunk: string) {
    this.buffer += chunk;
    if (document.hidden) return;
    this.flush(false);
  }

  private scrollToBottom(smooth = true): void {
    const el = this.scrollContainer?.nativeElement;
    if (!el) return;
    // 等 DOM/布局更新更完整后再滚
    requestAnimationFrame(() => {
      el.scrollTo({
        top: el.scrollHeight, // 尝试滚到内容的最底部附近（通常用于“滚到底”）
        behavior: smooth ? 'smooth' : 'auto', // 平滑滚动到目标位置
      });
    });
  }
}
