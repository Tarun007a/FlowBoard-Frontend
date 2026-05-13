import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AuthStoreService } from '../../core/services/auth-store.service';
import { BoardService } from '../../core/services/board.service';
import { WorkspaceService } from '../../core/services/workspace.service';
import { WorkspaceResponse } from '../../core/models/workspace.models';
import { WorkspacesComponent } from './workspaces.component';

describe('WorkspacesComponent', () => {
  let fixture: ComponentFixture<WorkspacesComponent>;
  let component: WorkspacesComponent;
  let createWorkspaceMock: ReturnType<typeof vi.fn>;
  let getMyWorkspacesMock: ReturnType<typeof vi.fn>;
  let getJoinedWorkspacesMock: ReturnType<typeof vi.fn>;
  let getPublicWorkspacesMock: ReturnType<typeof vi.fn>;
  let setWorkspacesMock: ReturnType<typeof vi.fn>;
  let getMembersMock: ReturnType<typeof vi.fn>;
  let getPublicBoardsForLoggedUserMock: ReturnType<typeof vi.fn>;
  let getPrivateBoardsMock: ReturnType<typeof vi.fn>;
  let restoreMock: ReturnType<typeof vi.fn>;
  let router: Router;

  const emptyPage = { pageSize: 0, pageNumber: 0, numberOfElements: 0, totalPages: 0, totalNumberOfElements: 0, content: [], last: true, first: true };

  beforeEach(async () => {
    createWorkspaceMock = vi.fn();
    getMyWorkspacesMock = vi.fn().mockReturnValue(of(emptyPage));
    getJoinedWorkspacesMock = vi.fn().mockReturnValue(of(emptyPage));
    getPublicWorkspacesMock = vi.fn().mockReturnValue(of(emptyPage));
    setWorkspacesMock = vi.fn();
    getMembersMock = vi.fn().mockReturnValue(of(emptyPage));
    getPublicBoardsForLoggedUserMock = vi.fn().mockReturnValue(of(emptyPage));
    getPrivateBoardsMock = vi.fn().mockReturnValue(of(emptyPage));
    restoreMock = vi.fn().mockReturnValue({ userId: 1, email: 'user@example.com', role: 'USER' });

    await TestBed.configureTestingModule({
      imports: [WorkspacesComponent, RouterTestingModule],
      providers: [
        {
          provide: WorkspaceService,
          useValue: {
            createWorkspace: createWorkspaceMock,
            getMyWorkspaces: getMyWorkspacesMock,
            getJoinedWorkspaces: getJoinedWorkspacesMock,
            getPublicWorkspaces: getPublicWorkspacesMock,
            setWorkspaces: setWorkspacesMock,
            getMembers: getMembersMock
          }
        },
        {
          provide: BoardService,
          useValue: {
            getPublicBoardsForLoggedUser: getPublicBoardsForLoggedUserMock,
            getPrivateBoards: getPrivateBoardsMock
          }
        },
        { provide: AuthStoreService, useValue: { restore: restoreMock } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(WorkspacesComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should open and close create modal', () => {
    component.openCreateModal();
    expect(component.showCreateModal).toBe(true);

    component.closeCreateModal();
    expect(component.showCreateModal).toBe(false);
  });

  it('should not create workspace when form is invalid', () => {
    component.createWorkspace();

    expect(createWorkspaceMock).not.toHaveBeenCalled();
  });

  it('should create workspace and close modal', () => {
    const workspace: WorkspaceResponse = {
      workspaceId: 1,
      ownerId: 1,
      name: 'Demo',
      description: 'Demo workspace',
      visibility: 'PRIVATE',
      logoUrl: 'default',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    };

    createWorkspaceMock.mockReturnValue(of(workspace));

    component.openCreateModal();
    component.form.setValue({ name: 'Demo', description: 'Demo workspace', visibility: 'PRIVATE' });
    component.createWorkspace();

    expect(createWorkspaceMock).toHaveBeenCalledWith({
      name: 'Demo',
      description: 'Demo workspace',
      visibility: 'PRIVATE',
      logoUrl: 'default-logo'
    });
    expect(component.showCreateModal).toBe(false);
    expect(component.form.get('name')?.value).toBe('');
    expect(component.myWorkspaces[0]).toEqual(workspace);
  });
});
