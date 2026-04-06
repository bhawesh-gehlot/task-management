import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/auth.service';
import { UserRole } from '../../../core/models';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');
  if (password && confirmPassword && password.value !== confirmPassword.value) {
    confirmPassword.setErrors({ passwordMismatch: true });
    return { passwordMismatch: true };
  }
  return null;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatProgressBarModule,
  ],
  template: `
    <div class="auth-container">
      <mat-card class="auth-card">
        @if (loading()) {
          <mat-progress-bar mode="indeterminate"></mat-progress-bar>
        }
        <mat-card-header>
          <div class="auth-header">
            <mat-icon class="auth-icon">task_alt</mat-icon>
            <mat-card-title>Create Account</mat-card-title>
            <mat-card-subtitle>Join TaskFlow to manage your team</mat-card-subtitle>
          </div>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Username</mat-label>
              <input matInput formControlName="username" placeholder="johndoe" />
              <mat-icon matSuffix>person</mat-icon>
              @if (form.controls.username.hasError('required') && form.controls.username.touched) {
                <mat-error>Username is required</mat-error>
              }
              @if (form.controls.username.hasError('minlength')) {
                <mat-error>Minimum 3 characters</mat-error>
              }
              @if (form.controls.username.hasError('pattern')) {
                <mat-error>Only letters, numbers, and underscores</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Email</mat-label>
              <input matInput formControlName="email" type="email" placeholder="you@example.com" />
              <mat-icon matSuffix>email</mat-icon>
              @if (form.controls.email.hasError('required') && form.controls.email.touched) {
                <mat-error>Email is required</mat-error>
              }
              @if (form.controls.email.hasError('email')) {
                <mat-error>Enter a valid email</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Role</mat-label>
              <mat-select formControlName="role">
                @for (role of roles; track role.value) {
                  <mat-option [value]="role.value">{{ role.label }}</mat-option>
                }
              </mat-select>
              @if (form.controls.role.hasError('required') && form.controls.role.touched) {
                <mat-error>Role is required</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Password</mat-label>
              <input
                matInput
                formControlName="password"
                [type]="hidePassword() ? 'password' : 'text'"
              />
              <button
                mat-icon-button
                matSuffix
                type="button"
                (click)="hidePassword.set(!hidePassword())"
              >
                <mat-icon>{{ hidePassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              @if (form.controls.password.hasError('required') && form.controls.password.touched) {
                <mat-error>Password is required</mat-error>
              }
              @if (form.controls.password.hasError('minlength')) {
                <mat-error>Minimum 6 characters</mat-error>
              }
              @if (form.controls.password.hasError('pattern')) {
                <mat-error>Must include uppercase, lowercase, and number</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Confirm Password</mat-label>
              <input
                matInput
                formControlName="confirmPassword"
                [type]="hidePassword() ? 'password' : 'text'"
              />
              @if (form.controls.confirmPassword.hasError('passwordMismatch')) {
                <mat-error>Passwords do not match</mat-error>
              }
            </mat-form-field>

            <button
              mat-flat-button
              color="primary"
              type="submit"
              class="full-width submit-btn"
              [disabled]="form.invalid || loading()"
            >
              Create Account
            </button>
          </form>
        </mat-card-content>

        <mat-card-actions align="end">
          <span>Already have an account?</span>
          <a mat-button color="primary" routerLink="/login">Sign In</a>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: `
    .auth-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 16px;
    }

    .auth-card {
      width: 100%;
      max-width: 420px;
      padding: 24px;
      border-radius: 16px;
      position: relative;
      overflow: hidden;

      mat-progress-bar {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
      }
    }

    .auth-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
      margin-bottom: 24px;

      .auth-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: #667eea;
        margin-bottom: 8px;
      }

      mat-card-title {
        font-size: 24px;
        font-weight: 600;
      }
    }

    .full-width {
      width: 100%;
    }

    .submit-btn {
      margin-top: 8px;
      height: 48px;
      font-size: 16px;
    }

    mat-card-actions {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding-top: 8px;
    }
  `,
})
export class Register {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  loading = signal(false);
  hidePassword = signal(true);

  roles = [
    { value: UserRole.ADMIN, label: 'Admin' },
    { value: UserRole.MANAGER, label: 'Manager' },
    { value: UserRole.TEAM_LEAD, label: 'Team Lead' },
    { value: UserRole.EMPLOYEE, label: 'Employee' },
  ];

  form = this.fb.nonNullable.group(
    {
      username: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(30),
          Validators.pattern(/^[a-zA-Z0-9_]+$/),
        ],
      ],
      email: ['', [Validators.required, Validators.email]],
      role: ['' as UserRole | '', [Validators.required]],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(6),
          Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
        ],
      ],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordMatchValidator },
  );

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);

    const { confirmPassword: _, ...data } = this.form.getRawValue();
    void _;

    this.authService.register(data as Parameters<typeof this.authService.register>[0]).subscribe({
      next: () => {
        this.snackBar.open('Registration successful!', 'Close', { duration: 3000 });
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        this.snackBar.open(err.message || 'Registration failed', 'Close', {
          duration: 5000,
        });
      },
    });
  }
}
