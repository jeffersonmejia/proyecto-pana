import { Component, computed, inject, signal } from '@angular/core';
import { AuthService, PreviewRole } from './core/auth/auth.service';
import { LoginComponent } from './modules/auth/login.component';
import { AdministrationComponent } from './modules/admin/administration.component';
import { PeopleComponent } from './modules/people/people.component';
import { AttendanceComponent } from './modules/attendance/attendance.component';
import { ActivitiesComponent } from './modules/activities/activities.component';
import { EvaluationsComponent } from './modules/evaluations/evaluations.component';
import { ReportsComponent } from './modules/reports/reports.component';
import { CoursesHomeComponent } from './modules/courses/courses-home.component';
import { LucideEye, LucideUsersRound } from '@lucide/angular';

@Component({
  selector: 'pana-root',
  standalone: true,
  imports: [LoginComponent, AdministrationComponent, PeopleComponent, AttendanceComponent, ActivitiesComponent, EvaluationsComponent, ReportsComponent, CoursesHomeComponent, LucideUsersRound, LucideEye],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  readonly auth = inject(AuthService);
  readonly sessionReady = signal(false);
  readonly activeModule = signal('home');
  readonly courseDetailOpen = signal(false);
  readonly accountMenuOpen = signal(false);
  readonly previewMenuOpen = signal(false);
  readonly previewSelection = signal<PreviewRole | ''>('');
  readonly previewRoles: { code: PreviewRole; label: string }[] = [
    { code: 'coordinator', label: 'Coordinador' }, { code: 'tutor', label: 'Tutor' },
    { code: 'student', label: 'Estudiante' }, { code: 'volunteer', label: 'Voluntario' },
    { code: 'beneficiary', label: 'Beneficiario' },
  ];
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
    this.auth.restoreSession().subscribe(() => this.sessionReady.set(true));
  }

  open(module: string): void { this.activeModule.set(module); this.accountMenuOpen.set(false); this.previewMenuOpen.set(false); if (module !== 'home') this.courseDetailOpen.set(false); }

  closeAccountMenu(event: Event, menu: HTMLElement): void {
    if (event.target instanceof Node && !menu.contains(event.target)) this.accountMenuOpen.set(false);
  }

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
    this.activeModule.set('home'); this.courseDetailOpen.set(false); this.previewMenuOpen.set(false);
  }

  stopPreview(): void {
    this.auth.stopRolePreview();
    this.previewSelection.set('');
    this.previewMenuOpen.set(false); this.activeModule.set('home'); this.courseDetailOpen.set(false);
  }

  logout(): void {
    this.auth.stopRolePreview();
    this.accountMenuOpen.set(false);
    this.previewMenuOpen.set(false);
    this.activeModule.set('home');
    this.auth.logout().subscribe();
  }
}
