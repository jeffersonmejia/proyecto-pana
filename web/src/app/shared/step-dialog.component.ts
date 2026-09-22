import { Component, input, output } from '@angular/core';
import { LucideX } from '@lucide/angular';

@Component({ selector: 'pana-step-dialog', standalone: true, imports: [LucideX],
  template: `<div class="dialog-scrim" (click)="close.emit()"><section class="dialog" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
    <header><div><h2>{{ title() }}</h2><p>Paso {{ step() + 1 }} de {{ steps().length }} · {{ steps()[step()] }}</p></div>
      <button class="icon-button" type="button" aria-label="Cerrar" (click)="close.emit()"><svg lucideX [size]="20"></svg></button></header>
    <div class="progress" aria-hidden="true"><span [style.width.%]="((step() + 1) / steps().length) * 100"></span></div>
    <div class="dialog-body"><ng-content /></div>
    <footer><button type="button" class="secondary" [disabled]="step() === 0" (click)="previous.emit()">Anterior</button>
      @if (step() < steps().length - 1) { <button type="button" class="primary" [disabled]="!canContinue()" (click)="next.emit()">Continuar</button> }
      @else { <button type="button" class="primary" [disabled]="saving() || !canSave()" (click)="save.emit()">{{ saving() ? 'Guardando…' : 'Guardar' }}</button> }
    </footer>
  </section></div>`,
  styles: [`.dialog-scrim{position:fixed;inset:0;z-index:20;display:grid;place-items:center;padding:20px;background:#172b4d66}.dialog{display:grid;grid-template-rows:auto 3px minmax(0,1fr) auto;width:min(640px,100%);max-height:min(760px,92vh);border:1px solid #d7e2f2;border-radius:24px;background:white;color:#202124}.dialog header,.dialog footer{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:20px 24px}.dialog header{border-bottom:1px solid #edf1f7}.dialog h2,.dialog p{margin:0}.dialog h2{font-size:1.35rem}.dialog p{margin-top:4px;color:#5f6f84;font-size:.9rem}.progress{background:#edf3fc}.progress span{display:block;height:3px;background:#4285f4;transition:width 180ms ease}.dialog-body{overflow:auto;padding:24px}.dialog footer{border-top:1px solid #edf1f7}.primary,.secondary,.icon-button{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:42px;padding:8px 16px;border:1px solid #d2dcec;border-radius:999px;background:#fff;color:#174ea6;font:inherit;cursor:pointer}.primary{border-color:#1a73e8;background:#1a73e8;color:#fff}.icon-button{width:40px;padding:0;border:0;color:#52657c}.dialog button:disabled{opacity:.45;cursor:default}@media(prefers-reduced-motion:reduce){.progress span{transition:none}}`],
})
export class StepDialogComponent {
  readonly title = input.required<string>();
  readonly steps = input.required<string[]>();
  readonly step = input(0);
  readonly saving = input(false);
  readonly canContinue = input(true);
  readonly canSave = input(true);
  readonly close = output<void>();
  readonly previous = output<void>();
  readonly next = output<void>();
  readonly save = output<void>();
}
