import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../core/models';
import { AdminDashboard } from './admin-dashboard/admin-dashboard.component';
import { ManagerDashboard } from './manager-dashboard/manager-dashboard.component';
import { TeamleadDashboard } from './teamlead-dashboard/teamlead-dashboard.component';
import { EmployeeDashboard } from './employee-dashboard/employee-dashboard.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [AdminDashboard, ManagerDashboard, TeamleadDashboard, EmployeeDashboard],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class Dashboard {
  protected readonly UserRole = UserRole;
  authService = inject(AuthService);
}
