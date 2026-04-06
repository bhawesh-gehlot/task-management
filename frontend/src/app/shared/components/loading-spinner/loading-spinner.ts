import { Component, input } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [MatProgressSpinnerModule],
  template: `
    <div class="spinner-container">
      <mat-spinner [diameter]="diameter()"></mat-spinner>
    </div>
  `,
  styles: `
    .spinner-container {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 40px;
    }
  `,
})
export class LoadingSpinner {
  diameter = input(48);
}
