import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { vi } from 'vitest';
import { API_BASE_URL } from '../tokens/api-base-url.token';
import { AuthStoreService } from './auth-store.service';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let httpMock: HttpTestingController;
  let snapshotMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    snapshotMock = vi.fn().mockReturnValue({ userId: 9 });

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: API_BASE_URL, useValue: 'http://localhost:1234' },
        { provide: AuthStoreService, useValue: { snapshot: snapshotMock } }
      ]
    });

    service = TestBed.inject(NotificationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  it('should call getMyNotifications api', () => {
    service.getMyNotifications().subscribe();

    const req = httpMock.expectOne((request) => request.url === 'http://localhost:1234/api/v1/notifications/recipient/9');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('20');
    expect(req.request.params.get('sortBy')).toBe('notificationId');
    expect(req.request.params.get('direction')).toBe('DESC');

    req.flush({ content: [] });
  });

  it('should call markAllAsRead api', () => {
    service.markAllAsRead().subscribe();

    const req = httpMock.expectOne('http://localhost:1234/api/v1/notifications/readAll/9');
    expect(req.request.method).toBe('PUT');

    req.flush('ok');
  });
});
