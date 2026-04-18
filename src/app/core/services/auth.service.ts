import { Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { ApiService } from './api.service';
import { AuthStoreService } from './auth-store.service';
import { CurrentUserProfileService } from './current-user-profile.service';
import {
  ForgetPasswordRequest,
  LoginRequest,
  SignupRequest,
  UserDto
} from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(
    private readonly api: ApiService,
    private readonly authStore: AuthStoreService,
    private readonly profileState: CurrentUserProfileService
  ) {}

  login(request: LoginRequest): Observable<string> {
    return this.api.postText('/api/v1/auth/login', request).pipe(
      map((token) => token.trim().replace(/^"|"$/g, '')),
      map((token) => {
        if (!token) {
          throw new Error('Invalid login response');
        }

        const session = this.authStore.saveToken(token);
        if (!session) {
          throw new Error('Invalid login response');
        }

        return token;
      })
    );
  }

  signup(request: SignupRequest): Observable<UserDto> {
    return this.api.post<UserDto>('/api/v1/auth/signup', request);
  }

  verify(token: string): Observable<string> {
    return this.api.getText(`/api/v1/auth/verify/${encodeURIComponent(token)}`);
  }

  sendOtp(email: string): Observable<string> {
    return this.api.postText('/api/v1/auth/sendotp', null, { email });
  }

  resetPassword(request: ForgetPasswordRequest): Observable<string> {
    return this.api.postText('/api/v1/auth/forget', request);
  }

  handleOAuthToken(token: string): Observable<boolean> {
    const normalizedToken = token.trim().replace(/^"|"$/g, '');
    if (!normalizedToken) {
      return of(false);
    }

    const session = this.authStore.saveToken(normalizedToken);
    if (!session) {
      return of(false);
    }

    return this.profileState.loadProfile(true).pipe(
      map(() => true),
      catchError(() => of(true))
    );
  }

  logout(): void {
    this.profileState.clear();
    this.authStore.clear();
  }
}