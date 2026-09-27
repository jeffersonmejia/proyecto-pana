import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { LucideArrowLeft, LucideBell, LucideSparkles } from '@lucide/angular';
import { notificationTimeAgo, NotificationItem, NotificationsService } from '../../core/notifications/notifications.service';

@Component({
  selector: 'pana-notification-list', standalone: true,
  imports: [LucideArrowLeft, LucideBell, LucideSparkles],
  templateUrl: './notification-list.component.html', styleUrl: './notification-list.component.scss',
})
export class NotificationListComponent {
  readonly notifications = inject(NotificationsService);
  private readonly router = inject(Router);
  readonly items = computed(() => this.notifications.items());
  readonly timeAgo = notificationTimeAgo;
  shortText(value: string, limit: number): string { return value.length > limit ? `${value.slice(0, limit - 1).trimEnd()}…` : value; }

  constructor() { this.notifications.load(true); }
  open(item: NotificationItem): void { this.notifications.markRead(item.id); void this.router.navigateByUrl(`/notificaciones/${item.id}`); }
  back(): void { void this.router.navigateByUrl('/cursos'); }
}
