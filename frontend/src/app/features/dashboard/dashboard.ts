import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../core/models';
import { AdminDashboard } from './admin-dashboard/admin-dashboard';
import { ManagerDashboard } from './manager-dashboard/manager-dashboard';
import { TeamleadDashboard } from './teamlead-dashboard/teamlead-dashboard';
import { EmployeeDashboard } from './employee-dashboard/employee-dashboard';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [AdminDashboard, ManagerDashboard, TeamleadDashboard, EmployeeDashboard],
  template: `
    <div class="dashboard-container">
      <h1 class="page-title">
        Welcome back, {{ authService.currentUser()?.username }}!
      </h1>

      @switch (authService.userRole()) {
        @case (UserRole.ADMIN) {
          <app-admin-dashboard />
        }
        @case (UserRole.MANAGER) {
          <app-manager-dashboard />
        }
        @case (UserRole.TEAM_LEAD) {
          <app-teamlead-dashboard />
        }
        @case (UserRole.EMPLOYEE) {
          <app-employee-dashboard />
        }
      }
    </div>
  `,
  styles: `
    .dashboard-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px;
    }

    .page-title {
      font-size: 28px;
      font-weight: 600;
      margin-bottom: 24px;
      color: #1f2937;
    }
  `,
})
export class Dashboard {
  protected readonly UserRole = UserRole;
  authService = inject(AuthService);
}
