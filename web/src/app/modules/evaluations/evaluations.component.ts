import { Component, EventEmitter, OnInit, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PaginatorComponent } from '../../shared/paginator.component';
import { StepDialogComponent } from '../../shared/step-dialog.component';
import { LucidePencil, LucidePlus, LucideToggleLeft, LucideToggleRight } from '@lucide/angular';
import { AuthService } from '../../core/auth/auth.service';
import { EvaluationAnswer, EvaluationInput, EvaluationPage, EvaluationRecord, EvaluationType, EvaluationsApiService } from './evaluations-api.service';

@Component({ selector: 'pana-evaluations', standalone: true, imports: [FormsModule, PaginatorComponent,
  StepDialogComponent, LucidePencil, LucidePlus, LucideToggleLeft, LucideToggleRight],
  templateUrl: './evaluations.component.html', styleUrl: './evaluations.component.scss' })
export class EvaluationsComponent implements OnInit {
  private readonly api = inject(EvaluationsApiService);
  readonly auth = inject(AuthService);
  @Output() close = new EventEmitter<void>();
  readonly people = signal<{ id: number; first_name: string; last_name: string }[]>([]);
  readonly criteria = signal<import('./evaluations-api.service').Criterion[]>([]);
  readonly records = signal<EvaluationRecord[]>([]);
  readonly pageInfo = signal<EvaluationPage>({ page: 1, page_size: 5, total: 0, pages: 1 });
  readonly selected = signal<EvaluationRecord | null>(null);
  readonly detail = signal<EvaluationRecord | null>(null);
  readonly error = signal('');
  readonly saving = signal(false);
  readonly dialogOpen = signal(false); readonly criterionDialogOpen = signal(false); readonly step = signal(0);
  type: EvaluationType = 'participant'; query = ''; personId: number | '' = ''; from = ''; to = '';
  criterionName = ''; criterionDescription = '';
  form: EvaluationInput = this.emptyForm();

  ngOnInit(): void {
    if (!this.canViewType('participant')) this.type = 'satisfaction';
    this.loadCriteria(); this.loadPeople(); this.load();
  }
  canManage(): boolean { return this.auth.hasPermission('evaluations.manage'); }
  canManageCriteria(): boolean { return this.auth.hasPermission('evaluations.criteria.manage'); }
  canViewType(type: EvaluationType): boolean {
    const roles = this.auth.user()?.roles ?? [];
    if (roles.some((role) => ['admin', 'coordinator'].includes(role))) return true;
    return type === 'participant' ? roles.some((role) => ['tutor', 'student'].includes(role)) : roles.includes('beneficiary');
  }
  setType(type: EvaluationType): void {
    if (!this.canViewType(type)) return;
    this.type = type; this.personId = ''; this.pageInfo.update((page) => ({ ...page, page: 1 }));
    this.selected.set(null); this.detail.set(null); this.dialogOpen.set(false); this.form = this.emptyForm();
    this.loadPeople(); this.load();
  }
  loadPeople(): void { this.api.people(this.type, this.query).subscribe({
    next: (result) => this.people.set(result.people), error: () => this.error.set('No se pudieron cargar los registros de personas.') }); }
  loadCriteria(): void { this.api.criteria().subscribe({ next: (result) => {
    this.criteria.set(result.criteria);
    if (!this.selected() && this.type === 'participant') this.form = this.emptyForm();
  },
    error: () => this.error.set('No se pudieron cargar los criterios.') }); }
  load(): void { this.api.list(this.type, this.personId, this.from, this.to, this.pageInfo().page).subscribe({
    next: (result) => { this.records.set(result.evaluations); this.pageInfo.set(result.pagination); this.error.set(''); },
    error: () => this.error.set('No se pudieron consultar los resultados.') }); }
  filter(): void { this.pageInfo.update((page) => ({ ...page, page: 1 })); this.load(); }
  changePage(page: number): void { this.pageInfo.update((current) => ({ ...current, page })); this.load(); }
  edit(record?: EvaluationRecord): void {
    this.step.set(0); this.dialogOpen.set(true); this.selected.set(record ?? null); this.detail.set(null);
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
    call.subscribe({ next: () => { this.saving.set(false); this.dialogOpen.set(false); this.filter(); },
      error: () => { this.saving.set(false); this.error.set('No se pudo guardar. Revisa persona, fecha y puntuaciones.'); } });
  }
  addCriterion(): void {
    this.api.createCriterion({ name: this.criterionName.trim(), description: this.criterionDescription.trim() }).subscribe({
      next: () => { this.criterionName = ''; this.criterionDescription = ''; this.criterionDialogOpen.set(false); this.loadCriteria(); },
      error: () => this.error.set('No se pudo crear el criterio.') });
  }
  toggleCriterion(item: import('./evaluations-api.service').Criterion): void {
    this.api.updateCriterion({ ...item, is_active: !item.is_active }).subscribe({ next: () => this.loadCriteria(),
      error: () => this.error.set('No se pudo actualizar el criterio.') });
  }
  openCriterion(): void { this.criterionDialogOpen.set(true); }
  canContinue(): boolean { return this.step() === 0 ? !!this.form.person_id && !!this.form.evaluated_on
    : this.type === 'satisfaction' ? !!this.form.satisfaction_score : !!this.form.answers.length; }
  next(): void { if (this.canContinue()) this.step.update((value) => Math.min(2, value + 1)); }
  previous(): void { this.step.update((value) => Math.max(0, value - 1)); }
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
