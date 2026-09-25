import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { tap } from 'rxjs';
export interface NotificationItem { id:number; type:string; title:string; message:string; action_url:string|null; read_at:string|null; created_at:string; }
export function notificationTimeAgo(value: string): string {
  const created = new Date(value.includes('T') ? value : value.replace(' ', 'T'));
  const seconds = Math.max(0, Math.floor((Date.now() - created.getTime()) / 1000));
  if (seconds < 60) return 'Hace un momento';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Ayer';
  if (days < 7) return `Hace ${days} d`;
  return created.toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric' });
}
@Injectable({providedIn:'root'})
export class NotificationsService {
  private readonly http=inject(HttpClient); private readonly url=`${environment.apiBaseUrl}/notifications`;
  readonly items=signal<NotificationItem[]>([]); readonly unread=signal(0);
  load(all = false): void { const suffix = all ? '?all=1' : ''; this.http.get<{items:NotificationItem[];unread:number}>(`${this.url}${suffix}`).subscribe(v=>{this.items.set(v.items);this.unread.set(v.unread);}); }
  markRead(id:number): void { this.http.patch(`${this.url}/read?id=${id}`,{}).subscribe(()=>this.load()); }
  markAll(): void { this.http.post(`${this.url}/read-all`,{}).pipe(tap(()=>this.load())).subscribe(); }
}
