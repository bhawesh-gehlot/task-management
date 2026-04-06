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
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { TeamAssignment } from '../team-assignment/team-assignment.component';
import {
  ConfirmDialog,
  ConfirmDialogData,
} from '../../../shared/components/confirm-dialog/confirm-dialog.component';

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
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.scss',
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
