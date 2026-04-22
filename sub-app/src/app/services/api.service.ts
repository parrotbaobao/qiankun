import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Workflow, NodeDropPayload } from '../interface/orchestration.models';

export interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
}

@Injectable({
    providedIn: 'root'
})
export class WorkflowApiService {
    private baseUrl = 'http://localhost:3000/api/workflows';

    constructor(private http: HttpClient) { }

    getWorkflow(id: string): Observable<ApiResponse<Workflow>> {
        return this.http.get<ApiResponse<Workflow>>(`${this.baseUrl}/${id}`);
    }

    saveWorkflow(workflow: Workflow): Observable<ApiResponse<Workflow>> {
        return this.http.put<ApiResponse<Workflow>>(
            `${this.baseUrl}/${workflow.id}`,
            workflow
        );
    }

    operateWorkflow(
        workflowId: string,
        action: string,
        payload: any
    ): Observable<ApiResponse> {
        return this.http.post<ApiResponse>(
            `${this.baseUrl}/${workflowId}/operations`,
            {
                action,
                payload
            }
        );
    }

    addNode(
        workflowId: string,
        payload: NodeDropPayload
    ): Observable<ApiResponse> {
        return this.operateWorkflow(workflowId, 'addNode', payload);
    }
}