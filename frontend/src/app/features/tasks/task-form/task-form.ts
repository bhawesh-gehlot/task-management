import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TaskService } from '../../../core/services/task.service';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { CreateTaskRequest, Task, TaskStatus, User, UserRole } from '../../../core/models';
import { StatusLabelPipe } from '../../../shared/pipes/status-label.pipe';
import { RoleLabelPipe } from '../../../shared/pipes/role-label.pipe';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    StatusLabelPipe,
    RoleLabelPipe,
    LoadingSpinner,
  ],
  template: `
    <div class="form-container">
      <mat-card class="form-card">
        @if (submitting()) {
          <mat-progress-bar mode="indeterminate"></mat-progress-bar>
        }
        <mat-card-header>
          <mat-card-title>
            <mat-icon>{{ isEditMode() ? 'edit' : 'add_task' }}</mat-icon>
            {{ isEditMode() ? 'Edit Task' : 'Create New Task' }}
          </mat-card-title>
        </mat-card-header>

        @if (loadingTask()) {
          <app-loading-spinner />
        } @else {
          <mat-card-content>
            <form [formGroup]="form" (ngSubmit)="onSubmit()">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Title</mat-label>
                <input matInput formControlName="title" placeholder="Task title" maxlength="100" />
                <mat-hint align="end">{{ form.controls.title.value.length }}/100</mat-hint>
                @if (form.controls.title.hasError('required') && form.controls.title.touched) {
                  <mat-error>Title is required</mat-error>
                }
                @if (form.controls.title.hasError('maxlength')) {
                  <mat-error>Max 100 characters</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Description</mat-label>
                <textarea
                  matInput
                  formControlName="description"
                  placeholder="Task description"
                  rows="4"
                  maxlength="500"
                ></textarea>
                <mat-hint align="end">{{ form.controls.description.value.length }}/500</mat-hint>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Status</mat-label>
                <mat-select formControlName="status">
                  @for (status of statuses; track status) {
                    <mat-option [value]="status">{{ status | statusLabel }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              @if (!isEmployee()) {
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Assign To</mat-label>
                  <mat-select formControlName="assignedTo">
                    @for (user of assignableUsers(); track user._id) {
                      <mat-option [value]="user._id">
                        {{ user.username }} ({{ user.role | roleLabel }})
                      </mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              }

              <div class="form-actions">
                <button mat-button type="button" routerLink="/tasks">Cancel</button>
                <button
                  mat-flat-button
                  color="primary"
                  type="submit"
                  [disabled]="form.invalid || submitting()"
                >
                  {{ isEditMode() ? 'Update Task' : 'Create Task' }}
                </button>
              </div>
            </form>
          </mat-card-content>
        }
      </mat-card>
    </div>
  `,
  styles: `
    .form-container {
      max-width: 700px;
      margin: 24px auto;
      padding: 0 24px;
    }

    .form-card {
      padding: 24px;
      border-radius: 12px;
      position: relative;
      overflow: hidden;

      mat-progress-bar {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
      }

      mat-card-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 22px;
      }
    }

    .full-width { width: 100%; }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 16px;
    }
  `,
})
export class TaskForm implements OnInit {
  private fb = inject(FormBuilder);
  private taskService = inject(TaskService);
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);

  isEditMode = signal(false);
  loadingTask = signal(false);
  submitting = signal(false);
  assignableUsers = signal<User[]>([]);
  private taskId = '';

  statuses = Object.values(TaskStatus);

  form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(100)]],
    description: ['', [Validators.maxLength(500)]],
    status: [TaskStatus.PENDING as TaskStatus],
    assignedTo: [''],
  });

  ngOnInit(): void {
    this.taskId = this.route.snapshot.params['id'] || '';

    if (this.taskId) {
      this.isEditMode.set(true);
      this.loadTask();
    }

    if (!this.isEmployee()) {
      this.loadAssignableUsers();
    }
  }

  isEmployee(): boolean {
    return this.authService.hasRole(UserRole.EMPLOYEE);
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.submitting.set(true);

    const formValue = this.form.getRawValue();

    if (this.isEditMode()) {
      this.taskService
        .updateTask(this.taskId, {
          title: formValue.title,
          description: formValue.description,
          status: formValue.status,
        })
        .subscribe({
          next: () => {
            this.snackBar.open('Task updated successfully', 'Close', { duration: 3000 });
            this.router.navigate(['/tasks']);
          },
          error: (err) => {
            this.submitting.set(false);
            this.snackBar.open(err.error?.message || 'Update failed', 'Close', {
              duration: 5000,
            });
          },
        });
    } else {
      const createData: CreateTaskRequest = {
        title: formValue.title,
        description: formValue.description,
        status: formValue.status,
      };

      if (!this.isEmployee() && formValue.assignedTo) {
        createData.assignedTo = formValue.assignedTo;
      }

      this.taskService.createTask(createData).subscribe({
        next: () => {
          this.snackBar.open('Task created successfully', 'Close', { duration: 3000 });
          this.router.navigate(['/tasks']);
        },
        error: (err) => {
          this.submitting.set(false);
          this.snackBar.open(err.error?.message || 'Create failed', 'Close', {
            duration: 5000,
          });
        },
      });
    }
  }

  private loadTask(): void {
    this.loadingTask.set(true);
    this.taskService.getTaskById(this.taskId).subscribe({
      next: (res) => {
        if (res.data) {
          const task: Task = res.data.task;
          this.form.patchValue({
            title: task.title,
            description: task.description,
            status: task.status,
            assignedTo: typeof task.assignedTo === 'string' ? task.assignedTo : task.assignedTo._id,
          });
        }
        this.loadingTask.set(false);
      },
      error: () => {
        this.snackBar.open('Failed to load task', 'Close', { duration: 5000 });
        this.router.navigate(['/tasks']);
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
}
