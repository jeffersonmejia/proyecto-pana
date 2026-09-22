import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApiService, BeneficiaryOption } from './admin-api.service';

@Component({
  selector: 'pana-beneficiary-picker', standalone: true, imports: [FormsModule],
  template: `<label>Buscar beneficiario existente
    <div class="search"><input name="beneficiary-search" [(ngModel)]="query" placeholder="CI, nombre o correo">
      <button type="button" (click)="search()">Buscar</button></div>
  </label>
  @if (error) { <p role="alert">{{ error }}</p> }
  @if (people.length) { <fieldset><legend>Personas disponibles</legend>
    @for (person of people; track person.id) {
      <label class="option"><input type="radio" name="beneficiary-person" [checked]="personId === person.id"
        (change)="personSelected.emit(person)">{{ person.first_name }} {{ person.last_name }} · {{ person.ci || 'Sin CI' }} · {{ person.email || 'Sin correo' }}</label>
    }
  </fieldset>}`,
  styles: [`:host{display:grid;gap:10px}.search{display:flex;gap:8px}.search input{flex:1;min-width:0}
    button{border:1px solid #1a73e8;border-radius:999px;background:#fff;color:#174ea6;padding:8px 14px;cursor:pointer}
    fieldset{display:grid;gap:8px;max-height:240px;overflow:auto;border:1px solid #d7e2f2;border-radius:12px;padding:12px}
    .option{display:flex;gap:8px;align-items:center}`],
})
export class BeneficiaryPickerComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  @Input() personId: number | null = null;
  @Input() personName = '';
  @Output() personSelected = new EventEmitter<BeneficiaryOption>();
  query = '';
  people: BeneficiaryOption[] = [];
  error = '';

  ngOnInit(): void {
    if (this.personId) { this.query = this.personName.trim(); this.search(); }
  }

  search(): void {
    if (this.query.trim().length < 2) { this.error = 'Escribe al menos dos caracteres.'; return; }
    this.error = '';
    this.api.beneficiaryPeople(this.query.trim(), this.personId).subscribe({
      next: (result) => { this.people = result.people; },
      error: () => { this.error = 'No se pudo buscar beneficiarios.'; },
    });
  }
}
