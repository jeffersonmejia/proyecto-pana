import { Component, EventEmitter, OnInit, Output, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { AttendanceApiService, AttendanceEvent, AttendanceInput, AttendanceRecord } from './attendance-api.service';

@Component({ selector: 'pana-attendance', standalone: true, imports: [FormsModule, MatButtonModule],
  templateUrl: './attendance.component.html', styleUrl: './attendance.component.scss' })
export class AttendanceComponent implements OnInit {
  private readonly api = inject(AttendanceApiService);
  @Output() close = new EventEmitter<void>();
  readonly people = signal<{ id: number; first_name: string; last_name: string }[]>([]);
  readonly records = signal<AttendanceRecord[]>([]);
  readonly totalHours = computed(() => (this.records().reduce((sum, record) => sum + (record.total_minutes ?? 0), 0) / 60).toFixed(2));
  readonly selected = signal<AttendanceRecord | null>(null);
  readonly history = signal<AttendanceEvent[]>([]);
  readonly error = signal('');
  readonly saving = signal(false);
  participantSearch = ''; participantId: number | '' = ''; from = ''; to = ''; status = 'all';
  form: AttendanceInput = this.emptyForm();

  ngOnInit(): void { this.loadPeople(); this.load(); }
  loadPeople(): void { this.api.participants(this.participantSearch).subscribe({
    next: (result) => this.people.set(result.participants), error: () => this.error.set('No se pudieron cargar los participantes.') }); }
  load(): void { this.api.list({ participant_id: this.participantId, from: this.from, to: this.to, status: this.status }).subscribe({
    next: (result) => { this.records.set(result.records); this.error.set(''); }, error: () => this.error.set('No se pudo consultar la asistencia.') }); }
  edit(record?: AttendanceRecord): void {
    this.selected.set(record ?? null); this.history.set([]);
    this.form = record ? { participant_id: record.participant_id, attendance_date: record.attendance_date,
      status: record.status, check_in: record.check_in?.slice(0, 5) ?? '', check_out: record.check_out?.slice(0, 5) ?? '',
      note: record.note ?? '', correction_reason: '' } : this.emptyForm();
    if (record) this.api.history(record.id).subscribe((result) => this.history.set(result.history));
  }
  save(): void {
    if (this.saving()) return;
    this.saving.set(true);
    const selected = this.selected();
    const call = selected ? this.api.correct({ ...this.form, id: selected.id }) : this.api.create(this.form);
    call.subscribe({ next: () => { this.saving.set(false); this.edit(); this.load(); },
      error: () => { this.saving.set(false); this.error.set('No se guardó. Revisa los datos o si ya existe un registro ese día.'); } });
  }
  private emptyForm(): AttendanceInput {
    return { participant_id: this.participantId || 0, attendance_date: this.today(), status: 'present',
      check_in: '', check_out: '', note: '', correction_reason: '' };
  }
  private today(): string {
    const date = new Date(); date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 10);
  }
}
