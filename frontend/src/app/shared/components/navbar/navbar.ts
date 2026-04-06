import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../../core/services/auth.service';
import { UserRole } from '../../../core/models';
import { RoleLabelPipe } from '../../pipes/role-label.pipe';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatChipsModule,
    MatDividerModule,
    RoleLabelPipe,
  ],
  template: `
    <mat-toolbar color="primary" class="navbar">
      <div class="navbar-brand">
        <mat-icon>task_alt</mat-icon>
        <span class="app-title" routerLink="/dashboard">TaskFlow</span>
      </div>

      <nav class="navbar-links">
        <a
          mat-button
          routerLink="/dashboard"
          routerLinkActive="active-link"
        >
          <mat-icon>dashboard</mat-icon>
          <span>Dashboard</span>
        </a>
        <a
          mat-button
          routerLink="/tasks"
          routerLinkActive="active-link"
        >
          <mat-icon>assignment</mat-icon>
          <span>Tasks</span>
        </a>
        @if (authService.hasRole(UserRole.ADMIN, UserRole.MANAGER)) {
          <a
            mat-button
            routerLink="/users"
            routerLinkActive="active-link"
          >
            <mat-icon>people</mat-icon>
            <span>Users</span>
          </a>
        }
      </nav>

      <div class="navbar-actions">
        <mat-chip-set>
          <mat-chip highlighted>
            {{ (currentUser()?.role ?? '') | roleLabel }}
          </mat-chip>
        </mat-chip-set>

        <button mat-icon-button [matMenuTriggerFor]="userMenu">
          <mat-icon>account_circle</mat-icon>
        </button>
        <mat-menu #userMenu="matMenu">
          <div class="user-menu-header" mat-menu-item disabled>
            <strong>{{ currentUser()?.username }}</strong>
            <br />
            <small>{{ currentUser()?.email }}</small>
          </div>
          <mat-divider></mat-divider>
          <button mat-menu-item (click)="logout()">
            <mat-icon>logout</mat-icon>
            <span>Logout</span>
          </button>
        </mat-menu>
      </div>
    </mat-toolbar>
  `,
  styles: `
    .navbar {
      display: flex;
      align-items: center;
      gap: 16px;
      position: sticky;
      top: 0;
      z-index: 1000;
    }

    .navbar-brand {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;

      .app-title {
        font-size: 20px;
        font-weight: 600;
        text-decoration: none;
        color: inherit;
      }
    }

    .navbar-links {
      display: flex;
      gap: 4px;
      margin-left: 24px;

      a {
        display: flex;
        align-items: center;
        gap: 4px;

        &.active-link {
          background: rgba(255, 255, 255, 0.15);
        }
      }
    }

    .navbar-actions {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .user-menu-header {
      line-height: 1.4;
      white-space: normal;
    }

    @media (max-width: 768px) {
      .navbar-links span {
        display: none;
      }
    }
  `,
})
export class Navbar {
  protected readonly UserRole = UserRole;
  authService = inject(AuthService);
  currentUser = this.authService.currentUser;

  logout(): void {
    this.authService.logout();
  }
}
