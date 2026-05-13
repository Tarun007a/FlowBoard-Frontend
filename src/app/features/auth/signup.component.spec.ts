import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../../core/services/auth.service';
import { SignupComponent } from './signup.component';

describe('SignupComponent', () => {
  let fixture: ComponentFixture<SignupComponent>;
  let component: SignupComponent;
  let signupMock: ReturnType<typeof vi.fn>;
  let router: Router;

  beforeEach(async () => {
    signupMock = vi.fn();

    await TestBed.configureTestingModule({
      imports: [SignupComponent, RouterTestingModule],
      providers: [{ provide: AuthService, useValue: { signup: signupMock } }]
    }).compileComponents();

    fixture = TestBed.createComponent(SignupComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should make fullName required', () => {
    const control = component.form.get('fullName');

    control?.setValue('');

    expect(control?.errors?.['required']).toBe(true);
  });

  it('should not submit when form is invalid', () => {
    component.submit();

    expect(signupMock).not.toHaveBeenCalled();
    expect(component.success).toBe('');
  });

  it('should call signup and navigate on submit', () => {
    signupMock.mockReturnValue(of({}));
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.form.setValue({
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      password: 'password123'
    });
    component.submit();

    expect(signupMock).toHaveBeenCalledWith({
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      password: 'password123'
    });
    expect(component.success).toContain('Account created');
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });
});
