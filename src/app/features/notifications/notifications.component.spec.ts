import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { NotificationService } from '../../core/services/notification.service';
import { NotificationsComponent } from './notifications.component';

describe('NotificationsComponent', () => {
  let fixture: ComponentFixture<NotificationsComponent>;
  let component: NotificationsComponent;
  let markAsReadMock: ReturnType<typeof vi.fn>;
  let markAllAsReadMock: ReturnType<typeof vi.fn>;
  let deleteNotificationMock: ReturnType<typeof vi.fn>;
  let clearReadNotificationsMock: ReturnType<typeof vi.fn>;
  let getMyNotificationsMock: ReturnType<typeof vi.fn>;
  let getUnreadCountMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    markAsReadMock = vi.fn().mockReturnValue(of('ok'));
    markAllAsReadMock = vi.fn().mockReturnValue(of('ok'));
    deleteNotificationMock = vi.fn().mockReturnValue(of('ok'));
    clearReadNotificationsMock = vi.fn().mockReturnValue(of('ok'));
    getMyNotificationsMock = vi.fn().mockReturnValue(of({ content: [] }));
    getUnreadCountMock = vi.fn().mockReturnValue(of(0));

    await TestBed.configureTestingModule({
      imports: [NotificationsComponent],
      providers: [{
        provide: NotificationService,
        useValue: {
          markAsRead: markAsReadMock,
          markAllAsRead: markAllAsReadMock,
          deleteNotification: deleteNotificationMock,
          clearReadNotifications: clearReadNotificationsMock,
          getMyNotifications: getMyNotificationsMock,
          getUnreadCount: getUnreadCountMock
        }
      }]
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationsComponent);
    component = fixture.componentInstance;
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should mark notification as read', () => {
    component.notifications = [{ notificationId: 1, isRead: false } as never];
    component.unreadCount = 1;

    component.onNotificationClick(component.notifications[0]);

    expect(markAsReadMock).toHaveBeenCalledWith(1);
    expect(component.notifications[0].isRead).toBe(true);
    expect(component.unreadCount).toBe(0);
  });

  it('should mark all notifications as read', () => {
    component.notifications = [{ notificationId: 1, isRead: false } as never];
    component.unreadCount = 1;

    component.markAllAsRead();

    expect(markAllAsReadMock).toHaveBeenCalledTimes(1);
    expect(component.unreadCount).toBe(0);
  });

  it('should delete notification', () => {
    component.notifications = [
      { notificationId: 1, isRead: false } as never,
      { notificationId: 2, isRead: true } as never
    ];
    component.unreadCount = 1;

    const event = { stopPropagation: () => void 0 } as MouseEvent;

    component.deleteNotification(1, event);

    expect(deleteNotificationMock).toHaveBeenCalledWith(1);
    expect(component.notifications.length).toBe(1);
    expect(component.unreadCount).toBe(0);
  });

  it('should clear read notifications', () => {
    component.notifications = [
      { notificationId: 1, isRead: false } as never,
      { notificationId: 2, isRead: true } as never
    ];

    component.clearRead();

    expect(clearReadNotificationsMock).toHaveBeenCalledTimes(1);
    expect(component.notifications.length).toBe(1);
  });
});
