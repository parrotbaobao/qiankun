import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  OnDestroy,
} from '@angular/core';
import { WorkflowApiService } from '../../core/services/api.service';
import { Subscription } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';

interface Message {
  from: 'user' | 'ai';
  text: string;
  status?: 'streaming' | 'DONE';
  id?: string;
  createdAt?: number;
  loading?: boolean;
}

@Component({
  selector: 'app-ai-chat',
  templateUrl: './ai-chat.component.html',
  styleUrls: ['./ai-chat.component.scss'],
})
export class AiChatComponent implements OnInit, OnDestroy {
  @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLDivElement>;
  text = '';
  private sub?: Subscription;
  private abortFn?: () => void;

  constructor(
    private APIService: WorkflowApiService,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService,
  ) { }

  visible = false;
  inputText = '';
  messages: Message[] = [];

  ngOnInit(): void {
    this.messages = [{ from: 'ai', text: this.translate.instant('aiChat.initialMessage') }];
    this.scrollToBottom(false);
  }

  private currentAssistantMsg?: Message;

  public send() {
    // 先停掉上一次
    this.sub?.unsubscribe();
    this.abortFn?.();

    const text = (this.inputText || '').trim();
    if (!text) {
      return;
    }

    this.messages.push({ from: 'user', text });

    // 插入一条“正在流式”的 AI 消息（后续不断覆盖 text）
    this.currentAssistantMsg = {
      id: crypto.randomUUID(),
      from: 'ai',
      text: '',
      status: 'streaming',
      createdAt: Date.now(),
      loading: true,
    };
    this.messages.push(this.currentAssistantMsg);

    this.inputText = ''; // 清空对话框
    this.scrollToBottom(false);
    this.sendToAI(text);
  }

  private sendToAI(text: string): void {
    const options = {
      body: {
        model: 'google/gemma-3-4b',
        stream: true,
        temperature: 0.2,
        messages: [{ role: 'user', content: text }],
      },

      // 如果 ev.data 是 JSON，就在这里取 delta
      pickText: (data: any) => {
        /**
         * 注意：
         * - 这里只负责解析增量 delta
         * - 不要在 catch 里标 DONE（可能是 [DONE]/心跳/空行）
         * DONE 用 complete 来判断更稳
         */
        try {
          const obj = JSON.parse(data);
          return obj?.choices?.[0]?.delta?.content ?? '';
        } catch (error) {
          return '';
        }
      },
    };
    const { text$, abort } = this.APIService.typewriterSse(options);
    this.abortFn = abort;

    this.sub = text$.subscribe({
      next: (fullText: string) => {
        if (!this.currentAssistantMsg) return;
        this.currentAssistantMsg.loading = false;

        /**
         * ✅ 关键：
         * Service 在后台不会 next；
         * 回到前台会 fastForward 一次性 next 最新 fullText；
         * 所以这里直接覆盖即可实现“回来一次性更新”
         */
        this.currentAssistantMsg.text = fullText;

        // 前台才需要渲染/滚动
        if (!document.hidden) {
          this.cdr.detectChanges();
          this.scrollToBottom(false);
        }
      },
      error: (e: any) => console.error(e),
      complete: () => {
        if (this.currentAssistantMsg) {
          this.currentAssistantMsg.status = 'DONE';
        }
        if (!document.hidden) {
          this.cdr.detectChanges();
          this.scrollToBottom(false);
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
