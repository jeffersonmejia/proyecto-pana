import { Component, EventEmitter, OnInit, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { PaginatorComponent } from '../../shared/paginator.component';
import { StepDialogComponent } from '../../shared/step-dialog.component';
import { LucidePencil, LucidePlus, LucideToggleLeft, LucideToggleRight } from '@lucide/angular';
import { PeopleApiService, PersonEvent, PersonInput, PersonRecord, PeoplePage } from './people-api.service';

@Component({
  selector: 'pana-people', standalone: true, imports: [FormsModule, PaginatorComponent,
    StepDialogComponent, LucidePencil, LucidePlus, LucideToggleLeft, LucideToggleRight],
  templateUrl: './people.component.html', styleUrl: './people.component.scss',
})
export class PeopleComponent implements OnInit {
  private readonly api = inject(PeopleApiService);
  readonly auth = inject(AuthService);
  @Output() close = new EventEmitter<void>();
  readonly people = signal<PersonRecord[]>([]);
  readonly pageInfo = signal<PeoplePage>({ page: 1, page_size: 5, total: 0, pages: 1 });
  readonly selected = signal<PersonRecord | null>(null);
  readonly history = signal<PersonEvent[]>([]);
  readonly error = signal('');
  readonly busy = signal(false);
  readonly dialogOpen = signal(false); readonly step = signal(0);
  q = ''; type = 'all'; status = 'all'; note = '';
  form: PersonInput = this.emptyForm();

  ngOnInit(): void { this.load(); }

  load(): void {
    this.api.list({ q: this.q.trim(), type: this.type, status: this.status, page: this.pageInfo().page }).subscribe({
      next: (result) => { this.people.set(result.people); this.pageInfo.set(result.pagination); this.error.set(''); },
      error: () => this.error.set('No se pudo cargar el registro.'),
    });
  }

  filter(): void { this.pageInfo.update((page) => ({ ...page, page: 1 })); this.load(); }
  changePage(page: number): void { this.pageInfo.update((value) => ({ ...value, page })); this.load(); }

  edit(person?: PersonRecord): void {
    this.step.set(0); this.dialogOpen.set(true);
    this.selected.set(person ?? null);
    this.form = person ? { ...this.emptyForm(), ...person, types: [...person.types] } : this.emptyForm();
    this.history.set([]);
    if (person) this.api.history(person.id).subscribe((result) => this.history.set(result.history));
  }

  save(): void {
    if (this.busy()) return;
    this.busy.set(true);
    const current = this.selected();
    const request = current ? this.api.update({ ...this.form, id: current.id }) : this.api.create(this.form);
    request.subscribe({
      next: () => { this.busy.set(false); this.dialogOpen.set(false); this.filter(); },
      error: () => { this.busy.set(false); this.error.set('Revisa los datos e intenta guardar otra vez.'); },
    });
  }

  toggleStatus(person: PersonRecord): void {
    this.api.update({ ...person, status: person.status === 'active' ? 'inactive' : 'active' }).subscribe({
      next: () => this.filter(), error: () => this.error.set('No se pudo cambiar el estado.'),
    });
  }

  canContinue(): boolean {
    const email = this.form.email?.trim() ?? '';
    const ci = this.form.ci?.trim() ?? '';
    return !!this.form.first_name.trim() && !!this.form.last_name.trim() && !!this.form.types.length
      && (!ci || /^[A-Za-z0-9-]{5,20}$/.test(ci))
      && (!this.selected()?.has_account || (!!ci && !!email))
      && (!email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
  }
  next(): void { if (this.canContinue()) this.step.set(1); }

  addNote(): void {
    const person = this.selected();
    if (!person || !this.note.trim()) return;
    this.api.addNote(person.id, this.note.trim()).subscribe({
      next: () => { this.note = ''; this.edit(person); },
      error: () => this.error.set('No se pudo guardar la nota.'),
    });
  }

  toggleType(type: string, checked: boolean): void {
    this.form.types = checked ? [...new Set([...this.form.types, type])] : this.form.types.filter((item) => item !== type);
  }

  private emptyForm(): PersonInput {
    return { ci: '', first_name: '', last_name: '', email: '', phone: '', birth_date: '',
      address: '', observations: '', status: 'active', types: ['participant'] };
  }
}
