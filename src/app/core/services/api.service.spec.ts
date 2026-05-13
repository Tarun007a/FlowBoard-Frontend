import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { API_BASE_URL } from '../tokens/api-base-url.token';
import { ApiService } from './api.service';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [{ provide: API_BASE_URL, useValue: 'http://localhost:1234' }]
    });

    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  it('should send GET request with params', () => {
    service.get('/api/v1/items', { page: 1, tags: ['a', 'b'] }).subscribe();

    const req = httpMock.expectOne((request) => request.url === 'http://localhost:1234/api/v1/items');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.getAll('tags')).toEqual(['a', 'b']);

    req.flush([]);
  });

  it('should send POST request for text', () => {
    service.postText('/api/v1/auth/login', { email: 'user@example.com' }).subscribe((res) => {
      expect(res).toBe('ok');
    });

    const req = httpMock.expectOne('http://localhost:1234/api/v1/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.responseType).toBe('text');

    req.flush('ok');
  });
});
