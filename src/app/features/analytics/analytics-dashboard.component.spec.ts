import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AnalyticsService } from '../../core/services/analytics.service';
import { AnalyticsDashboardComponent } from './analytics-dashboard.component';

describe('AnalyticsDashboardComponent', () => {
  let fixture: ComponentFixture<AnalyticsDashboardComponent>;
  let component: AnalyticsDashboardComponent;
  let getWorkspaceOverviewMock: ReturnType<typeof vi.fn>;
  let router: Router;
  const overview = [{
    workspaceId: 3,
    name: 'Product',
    totalBoards: 4,
    totalMembers: 6,
    isOwner: true,
    cardsSummary: {
      total: 11,
      toDo: 3,
      inProgress: 4,
      inReview: 2,
      done: 2
    }
  }] as never[];

  beforeEach(async () => {
    getWorkspaceOverviewMock = vi.fn().mockReturnValue(of(overview));

    await TestBed.configureTestingModule({
      imports: [AnalyticsDashboardComponent, RouterTestingModule],
      providers: [{ provide: AnalyticsService, useValue: { getWorkspaceOverview: getWorkspaceOverviewMock } }]
    }).compileComponents();

    fixture = TestBed.createComponent(AnalyticsDashboardComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should navigate to workspace analytics', () => {
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.openWorkspace(3);

    expect(navigateSpy).toHaveBeenCalledWith(['/analytics/workspace', 3]);
  });

  it('should load overview data', () => {
    expect(getWorkspaceOverviewMock).toHaveBeenCalledTimes(1);
    expect(component.loading).toBe(false);
    expect(component.workspaces).toEqual(overview);
  });
});
