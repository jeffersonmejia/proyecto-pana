import { Component, input, output } from '@angular/core';
import { LucideX } from '@lucide/angular';

@Component({
  selector: 'pana-confirmation-dialog',
  standalone: true,
  imports: [LucideX],
  template: `<div class="confirmation-scrim" (click)="closed.emit()"><section class="confirmation-dialog" role="dialog" aria-modal="true" [attr.aria-labelledby]="titleId" (click)="$event.stopPropagation()"><header><h2 [id]="titleId">{{ title() }}</h2><button type="button" class="confirmation-close" aria-label="Cerrar" (click)="closed.emit()"><svg lucideX [size]="18" aria-hidden="true"></svg></button></header><p>{{ message() }}</p><footer><button type="button" class="confirmation-cancel" [disabled]="saving()" (click)="closed.emit()">{{ cancelLabel() }}</button><button type="button" class="confirmation-confirm" [disabled]="saving()" (click)="confirmed.emit()">{{ saving() ? savingLabel() : confirmLabel() }}</button></footer></section></div>`,
  styles: [`
    :host { position: fixed; inset: 0; z-index: 40; }
    .confirmation-scrim { display: grid; width: 100%; height: 100%; place-items: center; padding: 18px; background: color-mix(in srgb, var(--pana-ink) 32%, transparent); }
    .confirmation-dialog { width: min(540px, calc(100vw - 36px)); padding: 28px; border: 1px solid var(--pana-outline); border-radius: 22px; background: var(--pana-surface); }
    header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
    h2 { margin: 0; color: var(--pana-ink); font-size: 1.25rem; line-height: 1.3; }
    p { margin: 12px 0 22px; color: var(--pana-muted); font-size: .98rem; line-height: 1.45; }
    .confirmation-close { display: grid; width: 30px; height: 30px; place-items: center; border: 0; border-radius: 50%; background: transparent; color: var(--pana-muted); cursor: pointer; }
    .confirmation-close:hover { background: var(--pana-surface-subtle); color: var(--pana-text); }
    footer { display: flex; justify-content: flex-end; gap: 14px; }
    footer button { min-width: 126px; min-height: 52px; padding: 10px 20px; border: 1px solid var(--pana-outline); border-radius: 18px; background: var(--pana-surface); color: var(--pana-muted-strong); font: inherit; font-size: .98rem; font-weight: 650; cursor: pointer; }
    footer .confirmation-confirm { border-color: var(--pana-primary); background: var(--pana-primary); color: var(--pana-surface); }
    footer button:disabled { opacity: .55; cursor: default; }
    @media (max-width: 520px) { .confirmation-dialog { padding: 22px; border-radius: var(--pana-radius); } footer { gap: 8px; } footer button { min-width: 0; flex: 1; } }
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
