import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService, PreviewRole } from './core/auth/auth.service';
import { LucideBell, LucideChevronDown, LucideEye, LucideUserRound, LucideUsersRound } from '@lucide/angular';
import { NotificationsService } from './core/notifications/notifications.service';

@Component({
  selector: 'pana-root',
  standalone: true,
  imports: [RouterOutlet, DatePipe, LucideUsersRound, LucideEye, LucideBell, LucideChevronDown, LucideUserRound],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  readonly auth = inject(AuthService);
  readonly notifications = inject(NotificationsService);
  readonly sessionReady = signal(false);
  readonly activeModule = signal('home');
  readonly courseDetailOpen = signal(false);
  readonly accountMenuOpen = signal(false);
  readonly notificationOpen = signal(false);
  readonly previewMenuOpen = signal(false);
  readonly previewSelection = signal<PreviewRole | ''>('');
  private readonly router=inject(Router);
  readonly previewRoles: { code: PreviewRole; label: string }[] = [
    { code: 'coordinator', label: 'Coordinador' }, { code: 'tutor', label: 'Tutor' },
    { code: 'student', label: 'Estudiante' }, { code: 'volunteer', label: 'Voluntario' },
    { code: 'beneficiary', label: 'Beneficiario' },
  ];
  readonly previewButtonLabel = computed(() => this.previewRoles.find(role => role.code === this.previewSelection())?.label ?? 'Ver como');
  readonly displayShortName = computed(() => {
    const user=this.auth.user();
    const name=user?.first_name?.trim().split(/\s+/)[0]??'';
    const surname=user?.last_name?.trim().split(/\s+/)[0]??'';
    return [name,surname].filter(Boolean).join(' ')||user?.email||'';
  });
  readonly displayRole = computed(() => {
    const labels: Record<string,string>={admin:'Informático',coordinator:'Coordinador',tutor:'Tutor',student:'Estudiante',volunteer:'Voluntario',beneficiary:'Beneficiario'};
    const role=this.auth.user()?.roles[0]??''; return labels[role]??role;
  });

  constructor() {
    this.auth.restoreSession().subscribe(ok => { this.sessionReady.set(true); if (ok) this.notifications.load(); });
    this.router.events.pipe(filter(event=>event instanceof NavigationEnd)).subscribe(event=>{
      const path=(event as NavigationEnd).urlAfterRedirects.split('?')[0].split('/').filter(Boolean);
      this.activeModule.set(path[0]==='cursos'?'home':path[0]==='administracion'?'admin':path[0]??'home');
      if(path[0]==='cursos')this.courseDetailOpen.set(!!path[1]);
    });
  }

  open(module: string): void {
    const paths:Record<string,string>={home:'/cursos',admin:'/administracion',people:'/personas',attendance:'/asistencia',activities:'/actividades',evaluations:'/evaluaciones',reports:'/reportes'};
    this.accountMenuOpen.set(false);this.previewMenuOpen.set(false);if(module!=='home')this.courseDetailOpen.set(false);
    void this.router.navigateByUrl(paths[module]??'/cursos');
  }
  onRouteActivate(component:unknown): void {
    const closable=component as {close?:{subscribe:(listener:()=>void)=>unknown}};
    closable.close?.subscribe(()=>this.open('home'));
  }

  closeAccountMenu(event: Event, menu: HTMLElement): void {
    if (event.target instanceof Node && !menu.contains(event.target)) this.accountMenuOpen.set(false);
  }
  toggleAccount(event: Event): void { event.stopPropagation(); this.accountMenuOpen.update(open => !open); }
  toggleNotifications(): void { this.notificationOpen.update(open => !open); if (!this.notificationOpen()) return; this.notifications.load(); }

  closePreviewMenu(event: Event, menu: HTMLElement): void {
    if (event.target instanceof Node && !menu.contains(event.target)) this.previewMenuOpen.set(false);
  }

  choosePreviewRole(event: Event): void {
    const role = (event.target as HTMLSelectElement).value as PreviewRole;
    if (!this.previewRoles.some(option => option.code === role)) return;
    this.previewSelection.set(role);
    this.startPreview();
  }

  startPreview(): void {
    const role = this.previewSelection();
    if (!role) return;
    this.auth.startRolePreview(role);
    this.courseDetailOpen.set(false); this.previewMenuOpen.set(false); this.open('home');
  }

  stopPreview(): void {
    this.auth.stopRolePreview();
    this.previewSelection.set('');
    this.previewMenuOpen.set(false); this.courseDetailOpen.set(false); this.open('home');
  }

  logout(): void {
    this.auth.stopRolePreview();
    this.accountMenuOpen.set(false);
    this.previewMenuOpen.set(false);
    this.courseDetailOpen.set(false);
    this.auth.logout().subscribe(()=>void this.router.navigateByUrl('/login'));
  }

  markNotification(id:number): void { this.notifications.markRead(id); }
}
