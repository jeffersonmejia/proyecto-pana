import { Component, computed, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../core/auth/auth.service';
import { LucideBell, LucideBookOpen, LucideCalendarDays, LucideChevronDown, LucideLogOut, LucideShieldCheck, LucideSparkles, LucideUserRound } from '@lucide/angular';
import { notificationTimeAgo, NotificationsService } from '../core/notifications/notifications.service';
import { AppModuleId, navigationPath } from '../core/navigation/app-navigation';

@Component({
  selector: 'pana-root',
  standalone: true,
  imports: [RouterOutlet, LucideBell, LucideBookOpen, LucideCalendarDays, LucideChevronDown, LucideLogOut, LucideShieldCheck, LucideSparkles, LucideUserRound],
  templateUrl: './workspace-shell.component.html',
  styleUrl: './workspace-shell.component.scss',
})
export class WorkspaceShellComponent {
  readonly auth = inject(AuthService);
  readonly notifications = inject(NotificationsService);
  readonly sessionReady = signal(false);
  readonly activeModule = signal('home');
  readonly publicWelcome = computed(() => this.activeModule() === 'bienvenido');
  readonly courseDetailOpen = signal(false);
  readonly accountMenuOpen = signal(false);
  readonly notificationOpen = signal(false);
  private readonly router=inject(Router);
  private notificationUserId = 0;
  readonly displayShortName = computed(() => {
    const user=this.auth.user();
    const name=user?.first_name?.trim().split(/\s+/)[0]??'';
    return name||user?.email||'';
  });
  readonly displayRole = computed(() => {
    const role=this.auth.user()?.roles[0]??'';
    const feminine=['femenino','mujer'].includes((this.auth.user()?.gender??'').toLocaleLowerCase());
    const labels: Record<string,string>={admin:feminine?'Administradora':'Administrador',coordinator:feminine?'Coordinadora':'Coordinador',tecnico:'Técnico',student:'Estudiante',volunteer:'Voluntario',beneficiary:feminine?'Beneficiaria':'Beneficiario'};
    return labels[role]??role;
  });
  readonly timeAgo = notificationTimeAgo;
  shortNotificationText(value: string, limit: number): string { return value.length > limit ? `${value.slice(0, limit - 1).trimEnd()}…` : value; }

  constructor() {
    effect(() => {
      const user = this.auth.user();
      if (!user) { this.notificationUserId = 0; return; }
      if (this.notificationUserId === user.id) return;
      this.notificationUserId = user.id;
      this.notifications.load();
    });
    this.auth.restoreSession().subscribe(() => { this.sessionReady.set(true); });
    this.router.events.pipe(filter(event=>event instanceof NavigationEnd)).subscribe(event=>{
      const path=(event as NavigationEnd).urlAfterRedirects.split('?')[0].split('/').filter(Boolean);
      this.activeModule.set(path[0]==='cursos'?'home':path[0]==='administracion'?'admin':path[0]??'home');
      if(path[0]==='cursos')this.courseDetailOpen.set(!!path[1]);
    });
  }

  open(module: AppModuleId): void {
    this.accountMenuOpen.set(false);if(module!=='home')this.courseDetailOpen.set(false);
    void this.router.navigateByUrl(navigationPath(module));
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
