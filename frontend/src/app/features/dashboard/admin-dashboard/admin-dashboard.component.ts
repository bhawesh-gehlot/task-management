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
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner.component';

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
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
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
