import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { BoardResponse } from '../../core/models/board.models';
import { BoardService } from '../../core/services/board.service';
import { BoardsComponent } from './boards.component';

describe('BoardsComponent', () => {
  let fixture: ComponentFixture<BoardsComponent>;
  let component: BoardsComponent;
  let getBoardsMock: ReturnType<typeof vi.fn>;
  let getPublicBoardsForLoggedUserMock: ReturnType<typeof vi.fn>;
  let getPrivateBoardsMock: ReturnType<typeof vi.fn>;
  let getPublicBoardsMock: ReturnType<typeof vi.fn>;
  let setBoardsMock: ReturnType<typeof vi.fn>;
  let createMock: ReturnType<typeof vi.fn>;
  let openMock: ReturnType<typeof vi.fn>;
  let closeMock: ReturnType<typeof vi.fn>;

  const emptyPage = { pageSize: 0, pageNumber: 0, numberOfElements: 0, totalPages: 0, totalNumberOfElements: 0, content: [], last: true, first: true };

  beforeEach(async () => {
    getBoardsMock = vi.fn().mockReturnValue(of([]));
    getPublicBoardsForLoggedUserMock = vi.fn().mockReturnValue(of(emptyPage));
    getPrivateBoardsMock = vi.fn().mockReturnValue(of(emptyPage));
    getPublicBoardsMock = vi.fn().mockReturnValue(of(emptyPage));
    setBoardsMock = vi.fn();
    createMock = vi.fn().mockReturnValue(of({} as BoardResponse));
    openMock = vi.fn().mockReturnValue(of('ok'));
    closeMock = vi.fn().mockReturnValue(of('ok'));

    await TestBed.configureTestingModule({
      imports: [BoardsComponent, RouterTestingModule],
      providers: [
        {
          provide: BoardService,
          useValue: {
            getBoards: getBoardsMock,
            getPublicBoardsForLoggedUser: getPublicBoardsForLoggedUserMock,
            getPrivateBoards: getPrivateBoardsMock,
            getPublicBoards: getPublicBoardsMock,
            setBoards: setBoardsMock,
            create: createMock,
            open: openMock,
            close: closeMock
          }
        },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: '12' }) } }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BoardsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should not create board when form is invalid', () => {
    component.createBoard();

    expect(createMock).not.toHaveBeenCalled();
  });

  it('should create board and reset form', () => {
    component.form.setValue({ name: 'Board', description: 'Desc', visibility: 'PUBLIC' });
    component.createBoard();

    expect(createMock).toHaveBeenCalledWith({
      workspaceId: 12,
      name: 'Board',
      description: 'Desc',
      visibility: 'PUBLIC'
    });
    expect(component.form.get('name')?.value).toBe('');
    expect(component.form.get('visibility')?.value).toBe('PUBLIC');
  });

  it('should call open when board is closed', () => {
    const board = { boardId: 10, isClosed: true } as BoardResponse;

    component.toggleBoard(board);

    expect(openMock).toHaveBeenCalledWith(10);
  });

  it('should call close when board is open', () => {
    const board = { boardId: 10, isClosed: false } as BoardResponse;

    component.toggleBoard(board);

    expect(closeMock).toHaveBeenCalledWith(10);
  });
});
