import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { WorkspaceService } from '../../core/services/workspace.service';
import { readHttpErrorMessage } from '../../core/utils/error.utils';

type AuthTab = 'login' | 'signup';

@Component({
  selector: 'app-auth-shell',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="auth-glow auth-glow-left"></div>
      <div class="auth-glow auth-glow-right"></div>

      <section class="panel auth-card">
        <div class="auth-header">
          <div>
            <div class="badge">Flowboard</div>
            <h1>Build boards, lists, and cards</h1>
            <p class="muted">Sign in or create an account to access your workspace flow.</p>
          </div>
          <div class="auth-tabs" role="tablist" aria-label="Authentication tabs">
            <button type="button" class="auth-tab" [class.active]="activeTab === 'login'" (click)="switchTab('login')">Login</button>
            <button type="button" class="auth-tab" [class.active]="activeTab === 'signup'" (click)="switchTab('signup')">Signup</button>
          </div>
        </div>

        <div class="auth-content" [ngSwitch]="activeTab">
          <form *ngSwitchCase="'login'" class="stack auth-panel" [formGroup]="loginForm" (ngSubmit)="login()">
            <div class="field">
              <label for="login-email">Email</label>
              <input id="login-email" type="email" formControlName="email" autocomplete="email" />
            </div>
            <div class="field">
              <label for="login-password">Password</label>
              <input id="login-password" type="password" formControlName="password" autocomplete="current-password" />
            </div>

            <p class="error" *ngIf="loginError">{{ loginError }}</p>
            <p class="success" *ngIf="loginMessage">{{ loginMessage }}</p>

            <div class="actions auth-actions">
              <button class="button accent" type="submit" [disabled]="loading || loginForm.invalid">
                {{ loading ? 'Signing in...' : 'Login' }}
              </button>
              <a class="button secondary" routerLink="/reset-password">Forgot Password?</a>
            </div>
          </form>

          <form *ngSwitchCase="'signup'" class="stack auth-panel" [formGroup]="signupForm" (ngSubmit)="signup()">
            <div class="field">
              <label for="signup-fullName">Full name</label>
              <input id="signup-fullName" type="text" formControlName="fullName" autocomplete="name" />
            </div>
            <div class="field">
              <label for="signup-email">Email</label>
              <input id="signup-email" type="email" formControlName="email" autocomplete="email" />
            </div>
            <div class="field">
              <label for="signup-password">Password</label>
              <input id="signup-password" type="password" formControlName="password" autocomplete="new-password" />
            </div>

            <p class="error" *ngIf="signupError">{{ signupError }}</p>
            <p class="success" *ngIf="signupMessage">{{ signupMessage }}</p>

            <div class="actions auth-actions">
              <button class="button accent" type="submit" [disabled]="loading || signupForm.invalid">
                {{ loading ? 'Creating...' : 'Create account' }}
              </button>
              <button class="button secondary" type="button" (click)="switchTab('login')">Back to login</button>
            </div>
          </form>
        </div>
      </section>
    </div>
  `,
  styles: [
    `
      .auth-page {
        min-height: 100dvh;
        display: grid;
        place-items: center;
        padding: 20px;
        position: relative;
        overflow: hidden;
      }

      .auth-card {
        width: min(520px, 100%);
        padding: 20px;
        position: relative;
        z-index: 1;
      }

      .auth-header {
        display: grid;
        gap: 12px;
        margin-bottom: 14px;
      }

      .auth-header h1 {
        margin: 8px 0 4px;
        font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
        font-size: 1.4rem;
      }

      .auth-tabs {
        display: flex;
        padding: 4px;
        border-radius: 8px;
        border: 1px solid #dfe1e6;
        background: #f1f2f4;
        gap: 4px;
        width: fit-content;
      }

      .auth-tab {
        border: 0;
        padding: 0.5rem 0.85rem;
        border-radius: 6px;
        background: transparent;
        color: #44546f;
        cursor: pointer;
        font-weight: 600;
      }

      .auth-tab.active {
        background: #0c66e4;
        color: #ffffff;
        font-weight: 700;
      }

      .auth-content {
        display: grid;
        place-items: center;
      }

      .auth-panel {
        width: 100%;
        padding: 16px;
        border-radius: 10px;
        border: 1px solid #dfe1e6;
        background: #f7f8f9;
        animation: fadeSlide 180ms ease;
      }

      @keyframes fadeSlide {
        from {
          opacity: 0;
          transform: translateY(8px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .auth-actions {
        margin-top: 4px;
      }

      .auth-glow {
        position: absolute;
        width: 320px;
        height: 320px;
        border-radius: 999px;
        filter: blur(18px);
        opacity: 0.22;
        pointer-events: none;
      }

      .auth-glow-left {
        background: rgba(0, 121, 191, 0.35);
        top: -80px;
        left: -90px;
      }

      .auth-glow-right {
        background: rgba(255, 255, 255, 0.35);
        bottom: -80px;
        right: -90px;
      }

      @media (max-width: 860px) {
        .auth-card {
          padding: 18px;
        }
      }
    `
  ]
})
export class AuthShellComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly notify = inject(NotificationService);
  private readonly workspaceService = inject(WorkspaceService);

  loading = false;
  activeTab: AuthTab = 'login';
  loginError = '';
  loginMessage = '';
  signupError = '';
  signupMessage = '';

  loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  signupForm = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  ngOnInit(): void {
    const segment = this.route.routeConfig?.path ?? '';
    this.activeTab = segment === 'signup' ? 'signup' : 'login';
  }

  switchTab(tab: AuthTab): void {
    this.activeTab = tab;
    this.loginError = '';
    this.loginMessage = '';
    this.signupError = '';
    this.signupMessage = '';
    this.router.navigate([`/${tab}`]);
  }

  login(): void {
    if (this.loading) {
      return;
    }

    this.loginError = '';
    this.loginMessage = '';

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.loginError = 'Please enter a valid email and password.';
      return;
    }

    this.loading = true;
    this.auth.login(this.loginForm.getRawValue()).pipe(finalize(() => (this.loading = false))).subscribe({
      next: () => {
        this.loginMessage = 'Welcome back!';
        this.notify.success('Welcome back!');
        this.workspaceService.getMyWorkspaces(0, 100).subscribe({
          error: () => {
            // Keep login flow uninterrupted if prefetch fails.
          }
        });
        this.router.navigate(['/workspaces']);
      },
      error: (err) => {
        const status = Number((err as { status?: unknown })?.status ?? 0);
        const message = status === 401
          ? 'Invalid email or password'
          : readHttpErrorMessage(err, 'Login failed. Please try again.');
        this.loginError = message;
        this.notify.error(message);
      }
    });
  }

  signup(): void {
    if (this.loading) {
      return;
    }

    this.signupError = '';
    this.signupMessage = '';

    if (this.signupForm.invalid) {
      this.signupForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.auth.signup(this.signupForm.getRawValue()).pipe(finalize(() => (this.loading = false))).subscribe({
      next: () => {
        this.signupMessage = 'Account created successfully';
        this.notify.success('Account created successfully');
        this.activeTab = 'login';
        this.router.navigate(['/login']);
      },
      error: (err) => {
        const message = readHttpErrorMessage(err, 'Signup failed. Please try again.');
        this.signupError = message;
        this.notify.error(message);
      }
    });
  }
}