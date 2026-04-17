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
            <button class="button accent" type="submit" [disabled]="loading || form.invalid">
              {{ loading ? 'Signing in...' : 'Login' }}
            </button>
            <a class="button secondary" routerLink="/signup">Create account</a>
            <a class="button secondary" routerLink="/reset-password">Forgot password</a>
          </div>
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

  submit(): void {
    this.error = '';
    this.success = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
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