import { Component, EventEmitter, OnInit, Output, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { PaginatorComponent } from '../../shared/paginator.component';
import { StepDialogComponent } from '../../shared/step-dialog.component';
import { LucideClock3, LucidePencil, LucidePlus } from '@lucide/angular';
import { AttendanceApiService, AttendanceEvent, AttendanceInput, AttendanceRecord, PageInfo } from './attendance-api.service';

@Component({ selector: 'pana-attendance', standalone: true,
  imports: [FormsModule, PaginatorComponent, StepDialogComponent, LucideClock3, LucidePencil, LucidePlus],
  templateUrl: './attendance.component.html', styleUrl: './attendance.component.scss' })
export class AttendanceComponent implements OnInit {
  private readonly api = inject(AttendanceApiService);
  readonly auth = inject(AuthService);
  @Output() close = new EventEmitter<void>();
  readonly people = signal<{ id: number; first_name: string; last_name: string }[]>([]);
  readonly records = signal<AttendanceRecord[]>([]);
  readonly pageInfo = signal<PageInfo>({ page: 1, page_size: 5, total: 0, pages: 1 });
  readonly totalHours = computed(() => (this.records().reduce((sum, row) => sum + (row.total_minutes ?? 0), 0) / 60).toFixed(2));
  readonly selected = signal<AttendanceRecord | null>(null);
  readonly history = signal<AttendanceEvent[]>([]);
  readonly error = signal(''); readonly saving = signal(false); readonly dialogOpen = signal(false); readonly step = signal(0);
  participantSearch = ''; participantId: number | '' = ''; from = ''; to = ''; status = 'all';
  form: AttendanceInput = this.emptyForm();

  ngOnInit(): void { this.loadPeople(); this.load(); }
  canManage(): boolean { return this.auth.hasPermission('attendance.manage'); }
  loadPeople(): void { this.api.participants(this.participantSearch).subscribe({
    next: (result) => this.people.set(result.participants), error: () => this.error.set('No se pudieron cargar los participantes.') }); }
  load(): void { this.api.list({ participant_id: this.participantId, from: this.from, to: this.to,
    status: this.status, page: this.pageInfo().page }).subscribe({
    next: (result) => { this.records.set(result.records); this.pageInfo.set(result.pagination); this.error.set(''); },
    error: () => this.error.set('No se pudo consultar la asistencia.') }); }
  filter(): void { this.pageInfo.update((page) => ({ ...page, page: 1 })); this.load(); }
  changePage(page: number): void { this.pageInfo.update((current) => ({ ...current, page })); this.load(); }
  edit(record?: AttendanceRecord): void {
    this.selected.set(record ?? null); this.history.set([]); this.step.set(0); this.dialogOpen.set(true);
    this.form = record ? { participant_id: record.participant_id, attendance_date: record.attendance_date,
      status: record.status, check_in: record.check_in?.slice(0, 5) ?? '', check_out: record.check_out?.slice(0, 5) ?? '',
      note: record.note ?? '', correction_reason: '' } : this.emptyForm();
    if (record) this.api.history(record.id).subscribe((result) => this.history.set(result.history));
  }
  canContinue(): boolean { return !!this.form.participant_id && !!this.form.attendance_date; }
  canSave(): boolean { return this.canContinue() && !(!!this.form.check_in && !!this.form.check_out && this.form.check_out <= this.form.check_in)
    && !(this.form.status !== 'present' && (!!this.form.check_in || !!this.form.check_out))
    && (!this.selected() || !!this.form.correction_reason?.trim()); }
  next(): void { if (this.canContinue()) this.step.update((value) => Math.min(1, value + 1)); }
  save(): void {
    if (this.saving() || !this.canSave()) return;
    this.saving.set(true); const selected = this.selected();
    const call = selected ? this.api.correct({ ...this.form, id: selected.id }) : this.api.create(this.form);
    call.subscribe({ next: () => { this.saving.set(false); this.dialogOpen.set(false); this.filter(); },
      error: () => { this.saving.set(false); this.error.set('No se guardó. Revisa los datos o si ya existe un registro ese día.'); } });
  }
  private emptyForm(): AttendanceInput { return { participant_id: this.participantId || 0, attendance_date: this.today(),
    status: 'present', check_in: '', check_out: '', note: '', correction_reason: '' }; }
  private today(): string { const date = new Date(); date.setMinutes(date.getMinutes() - date.getTimezoneOffset()); return date.toISOString().slice(0, 10); }
}
