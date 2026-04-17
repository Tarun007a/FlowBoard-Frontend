import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { readErrorMessage } from '../../core/utils/error.utils';

@Component({
  selector: 'app-signup-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="page-frame auth-frame">
      <section class="hero auth-hero">
        <div class="badge">New Account</div>
        <h1>Create your workspace access</h1>
        <p class="muted">Backend signup expects full name, email, and a strong password with uppercase, lowercase, digit, and special character.</p>
      </section>

      <section class="panel auth-panel">
        <form class="stack" [formGroup]="form" (ngSubmit)="submit()">
          <div class="field">
            <label for="fullName">Full name</label>
            <input id="fullName" type="text" formControlName="fullName" />
          </div>
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
              {{ loading ? 'Creating...' : 'Signup' }}
            </button>
            <a class="button secondary" routerLink="/login">Back to login</a>
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
export class SignupComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  loading = false;
  error = '';
  success = '';

  form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]]
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
      .signup(this.form.getRawValue())
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.success = 'Account created. You can now login.';
          this.router.navigate(['/login']);
        },
        error: (err) => (this.error = readErrorMessage(err))
      });
  }
}