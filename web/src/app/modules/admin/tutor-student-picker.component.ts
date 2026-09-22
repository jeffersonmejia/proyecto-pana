import { Component, OnInit, input, output, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApiService, StudentOption } from './admin-api.service';

@Component({ selector: 'pana-tutor-student-picker', standalone: true, imports: [FormsModule],
  template: `<label>Buscar estudiantes asignados<input name="student-search" [(ngModel)]="query" (input)="search()" placeholder="Nombre o cédula"></label>
    <fieldset><legend>Estudiantes a cargo</legend>@for (student of students(); track student.id) {
      <label class="student-check"><input type="checkbox" [checked]="selectedIds().includes(student.id)"
        (change)="toggle($event, student.id)">{{ student.last_name }}, {{ student.first_name }} · {{ student.ci }}</label>
    } @empty { <p>Busca por nombre o cédula para asignar estudiantes.</p> }</fieldset>`,
  styles: [`:host{display:grid;gap:12px}label{display:grid;gap:7px}input:not([type=checkbox]){min-height:42px;padding:8px 11px;border:1px solid #c8d6e9;border-radius:10px;font:inherit}fieldset{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 16px;max-height:300px;overflow:auto;border:1px solid #d7e2f2;border-radius:14px;padding:14px}legend{padding:0 6px;color:#52657c}.student-check{display:flex;align-items:center;gap:8px}p{margin:0;color:#68778a}@media(max-width:720px){fieldset{grid-template-columns:1fr}}`],
})
export class TutorStudentPickerComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  readonly userId = input<number | null>(null);
  readonly selectedIds = input<number[]>([]);
  readonly selectedIdsChange = output<number[]>();
  readonly students = signal<StudentOption[]>([]);
  query = '';

  ngOnInit(): void { if (this.userId()) this.search(); }

  search(): void {
    if (this.query.trim().length < 2 && !this.userId()) return;
    this.api.students(this.query.trim(), this.userId()).subscribe((result) => this.students.set(result.students));
  }

  toggle(event: Event, id: number): void {
    const current = this.selectedIds();
    const selected = (event.target as HTMLInputElement).checked;
    this.selectedIdsChange.emit(selected ? [...new Set([...current, id])] : current.filter((value) => value !== id));
  }
}
