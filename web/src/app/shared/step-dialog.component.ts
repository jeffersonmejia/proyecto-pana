import { Component, input, output } from '@angular/core';
import { LucideX } from '@lucide/angular';

@Component({
  selector: 'pana-step-dialog',
  standalone: true,
  imports: [LucideX],
  template: `<div class="dialog-scrim" (click)="close.emit()"><section class="dialog" [class.wide]="wide()" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
    <header><div><h2>{{ title() }}</h2>@if (steps().length > 1) { <p>Paso {{ step() + 1 }} de {{ steps().length }} &#183; {{ steps()[step()] }}</p> }</div><button class="icon-button" type="button" aria-label="Cerrar" (click)="close.emit()"><svg lucideX [size]="20"></svg></button></header>
    @if (steps().length > 1) { <nav class="dialog-steps" aria-label="Progreso del formulario"><div class="dialog-stepper" role="list">@for (stepName of steps(); track stepName; let index = $index) {<span class="dialog-step-item" [class.active]="index === step()" [class.completed]="index < step()" role="listitem"><span class="dialog-step-dot">{{ index + 1 }}</span><span class="dialog-step-name">{{ stepName }}</span></span>@if (index < steps().length - 1) {<i class="dialog-step-line" [class.completed]="index < step()"></i>}}</div></nav> }
    <div class="dialog-body"><ng-content /></div><footer>@if (steps().length > 1) { <button type="button" class="secondary" [disabled]="step() === 0" (click)="previous.emit()">Anterior</button> } @if (step() < steps().length - 1) {<button type="button" class="primary" [disabled]="!canContinue()" (click)="next.emit()">Siguiente</button>} @else {<button type="button" class="primary" [disabled]="saving() || !canSave()" (click)="save.emit()">{{ saving() ? 'Guardando...' : 'Guardar' }}</button>}</footer>
  </section></div>`,
  styleUrl: './step-dialog.component.scss',
})
export class StepDialogComponent {
  readonly title = input.required<string>(); readonly wide = input(false); readonly steps = input.required<string[]>(); readonly step = input(0); readonly saving = input(false); readonly canContinue = input(true); readonly canSave = input(true);
  readonly close = output<void>(); readonly previous = output<void>(); readonly next = output<void>(); readonly save = output<void>();
}
