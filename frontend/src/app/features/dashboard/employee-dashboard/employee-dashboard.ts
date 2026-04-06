import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { TaskService } from '../../../core/services/task.service';
import { TaskStats } from '../../../core/models';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';

@Component({
  selector: 'app-employee-dashboard',
  standalone: true,
  imports: [RouterLink, MatCardModule, MatIconModule, MatButtonModule, LoadingSpinner],
  template: `
    @if (loading()) {
      <app-loading-spinner />
    } @else {
      <div class="dashboard-grid">
        <div class="stats-row">
          <mat-card class="stat-card">
            <mat-card-content>
              <mat-icon class="stat-icon total">assignment</mat-icon>
              <div class="stat-info">
                <span class="stat-value">{{ stats()?.total ?? 0 }}</span>
                <span class="stat-label">My Tasks</span>
              </div>
            </mat-card-content>
          </mat-card>
          <mat-card class="stat-card">
            <mat-card-content>
              <mat-icon class="stat-icon pending">hourglass_empty</mat-icon>
              <div class="stat-info">
                <span class="stat-value">{{ stats()?.pending ?? 0 }}</span>
                <span class="stat-label">Pending</span>
              </div>
            </mat-card-content>
          </mat-card>
          <mat-card class="stat-card">
            <mat-card-content>
              <mat-icon class="stat-icon progress">autorenew</mat-icon>
              <div class="stat-info">
                <span class="stat-value">{{ stats()?.in_progress ?? 0 }}</span>
                <span class="stat-label">In Progress</span>
              </div>
            </mat-card-content>
          </mat-card>
          <mat-card class="stat-card">
            <mat-card-content>
              <mat-icon class="stat-icon completed">check_circle</mat-icon>
              <div class="stat-info">
                <span class="stat-value">{{ stats()?.completed ?? 0 }}</span>
                <span class="stat-label">Completed</span>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <div class="actions-row">
          <button mat-flat-button color="primary" routerLink="/tasks/new">
            <mat-icon>add</mat-icon> New Task
          </button>
          <button mat-stroked-button routerLink="/tasks">
            <mat-icon>list</mat-icon> View My Tasks
          </button>
        </div>
      </div>
    }
  `,
  styles: `
    .dashboard-grid { display: flex; flex-direction: column; gap: 24px; }
    .stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
    .stat-card mat-card-content { display: flex; align-items: center; gap: 16px; padding: 24px !important; }
    .stat-icon { font-size: 40px; width: 40px; height: 40px; &.total { color: #667eea; } &.pending { color: #f59e0b; } &.progress { color: #3b82f6; } &.completed { color: #10b981; } }
    .stat-info { display: flex; flex-direction: column; }
    .stat-value { font-size: 28px; font-weight: 700; line-height: 1; }
    .stat-label { font-size: 14px; color: #6b7280; margin-top: 4px; }
    .actions-row { display: flex; gap: 12px; flex-wrap: wrap; }
  `,
})
export class EmployeeDashboard implements OnInit {
  private taskService = inject(TaskService);
  loading = signal(true);
  stats = signal<TaskStats | null>(null);

  ngOnInit(): void {
    this.taskService.getTaskStats().subscribe({
      next: (res) => {
        if (res.data) this.stats.set(res.data.stats);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
