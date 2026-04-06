import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DatePipe } from '@angular/common';
import { Subject, takeUntil, debounceTime, merge } from 'rxjs';
import { TaskService } from '../../../core/services/task.service';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { SocketService } from '../../../core/services/socket.service';
import { Task, TaskStatus, User, UserRole, Pagination } from '../../../core/models';
import { StatusLabelPipe } from '../../../shared/pipes/status-label.pipe';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';
import {
  ConfirmDialog,
  ConfirmDialogData,
} from '../../../shared/components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatChipsModule,
    MatPaginatorModule,
    MatMenuModule,
    MatTooltipModule,
    DatePipe,
    StatusLabelPipe,
    LoadingSpinner,
  ],
  template: `
    <div class="task-list-container">
      <div class="page-header">
        <h1>Tasks</h1>
        <button mat-flat-button color="primary" routerLink="/tasks/new">
          <mat-icon>add</mat-icon> New Task
        </button>
      </div>

      <mat-card class="filters-card">
        <mat-card-content>
          <div class="filters-row">
            <mat-form-field appearance="outline" class="filter-field">
              <mat-label>Search</mat-label>
              <input matInput [(ngModel)]="searchQuery" (ngModelChange)="onSearchChange()" placeholder="Search tasks..." />
              <mat-icon matSuffix>search</mat-icon>
            </mat-form-field>

            <mat-form-field appearance="outline" class="filter-field">
              <mat-label>Status</mat-label>
              <mat-select [(ngModel)]="statusFilter" (ngModelChange)="loadTasks()">
                <mat-option value="">All</mat-option>
                <mat-option [value]="TaskStatus.PENDING">Pending</mat-option>
                <mat-option [value]="TaskStatus.IN_PROGRESS">In Progress</mat-option>
                <mat-option [value]="TaskStatus.COMPLETED">Completed</mat-option>
              </mat-select>
            </mat-form-field>

            @if (authService.hasRole(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEAM_LEAD)) {
              <mat-form-field appearance="outline" class="filter-field">
                <mat-label>Assigned To</mat-label>
                <mat-select [(ngModel)]="assignedToFilter" (ngModelChange)="loadTasks()">
                  <mat-option value="">All</mat-option>
                  @for (user of assignableUsers(); track user._id) {
                    <mat-option [value]="user._id">{{ user.username }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            }
          </div>
        </mat-card-content>
      </mat-card>

      @if (loading()) {
        <app-loading-spinner />
      } @else if (tasks().length === 0) {
        <mat-card class="empty-card">
          <mat-card-content>
            <mat-icon class="empty-icon">assignment</mat-icon>
            <h3>No tasks found</h3>
            <p>Create a new task to get started.</p>
            <button mat-flat-button color="primary" routerLink="/tasks/new">
              <mat-icon>add</mat-icon> Create Task
            </button>
          </mat-card-content>
        </mat-card>
      } @else {
        <div class="tasks-grid">
          @for (task of tasks(); track task._id) {
            <mat-card class="task-card" [class]="'status-' + task.status">
              <mat-card-header>
                <mat-card-title>{{ task.title }}</mat-card-title>
                <mat-card-subtitle>
                  Assigned to: {{ getUsername(task.assignedTo) }}
                </mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                @if (task.description) {
                  <p class="task-description">{{ task.description }}</p>
                }
                <div class="task-meta">
                  <mat-chip-set>
                    <mat-chip [class]="'chip-' + task.status">
                      {{ task.status | statusLabel }}
                    </mat-chip>
                  </mat-chip-set>
                  <span class="task-date">{{ task.updatedAt | date:'medium' }}</span>
                </div>
              </mat-card-content>
              <mat-card-actions align="end">
                <button mat-icon-button matTooltip="Edit" (click)="editTask(task)">
                  <mat-icon>edit</mat-icon>
                </button>
                @if (authService.hasRole(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEAM_LEAD)) {
                  <button mat-icon-button matTooltip="Reassign" [matMenuTriggerFor]="reassignMenu">
                    <mat-icon>swap_horiz</mat-icon>
                  </button>
                  <mat-menu #reassignMenu="matMenu">
                    @for (user of assignableUsers(); track user._id) {
                      <button mat-menu-item (click)="reassignTask(task, user._id)">
                        {{ user.username }} ({{ user.role }})
                      </button>
                    }
                  </mat-menu>
                }
                <button mat-icon-button matTooltip="Delete" (click)="confirmDelete(task)">
                  <mat-icon color="warn">delete</mat-icon>
                </button>
              </mat-card-actions>
            </mat-card>
          }
        </div>

        <mat-paginator
          [length]="pagination()?.total ?? 0"
          [pageSize]="pageSize"
          [pageSizeOptions]="[5, 10, 25]"
          [pageIndex]="currentPage - 1"
          (page)="onPageChange($event)"
          showFirstLastButtons
        ></mat-paginator>
      }
    </div>
  `,
  styles: `
    .task-list-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;

      h1 { font-size: 28px; font-weight: 600; margin: 0; }
    }

    .filters-card { margin-bottom: 24px; }

    .filters-row {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      align-items: center;

      .filter-field { min-width: 200px; flex: 1; }
    }

    .tasks-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 16px;
      margin-bottom: 16px;
    }

    .task-card {
      border-left: 4px solid transparent;
      transition: box-shadow 0.2s;

      &:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
      &.status-pending { border-left-color: #f59e0b; }
      &.status-in_progress { border-left-color: #3b82f6; }
      &.status-completed { border-left-color: #10b981; }
    }

    .task-description {
      color: #6b7280;
      margin: 8px 0;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .task-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 12px;
    }

    .task-date { font-size: 12px; color: #9ca3af; }

    .chip-pending { --mdc-chip-label-text-color: #92400e; --mdc-chip-elevated-container-color: #fef3c7; }
    .chip-in_progress { --mdc-chip-label-text-color: #1e40af; --mdc-chip-elevated-container-color: #dbeafe; }
    .chip-completed { --mdc-chip-label-text-color: #065f46; --mdc-chip-elevated-container-color: #d1fae5; }

    .empty-card mat-card-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 48px;
      text-align: center;
    }

    .empty-icon { font-size: 64px; width: 64px; height: 64px; color: #d1d5db; margin-bottom: 16px; }

    @media (max-width: 600px) {
      .tasks-grid { grid-template-columns: 1fr; }
    }
  `,
})
export class TaskList implements OnInit, OnDestroy {
  protected readonly TaskStatus = TaskStatus;
  protected readonly UserRole = UserRole;

  private taskService = inject(TaskService);
  authService = inject(AuthService);
  private userService = inject(UserService);
  private socketService = inject(SocketService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  loading = signal(true);
  tasks = signal<Task[]>([]);
  pagination = signal<Pagination | null>(null);
  assignableUsers = signal<User[]>([]);

  statusFilter = '';
  assignedToFilter = '';
  searchQuery = '';
  currentPage = 1;
  pageSize = 10;

  ngOnInit(): void {
    this.loadAssignableUsers();
    this.loadTasks();
    this.setupSocketListeners();

    this.searchSubject.pipe(debounceTime(400), takeUntil(this.destroy$)).subscribe(() => {
      this.currentPage = 1;
      this.loadTasks();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadTasks(): void {
    this.loading.set(true);
    this.taskService
      .getTasks({
        status: this.statusFilter as TaskStatus || undefined,
        assignedTo: this.assignedToFilter || undefined,
        search: this.searchQuery || undefined,
        page: this.currentPage,
        limit: this.pageSize,
      })
      .subscribe({
        next: (res) => {
          if (res.data) {
            this.tasks.set(res.data.tasks);
            this.pagination.set(res.data.pagination);
          }
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  onSearchChange(): void {
    this.searchSubject.next(this.searchQuery);
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.loadTasks();
  }

  editTask(task: Task): void {
    this.router.navigate(['/tasks', task._id, 'edit']);
  }

  confirmDelete(task: Task): void {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Delete Task',
        message: `Are you sure you want to delete "${task.title}"? This action cannot be undone.`,
        confirmText: 'Delete',
      } as ConfirmDialogData,
      width: '400px',
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) this.deleteTask(task._id);
    });
  }

  reassignTask(task: Task, userId: string): void {
    this.taskService.reassignTask(task._id, userId).subscribe({
      next: (res) => {
        this.snackBar.open(res.message, 'Close', { duration: 3000 });
        this.loadTasks();
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Reassign failed', 'Close', { duration: 5000 });
      },
    });
  }

  getUsername(user: User | string): string {
    return typeof user === 'string' ? user : user.username;
  }

  private deleteTask(id: string): void {
    this.taskService.deleteTask(id).subscribe({
      next: () => {
        this.snackBar.open('Task deleted', 'Close', { duration: 3000 });
        this.loadTasks();
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Delete failed', 'Close', { duration: 5000 });
      },
    });
  }

  private loadAssignableUsers(): void {
    this.userService.getAssignableUsers().subscribe({
      next: (res) => {
        if (res.data) this.assignableUsers.set(res.data.users);
      },
    });
  }

  private setupSocketListeners(): void {
    merge(
      this.socketService.taskCreated$,
      this.socketService.taskUpdated$,
      this.socketService.taskDeleted$,
      this.socketService.taskReassigned$,
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadTasks());
  }
}
