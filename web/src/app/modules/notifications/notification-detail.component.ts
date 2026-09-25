import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideArrowLeft, LucideSparkles } from '@lucide/angular';
import { notificationTimeAgo, NotificationsService } from '../../core/notifications/notifications.service';

@Component({
  selector: 'pana-notification-detail', standalone: true,
  imports: [LucideArrowLeft, LucideSparkles],
  templateUrl: './notification-detail.component.html', styleUrl: './notification-detail.component.scss',
})
export class NotificationDetailComponent {
  readonly notifications = inject(NotificationsService);
  private readonly route = inject(ActivatedRoute); private readonly router = inject(Router);
  readonly item = computed(() => { const id = Number(this.route.snapshot.paramMap.get('id')); return this.notifications.items().find(item => item.id === id) ?? null; });
  readonly timeAgo = notificationTimeAgo;
  constructor() { this.notifications.load(true); }
  back(): void { void this.router.navigateByUrl('/notificaciones'); }
}
