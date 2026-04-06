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
import { forkJoin } from 'rxjs';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { User, UserRole } from '../../../core/models';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner.component';

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
  templateUrl: './team-assignment.component.html',
  styleUrl: './team-assignment.component.scss',
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
        delete this.selectedManager[user._id];
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

  loadData(): void {
    this.loading.set(true);

    forkJoin({
      unassignedTL: this.userService.getUnassignedUsers(UserRole.TEAM_LEAD),
      unassignedEmp: this.userService.getUnassignedUsers(UserRole.EMPLOYEE),
      team: this.userService.getTeamMembers(),
    }).subscribe({
      next: ({ unassignedTL, unassignedEmp, team }) => {
        if (unassignedTL.data) this.unassignedTeamLeads.set(unassignedTL.data.users);
        if (unassignedEmp.data) this.unassignedEmployees.set(unassignedEmp.data.users);

        if (team.data) {
          const members = team.data.members;
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
