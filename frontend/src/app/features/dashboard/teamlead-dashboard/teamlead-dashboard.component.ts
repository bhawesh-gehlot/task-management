import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { TaskService } from '../../../core/services/task.service';
import { UserService } from '../../../core/services/user.service';
import { TaskStats, User } from '../../../core/models';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-teamlead-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatListModule,
    MatChipsModule,
    LoadingSpinner,
  ],
  templateUrl: './teamlead-dashboard.component.html',
  styleUrl: './teamlead-dashboard.component.scss',
})
export class TeamleadDashboard implements OnInit {
  private taskService = inject(TaskService);
  private userService = inject(UserService);

  loading = signal(true);
  stats = signal<TaskStats | null>(null);
  members = signal<User[]>([]);

  ngOnInit(): void {
    this.taskService.getTaskStats().subscribe({
      next: (res) => { if (res.data) this.stats.set(res.data.stats); },
    });

    this.userService.getTeamMembers().subscribe({
      next: (res) => {
        if (res.data) this.members.set(res.data.members as User[]);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
