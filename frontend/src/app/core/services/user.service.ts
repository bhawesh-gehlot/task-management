import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, User, UserStats, TeamLeadWithMembers, UserRole } from '../models';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly apiUrl = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  getAllUsers(): Observable<ApiResponse<{ users: User[] }>> {
    return this.http.get<ApiResponse<{ users: User[] }>>(this.apiUrl);
  }

  getTeamMembers(): Observable<ApiResponse<{ members: TeamLeadWithMembers[] | User[] }>> {
    return this.http.get<ApiResponse<{ members: TeamLeadWithMembers[] | User[] }>>(
      `${this.apiUrl}/team`,
    );
  }

  getUnassignedUsers(
    role?: UserRole,
  ): Observable<ApiResponse<{ users: User[] }>> {
    let params = new HttpParams();
    if (role) params = params.set('role', role);
    return this.http.get<ApiResponse<{ users: User[] }>>(
      `${this.apiUrl}/unassigned`,
      { params },
    );
  }

  getAssignableUsers(): Observable<ApiResponse<{ users: User[] }>> {
    return this.http.get<ApiResponse<{ users: User[] }>>(
      `${this.apiUrl}/assignable`,
    );
  }

  assignUser(
    userId: string,
    managedBy: string,
  ): Observable<ApiResponse<{ user: User }>> {
    return this.http.put<ApiResponse<{ user: User }>>(
      `${this.apiUrl}/${userId}/assign`,
      { managedBy },
    );
  }

  unassignUser(userId: string): Observable<ApiResponse<{ user: User }>> {
    return this.http.put<ApiResponse<{ user: User }>>(
      `${this.apiUrl}/${userId}/unassign`,
      {},
    );
  }

  changeUserRole(
    userId: string,
    role: UserRole,
  ): Observable<ApiResponse<{ user: User }>> {
    return this.http.put<ApiResponse<{ user: User }>>(
      `${this.apiUrl}/${userId}/role`,
      { role },
    );
  }

  deleteUser(userId: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/${userId}`);
  }

  getUserStats(): Observable<ApiResponse<{ stats: UserStats }>> {
    return this.http.get<ApiResponse<{ stats: UserStats }>>(
      `${this.apiUrl}/stats`,
    );
  }
}
