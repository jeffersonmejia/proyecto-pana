import { Component, input, output } from '@angular/core';
import { LucideX } from '@lucide/angular';

@Component({
  selector: 'pana-confirmation-dialog',
  standalone: true,
  imports: [LucideX],
  template: `<div class="confirmation-scrim" (click)="closed.emit()"><section class="confirmation-dialog" role="dialog" aria-modal="true" [attr.aria-labelledby]="titleId" (click)="$event.stopPropagation()"><header><h2 [id]="titleId">{{ title() }}</h2><button type="button" class="confirmation-close" aria-label="Cerrar" (click)="closed.emit()"><svg lucideX [size]="18" aria-hidden="true"></svg></button></header><p>{{ message() }}</p><footer><button type="button" class="confirmation-cancel" [disabled]="saving()" (click)="closed.emit()">{{ cancelLabel() }}</button><button type="button" class="confirmation-confirm" [disabled]="saving()" (click)="confirmed.emit()">{{ saving() ? savingLabel() : confirmLabel() }}</button></footer></section></div>`,
  styles: [`
    :host { position: fixed; inset: 0; z-index: 40; }
    .confirmation-scrim { display: grid; width: 100%; height: 100%; place-items: center; padding: 18px; background: color-mix(in srgb, var(--pana-ink) 40%, transparent); }
    .confirmation-dialog { width: min(390px, 100%); padding: 20px; border: 1px solid var(--pana-outline); border-radius: var(--pana-radius); background: var(--pana-surface); }
    header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
    h2 { margin: 0 0 8px; font-size: 1.08rem; }
    p { margin: 0; color: var(--pana-muted); font-size: .88rem; }
    .confirmation-close { display: grid; width: 30px; height: 30px; place-items: center; border: 0; border-radius: 50%; background: transparent; color: var(--pana-muted); cursor: pointer; }
    .confirmation-close:hover { background: var(--pana-surface-subtle); color: var(--pana-text); }
    footer { display: flex; justify-content: flex-end; gap: 8px; margin-top: 18px; }
    footer button { min-height: 36px; padding: 7px 13px; border: 1px solid var(--pana-outline); border-radius: var(--pana-radius); font: inherit; font-size: .82rem; cursor: pointer; }
    .confirmation-cancel { background: var(--pana-surface-subtle); color: var(--pana-muted-strong); }
    .confirmation-confirm { border-color: var(--pana-danger); background: var(--pana-danger); color: var(--pana-surface); }
    footer button:disabled { opacity: .55; cursor: default; }
  `],
})
export class ConfirmationDialogComponent {
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly confirmLabel = input('Confirmar');
  readonly cancelLabel = input('Cancelar');
  readonly savingLabel = input('Guardando…');
  readonly saving = input(false);
  readonly titleId = `confirmation-title-${Math.random().toString(36).slice(2)}`;
  readonly confirmed = output<void>();
  readonly closed = output<void>();
}
