import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { readErrorMessage } from '../../core/utils/error.utils';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="page-frame auth-frame">
      <section class="hero auth-hero">
        <div class="badge">Auth Gateway</div>
        <h1>Sign in to Flowboard</h1>
        <p class="muted">Use the same JWT token the backend gateway expects. Public signup and password reset remain available here.</p>
      </section>

      <section class="panel auth-panel">
        <form class="stack" [formGroup]="form" (ngSubmit)="submit()">
          <div class="field">
            <label for="email">Email</label>
            <input id="email" type="email" formControlName="email" />
          </div>
          <div class="field">
            <label for="password">Password</label>
            <input id="password" type="password" formControlName="password" />
          </div>

          <p class="error" *ngIf="error">{{ error }}</p>
          <p class="success" *ngIf="success">{{ success }}</p>

          <div class="actions">
            <button class="button accent" type="submit" [disabled]="loading" [attr.aria-busy]="loading">
              {{ loading ? 'Signing in...' : 'Login' }}
            </button>
            <a class="button secondary" routerLink="/signup">Create account</a>
            <a class="button secondary" routerLink="/reset-password">Forgot password</a>
          </div>

          <button class="google-button" type="button" (click)="continueWithGoogle()" [disabled]="loading">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.2-1.6 3.6-5.5 3.6-3.3 0-6-2.8-6-6.2s2.7-6.2 6-6.2c1.9 0 3.2.8 3.9 1.5l2.6-2.5C16.8 2.6 14.6 1.7 12 1.7 6.9 1.7 2.8 6.2 2.8 11.5S6.9 21.3 12 21.3c6.9 0 9.2-4.9 9.2-7.4 0-.5-.1-.9-.1-1.3H12z" />
              <path fill="#FBBC05" d="M2.8 6.8l3.2 2.4C6.8 7.2 9.2 5.3 12 5.3c1.9 0 3.2.8 3.9 1.5l2.6-2.5C16.8 2.6 14.6 1.7 12 1.7c-3.6 0-6.7 2.1-8.2 5.1z" />
              <path fill="#34A853" d="M12 21.3c2.5 0 4.7-.8 6.3-2.3l-2.9-2.4c-.8.6-1.9 1.1-3.4 1.1-3.8 0-5.3-2.6-5.6-3.8l-3.2 2.5c1.5 3.1 4.6 4.9 8.8 4.9z" />
              <path fill="#4285F4" d="M21.2 13.9c0-.5-.1-.9-.1-1.3H12v3.9h5.5c-.3 1.4-1.3 2.5-2.2 3.1l2.9 2.4c1.7-1.5 2.9-3.8 2.9-6.8z" />
            </svg>
            <span>Continue with Google</span>
          </button>
        </form>
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

      .google-button {
        width: 100%;
        border: 1px solid #cfdbeb;
        border-radius: 10px;
        background: #ffffff;
        color: #1f3f63;
        min-height: 44px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.6rem;
        font-weight: 700;
        cursor: pointer;
        transition: border-color 130ms ease, background-color 130ms ease, box-shadow 130ms ease;
      }

      .google-button svg {
        width: 18px;
        height: 18px;
      }

      .google-button:hover:not(:disabled) {
        border-color: #aec7e3;
        background: #f8fbff;
        box-shadow: 0 6px 18px rgba(53, 112, 183, 0.12);
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
export class LoginComponent {
  private readonly googleOAuthUrl = 'http://localhost:8080/oauth2/authorization/google';
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  loading = false;
  error = '';
  success = '';

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  continueWithGoogle(): void {
    window.location.href = this.googleOAuthUrl;
  }

  submit(): void {
    if (this.loading) {
      return;
    }

    this.error = '';
    this.success = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error = 'Please enter a valid email and password.';
      return;
    }

    this.loading = true;
    this.auth
      .login(this.form.getRawValue())
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => this.router.navigate(['/workspaces']),
        error: (err) => (this.error = readErrorMessage(err))
      });
  }
}