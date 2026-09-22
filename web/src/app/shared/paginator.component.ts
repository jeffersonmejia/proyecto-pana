import { Component, computed, input, output } from '@angular/core';
import { LucideChevronLeft, LucideChevronRight } from '@lucide/angular';

export interface PageInfo { page: number; page_size: number; total: number; pages: number; }

@Component({ selector: 'pana-paginator', standalone: true, imports: [LucideChevronLeft, LucideChevronRight],
  template: `<nav class="pager" aria-label="Paginación">
    <span>{{ total() ? first() + 1 : 0 }}–{{ last() }} de {{ total() }}</span>
    <button type="button" aria-label="Página anterior" [disabled]="page() <= 1" (click)="pageChange.emit(page() - 1)"><svg lucideChevronLeft [size]="18"></svg></button>
    <button type="button" aria-label="Página siguiente" [disabled]="page() >= pages()" (click)="pageChange.emit(page() + 1)"><svg lucideChevronRight [size]="18"></svg></button>
  </nav>`,
  styles: [`.pager{display:flex;align-items:center;justify-content:flex-end;gap:14px;padding:12px 4px;color:#52657c;font-size:.9rem}.pager button{display:grid;place-items:center;width:38px;height:38px;border:1px solid #d2dcec;border-radius:50%;background:#fff;color:#174ea6;cursor:pointer}.pager button:disabled{opacity:.4;cursor:default}`],
})
export class PaginatorComponent {
  readonly page = input(1);
  readonly total = input(0);
  readonly pageSize = input(5);
  readonly pageChange = output<number>();
  readonly pages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  readonly first = computed(() => (this.page() - 1) * this.pageSize());
  readonly last = computed(() => Math.min(this.first() + this.pageSize(), this.total()));
}
