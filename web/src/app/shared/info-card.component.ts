import { NgComponentOutlet } from '@angular/common';
import { Component, Type, input } from '@angular/core';

export type InfoCardTone = 'blue' | 'purple' | 'green' | 'orange' | 'yellow';

@Component({
  selector: 'pana-info-card',
  standalone: true,
  imports: [NgComponentOutlet],
  template: `<article class="info-card" [class]="'tone-' + tone()">
    <div class="icon-box"><ng-container *ngComponentOutlet="icon()"></ng-container></div>
    <div class="content"><span class="title">{{ title() }}</span><strong>{{ value() }}</strong></div>
  </article>`,
  styles: [`
    :host { display: block; min-width: 0; }
    .info-card { display: grid; grid-template-columns: 40px minmax(0, 1fr); align-items: center; gap: 8px; min-height: 74px; padding: 12px; border: 1px solid var(--pana-outline); border-radius: var(--pana-radius); background: var(--pana-surface); color: var(--pana-text); box-sizing: border-box; }
    .icon-box { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 10px; }
    .icon-box > * { width: 20px; height: 20px; }
    .content { display: grid; gap: 6px; min-width: 0; }
    .title { color: var(--pana-muted-strong); font-size: .75rem; line-height: 1.1; }
    strong { color: var(--pana-text); font-size: .86rem; font-weight: 650; line-height: 1.2; overflow-wrap: anywhere; }
    .tone-blue .icon-box { background: var(--pana-pastel-blue-bg); color: var(--pana-pastel-blue-icon); }
    .tone-purple .icon-box { background: var(--pana-pastel-purple-bg); color: var(--pana-pastel-purple-icon); }
    .tone-green .icon-box { background: var(--pana-pastel-green-bg); color: var(--pana-pastel-green-icon); }
    .tone-orange .icon-box { background: var(--pana-pastel-orange-bg); color: var(--pana-pastel-orange-icon); }
    .tone-yellow .icon-box { background: var(--pana-pastel-yellow-bg); color: var(--pana-pastel-yellow-icon); }
  `],
})
export class InfoCardComponent {
  readonly icon = input.required<Type<unknown>>();
  readonly title = input.required<string>();
  readonly value = input.required<string>();
  readonly tone = input<InfoCardTone>('blue');
}
