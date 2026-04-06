import { Pipe, PipeTransform } from '@angular/core';
import { TaskStatus } from '../../core/models';

@Pipe({ name: 'statusLabel', standalone: true })
export class StatusLabelPipe implements PipeTransform {
  private readonly labels: Record<string, string> = {
    [TaskStatus.PENDING]: 'Pending',
    [TaskStatus.IN_PROGRESS]: 'In Progress',
    [TaskStatus.COMPLETED]: 'Completed',
  };

  transform(value: string): string {
    return this.labels[value] || value;
  }
}
