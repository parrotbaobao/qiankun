import { HttpClient, HttpEvent, HttpEventType, HttpRequest } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { filter, map, Observable } from "rxjs";

@Injectable({ providedIn: 'root' })
export class UploadService {

    constructor(private http: HttpClient) { }

    public uploadFile(api: string, file: File, extra: any): Observable<any> {
        // 上传文件时不能用普通 JSON（application/json）直接把二进制塞进去；
        // 最通用的方式是用 表单上传协议：multipart/form-data。FormData 就是浏览器提供的“构造 multipart 请求体”的工具。
        const form = new FormData();
        form.append('file', file, file.name);

        const req = new HttpRequest('POST', api, form, {
            reportProgress: true,
            // withCredentials: true, // 如果需要带 cookie
        });

        return this.http.request(req).pipe(

            filter((e: HttpEvent<any>) => {
                return e.type === HttpEventType.UploadProgress || e.type === HttpEventType.Response
            }),
            map((e: HttpEvent<any>) => {
                console.log(e);

                if (e.type === HttpEventType.UploadProgress) {
                    const total = e.total ?? 0;
                    const progress = total ? Math.round((e.loaded / total) * 100) : 0;
                    return { type: 'progress', progress };
                }
                return { type: 'response', body: (e as any).body };
            })
        )

    }
}