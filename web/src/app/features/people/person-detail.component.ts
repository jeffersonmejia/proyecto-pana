import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideArrowLeft, LucideBuilding2, LucideCalendarDays, LucideCircleCheck, LucideFileText, LucideIdCard, LucideKeyRound, LucideMail, LucideMapPin, LucidePhone, LucideTag, LucideUser } from '@lucide/angular';
import { PeopleApiService, PersonDetail } from './people-api.service';
import { InfoCardComponent } from '../../shared/info-card.component';

@Component({ selector: 'pana-person-detail', standalone: true, imports: [InfoCardComponent, LucideArrowLeft, LucideBuilding2, LucideCalendarDays, LucideCircleCheck, LucideFileText, LucideIdCard, LucideKeyRound, LucideMail, LucideMapPin, LucidePhone, LucideTag, LucideUser], templateUrl: './person-detail.component.html', styleUrl: './person-detail.component.scss' })
export class PersonDetailComponent implements OnInit {
  private readonly api = inject(PeopleApiService); private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly detail = signal<PersonDetail | null>(null); readonly error = signal(''); readonly loading = signal(true);
  readonly cardIcons = { id: LucideIdCard, phone: LucidePhone, mail: LucideMail, pin: LucideMapPin, building: LucideBuilding2, calendar: LucideCalendarDays };
  ngOnInit(): void { const id = Number(this.route.snapshot.paramMap.get('id')); if (!id) { this.error.set('Participante no válido.'); this.loading.set(false); return; }
    const courseId = Number(this.route.snapshot.paramMap.get('courseId'));
    this.api.detail(id, courseId > 0 ? courseId : undefined).subscribe({ next: value => { this.detail.set(value); this.loading.set(false); }, error: () => { this.error.set('No se pudo cargar la información del participante.'); this.loading.set(false); } }); }
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
    return types.map(type => labels[type.toLowerCase()] ?? type).join(' · ');
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
}
