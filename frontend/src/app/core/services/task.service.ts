import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApiResponse,
  Task,
  Pagination,
  TaskStats,
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskStatus,
} from '../models';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly apiUrl = `${environment.apiUrl}/tasks`;

  constructor(private http: HttpClient) {}

  getTasks(filters?: {
    status?: TaskStatus;
    assignedTo?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Observable<ApiResponse<{ tasks: Task[]; pagination: Pagination }>> {
    let params = new HttpParams();

    if (filters) {
      if (filters.status) params = params.set('status', filters.status);
      if (filters.assignedTo) params = params.set('assignedTo', filters.assignedTo);
      if (filters.search) params = params.set('search', filters.search);
      if (filters.page) params = params.set('page', filters.page.toString());
      if (filters.limit) params = params.set('limit', filters.limit.toString());
    }

    return this.http.get<ApiResponse<{ tasks: Task[]; pagination: Pagination }>>(
      this.apiUrl,
      { params },
    );
  }

  getTaskById(id: string): Observable<ApiResponse<{ task: Task }>> {
    return this.http.get<ApiResponse<{ task: Task }>>(`${this.apiUrl}/${id}`);
  }

  createTask(data: CreateTaskRequest): Observable<ApiResponse<{ task: Task }>> {
    return this.http.post<ApiResponse<{ task: Task }>>(this.apiUrl, data);
  }

  updateTask(id: string, data: UpdateTaskRequest): Observable<ApiResponse<{ task: Task }>> {
    return this.http.put<ApiResponse<{ task: Task }>>(`${this.apiUrl}/${id}`, data);
  }

  deleteTask(id: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/${id}`);
  }

  reassignTask(id: string, assignedTo: string): Observable<ApiResponse<{ task: Task }>> {
    return this.http.put<ApiResponse<{ task: Task }>>(`${this.apiUrl}/${id}/reassign`, {
      assignedTo,
    });
  }

  getTaskStats(): Observable<ApiResponse<{ stats: TaskStats }>> {
    return this.http.get<ApiResponse<{ stats: TaskStats }>>(`${this.apiUrl}/stats`);
  }
}
