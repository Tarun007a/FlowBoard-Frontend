import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { WorkspaceService } from '../../core/services/workspace.service';
import { readHttpErrorMessage } from '../../core/utils/error.utils';
import { isAdminRole } from '../../core/utils/admin.utils';

// The two possible tabs on this page
type AuthTab = 'login' | 'signup';

@Component({
  selector: 'app-auth-shell',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './auth-shell.component.html',
  styleUrl: './auth-shell.component.css'
})
export class AuthShellComponent implements OnInit {
  // URL for Google OAuth login
  private readonly googleOAuthUrl = 'http://flow-board.duckdns.org:8080/oauth2/authorization/google';

  // Injected services (Angular's modern way to get services without a constructor)
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly workspaceService = inject(WorkspaceService);

  // State variables
  loading = false;
  activeTab: AuthTab = 'login';
  loginError = '';
  loginMessage = '';
  signupError = '';
  signupMessage = '';

  // Login form with email and password fields
  loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  // Signup form with name, email, and password
  signupForm = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  // When the page loads, set the active tab based on the URL path (/login or /signup)
  ngOnInit(): void {
    const segment = this.route.routeConfig?.path ?? '';
    this.activeTab = segment === 'signup' ? 'signup' : 'login';
  }

  // Switch between login and signup tabs
  switchTab(tab: AuthTab): void {
    this.activeTab = tab;
    // Clear all messages when switching
    this.loginError = '';
    this.loginMessage = '';
    this.signupError = '';
    this.signupMessage = '';
    this.router.navigate([`/${tab}`]);
  }

  // Redirect the browser to Google login page
  continueWithGoogle(): void {
    window.location.href = this.googleOAuthUrl;
  }

  // Handle login form submission
  login(): void {
    if (this.loading) return;

    this.loginError = '';
    this.loginMessage = '';

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.loginError = 'Please enter a valid email and password.';
      return;
    }

    this.loading = true;

    // finalize() runs whether the request succeeds or fails (like a finally block)
    this.auth.login(this.loginForm.getRawValue())
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          const role = this.auth.currentRole();
          if (!isAdminRole(role)) {
            // Pre-load workspaces in the background after normal user login.
            this.workspaceService.getMyWorkspaces(0, 100).subscribe({ error: () => {} });
          }

          this.router.navigate([this.auth.resolvePostLoginRoute()]);
        },
        error: (err) => {
          const status = Number((err as { status?: unknown })?.status ?? 0);
          const message = status === 401
            ? 'Invalid credentials'
            : status === 403
              ? 'Unauthorized'
              : readHttpErrorMessage(err, 'Login failed. Please try again.');
          this.loginError = message;
        }
      });
  }

  // Handle signup form submission
  signup(): void {
    if (this.loading) return;

    this.signupError = '';
    this.signupMessage = '';

    if (this.signupForm.invalid) {
      this.signupForm.markAllAsTouched();
      this.signupError = 'Please complete all required fields correctly.';
      return;
    }

    this.loading = true;

    this.auth.signup(this.signupForm.getRawValue())
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.activeTab = 'login';
          this.router.navigate(['/login']);
        },
        error: (err) => {
          const message = readHttpErrorMessage(err, 'Signup failed. Please try again.');
          this.signupError = message;
        }
      });
  }
}
