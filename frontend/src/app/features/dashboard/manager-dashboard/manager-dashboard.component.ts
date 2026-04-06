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
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner.component';

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
  templateUrl: './manager-dashboard.component.html',
  styleUrl: './manager-dashboard.component.scss',
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
