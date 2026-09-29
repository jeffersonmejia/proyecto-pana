import { Component, input, output } from '@angular/core';
import { LucideEye } from '@lucide/angular';

@Component({
  selector: 'pana-view-person-button',
  standalone: true,
  imports: [LucideEye],
  template: `<button type="button" class="view-person-button" aria-label="Ver participante" title="Ver participante" [disabled]="disabled()" (click)="pressed.emit()"><svg lucideEye [size]="16"></svg><span>Ver</span></button>`,
  styles: [`
    :host { display: inline-flex; }
    .view-person-button { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 34px; padding: 6px 12px; border: 1px solid var(--pana-pastel-blue-bg); border-radius: var(--pana-radius); background: var(--pana-pastel-blue-bg); color: var(--pana-pastel-blue-icon); font: inherit; font-size: .8rem; font-weight: 600; cursor: pointer; }
    @container (max-width: 900px) { .view-person-button { width: 34px; height: 34px; padding: 6px; } .view-person-button span { display: none; } }
    .view-person-button:hover { background: var(--pana-pastel-blue-bg); color: var(--pana-pastel-blue-icon); }
    .view-person-button:disabled { border-color: var(--pana-gray-soft); background: var(--pana-gray-soft); color: var(--pana-gray); opacity: .75; cursor: not-allowed; }
  `],
})
export class ViewPersonButtonComponent {
  readonly disabled = input(false);
  readonly pressed = output<void>();
}
