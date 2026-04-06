import { Component, inject, OnInit, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { User, UserRole } from '../../../core/models';
import { RoleLabelPipe } from '../../../shared/pipes/role-label.pipe';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner';
import { TeamAssignment } from '../team-assignment/team-assignment';
import {
  ConfirmDialog,
  ConfirmDialogData,
} from '../../../shared/components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTabsModule,
    MatMenuModule,
    MatTooltipModule,
    RoleLabelPipe,
    LoadingSpinner,
    TeamAssignment,
  ],
  template: `
    <div class="users-container">
      <h1 class="page-title">User Management</h1>

      <mat-tab-group>
        <mat-tab label="All Users">
          @if (loading()) {
            <app-loading-spinner />
          } @else {
            <mat-card class="users-table-card">
              <table mat-table [dataSource]="users()" class="full-width">
                <ng-container matColumnDef="username">
                  <th mat-header-cell *matHeaderCellDef>Username</th>
                  <td mat-cell *matCellDef="let user">{{ user.username }}</td>
                </ng-container>

                <ng-container matColumnDef="email">
                  <th mat-header-cell *matHeaderCellDef>Email</th>
                  <td mat-cell *matCellDef="let user">{{ user.email }}</td>
                </ng-container>

                <ng-container matColumnDef="role">
                  <th mat-header-cell *matHeaderCellDef>Role</th>
                  <td mat-cell *matCellDef="let user">
                    <mat-chip [class]="'role-chip-' + user.role">
                      {{ user.role | roleLabel }}
                    </mat-chip>
                  </td>
                </ng-container>

                <ng-container matColumnDef="managedBy">
                  <th mat-header-cell *matHeaderCellDef>Reports To</th>
                  <td mat-cell *matCellDef="let user">
                    {{ user.managedBy?.username || 'Unassigned' }}
                  </td>
                </ng-container>

                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef>Actions</th>
                  <td mat-cell *matCellDef="let user">
                    @if (user.managedBy) {
                      <button
                        mat-icon-button
                        (click)="unassignUser(user)"
                        matTooltip="Unassign"
                      >
                        <mat-icon>link_off</mat-icon>
                      </button>
                    }
                    @if (isAdmin()) {
                      <button
                        mat-icon-button
                        matTooltip="Change Role"
                        [matMenuTriggerFor]="roleMenu"
                      >
                        <mat-icon>swap_vert</mat-icon>
                      </button>
                      <mat-menu #roleMenu="matMenu">
                        @for (role of availableRoles; track role.value) {
                          @if (role.value !== user.role) {
                            <button mat-menu-item (click)="changeRole(user, role.value)">
                              {{ role.label }}
                            </button>
                          }
                        }
                      </mat-menu>
                      <button
                        mat-icon-button
                        color="warn"
                        matTooltip="Delete User"
                        (click)="confirmDelete(user)"
                      >
                        <mat-icon>delete</mat-icon>
                      </button>
                    }
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
              </table>
            </mat-card>
          }
        </mat-tab>

        <mat-tab label="Team Assignment">
          <app-team-assignment (userAssigned)="loadUsers()" />
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: `
    .users-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px;
    }

    .page-title {
      font-size: 28px;
      font-weight: 600;
      margin-bottom: 24px;
    }

    .users-table-card {
      margin-top: 16px;
      overflow-x: auto;
    }

    .full-width { width: 100%; }

    .role-chip-admin { --mdc-chip-elevated-container-color: #fce7f3; --mdc-chip-label-text-color: #9d174d; }
    .role-chip-manager { --mdc-chip-elevated-container-color: #e0e7ff; --mdc-chip-label-text-color: #3730a3; }
    .role-chip-team_lead { --mdc-chip-elevated-container-color: #fef3c7; --mdc-chip-label-text-color: #92400e; }
    .role-chip-employee { --mdc-chip-elevated-container-color: #d1fae5; --mdc-chip-label-text-color: #065f46; }
  `,
})
export class UserList implements OnInit {
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  loading = signal(true);
  users = signal<User[]>([]);
  displayedColumns = ['username', 'email', 'role', 'managedBy', 'actions'];

  availableRoles = [
    { value: UserRole.MANAGER, label: 'Manager' },
    { value: UserRole.TEAM_LEAD, label: 'Team Lead' },
    { value: UserRole.EMPLOYEE, label: 'Employee' },
  ];

  ngOnInit(): void {
    this.loadUsers();
  }

  isAdmin(): boolean {
    return this.authService.hasRole(UserRole.ADMIN);
  }

  loadUsers(): void {
    this.loading.set(true);
    this.userService.getAllUsers().subscribe({
      next: (res) => {
        if (res.data) this.users.set(res.data.users);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  unassignUser(user: User): void {
    this.userService.unassignUser(user._id).subscribe({
      next: (res) => {
        this.snackBar.open(res.message, 'Close', { duration: 3000 });
        this.loadUsers();
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Unassign failed', 'Close', {
          duration: 5000,
        });
      },
    });
  }

  changeRole(user: User, newRole: UserRole): void {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Change User Role',
        message: `Change ${user.username}'s role to ${newRole.replace('_', ' ')}? This will remove their current team assignments.`,
        confirmText: 'Change Role',
      } as ConfirmDialogData,
      width: '400px',
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.userService.changeUserRole(user._id, newRole).subscribe({
        next: (res) => {
          this.snackBar.open(res.message, 'Close', { duration: 3000 });
          this.loadUsers();
        },
        error: (err) => {
          this.snackBar.open(err.error?.message || 'Role change failed', 'Close', {
            duration: 5000,
          });
        },
      });
    });
  }

  confirmDelete(user: User): void {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Delete User',
        message: `Permanently delete ${user.username}? Their tasks will also be removed. This cannot be undone.`,
        confirmText: 'Delete',
      } as ConfirmDialogData,
      width: '400px',
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.userService.deleteUser(user._id).subscribe({
        next: (res) => {
          this.snackBar.open(res.message, 'Close', { duration: 3000 });
          this.loadUsers();
        },
        error: (err) => {
          this.snackBar.open(err.error?.message || 'Delete failed', 'Close', {
            duration: 5000,
          });
        },
      });
    });
  }
}
