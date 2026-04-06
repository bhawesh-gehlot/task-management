import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { TaskService } from '../../../core/services/task.service';
import { UserService } from '../../../core/services/user.service';
import { TaskStats, TeamLeadWithMembers } from '../../../core/models';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';

@Component({
  selector: 'app-manager-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatListModule,
    MatExpansionModule,
    MatChipsModule,
    MatBadgeModule,
    LoadingSpinner,
  ],
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
                <span class="stat-label">Total Tasks</span>
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
            <mat-icon>list</mat-icon> View All Tasks
          </button>
          <button mat-stroked-button routerLink="/users">
            <mat-icon>people</mat-icon> Manage Users
          </button>
        </div>

        <mat-card class="team-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>groups</mat-icon> My Team Leads
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @if (teamLeads().length === 0) {
              <p class="empty-state">No team leads assigned yet. Go to Users to assign team leads.</p>
            } @else {
              <mat-accordion>
                @for (lead of teamLeads(); track lead._id) {
                  <mat-expansion-panel>
                    <mat-expansion-panel-header>
                      <mat-panel-title>
                        <mat-icon>person</mat-icon>
                        {{ lead.username }}
                      </mat-panel-title>
                      <mat-panel-description>
                        {{ lead.email }} &mdash; {{ lead.teamMembers.length || 0 }} members
                      </mat-panel-description>
                    </mat-expansion-panel-header>

                    @if (lead.teamMembers.length) {
                      <mat-list>
                        @for (member of lead.teamMembers; track member._id) {
                          <mat-list-item>
                            <mat-icon matListItemIcon>person_outline</mat-icon>
                            <span matListItemTitle>{{ member.username }}</span>
                            <span matListItemLine>{{ member.email }}</span>
                          </mat-list-item>
                        }
                      </mat-list>
                    } @else {
                      <p class="empty-state">No employees assigned to this team lead.</p>
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

    .team-card {
      mat-card-title {
        display: flex;
        align-items: center;
        gap: 8px;
      }
    }

    .empty-state {
      text-align: center;
      color: #9ca3af;
      padding: 24px;
      font-style: italic;
    }
  `,
})
export class ManagerDashboard implements OnInit {
  private taskService = inject(TaskService);
  private userService = inject(UserService);

  loading = signal(true);
  stats = signal<TaskStats | null>(null);
  teamLeads = signal<TeamLeadWithMembers[]>([]);

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.taskService.getTaskStats().subscribe({
      next: (res) => {
        if (res.data) this.stats.set(res.data.stats);
      },
    });

    this.userService.getTeamMembers().subscribe({
      next: (res) => {
        if (res.data) this.teamLeads.set(res.data.members as TeamLeadWithMembers[]);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
