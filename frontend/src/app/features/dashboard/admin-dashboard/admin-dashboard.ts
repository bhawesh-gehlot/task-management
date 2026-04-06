import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';
import { TaskService } from '../../../core/services/task.service';
import { UserService } from '../../../core/services/user.service';
import { TaskStats, UserStats, ManagerWithTeams } from '../../../core/models';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatListModule,
    MatExpansionModule,
    MatChipsModule,
    LoadingSpinner,
  ],
  template: `
    @if (loading()) {
      <app-loading-spinner />
    } @else {
      <div class="dashboard-grid">
        <h2 class="section-title">User Overview</h2>
        <div class="stats-row">
          <mat-card class="stat-card">
            <mat-card-content>
              <mat-icon class="stat-icon users">people</mat-icon>
              <div class="stat-info">
                <span class="stat-value">{{ userStats()?.total ?? 0 }}</span>
                <span class="stat-label">Total Users</span>
              </div>
            </mat-card-content>
          </mat-card>
          <mat-card class="stat-card">
            <mat-card-content>
              <mat-icon class="stat-icon managers">admin_panel_settings</mat-icon>
              <div class="stat-info">
                <span class="stat-value">{{ userStats()?.manager ?? 0 }}</span>
                <span class="stat-label">Managers</span>
              </div>
            </mat-card-content>
          </mat-card>
          <mat-card class="stat-card">
            <mat-card-content>
              <mat-icon class="stat-icon leads">supervisor_account</mat-icon>
              <div class="stat-info">
                <span class="stat-value">{{ userStats()?.team_lead ?? 0 }}</span>
                <span class="stat-label">Team Leads</span>
              </div>
            </mat-card-content>
          </mat-card>
          <mat-card class="stat-card">
            <mat-card-content>
              <mat-icon class="stat-icon employees">badge</mat-icon>
              <div class="stat-info">
                <span class="stat-value">{{ userStats()?.employee ?? 0 }}</span>
                <span class="stat-label">Employees</span>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <h2 class="section-title">Task Overview</h2>
        <div class="stats-row">
          <mat-card class="stat-card">
            <mat-card-content>
              <mat-icon class="stat-icon total">assignment</mat-icon>
              <div class="stat-info">
                <span class="stat-value">{{ taskStats()?.total ?? 0 }}</span>
                <span class="stat-label">Total Tasks</span>
              </div>
            </mat-card-content>
          </mat-card>
          <mat-card class="stat-card">
            <mat-card-content>
              <mat-icon class="stat-icon pending">hourglass_empty</mat-icon>
              <div class="stat-info">
                <span class="stat-value">{{ taskStats()?.pending ?? 0 }}</span>
                <span class="stat-label">Pending</span>
              </div>
            </mat-card-content>
          </mat-card>
          <mat-card class="stat-card">
            <mat-card-content>
              <mat-icon class="stat-icon progress">autorenew</mat-icon>
              <div class="stat-info">
                <span class="stat-value">{{ taskStats()?.in_progress ?? 0 }}</span>
                <span class="stat-label">In Progress</span>
              </div>
            </mat-card-content>
          </mat-card>
          <mat-card class="stat-card">
            <mat-card-content>
              <mat-icon class="stat-icon completed">check_circle</mat-icon>
              <div class="stat-info">
                <span class="stat-value">{{ taskStats()?.completed ?? 0 }}</span>
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
            <mat-icon>list</mat-icon> All Tasks
          </button>
          <button mat-stroked-button routerLink="/users">
            <mat-icon>people</mat-icon> Manage Users
          </button>
        </div>

        <mat-card class="hierarchy-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>account_tree</mat-icon> Organization Hierarchy
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @if (managers().length === 0) {
              <p class="empty-state">No managers in the system yet.</p>
            } @else {
              <mat-accordion multi>
                @for (mgr of managers(); track mgr._id) {
                  <mat-expansion-panel>
                    <mat-expansion-panel-header>
                      <mat-panel-title>
                        <mat-icon>admin_panel_settings</mat-icon>
                        {{ mgr.username }}
                      </mat-panel-title>
                      <mat-panel-description>
                        Manager &mdash; {{ mgr.teamMembers.length || 0 }} team leads
                      </mat-panel-description>
                    </mat-expansion-panel-header>

                    @if (mgr.teamMembers.length) {
                      <mat-accordion>
                        @for (lead of mgr.teamMembers; track lead._id) {
                          <mat-expansion-panel>
                            <mat-expansion-panel-header>
                              <mat-panel-title>
                                <mat-icon>supervisor_account</mat-icon>
                                {{ lead.username }}
                              </mat-panel-title>
                              <mat-panel-description>
                                Team Lead &mdash; {{ lead.teamMembers.length || 0 }} employees
                              </mat-panel-description>
                            </mat-expansion-panel-header>

                            @if (lead.teamMembers.length) {
                              <mat-list>
                                @for (emp of lead.teamMembers; track emp._id) {
                                  <mat-list-item>
                                    <mat-icon matListItemIcon>person</mat-icon>
                                    <span matListItemTitle>{{ emp.username }}</span>
                                    <span matListItemLine>{{ emp.email }}</span>
                                  </mat-list-item>
                                }
                              </mat-list>
                            } @else {
                              <p class="empty-state">No employees.</p>
                            }
                          </mat-expansion-panel>
                        }
                      </mat-accordion>
                    } @else {
                      <p class="empty-state">No team leads assigned.</p>
                    }
                  </mat-expansion-panel>
                }
              </mat-accordion>
            }
          </mat-card-content>
        </mat-card>
      </div>
    }
  `,
  styles: `
    .dashboard-grid {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .section-title {
      font-size: 18px;
      font-weight: 600;
      margin: 0;
      color: #374151;
    }

    .stats-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }

    .stat-card mat-card-content {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 24px !important;
    }

    .stat-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;

      &.users { color: #8b5cf6; }
      &.managers { color: #ec4899; }
      &.leads { color: #f97316; }
      &.employees { color: #06b6d4; }
      &.total { color: #667eea; }
      &.pending { color: #f59e0b; }
      &.progress { color: #3b82f6; }
      &.completed { color: #10b981; }
    }

    .stat-info {
      display: flex;
      flex-direction: column;
    }

    .stat-value {
      font-size: 28px;
      font-weight: 700;
      line-height: 1;
    }

    .stat-label {
      font-size: 14px;
      color: #6b7280;
      margin-top: 4px;
    }

    .actions-row {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .hierarchy-card {
      mat-card-title {
        display: flex;
        align-items: center;
        gap: 8px;
      }
    }

    .empty-state {
      text-align: center;
      color: #9ca3af;
      padding: 16px;
      font-style: italic;
    }
  `,
})
export class AdminDashboard implements OnInit {
  private taskService = inject(TaskService);
  private userService = inject(UserService);

  loading = signal(true);
  taskStats = signal<TaskStats | null>(null);
  userStats = signal<UserStats | null>(null);
  managers = signal<ManagerWithTeams[]>([]);

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.taskService.getTaskStats().subscribe({
      next: (res) => {
        if (res.data) this.taskStats.set(res.data.stats);
      },
    });

    this.userService.getUserStats().subscribe({
      next: (res) => {
        if (res.data) this.userStats.set(res.data.stats);
      },
    });

    this.userService.getTeamMembers().subscribe({
      next: (res) => {
        if (res.data) this.managers.set(res.data.members as ManagerWithTeams[]);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
