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
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner.component';

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
  templateUrl: './task-form.component.html',
  styleUrl: './task-form.component.scss',
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
