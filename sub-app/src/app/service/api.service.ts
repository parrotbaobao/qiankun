import { Injectable } from '@angular/core'; // Angular 依赖注入
import { HttpClient } from '@angular/common/http'; // HttpClient（当前文件里未使用，可删）
import { fetchEventSource } from '@microsoft/fetch-event-source'; // SSE 客户端（基于 fetch）
import { Observable, Subscriber } from 'rxjs'; // RxJS Observable，用于把流式输出暴露给组件订阅
import { TypewriterOptions, TypewriterSession } from './typewriter-session';



@Injectable({
  providedIn: 'root',
})
export class APIService {
  constructor(private http: HttpClient) {} // 注入 HttpClient（当前文件里未使用，可删）
  // SSE + 打字机：返回 Observable（累计文本） + abort（中止）
  public typewriterSse(options: TypewriterOptions): any {
    const session = new TypewriterSession(options); // ✅ 每次 new 一个 session
    return session.start(); // ✅ session 内部状态隔离，不会覆盖
  }
}
