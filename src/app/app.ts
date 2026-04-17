import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NotificationOutletComponent } from './layout/notification-outlet.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NotificationOutletComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
}
