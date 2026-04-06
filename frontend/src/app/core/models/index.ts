export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  TEAM_LEAD = 'team_lead',
  EMPLOYEE = 'employee',
}

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

export interface User {
  _id: string;
  id?: string;
  username: string;
  email: string;
  role: UserRole;
  managedBy: string | User | null;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  _id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assignedTo: User | string;
  createdBy: User | string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Array<{ field: string; message: string }>;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface TaskStats {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
}

export interface TeamLeadWithMembers extends User {
  teamMembers: User[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  status?: TaskStatus;
  assignedTo?: string;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: TaskStatus;
}

export interface UserStats {
  total: number;
  admin: number;
  manager: number;
  team_lead: number;
  employee: number;
}

export interface ManagerWithTeams extends User {
  teamMembers: TeamLeadWithMembers[];
}
