import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AnalyticsService } from '../../core/services/analytics.service';
import { UserService } from '../../core/services/user.service';
import { SmartFilterComponent } from './smart-filter.component';

describe('SmartFilterComponent', () => {
  let fixture: ComponentFixture<SmartFilterComponent>;
  let component: SmartFilterComponent;
  let getWorkspaceMembersMock: ReturnType<typeof vi.fn>;
  let getWorkspaceBoardsMock: ReturnType<typeof vi.fn>;
  let getCardsMock: ReturnType<typeof vi.fn>;
  let getBulkMock: ReturnType<typeof vi.fn>;
  let router: Router;

  beforeEach(async () => {
    getWorkspaceMembersMock = vi.fn().mockReturnValue(of([]));
    getWorkspaceBoardsMock = vi.fn().mockReturnValue(of([]));
    getCardsMock = vi.fn().mockReturnValue(of([]));
    getBulkMock = vi.fn().mockReturnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [SmartFilterComponent, RouterTestingModule],
      providers: [
        {
          provide: AnalyticsService,
          useValue: {
            getWorkspaceMembers: getWorkspaceMembersMock,
            getWorkspaceBoards: getWorkspaceBoardsMock,
            getCards: getCardsMock
          }
        },
        { provide: UserService, useValue: { getBulk: getBulkMock } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ workspaceId: '7' }) } }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SmartFilterComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should set selected card when opened', () => {
    const card = { cardId: 1, createdById: 1, assigneeId: null } as never;

    component.openCard(card);

    expect(component.selectedCard).toBe(card);
  });

  it('should build status class', () => {
    expect(component.statusClass('IN_PROGRESS')).toBe('status-in-progress');
  });

  it('should call getCards when fetching cards', () => {
    component.fetchCards();

    expect(getCardsMock).toHaveBeenLastCalledWith({ workspaceId: 7 });
    expect(component.cardsLoading).toBe(false);
  });

  it('should navigate away when workspace id is invalid', () => {
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const route = TestBed.inject(ActivatedRoute) as any;

    route.snapshot = { paramMap: convertToParamMap({}) };

    component.ngOnInit();

    expect(navigateSpy).toHaveBeenCalledWith(['/analytics']);
  });
});
