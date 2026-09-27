import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideArrowLeft } from '@lucide/angular';
import { PeopleApiService, PersonDetail } from './people-api.service';

@Component({ selector: 'pana-person-detail', standalone: true, imports: [LucideArrowLeft], templateUrl: './person-detail.component.html', styleUrl: './person-detail.component.scss' })
export class PersonDetailComponent implements OnInit {
  private readonly api = inject(PeopleApiService); private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router); private readonly sanitizer = inject(DomSanitizer);
  readonly detail = signal<PersonDetail | null>(null); readonly error = signal(''); readonly loading = signal(true);
  readonly mapAddress = computed(() => { const data = this.detail(); const latitude = data?.person.latitude; const longitude = data?.person.longitude; if (latitude != null && longitude != null) return `${latitude},${longitude}`; const person = data?.person.address?.trim();
    if (person) return person; const event = data?.events.find(row => this.value(row, 'address') !== '—') ?? data?.events[0];
    return event ? this.value(event, 'address') !== '—' ? this.value(event, 'address') : this.value(event, 'location') : ''; });
  readonly personMap = computed(() => this.mapUrl(this.mapAddress()));
  ngOnInit(): void { const id = Number(this.route.snapshot.paramMap.get('id')); if (!id) { this.error.set('Participante no válido.'); this.loading.set(false); return; }
    this.api.detail(id).subscribe({ next: value => { this.detail.set(value); this.loading.set(false); }, error: () => { this.error.set('No se pudo cargar la información del participante.'); this.loading.set(false); } }); }
  back(): void { const courseId = Number(this.route.snapshot.paramMap.get('courseId')); void this.router.navigate(courseId ? ['/cursos', courseId] : ['/cursos'], courseId ? { queryParams: { tab: 'participants' } } : undefined); }
  mapUrl(address: string): SafeResourceUrl | null { const value = address.trim(); if (!value) return null; const coordinates = /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(value); const encoded = encodeURIComponent(value); const query = coordinates ? `q=${encoded}&ll=${encoded}&z=18` : `q=${encoded}&z=15`; return this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.google.com/maps?${query}&output=embed`); }
  attendanceHours(rows: Record<string, unknown>[]): number { return Math.round(rows.reduce((total, row) => total + this.duration(row['check_in'], row['check_out']), 0) * 10) / 10; }
  private duration(start: unknown, end: unknown): number { if (!start || !end) return 0; const from = new Date(String(start).replace(' ', 'T')).getTime(); const to = new Date(String(end).replace(' ', 'T')).getTime(); return Number.isFinite(from) && Number.isFinite(to) && to > from ? (to - from) / 3600000 : 0; }
  value(row: Record<string, unknown>, key: string): string { return String(row[key] ?? '—'); }
}
