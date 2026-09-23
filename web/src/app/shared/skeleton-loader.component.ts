import { Component, input } from '@angular/core';

type SkeletonVariant = 'text' | 'title' | 'circle' | 'block';

@Component({
  selector: 'pana-skeleton',
  standalone: true,
  template: '<span class="skeleton" [class]="variant()" [style.width]="width()" aria-hidden="true"></span>',
  styles: [`
    :host { display: block; }
    .skeleton { display: block; max-width: 100%; border-radius: 8px; background: linear-gradient(90deg, #eef3f9 25%, #f6f9fd 50%, #eef3f9 75%); background-size: 200% 100%; animation: skeleton-wave 1.9s ease-in-out infinite; pointer-events: none; }
    .text { height: 12px; }
    .title { height: 18px; border-radius: 6px; }
    .circle { width: 42px; height: 42px; border-radius: 14px; }
    .block { height: 62px; border-radius: 12px; }
    @keyframes skeleton-wave { from { background-position: 200% 0; } to { background-position: -200% 0; } }
    @media (prefers-reduced-motion: reduce) { .skeleton { animation: none; } }
  `],
})
export class SkeletonLoaderComponent {
  readonly variant = input<SkeletonVariant>('text');
  readonly width = input('100%');
}
