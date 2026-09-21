import { Component, EventEmitter, OnInit, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { PeopleApiService, PersonEvent, PersonInput, PersonRecord } from './people-api.service';

@Component({
  selector: 'pana-people', standalone: true, imports: [FormsModule, MatButtonModule],
  templateUrl: './people.component.html', styleUrl: './people.component.scss',
})
export class PeopleComponent implements OnInit {
  private readonly api = inject(PeopleApiService);
  @Output() close = new EventEmitter<void>();
  readonly people = signal<PersonRecord[]>([]);
  readonly selected = signal<PersonRecord | null>(null);
  readonly history = signal<PersonEvent[]>([]);
  readonly error = signal('');
  readonly busy = signal(false);
  q = ''; type = 'all'; status = 'all'; note = '';
  form: PersonInput = this.emptyForm();

  ngOnInit(): void { this.load(); }

  load(): void {
    this.api.list({ q: this.q.trim(), type: this.type, status: this.status }).subscribe({
      next: (result) => { this.people.set(result.people); this.error.set(''); },
      error: () => this.error.set('No se pudo cargar el registro.'),
    });
  }

  edit(person?: PersonRecord): void {
    this.selected.set(person ?? null);
    this.form = person ? { ...person, types: [...person.types] } : this.emptyForm();
    this.history.set([]);
    if (person) this.api.history(person.id).subscribe((result) => this.history.set(result.history));
  }

  save(): void {
    if (this.busy()) return;
    this.busy.set(true);
    const current = this.selected();
    const request = current ? this.api.update({ ...this.form, id: current.id }) : this.api.create(this.form);
    request.subscribe({
      next: () => { this.busy.set(false); this.edit(); this.load(); },
      error: () => { this.busy.set(false); this.error.set('Revisa los datos e intenta guardar otra vez.'); },
    });
  }

  remove(person: PersonRecord): void {
    if (!window.confirm(`¿Eliminar a ${person.first_name} ${person.last_name}?`)) return;
    this.api.delete(person.id).subscribe({ next: () => { this.edit(); this.load(); },
      error: () => this.error.set('No se pudo eliminar el registro.') });
  }

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
    return { first_name: '', last_name: '', email: '', phone: '', status: 'active', types: ['participant'] };
  }
}
