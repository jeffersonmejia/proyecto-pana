import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { tap } from 'rxjs';
export interface NotificationItem { id:number; type:string; title:string; message:string; action_url:string|null; read_at:string|null; created_at:string; }
@Injectable({providedIn:'root'})
export class NotificationsService {
  private readonly http=inject(HttpClient); private readonly url=`${environment.apiBaseUrl}/notifications`;
  readonly items=signal<NotificationItem[]>([]); readonly unread=signal(0);
  load(): void { this.http.get<{items:NotificationItem[];unread:number}>(this.url).subscribe(v=>{this.items.set(v.items);this.unread.set(v.unread);}); }
  markRead(id:number): void { this.http.patch(`${this.url}/read?id=${id}`,{}).subscribe(()=>this.load()); }
  markAll(): void { this.http.post(`${this.url}/read-all`,{}).pipe(tap(()=>this.load())).subscribe(); }
}
