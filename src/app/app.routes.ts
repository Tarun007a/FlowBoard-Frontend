import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { landingGuard } from './core/guards/landing.guard';
import { ShellComponent } from './layout/shell.component';
import { AuthShellComponent } from './features/auth/auth-shell.component';
import { ResetPasswordComponent } from './features/auth/reset-password.component';
import { VerifyAccountComponent } from './features/auth/verify-account.component';
import { OAuthSuccessComponent } from './features/auth/oauth-success.component';
import { WorkspacesComponent } from './features/workspaces/workspaces.component';
import { CardsComponent } from './features/cards/cards.component';
import { WorkspaceDetailComponent } from './features/workspace-detail/workspace-detail.component';
import { NotificationsComponent } from './features/notifications/notifications.component';
import { ProfileComponent } from './features/profile/profile.component';
import { SubscriptionPlansComponent } from './features/subscription/subscription-plans.component';
import { MySubscriptionComponent } from './features/subscription/my-subscription.component';
import { AdminDashboardComponent } from './features/admin/admin-dashboard.component';
import { adminGuard } from './core/guards/admin.guard';
import { RegisterAdminComponent } from './features/admin/register-admin.component';

export const routes: Routes = [
	{
		path: '',
		canActivate: [landingGuard],
		loadComponent: () => import('./features/landing/landing-page.component').then((m) => m.LandingPageComponent)
	},
	{ path: 'login', component: AuthShellComponent, canActivate: [guestGuard] },
	{ path: 'signup', component: AuthShellComponent, canActivate: [guestGuard] },
	{ path: 'register-admin', component: RegisterAdminComponent, canActivate: [guestGuard] },
	{ path: 'reset-password', component: ResetPasswordComponent, canActivate: [guestGuard] },
	{ path: 'verify/:token', component: VerifyAccountComponent },
	{ path: 'oauth-success', component: OAuthSuccessComponent },
	{ path: 'admin', pathMatch: 'full', redirectTo: 'admin/dashboard' },
	{
		path: '',
		component: ShellComponent,
		canActivate: [authGuard],
		children: [
			{ path: 'dashboard', redirectTo: 'workspaces', pathMatch: 'full' },
			{ path: 'admin/dashboard', component: AdminDashboardComponent, canActivate: [adminGuard] },
			{ path: 'workspaces', component: WorkspacesComponent },
			{ path: 'subscription/plans', component: SubscriptionPlansComponent },
			{ path: 'subscription/my', component: MySubscriptionComponent },
			{ path: 'profile', component: ProfileComponent },
			{ path: 'workspace/:id', component: WorkspaceDetailComponent },
			{ path: 'workspace/:id/boards', component: WorkspaceDetailComponent },
			{ path: 'board/:id', component: CardsComponent },
			{ path: 'notifications', component: NotificationsComponent },
			{ path: '', pathMatch: 'full', redirectTo: 'workspaces' }
		]
	},
	{ path: '**', redirectTo: 'login' }
];
