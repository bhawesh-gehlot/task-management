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
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner.component';
import {
  ConfirmDialog,
  ConfirmDialogData,
} from '../../../shared/components/confirm-dialog/confirm-dialog.component';

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
  templateUrl: './task-list.component.html',
  styleUrl: './task-list.component.scss',
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
