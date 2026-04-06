import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { UserRole } from './core/models';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.Login),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/register/register.component').then((m) => m.Register),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then((m) => m.Dashboard),
  },
  {
    path: 'tasks',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/tasks/task-list/task-list.component').then((m) => m.TaskList),
  },
  {
    path: 'tasks/new',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/tasks/task-form/task-form.component').then((m) => m.TaskForm),
  },
  {
    path: 'tasks/:id/edit',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/tasks/task-form/task-form.component').then((m) => m.TaskForm),
  },
  {
    path: 'users',
    canActivate: [authGuard, roleGuard(UserRole.ADMIN, UserRole.MANAGER)],
    loadComponent: () =>
      import('./features/users/user-list/user-list.component').then((m) => m.UserList),
  },
  { path: '**', redirectTo: '/dashboard' },
];
