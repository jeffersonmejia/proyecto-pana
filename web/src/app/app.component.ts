import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from './core/auth/auth.service';
import { LucideBell, LucideBookOpen, LucideCalendarDays, LucideChevronDown, LucideSparkles, LucideUserRound, LucideUsersRound } from '@lucide/angular';
import { notificationTimeAgo, NotificationsService } from './core/notifications/notifications.service';

@Component({
  selector: 'pana-root',
  standalone: true,
  imports: [RouterOutlet, LucideUsersRound, LucideBell, LucideBookOpen, LucideCalendarDays, LucideChevronDown, LucideSparkles, LucideUserRound],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  readonly auth = inject(AuthService);
  readonly notifications = inject(NotificationsService);
  readonly sessionReady = signal(false);
  readonly activeModule = signal('home');
  readonly publicWelcome = computed(() => this.activeModule() === 'bienvenido');
  readonly courseDetailOpen = signal(false);
  readonly accountMenuOpen = signal(false);
  readonly notificationOpen = signal(false);
  private readonly router=inject(Router);
  readonly displayShortName = computed(() => {
    const user=this.auth.user();
    const name=user?.first_name?.trim().split(/\s+/)[0]??'';
    const surname=user?.last_name?.trim().split(/\s+/)[0]??'';
    return [name,surname].filter(Boolean).join(' ')||user?.email||'';
  });
  readonly displayRole = computed(() => {
 const labels: Record<string,string>={admin:'Informático',coordinator:'Coordinador',tecnico:'Técnico',student:'Estudiante',volunteer:'Voluntario',beneficiary:'Beneficiario'};
    const role=this.auth.user()?.roles[0]??''; return labels[role]??role;
  });
  readonly timeAgo = notificationTimeAgo;
  shortNotificationText(value: string, limit: number): string { return value.length > limit ? `${value.slice(0, limit - 1).trimEnd()}…` : value; }

  constructor() {
    this.auth.restoreSession().subscribe(ok => { this.sessionReady.set(true); if (ok) this.notifications.load(); });
    this.router.events.pipe(filter(event=>event instanceof NavigationEnd)).subscribe(event=>{
      const path=(event as NavigationEnd).urlAfterRedirects.split('?')[0].split('/').filter(Boolean);
      this.activeModule.set(path[0]==='cursos'?'home':path[0]==='administracion'?'admin':path[0]??'home');
      if(path[0]==='cursos')this.courseDetailOpen.set(!!path[1]);
    });
  }

  open(module: string): void {
    const paths:Record<string,string>={home:'/cursos',events:'/eventos',admin:'/administracion',people:'/personas',attendance:'/asistencia',activities:'/actividades',evaluations:'/evaluaciones',reports:'/reportes'};
    this.accountMenuOpen.set(false);if(module!=='home')this.courseDetailOpen.set(false);
    void this.router.navigateByUrl(paths[module]??'/cursos');
  }
  openProfile(): void { this.accountMenuOpen.set(false); void this.router.navigateByUrl('/perfil'); }
  onRouteActivate(component:unknown): void {
    const closable=component as {close?:{subscribe:(listener:()=>void)=>unknown}};
    closable.close?.subscribe(()=>this.open('home'));
  }

  closeAccountMenu(event: Event, menu: HTMLElement): void {
    if (event.target instanceof Node && !menu.contains(event.target)) this.accountMenuOpen.set(false);
  }
  toggleAccount(event: Event): void { event.stopPropagation(); this.accountMenuOpen.update(open => !open); }
  toggleNotifications(): void { this.notificationOpen.update(open => !open); if (!this.notificationOpen()) return; this.notifications.load(); }

  stopPreview(): void {
    this.auth.stopRolePreview();
    this.courseDetailOpen.set(false); this.open('home');
  }

  logout(): void {
    this.auth.stopRolePreview();
    this.accountMenuOpen.set(false);
    this.courseDetailOpen.set(false);
    this.auth.logout().subscribe(()=>void this.router.navigateByUrl('/login'));
  }

  markNotification(id:number): void { this.notifications.markRead(id); this.notificationOpen.set(false); void this.router.navigateByUrl(`/notificaciones/${id}`); }
  openAllNotifications(): void { this.notificationOpen.set(false); void this.router.navigateByUrl('/notificaciones'); }
}
