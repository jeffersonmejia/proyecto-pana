import { Component, EventEmitter, OnInit, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../core/auth/auth.service';
import { EvaluationAnswer, EvaluationInput, EvaluationRecord, EvaluationType, EvaluationsApiService } from './evaluations-api.service';

@Component({ selector: 'pana-evaluations', standalone: true, imports: [FormsModule, MatButtonModule],
  templateUrl: './evaluations.component.html', styleUrl: './evaluations.component.scss' })
export class EvaluationsComponent implements OnInit {
  private readonly api = inject(EvaluationsApiService);
  readonly auth = inject(AuthService);
  @Output() close = new EventEmitter<void>();
  readonly people = signal<{ id: number; first_name: string; last_name: string }[]>([]);
  readonly criteria = signal<import('./evaluations-api.service').Criterion[]>([]);
  readonly records = signal<EvaluationRecord[]>([]);
  readonly selected = signal<EvaluationRecord | null>(null);
  readonly detail = signal<EvaluationRecord | null>(null);
  readonly error = signal('');
  readonly saving = signal(false);
  type: EvaluationType = 'participant'; query = ''; personId: number | '' = ''; from = ''; to = '';
  criterionName = ''; criterionDescription = '';
  form: EvaluationInput = this.emptyForm();

  ngOnInit(): void { this.loadCriteria(); this.loadPeople(); this.load(); }
  canManage(): boolean { return this.auth.hasPermission('evaluations.manage'); }
  setType(type: EvaluationType): void {
    this.type = type; this.personId = ''; this.selected.set(null); this.detail.set(null); this.form = this.emptyForm();
    this.loadPeople(); this.load();
  }
  loadPeople(): void { this.api.people(this.type, this.query).subscribe({
    next: (result) => this.people.set(result.people), error: () => this.error.set('No se pudieron cargar los registros de personas.') }); }
  loadCriteria(): void { this.api.criteria().subscribe({ next: (result) => {
    this.criteria.set(result.criteria);
    if (!this.selected() && this.type === 'participant') this.form = this.emptyForm();
  },
    error: () => this.error.set('No se pudieron cargar los criterios.') }); }
  load(): void { this.api.list(this.type, this.personId, this.from, this.to).subscribe({
    next: (result) => { this.records.set(result.evaluations); this.error.set(''); }, error: () => this.error.set('No se pudieron consultar los resultados.') }); }
  edit(record?: EvaluationRecord): void {
    this.selected.set(record ?? null); this.detail.set(null);
    if (!record) { this.form = this.emptyForm(); return; }
    this.api.one(record.id).subscribe(({ evaluation }) => {
      this.detail.set(evaluation);
      this.form = { evaluation_type: evaluation.evaluation_type, person_id: evaluation.person_id,
        evaluated_on: evaluation.evaluated_on, satisfaction_score: evaluation.satisfaction_score,
        observations: evaluation.observations ?? '', answers: evaluation.answers ?? [] };
    });
  }
  setScore(criterionId: number, score: number): void {
    const answer = this.form.answers.find((item) => item.criterion_id === criterionId);
    if (answer) answer.score = score;
    else this.form.answers.push({ criterion_id: criterionId, score, note: '' });
  }
  answerScore(criterionId: number): number {
    return this.form.answers.find((item) => item.criterion_id === criterionId)?.score ?? 3;
  }
  activeCriteria(): import('./evaluations-api.service').Criterion[] { return this.criteria().filter((item) => Boolean(item.is_active)); }
  save(): void {
    if (this.saving()) return;
    this.saving.set(true); const current = this.selected();
    const call = current ? this.api.update({ ...this.form, id: current.id }) : this.api.create(this.form);
    call.subscribe({ next: () => { this.saving.set(false); this.edit(); this.load(); },
      error: () => { this.saving.set(false); this.error.set('No se pudo guardar. Revisa persona, fecha y puntuaciones.'); } });
  }
  addCriterion(): void {
    this.api.createCriterion({ name: this.criterionName.trim(), description: this.criterionDescription.trim() }).subscribe({
      next: () => { this.criterionName = ''; this.criterionDescription = ''; this.loadCriteria(); },
      error: () => this.error.set('No se pudo crear el criterio.') });
  }
  toggleCriterion(item: import('./evaluations-api.service').Criterion): void {
    this.api.updateCriterion({ ...item, is_active: !item.is_active }).subscribe({ next: () => this.loadCriteria(),
      error: () => this.error.set('No se pudo actualizar el criterio.') });
  }
  private emptyForm(): EvaluationInput {
    return { evaluation_type: this.type, person_id: this.personId || 0, evaluated_on: this.today(),
      satisfaction_score: null, observations: '', answers: this.type === 'participant'
        ? this.activeCriteria().map((item) => ({ criterion_id: item.id, score: 3, note: '' })) : [] };
  }
  private today(): string {
    const date = new Date(); date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 10);
  }
}
