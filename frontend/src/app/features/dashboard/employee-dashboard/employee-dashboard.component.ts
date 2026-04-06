import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { TaskService } from '../../../core/services/task.service';
import { TaskStats } from '../../../core/models';
import { LoadingSpinner } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-employee-dashboard',
  standalone: true,
  imports: [RouterLink, MatCardModule, MatIconModule, MatButtonModule, LoadingSpinner],
  templateUrl: './employee-dashboard.component.html',
  styleUrl: './employee-dashboard.component.scss',
})
export class EmployeeDashboard implements OnInit {
  private taskService = inject(TaskService);
  loading = signal(true);
  stats = signal<TaskStats | null>(null);

  ngOnInit(): void {
    this.taskService.getTaskStats().subscribe({
      next: (res) => {
        if (res.data) this.stats.set(res.data.stats);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
