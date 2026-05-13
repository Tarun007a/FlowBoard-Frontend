import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { API_BASE_URL } from '../tokens/api-base-url.token';
import { WorkspaceService } from './workspace.service';

describe('WorkspaceService', () => {
  let service: WorkspaceService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [{ provide: API_BASE_URL, useValue: 'http://localhost:1234' }]
    });

    service = TestBed.inject(WorkspaceService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  it('should call getMyWorkspaces api', () => {
    service.getMyWorkspaces(0, 10, 'workspaceId', 'asc').subscribe();

    const req = httpMock.expectOne((request) => request.url === 'http://localhost:1234/api/v1/workspaces/me');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('10');

    req.flush({ content: [] });
  });

  it('should call create workspace api', () => {
    service.createWorkspace({ name: 'Demo', description: '', visibility: 'PRIVATE', logoUrl: 'default' }).subscribe();

    const req = httpMock.expectOne('http://localhost:1234/api/v1/workspaces/create');
    expect(req.request.method).toBe('POST');

    req.flush({ workspaceId: 1 });
  });
});
