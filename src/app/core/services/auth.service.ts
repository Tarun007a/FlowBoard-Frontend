import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiService } from './api.service';
import { AuthStoreService } from './auth-store.service';
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
    private readonly authStore: AuthStoreService
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

  logout(): void {
    this.authStore.clear();
  }
}