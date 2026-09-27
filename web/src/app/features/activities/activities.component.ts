import { Component, EventEmitter, OnInit, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { PaginatorComponent } from '../../shared/paginator.component';
import { StepDialogComponent } from '../../shared/step-dialog.component';
import { LucidePencil, LucidePlus } from '@lucide/angular';
import { ActivitiesApiService, ActivitiesPage, ActivityInput, ActivityLog, ActivityRecord } from './activities-api.service';

@Component({ selector: 'pana-activities', standalone: true, imports: [FormsModule, PaginatorComponent,
  StepDialogComponent, LucidePencil, LucidePlus],
  templateUrl: './activities.component.html', styleUrl: './activities.component.scss' })
export class ActivitiesComponent implements OnInit {
  private readonly api = inject(ActivitiesApiService);
  readonly auth = inject(AuthService);
  @Output() close = new EventEmitter<void>();
  readonly people = signal<{ id: number; first_name: string; last_name: string }[]>([]);
  readonly activities = signal<ActivityRecord[]>([]);
  readonly pageInfo = signal<ActivitiesPage>({ page: 1, page_size: 5, total: 0, pages: 1 });
  readonly selected = signal<ActivityRecord | null>(null);
  readonly logs = signal<ActivityLog[]>([]);
  readonly error = signal('');
  readonly saving = signal(false);
  readonly dialogOpen = signal(false); readonly step = signal(0);
  participantQuery = ''; participantId: number | '' = ''; from = ''; to = ''; filterStatus = 'all';
  logParticipant: number | '' = ''; logDetails = '';
  form: ActivityInput = this.emptyForm();

  ngOnInit(): void { this.loadPeople(); this.load(); }
  canManage(): boolean { return this.auth.hasPermission('activities.manage'); }
  loadPeople(): void { this.api.participants(this.participantQuery).subscribe({
    next: (result) => this.people.set(result.participants), error: () => this.error.set('No se pudieron cargar los participantes.') }); }
  load(): void { this.api.list({ participant_id: this.participantId, from: this.from, to: this.to,
    status: this.filterStatus, page: this.pageInfo().page }).subscribe({
    next: (result) => { this.activities.set(result.activities); this.pageInfo.set(result.pagination); this.error.set(''); },
    error: () => this.error.set('No se pudo cargar el cronograma.') }); }
  filter(): void { this.pageInfo.update((page) => ({ ...page, page: 1 })); this.load(); }
  changePage(page: number): void { this.pageInfo.update((current) => ({ ...current, page })); this.load(); }
  edit(activity?: ActivityRecord): void {
    this.step.set(0); this.dialogOpen.set(true);
    this.selected.set(activity ?? null); this.logs.set([]); this.logDetails = ''; this.logParticipant = '';
    this.form = activity ? { title: activity.title, description: activity.description ?? '', responsible: activity.responsible,
      start_at: activity.start_at.replace(' ', 'T').slice(0, 16), end_at: activity.end_at.replace(' ', 'T').slice(0, 16),
      status: activity.status, participant_ids: [...activity.participant_ids] } : this.emptyForm();
    if (activity) this.api.logs(activity.id).subscribe((result) => this.logs.set(result.logs));
  }
  toggleParticipant(id: number, checked: boolean): void {
    this.form.participant_ids = checked ? [...new Set([...this.form.participant_ids, id])] : this.form.participant_ids.filter((item) => item !== id);
  }
  save(): void {
    if (this.saving()) return;
    this.saving.set(true);
    const current = this.selected();
    const call = current ? this.api.update({ ...this.form, id: current.id }) : this.api.create(this.form);
    call.subscribe({ next: () => { this.saving.set(false); this.dialogOpen.set(false); this.filter(); },
      error: () => { this.saving.set(false); this.error.set('No se pudo guardar. Revisa fechas, participantes y campos.'); } });
  }
  addLog(): void {
    const activity = this.selected();
    if (!activity || !this.logDetails.trim()) return;
    this.api.addObservation(activity.id, this.logParticipant, this.logDetails.trim()).subscribe({
      next: () => { this.logDetails = ''; this.api.logs(activity.id).subscribe((result) => this.logs.set(result.logs)); },
      error: () => this.error.set('No se pudo guardar la observación.') });
  }
  canContinue(): boolean { return this.step() === 0 ? !!this.form.title.trim() && !!this.form.responsible.trim()
    : !!this.form.start_at && !!this.form.end_at && this.form.end_at > this.form.start_at && !!this.form.participant_ids.length; }
  next(): void { if (this.canContinue()) this.step.update((value) => Math.min(2, value + 1)); }
  previous(): void { this.step.update((value) => Math.max(0, value - 1)); }
  toggleStatus(activity: ActivityRecord): void {
    const status = activity.status === 'cancelled' ? 'planned' : 'cancelled';
    const form: ActivityInput = { title: activity.title, description: activity.description ?? '', responsible: activity.responsible,
      start_at: activity.start_at.replace(' ', 'T').slice(0, 16), end_at: activity.end_at.replace(' ', 'T').slice(0, 16),
      status, participant_ids: activity.participant_ids };
    this.api.update({ ...form, id: activity.id }).subscribe({ next: () => this.filter(), error: () => this.error.set('No se pudo cambiar el estado.') });
  }
  private emptyForm(): ActivityInput {
    return { title: '', description: '', responsible: '', start_at: '', end_at: '', status: 'planned', participant_ids: [] };
  }
}
