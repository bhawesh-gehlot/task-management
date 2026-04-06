import { Pipe, PipeTransform } from '@angular/core';
import { UserRole } from '../../core/models';

@Pipe({ name: 'roleLabel', standalone: true })
export class RoleLabelPipe implements PipeTransform {
  private readonly labels: Record<string, string> = {
    [UserRole.ADMIN]: 'Admin',
    [UserRole.MANAGER]: 'Manager',
    [UserRole.TEAM_LEAD]: 'Team Lead',
    [UserRole.EMPLOYEE]: 'Employee',
  };

  transform(value: string): string {
    return this.labels[value] || value;
  }
}
