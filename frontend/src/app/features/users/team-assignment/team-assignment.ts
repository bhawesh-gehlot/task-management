import { Component, inject, OnInit, output, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { User, UserRole } from '../../../core/models';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';

@Component({
  selector: 'app-team-assignment',
  standalone: true,
  imports: [
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatDividerModule,
    LoadingSpinner,
  ],
  template: `
    @if (loading()) {
      <app-loading-spinner />
    } @else {
      <div class="assignment-grid">
        <mat-card>
          <mat-card-header>
            <mat-card-title>
              <mat-icon>person_add</mat-icon> Assign Team Leads
            </mat-card-title>
            <mat-card-subtitle>
              {{ isAdmin() ? 'Assign unassigned team leads to a manager' : 'Assign unassigned team leads to yourself' }}
            </mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            @if (unassignedTeamLeads().length === 0) {
              <p class="empty-state">No unassigned team leads available.</p>
            } @else if (isAdmin()) {
              @for (user of unassignedTeamLeads(); track user._id) {
                <div class="assign-row">
                  <div class="user-info">
                    <mat-icon>person</mat-icon>
                    <div>
                      <strong>{{ user.username }}</strong>
                      <br />
                      <small>{{ user.email }}</small>
                    </div>
                  </div>
                  <div class="assign-controls">
                    <mat-form-field appearance="outline" class="team-lead-select">
                      <mat-label>Manager</mat-label>
                      <mat-select [(ngModel)]="selectedManager[user._id]">
                        @for (mgr of allManagers(); track mgr._id) {
                          <mat-option [value]="mgr._id">{{ mgr.username }}</mat-option>
                        }
                      </mat-select>
                    </mat-form-field>
                    <button
                      mat-flat-button
                      color="primary"
                      [disabled]="!selectedManager[user._id]"
                      (click)="assignTeamLead(user, selectedManager[user._id])"
                    >
                      Assign
                    </button>
                  </div>
                </div>
                <mat-divider></mat-divider>
              }
            } @else {
              <mat-list>
                @for (user of unassignedTeamLeads(); track user._id) {
                  <mat-list-item>
                    <mat-icon matListItemIcon>person</mat-icon>
                    <span matListItemTitle>{{ user.username }}</span>
                    <span matListItemLine>{{ user.email }}</span>
                    <button
                      mat-flat-button
                      color="primary"
                      matListItemMeta
                      (click)="assignTeamLead(user)"
                    >
                      Assign to Me
                    </button>
                  </mat-list-item>
                }
              </mat-list>
            }
          </mat-card-content>
        </mat-card>

        <mat-card>
          <mat-card-header>
            <mat-card-title>
              <mat-icon>group_add</mat-icon> Assign Employees
            </mat-card-title>
            <mat-card-subtitle>
              Assign unassigned employees to a team lead
            </mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            @if (unassignedEmployees().length === 0) {
              <p class="empty-state">No unassigned employees available.</p>
            } @else {
              @for (user of unassignedEmployees(); track user._id) {
                <div class="assign-row">
                  <div class="user-info">
                    <mat-icon>person_outline</mat-icon>
                    <div>
                      <strong>{{ user.username }}</strong>
                      <br />
                      <small>{{ user.email }}</small>
                    </div>
                  </div>
                  <div class="assign-controls">
                    <mat-form-field appearance="outline" class="team-lead-select">
                      <mat-label>Team Lead</mat-label>
                      <mat-select [(ngModel)]="selectedTeamLead[user._id]">
                        @for (lead of myTeamLeads(); track lead._id) {
                          <mat-option [value]="lead._id">{{ lead.username }}</mat-option>
                        }
                      </mat-select>
                    </mat-form-field>
                    <button
                      mat-flat-button
                      color="primary"
                      [disabled]="!selectedTeamLead[user._id]"
                      (click)="assignEmployee(user)"
                    >
                      Assign
                    </button>
                  </div>
                </div>
                <mat-divider></mat-divider>
              }
            }
          </mat-card-content>
        </mat-card>
      </div>
    }
  `,
  styles: `
    .assignment-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 24px;
      margin-top: 16px;
    }

    mat-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .empty-state {
      text-align: center;
      color: #9ca3af;
      padding: 24px;
      font-style: italic;
    }

    .assign-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      gap: 12px;
      flex-wrap: wrap;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .assign-controls {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .team-lead-select {
      width: 180px;
    }

    @media (max-width: 500px) {
      .assignment-grid { grid-template-columns: 1fr; }
      .assign-row { flex-direction: column; align-items: flex-start; }
    }
  `,
})
export class TeamAssignment implements OnInit {
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  userAssigned = output<void>();

  loading = signal(true);
  unassignedTeamLeads = signal<User[]>([]);
  unassignedEmployees = signal<User[]>([]);
  myTeamLeads = signal<User[]>([]);
  allManagers = signal<User[]>([]);
  selectedTeamLead: Record<string, string> = {};
  selectedManager: Record<string, string> = {};

  ngOnInit(): void {
    this.loadData();
  }

  isAdmin(): boolean {
    return this.authService.hasRole(UserRole.ADMIN);
  }

  assignTeamLead(user: User, managerId?: string): void {
    const targetId = managerId || this.selectedManager[user._id] || this.authService.currentUser()?._id || this.authService.currentUser()?.id;
    if (!targetId) return;

    this.userService.assignUser(user._id, targetId).subscribe({
      next: (res) => {
        this.snackBar.open(res.message, 'Close', { duration: 3000 });
        this.loadData();
        this.userAssigned.emit();
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Assignment failed', 'Close', {
          duration: 5000,
        });
      },
    });
  }

  assignEmployee(user: User): void {
    const teamLeadId = this.selectedTeamLead[user._id];
    if (!teamLeadId) return;

    this.userService.assignUser(user._id, teamLeadId).subscribe({
      next: (res) => {
        this.snackBar.open(res.message, 'Close', { duration: 3000 });
        delete this.selectedTeamLead[user._id];
        this.loadData();
        this.userAssigned.emit();
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Assignment failed', 'Close', {
          duration: 5000,
        });
      },
    });
  }

  private loadData(): void {
    this.loading.set(true);

    this.userService.getUnassignedUsers(UserRole.TEAM_LEAD).subscribe({
      next: (res) => {
        if (res.data) this.unassignedTeamLeads.set(res.data.users);
      },
    });

    this.userService.getUnassignedUsers(UserRole.EMPLOYEE).subscribe({
      next: (res) => {
        if (res.data) this.unassignedEmployees.set(res.data.users);
      },
    });

    this.userService.getTeamMembers().subscribe({
      next: (res) => {
        if (res.data) {
          const members = res.data.members;
          if (this.isAdmin()) {
            this.allManagers.set(
              members.filter((m: User) => m.role === UserRole.MANAGER) as User[],
            );
            const allTeamLeads: User[] = [];
            for (const m of members) {
              const mgrAny = m as unknown as { teamMembers?: unknown[] };
              if (Array.isArray(mgrAny.teamMembers)) {
                for (const tl of mgrAny.teamMembers) {
                  if ((tl as User).role === UserRole.TEAM_LEAD) {
                    allTeamLeads.push(tl as User);
                  }
                }
              }
            }
            this.myTeamLeads.set(allTeamLeads);
          } else {
            this.myTeamLeads.set(
              members.filter((m: User) => m.role === UserRole.TEAM_LEAD) as User[],
            );
          }
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
