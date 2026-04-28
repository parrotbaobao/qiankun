import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

// 类型定义
export interface User {
  id: number;
  name: string;
  email: string;
  status: 'active' | 'inactive';
}

export interface UserResponse {
  code: number;
  message: string;
  data: User;
}

export interface ErrorResponse {
  code: number;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = 'https://api.example.com';

  constructor(private http: HttpClient) { }

  getUserById(id: number): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.baseUrl}/users/${id}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = '未知错误';
    if (error.error instanceof ErrorEvent) {
      // 客户端错误
      errorMessage = `客户端错误: ${error.error.message}`;
    } else {
      // 服务器错误
      errorMessage = `服务器错误: ${error.status}\n消息: ${error.message}`;
    }
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}
