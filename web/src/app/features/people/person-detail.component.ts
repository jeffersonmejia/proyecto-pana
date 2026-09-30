import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideArrowLeft, LucideBuilding2, LucideCalendarDays, LucideCircleCheck, LucideFileText, LucideIdCard, LucideKeyRound, LucideMail, LucideMapPin, LucidePhone, LucideTag, LucideUser } from '@lucide/angular';
import { PeopleApiService, PersonDetail } from './people-api.service';
import { InfoCardComponent } from '../../shared/info-card.component';
import { CourseNavItem, CourseSectionNavComponent } from '../../shared/course-section-nav.component';
import { LucideHouse, LucidePanelLeftClose, LucidePanelLeftOpen } from '@lucide/angular';
import { AuthService } from '../../core/auth/auth.service';

@Component({ selector: 'pana-person-detail', standalone: true, imports: [InfoCardComponent, CourseSectionNavComponent, LucideArrowLeft, LucideBuilding2, LucideCalendarDays, LucideCircleCheck, LucideFileText, LucideIdCard, LucideKeyRound, LucideMail, LucideMapPin, LucidePhone, LucideTag, LucideUser, LucideHouse, LucidePanelLeftClose, LucidePanelLeftOpen], templateUrl: './person-detail.component.html', styleUrl: './person-detail.component.scss' })
export class PersonDetailComponent implements OnInit {
  private readonly api = inject(PeopleApiService); private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly auth=inject(AuthService);
  readonly detail = signal<PersonDetail | null>(null); readonly fallbackPerson = signal<Partial<PersonDetail['person']> | null>(this.readPersonPreview()); readonly person = computed(() => this.detail()?.person ?? this.fallbackPerson()); readonly error = signal(''); readonly loading = signal(true);
  readonly navigationCollapsed=signal(this.readNavigationCollapsed());
  readonly navigationItems: CourseNavItem[]=[{id:'participants',label:'Participantes'},{id:'attendance',label:'Asistencia'},{id:'activities',label:'Actividades'},{id:'evaluations',label:'Evaluaciones'}];
  readonly courseName=computed(()=>{ const courseId=Number(this.route.snapshot.paramMap.get('courseId')); const course=(this.detail()?.courses??[]).find(item=>Number(item['id'])===courseId); return typeof course?.['name']==='string'?course['name']:'Curso'; });
  readonly cardIcons = { id: LucideIdCard, phone: LucidePhone, mail: LucideMail, pin: LucideMapPin, building: LucideBuilding2, calendar: LucideCalendarDays };
  private readPersonPreview(): Partial<PersonDetail['person']> | null { const preview=typeof window!=='undefined'?window.history.state?.['person']:null; return preview?.first_name||preview?.last_name?preview:null; }
  ngOnInit(): void { const id = Number(this.route.snapshot.paramMap.get('id')); if (!id) { this.error.set('Participante no válido.'); this.loading.set(false); return; }
    const courseId = Number(this.route.snapshot.paramMap.get('courseId'));
    this.api.detail(id, courseId > 0 ? courseId : undefined).subscribe({ next: value => { this.detail.set(value); this.loading.set(false); }, error: () => { this.error.set('No se pudo cargar la información adicional del participante.'); this.loading.set(false); } }); }
  roleLabel(types: string[]): string {
    const labels: Record<string, string> = {
      admin: 'Administrador',
      informatico: 'Administrador',
      coordinator: 'Coordinador',
      coordinador: 'Coordinador',
      tecnico: 'Técnico',
      technician: 'Técnico',
      beneficiary: 'Beneficiario',
      beneficiario: 'Beneficiario',
      student: 'Estudiante',
      estudiante: 'Estudiante',
      volunteer: 'Voluntario',
      voluntario: 'Voluntario',
    };
    const roleLabels = [...new Set(types.map(type => labels[type.toLowerCase()] ?? type).filter(label => label.toLowerCase() !== 'participant'))];
    return roleLabels.includes('Beneficiario') ? 'Beneficiario' : roleLabels.join(' · ');
  }

  birthDateWithAge(value: string | null): string {
    if (!value) return '—';
    const birthDate = new Date(`${value}T00:00:00`);
    if (Number.isNaN(birthDate.getTime())) return value;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const beforeBirthday = today.getMonth() < birthDate.getMonth()
      || (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate());
    if (beforeBirthday) age -= 1;
    return `${value} (${age} años)`;
  }

  back(): void { const courseId = Number(this.route.snapshot.paramMap.get('courseId')); void this.router.navigate(courseId ? ['/cursos', courseId] : ['/cursos'], courseId ? { queryParams: { tab: 'participants' } } : undefined); }
  toggleNavigation(): void { this.navigationCollapsed.update(collapsed=>{ const next=!collapsed; this.persistNavigationCollapsed(next); return next; }); }
  selectCourseSection(id:string): void { const courseId=Number(this.route.snapshot.paramMap.get('courseId')); if(!courseId)return; if(id==='participants'){this.back();return;} void this.router.navigate(['/cursos',courseId],{queryParams:{tab:id}}); }
  private navigationStorageKey(): string { return `pana.course-navigation.collapsed.${this.auth.user()?.id ?? 'default'}`; }
  private readNavigationCollapsed(): boolean { try { return typeof localStorage!=='undefined'&&localStorage.getItem(this.navigationStorageKey())==='true'; } catch { return false; } }
  private persistNavigationCollapsed(collapsed:boolean): void { try { if(typeof localStorage!=='undefined')localStorage.setItem(this.navigationStorageKey(),String(collapsed)); } catch {} }
}
