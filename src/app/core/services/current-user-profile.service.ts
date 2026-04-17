import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError, tap } from 'rxjs';
import { UserDto } from '../models/auth.models';
import { AuthStoreService } from './auth-store.service';
import { UserService } from './user.service';

@Injectable({ providedIn: 'root' })
export class CurrentUserProfileService {
  private readonly profileSubject = new BehaviorSubject<UserDto | null>(null);
  readonly profile$ = this.profileSubject.asObservable();

  constructor(
    private readonly authStore: AuthStoreService,
    private readonly userService: UserService
  ) {}

  snapshot(): UserDto | null {
    return this.profileSubject.value;
  }

  loadProfile(force = false): Observable<UserDto> {
    const session = this.authStore.snapshot() ?? this.authStore.restore();
    const userId = session?.userId;

    if (!userId) {
      return throwError(() => new Error('Missing authenticated user'));
    }

    const existing = this.profileSubject.value;
    if (!force && existing?.userId === userId) {
      return of(existing);
    }

    return this.userService.getById(userId).pipe(
      tap((profile) => this.profileSubject.next(profile))
    );
  }

  setProfile(profile: UserDto): void {
    this.profileSubject.next(profile);
  }

  clear(): void {
    this.profileSubject.next(null);
  }
}