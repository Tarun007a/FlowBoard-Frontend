import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { readErrorMessage } from '../../core/utils/error.utils';

@Component({
  selector: 'app-verify-account-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page-frame auth-frame">
      <section class="hero auth-hero">
        <div class="badge">Account Verification</div>
        <h1>Validating your token</h1>
        <p class="muted">The backend verifies the token from the signup flow and returns a plain text status message.</p>
      </section>

      <section class="panel auth-panel stack">
        <p class="error" *ngIf="error">{{ error }}</p>
        <p class="success" *ngIf="success">{{ success }}</p>
        <p class="muted" *ngIf="loading">Checking token...</p>
        <div class="actions">
          <a class="button accent" routerLink="/login">Go to login</a>
        </div>
      </section>
    </div>
  `,
  styles: [
    `
      .auth-frame {
        display: grid;
        grid-template-columns: minmax(0, 1.2fr) minmax(320px, 460px);
        gap: 18px;
        align-items: center;
        min-height: 100dvh;
        padding-top: 40px;
      }

      .auth-hero,
      .auth-panel {
        padding: 28px;
      }

      @media (max-width: 960px) {
        .auth-frame {
          grid-template-columns: 1fr;
          padding-top: 18px;
        }
      }
    `
  ]
})
export class VerifyAccountComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);

  loading = true;
  error = '';
  success = '';

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token');

    if (!token) {
      this.error = 'Missing verification token';
      this.loading = false;
      return;
    }

    this.auth
      .verify(token)
      .pipe(
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        next: (message) => (this.success = message),
        error: (err) => (this.error = readErrorMessage(err))
      });
  }
}