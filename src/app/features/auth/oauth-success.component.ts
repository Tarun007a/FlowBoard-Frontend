import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { take } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-oauth-success',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './oauth-success.component.html',
  styleUrl: './oauth-success.component.css'
})
export class OAuthSuccessComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotificationService);

  statusMessage = 'Signing you in...';
  isFailure = false;

  private redirectTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.route.queryParamMap.pipe(take(1)).subscribe((params) => {
      const token = params.get('token')?.trim() ?? '';

      if (!token) {
        this.handleFailure();
        return;
      }

      this.auth.handleOAuthToken(token).pipe(take(1)).subscribe({
        next: (handled) => {
          if (!handled) {
            this.handleFailure();
            return;
          }

          this.router.navigate([this.auth.resolvePostLoginRoute()], { replaceUrl: true });
        },
        error: () => this.handleFailure()
      });
    });
  }

  ngOnDestroy(): void {
    if (this.redirectTimer) {
      clearTimeout(this.redirectTimer);
    }
  }

  private handleFailure(): void {
    this.isFailure = true;
    this.statusMessage = 'Google login failed. Redirecting to login...';
    this.notify.error('Google login failed');

    this.redirectTimer = setTimeout(() => {
      this.router.navigate(['/login'], { replaceUrl: true });
    }, 1400);
  }
}
