import { Component, input, output } from '@angular/core';
import { LucideBookOpen, LucideClipboardCheck, LucideClock3, LucideUsersRound } from '@lucide/angular';

export interface CourseNavItem { id: string; label: string; count?: string; }

@Component({
  selector: 'pana-course-section-nav',
  standalone: true,
  imports: [LucideBookOpen, LucideClipboardCheck, LucideClock3, LucideUsersRound],
  template: `<nav class="course-section-nav" [class.collapsed]="collapsed()" role="tablist" aria-label="Secciones del curso">
    @for (item of items(); track item.id) {
      <button type="button" role="tab" [attr.aria-selected]="active() === item.id" [class.active]="active() === item.id" [class]="'nav-' + item.id" (click)="selected.emit(item.id)">
        @if (item.id === 'participants') { <svg lucideUsersRound [size]="19"></svg> }
        @if (item.id === 'attendance') { <svg lucideClock3 [size]="19"></svg> }
        @if (item.id === 'activities') { <svg lucideBookOpen [size]="19"></svg> }
        @if (item.id === 'evaluations') { <svg lucideClipboardCheck [size]="19"></svg> }
        <span class="nav-label">{{ item.label }}@if (item.count) { <small>{{ item.count }}</small> }</span><span class="nav-tooltip" aria-hidden="true">{{ item.label }}</span>
      </button>
    }
  </nav>`,
  styles: [`
    :host { display: block; min-width: 0; }
    .course-section-nav { display: grid; gap: 6px; }
    button { position: relative; display: flex; align-items: center; gap: 10px; width: 100%; min-height: 44px; padding: 9px 11px; border: 1px solid transparent; border-radius: var(--pana-radius); background: transparent; color: var(--pana-muted-strong); font: inherit; font-size: .82rem; text-align: left; cursor: pointer; }
    button svg { flex: 0 0 auto; }
    button span.nav-label { display: flex; align-items: center; justify-content: space-between; gap: 6px; width: 100%; }
    .nav-tooltip { display: none; position: absolute; left: calc(100% + 8px); top: 50%; z-index: 10; width: max-content; max-width: 220px; padding: 8px 12px; transform: translateY(-50%); border: 1px solid var(--pana-outline); border-radius: 999px; background: var(--pana-ink); color: var(--pana-surface); font-size: .78rem; font-weight: 600; white-space: nowrap; pointer-events: none; }
    .course-section-nav.collapsed button { justify-content: center; padding-inline: 0; }
    .course-section-nav.collapsed button span.nav-label { display: none; }
    .course-section-nav.collapsed button:hover .nav-tooltip { display: block; }
    small { color: currentColor; font-size: .76rem; }
    button:hover { background: var(--pana-surface-subtle); }
    button.active { border-color: var(--nav-bg); background: var(--nav-bg); color: var(--nav-fg); font-weight: 650; }
    .nav-participants { --nav-bg: var(--pana-pastel-blue-bg); --nav-fg: var(--pana-pastel-blue-icon); }
    .nav-attendance { --nav-bg: var(--pana-pastel-green-bg); --nav-fg: var(--pana-pastel-green-icon); }
    .nav-activities { --nav-bg: var(--pana-pastel-orange-bg); --nav-fg: var(--pana-pastel-orange-icon); }
    .nav-evaluations { --nav-bg: var(--pana-pastel-purple-bg); --nav-fg: var(--pana-pastel-purple-icon); }
  `],
})
export class CourseSectionNavComponent {
  readonly items = input.required<CourseNavItem[]>();
  readonly active = input.required<string>();
  readonly collapsed = input(false);
  readonly selected = output<string>();
}
