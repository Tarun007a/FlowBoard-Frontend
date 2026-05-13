import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../../core/services/auth.service';
import { AuthStoreService } from '../../core/services/auth-store.service';
import { CurrentUserProfileService } from '../../core/services/current-user-profile.service';
import { UserService } from '../../core/services/user.service';
import { ProfileComponent } from './profile.component';

describe('ProfileComponent', () => {
  let fixture: ComponentFixture<ProfileComponent>;
  let component: ProfileComponent;
  let logoutMock: ReturnType<typeof vi.fn>;
  let snapshotMock: ReturnType<typeof vi.fn>;
  let restoreMock: ReturnType<typeof vi.fn>;
  let updateMock: ReturnType<typeof vi.fn>;
  let loadProfileMock: ReturnType<typeof vi.fn>;
  let setProfileMock: ReturnType<typeof vi.fn>;
  let clearMock: ReturnType<typeof vi.fn>;
  let router: Router;

  const session = { userId: 1, email: 'user@example.com', role: 'USER' } as never;
  const profile = { userId: 1, fullName: 'Jane Doe', email: 'user@example.com', avatarUrl: '' } as never;

  beforeEach(async () => {
    logoutMock = vi.fn();
    snapshotMock = vi.fn().mockReturnValue(session);
    restoreMock = vi.fn().mockReturnValue(session);
    updateMock = vi.fn().mockReturnValue(of(profile));
    loadProfileMock = vi.fn().mockReturnValue(of(profile));
    setProfileMock = vi.fn();
    clearMock = vi.fn();

    await TestBed.configureTestingModule({
      imports: [ProfileComponent, RouterTestingModule],
      providers: [
        { provide: AuthService, useValue: { logout: logoutMock } },
        { provide: AuthStoreService, useValue: { snapshot: snapshotMock, restore: restoreMock } },
        { provide: UserService, useValue: { update: updateMock } },
        {
          provide: CurrentUserProfileService,
          useValue: {
            loadProfile: loadProfileMock,
            setProfile: setProfileMock,
            clear: clearMock,
            profile$: of(profile)
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should start and cancel edit', () => {
    component.startEdit();
    expect(component.editing).toBe(true);

    component.cancelEdit();
    expect(component.editing).toBe(false);
  });

  it('should not save when form is invalid', () => {
    component.form.get('fullName')?.setValue('');
    component.save();

    expect(updateMock).not.toHaveBeenCalled();
  });

  it('should save profile updates', () => {
    component.form.setValue({ fullName: ' Jane Doe ', avatarUrl: '  ' });
    component.save();

    expect(updateMock).toHaveBeenCalledWith(1, { fullName: 'Jane Doe', avatarUrl: '' });
    expect(loadProfileMock).toHaveBeenCalledWith(true);
    expect(setProfileMock).toHaveBeenCalledWith(profile);
    expect(component.editing).toBe(false);
    expect(component.saving).toBe(false);
  });

  it('should logout and navigate', () => {
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.logout();

    expect(logoutMock).toHaveBeenCalledTimes(1);
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });
});
