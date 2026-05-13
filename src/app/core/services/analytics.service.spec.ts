import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { API_BASE_URL } from '../tokens/api-base-url.token';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [{ provide: API_BASE_URL, useValue: 'http://localhost:1234' }]
    });

    service = TestBed.inject(AnalyticsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should call get workspace overview', () => {
    service.getWorkspaceOverview().subscribe();

    const req = httpMock.expectOne('http://localhost:1234/api/v1/analytics/me');
    expect(req.request.method).toBe('GET');

    req.flush([]);
  });

  it('should call get cards with params', () => {
    service.getCards({ workspaceId: 5, boardId: 2 }).subscribe();

    const req = httpMock.expectOne((request) => request.url === 'http://localhost:1234/api/v1/analytics/cards');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('workspaceId')).toBe('5');
    expect(req.request.params.get('boardId')).toBe('2');

    req.flush([]);
  });
});
