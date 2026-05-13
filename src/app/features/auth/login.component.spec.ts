import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../../core/services/auth.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let loginMock: ReturnType<typeof vi.fn>;
  let router: Router;

  beforeEach(async () => {
    loginMock = vi.fn();

    await TestBed.configureTestingModule({
      imports: [LoginComponent, RouterTestingModule],
      providers: [{ provide: AuthService, useValue: { login: loginMock } }]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should make email required', () => {
    const control = component.form.get('email');

    control?.setValue('');

    expect(control?.errors?.['required']).toBe(true);
  });

  it('should show error when form is invalid', () => {
    component.submit();

    expect(component.error).toContain('valid email');
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('should call login and navigate on submit', () => {
    loginMock.mockReturnValue(of('token'));
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.form.setValue({ email: 'user@example.com', password: 'password123' });
    component.submit();

    expect(loginMock).toHaveBeenCalledWith({ email: 'user@example.com', password: 'password123' });
    expect(navigateSpy).toHaveBeenCalledWith(['/workspaces']);
    expect(component.loading).toBe(false);
  });
});
