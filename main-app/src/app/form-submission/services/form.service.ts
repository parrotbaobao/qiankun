import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { FormData, Reviewer, Attachment } from '../models/form.model';

@Injectable({
  providedIn: 'root'
})
export class FormService {
  private reviewers: Reviewer[] = [
    { id: '1', name: '张三' },
    { id: '2', name: '李四' },
    { id: '3', name: '王五' },
    { id: '4', name: '赵六' }
  ];

  getReviewers(): Observable<Reviewer[]> {
    return of(this.reviewers).pipe(delay(500));
  }

  submitForm(formData: FormData): Observable<boolean> {
    // 模拟表单提交
    return of(true).pipe(delay(1000));
  }

  uploadAttachment(file: File): Observable<Attachment> {
    // 模拟文件上传
    return of({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      type: file.type,
      size: file.size,
      url: URL.createObjectURL(file)
    }).pipe(delay(1000));
  }

  deleteAttachment(attachmentId: string): Observable<boolean> {
    // 模拟删除附件
    return of(true).pipe(delay(500));
  }
}
