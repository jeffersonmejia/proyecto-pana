import { Component, EventEmitter, OnInit, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { ActivitiesApiService, ActivityInput, ActivityLog, ActivityRecord } from './activities-api.service';

@Component({ selector: 'pana-activities', standalone: true, imports: [FormsModule, MatButtonModule],
  templateUrl: './activities.component.html', styleUrl: './activities.component.scss' })
export class ActivitiesComponent implements OnInit {
  private readonly api = inject(ActivitiesApiService);
  @Output() close = new EventEmitter<void>();
  readonly people = signal<{ id: number; first_name: string; last_name: string }[]>([]);
  readonly activities = signal<ActivityRecord[]>([]);
  readonly selected = signal<ActivityRecord | null>(null);
  readonly logs = signal<ActivityLog[]>([]);
  readonly error = signal('');
  readonly saving = signal(false);
  participantQuery = ''; participantId: number | '' = ''; from = ''; to = ''; filterStatus = 'all';
  logParticipant: number | '' = ''; logDetails = '';
  form: ActivityInput = this.emptyForm();

  ngOnInit(): void { this.loadPeople(); this.load(); }
  loadPeople(): void { this.api.participants(this.participantQuery).subscribe({
    next: (result) => this.people.set(result.participants), error: () => this.error.set('No se pudieron cargar los participantes.') }); }
  load(): void { this.api.list({ participant_id: this.participantId, from: this.from, to: this.to, status: this.filterStatus }).subscribe({
    next: (result) => { this.activities.set(result.activities); this.error.set(''); }, error: () => this.error.set('No se pudo cargar el cronograma.') }); }
  edit(activity?: ActivityRecord): void {
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
    call.subscribe({ next: () => { this.saving.set(false); this.edit(); this.load(); },
      error: () => { this.saving.set(false); this.error.set('No se pudo guardar. Revisa fechas, participantes y campos.'); } });
  }
  addLog(): void {
    const activity = this.selected();
    if (!activity || !this.logDetails.trim()) return;
    this.api.addObservation(activity.id, this.logParticipant, this.logDetails.trim()).subscribe({
      next: () => this.edit(activity), error: () => this.error.set('No se pudo guardar la observación.') });
  }
  private emptyForm(): ActivityInput {
    return { title: '', description: '', responsible: '', start_at: '', end_at: '', status: 'planned', participant_ids: [] };
  }
}
