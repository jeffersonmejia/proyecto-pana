import { Component, input } from '@angular/core';
import { SkeletonLoaderComponent } from './skeleton-loader.component';

export type CourseSkeletonSection = 'overview' | 'participants' | 'attendance' | 'activities' | 'evaluations';

@Component({
  selector: 'pana-course-section-skeleton', standalone: true, imports: [SkeletonLoaderComponent],
  template: `
    <section class="course-section-skeleton" aria-label="Cargando sección del curso" aria-busy="true">
      @switch (section()) {
        @case ('overview') { <div class="overview-skeleton"><pana-skeleton variant="title" width="38%"/><pana-skeleton variant="text" width="62%"/><div class="metric-skeleton">@for (item of [1,2,3,4]; track item) { <pana-skeleton variant="block"/> }</div><div class="metric-skeleton">@for (item of [1,2,3,4]; track item) { <pana-skeleton variant="block"/> }</div></div> }
        @case ('participants') { <div class="table-skeleton"><div class="toolbar-skeleton"><pana-skeleton variant="title" width="180px"/><pana-skeleton variant="block" width="240px"/></div><pana-skeleton variant="text" width="70%"/>@for (item of [1,2,3,4,5,6]; track item) { <pana-skeleton variant="text" width="94%"/> }</div> }
        @case ('attendance') { <div class="table-skeleton"><div class="toolbar-skeleton"><pana-skeleton variant="title" width="160px"/><pana-skeleton variant="block" width="150px"/></div>@for (item of [1,2,3,4,5,6]; track item) { <pana-skeleton variant="text" width="96%"/> }</div> }
        @case ('activities') { <div class="activity-skeleton"><div class="toolbar-skeleton"><pana-skeleton variant="title" width="170px"/><pana-skeleton variant="block" width="130px"/></div><div class="metric-skeleton">@for (item of [1,2,3,4]; track item) { <pana-skeleton variant="block"/> }</div>@for (item of [1,2,3]; track item) { <pana-skeleton variant="block" width="100%"/> }</div> }
        @case ('evaluations') { <div class="table-skeleton"><pana-skeleton variant="title" width="180px"/>@for (item of [1,2,3,4,5]; track item) { <pana-skeleton variant="text" width="92%"/> }</div> }
      }
    </section>
  `,
  styles: [`:host { display: block; min-width: 0; } .course-section-skeleton { display: grid; gap: 18px; margin-top: 18px; } .overview-skeleton, .table-skeleton, .activity-skeleton { display: grid; gap: 18px; min-width: 0; padding: 20px 4px; } .table-skeleton, .activity-skeleton { padding: 22px 18px; border: 1px solid #e1e9f3; border-radius: 16px; background: #fff; } .metric-skeleton { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; } .toolbar-skeleton { display: flex; align-items: center; justify-content: space-between; gap: 14px; } @media (max-width: 600px) { .metric-skeleton { grid-template-columns: repeat(2, minmax(0, 1fr)); } .toolbar-skeleton { align-items: flex-start; flex-direction: column; } }`],
})
export class CourseSectionSkeletonComponent { readonly section = input<CourseSkeletonSection>('overview'); }
