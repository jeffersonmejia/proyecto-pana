import { Component, input, output } from '@angular/core';
import { LucideCheckCircle2, LucideX } from '@lucide/angular';

@Component({
  selector: 'pana-message-dialog',
  standalone: true,
  imports: [LucideCheckCircle2, LucideX],
  template: `<div class="message-dialog-scrim" (click)="closed.emit()"><section class="message-dialog" role="dialog" aria-modal="true" [attr.aria-labelledby]="titleId" (click)="$event.stopPropagation()"><header><span class="message-dialog-icon" aria-hidden="true"><svg lucideCheckCircle2 [size]="20"></svg></span><button type="button" class="message-dialog-close" aria-label="Cerrar" (click)="closed.emit()"><svg lucideX [size]="18"></svg></button></header><h2 [id]="titleId">{{ title() }}</h2><p>{{ message() }}</p><footer><button type="button" class="message-dialog-confirm" (click)="closed.emit()">Aceptar</button></footer></section></div>`,
  styles: [`
    :host { position: fixed; inset: 0; z-index: 40; }
    .message-dialog-scrim { display: grid; width: 100%; height: 100%; place-items: center; padding: 18px; background: color-mix(in srgb, var(--pana-ink) 40%, transparent); }
    .message-dialog { width: min(390px, 100%); padding: 20px; border: 1px solid var(--pana-outline); border-radius: var(--pana-radius); background: var(--pana-surface); }
    header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .message-dialog-icon { display: inline-grid; width: 38px; height: 38px; place-items: center; border-radius: 50%; background: var(--pana-pastel-green-bg); color: var(--pana-pastel-green-icon); }
    h2 { margin: 12px 0 8px; font-size: 1.08rem; }
    p { margin: 0; color: var(--pana-muted); font-size: .88rem; }
    .message-dialog-close { display: grid; width: 30px; height: 30px; place-items: center; border: 0; border-radius: 50%; background: transparent; color: var(--pana-muted); cursor: pointer; }
    .message-dialog-close:hover { background: var(--pana-gray-soft); color: var(--pana-text); }
    footer { display: flex; justify-content: flex-end; margin-top: 18px; }
    .message-dialog-confirm { min-height: 36px; padding: 7px 14px; border: 1px solid var(--pana-pastel-green-bg); border-radius: var(--pana-radius); background: var(--pana-pastel-green-bg); color: var(--pana-pastel-green-icon); font: inherit; font-size: .82rem; font-weight: 650; cursor: pointer; }
    .message-dialog-confirm:hover { background: var(--pana-pastel-green-icon); color: var(--pana-surface); }
  `],
})
export class MessageDialogComponent {
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly closed = output<void>();
  readonly titleId = `message-dialog-title-${Math.random().toString(36).slice(2)}`;
}
