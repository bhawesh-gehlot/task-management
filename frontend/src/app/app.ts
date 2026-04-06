import { Component, inject, OnInit, OnDestroy, effect } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { SocketService } from './core/services/socket.service';
import { Navbar } from './shared/components/navbar/navbar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Navbar],
  template: `
    @if (authService.isAuthenticated()) {
      <app-navbar />
    }
    <main [class.authenticated]="authService.isAuthenticated()">
      <router-outlet />
    </main>
  `,
  styles: `
    main.authenticated {
      min-height: calc(100vh - 64px);
      background: #f5f5f5;
    }
  `,
})
export class App implements OnInit, OnDestroy {
  authService = inject(AuthService);
  private socketService = inject(SocketService);

  constructor() {
    effect(() => {
      if (this.authService.isAuthenticated()) {
        this.socketService.connect();
      } else {
        this.socketService.disconnect();
      }
    });
  }

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.socketService.connect();
    }
  }

  ngOnDestroy(): void {
    this.socketService.disconnect();
  }
}
