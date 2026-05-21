import { Component, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  Subject,
  interval,
  BehaviorSubject,
  EMPTY,
} from 'rxjs';
import {
  switchMap,
  takeUntil,
  catchError,
  retry,
  tap,
  distinctUntilChanged,
  map,
} from 'rxjs/operators';

interface TaskStatus {
  id: string;
  status: 'pending' | 'queued' | 'processing' | 'done';
  progress: number;
  message: string;
  updatedAt: string;
  errorCount: number;
}

interface LogEntry {
  time: string;
  type: 'info' | 'success' | 'error' | 'warn';
  text: string;
}

@Component({
  selector: 'app-polling-demo',
  templateUrl: './polling-demo.component.html',
  styleUrls: ['./polling-demo.component.scss'],
})
export class PollingDemoComponent implements OnDestroy {
  // ── 常量 ──────────────────────────────────────────────────────────────────
  readonly STEPS = ['pending', 'queued', 'processing', 'done'] as const;

  readonly codeSnippet = `// 核心：BehaviorSubject 控制轮询开关
this.polling$
  .pipe(
    switchMap(active => {
      if (!active) return EMPTY;           // 暂停时什么都不做

      return interval(2000).pipe(          // 每 2s 触发一次
        switchMap(() =>
          this.http.get('/api/tasks/status').pipe(
            retry(2),                      // 失败最多重试 2 次
            catchError(() => EMPTY)        // 超出重试则跳过本次
          )
        ),
        distinctUntilChanged(...)          // 状态没变化不触发 UI 更新
      );
    }),
    takeUntil(this.destroy$)               // 组件销毁时自动取消订阅
  )
  .subscribe(status => { ... });`;

  // ── 状态 ──────────────────────────────────────────────────────────────────
  taskId: string | null = null;
  taskStatus: TaskStatus | null = null;
  isPolling = false;
  pollCount = 0;
  intervalMs = 2000;
  logs: LogEntry[] = [];

  // ── RxJS 控制流 ───────────────────────────────────────────────────────────
  /** 组件销毁时发射，统一取消所有订阅 */
  private destroy$ = new Subject<void>();
  /** true = 开始轮询, false = 暂停轮询 */
  private polling$ = new BehaviorSubject<boolean>(false);

  constructor(private http: HttpClient) {
    this.initPollingStream();
  }

  // ── 核心：轮询流 ───────────────────────────────────────────────────────────
  private initPollingStream(): void {
    /*
     * 核心模式：
     *   polling$  ──switchMap──>  interval(N ms)  ──switchMap──>  HTTP GET
     *
     * 当 polling$ 发射 false 时，switchMap 切换到 EMPTY，轮询自动停止。
     * 当 polling$ 发射 true  时，重新启动 interval，立即触发第一次请求。
     */
    this.polling$
      .pipe(
        switchMap((active) => {
          if (!active || !this.taskId) return EMPTY;

          // interval(0) 会立刻触发第一次，之后每 intervalMs 触发一次
          return interval(this.intervalMs).pipe(
            tap(() => this.pollCount++),

            // switchMap：每次 interval tick 发起一个 HTTP 请求
            // 若上一次请求还没返回，自动取消（适合轮询场景）
            switchMap(() =>
              this.http.get<TaskStatus>(`/api/tasks/${this.taskId}/status`).pipe(
                // 网络错误时最多重试 2 次，超出后把错误传给外层 catchError
                retry(2),
                catchError((err) => {
                  this.addLog('error', `请求失败: ${err.message ?? err.status}`);
                  return EMPTY; // 本次 tick 失败，不影响下一次轮询
                })
              )
            ),

            // 只在 status 真正变化时更新 UI（避免无意义渲染）
            distinctUntilChanged((a, b) => a.status === b.status && a.progress === b.progress),

            takeUntil(this.destroy$)
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((status) => {
        this.taskStatus = status;
        const logType = status.status === 'done' ? 'success' : 'info';
        this.addLog(logType, `[${status.status}] ${status.message}  进度: ${status.progress}%`);

        // 任务完成后自动停止轮询
        if (status.status === 'done') {
          this.stopPolling();
          this.addLog('success', '轮询结束，任务已完成');
        }
      });
  }

  // ── 操作方法 ───────────────────────────────────────────────────────────────
  createTask(): void {
    this.reset();
    this.http.post<{ id: string }>('/api/tasks', {}).subscribe((res) => {
      this.taskId = res.id;
      this.addLog('info', `任务已创建: ${res.id}`);
      this.startPolling();
    });
  }

  startPolling(): void {
    if (!this.taskId) return;
    this.isPolling = true;
    this.addLog('warn', `开始轮询，间隔 ${this.intervalMs}ms`);
    this.polling$.next(true);
  }

  stopPolling(): void {
    this.isPolling = false;
    this.polling$.next(false);
  }

  togglePolling(): void {
    this.isPolling ? this.stopPolling() : this.startPolling();
  }

  changeInterval(ms: number): void {
    this.intervalMs = ms;
    // 重新触发 polling$ 让 switchMap 用新的 interval 值重建流
    if (this.isPolling) {
      this.polling$.next(false);
      setTimeout(() => this.polling$.next(true), 50);
    }
    this.addLog('info', `轮询间隔已调整为 ${ms}ms`);
  }

  reset(): void {
    this.stopPolling();
    if (this.taskId) {
      this.http.delete(`/api/tasks/${this.taskId}`).subscribe();
    }
    this.taskId = null;
    this.taskStatus = null;
    this.pollCount = 0;
    this.logs = [];
  }

  isStepPassed(step: string): boolean {
    const currentIdx = this.STEPS.indexOf(this.taskStatus?.status as any ?? 'pending');
    const stepIdx = this.STEPS.indexOf(step as any);
    return stepIdx < currentIdx;
  }

  private addLog(type: LogEntry['type'], text: string): void {
    const time = new Date().toLocaleTimeString('zh-CN', { hour12: false });
    this.logs.unshift({ time, type, text });
    if (this.logs.length > 50) this.logs.pop();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
