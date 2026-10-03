import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { CoursesApiService } from '../courses/courses-api.service';

@Component({
  selector: 'pana-welcome',
  standalone: true,
  templateUrl: './welcome.component.html',
  styleUrl: './welcome.component.scss',
})
export class WelcomeComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly courses = inject(CoursesApiService);
  readonly courseName = signal('PANA');
  readonly courseDescription = signal<string | null>(null);
  readonly courseCover = signal('assets/login-pana.png');
  readonly courseId = signal<number | null>(null);
  readonly checkingSession = signal(true);
  readonly hasSession = signal(false);
  readonly enrolling = signal(false);
  readonly enrollmentSubmitted = signal(false);
  readonly error = signal('');

  constructor() {
    this.route.queryParamMap.subscribe(params => {
      const value = params.get('curso')?.trim();
      if (value) this.courseName.set(value);
      const id = Number(params.get('id'));
      const courseId = Number.isInteger(id) && id > 0 ? id : null;
      this.courseId.set(courseId);
      if (courseId) this.courses.publicWelcome(courseId).subscribe({ next: ({ course }) => {
        this.courseName.set(course.name); this.courseDescription.set(course.description); if (course.cover_available) this.courseCover.set(this.courses.publicCoverUrl(course.id));
      }, error: () => this.error.set('El curso solicitado no está disponible.') });
    });
    this.auth.restoreSession().subscribe(active => { this.hasSession.set(active); this.checkingSession.set(false); });
  }

  goLogin(): void { void this.router.navigateByUrl('/login'); }
  goRegistration(): void { void this.router.navigateByUrl('/inscripcion'); }
  enroll(): void {
    const id = this.courseId();
    if (!id || this.enrolling()) { this.error.set('Este código QR no incluye un curso válido.'); return; }
    this.enrolling.set(true); this.error.set('');
    this.courses.enroll(id).subscribe({next:result=>{this.enrolling.set(false);if(result.status==='pending'){this.enrollmentSubmitted.set(true);return;}void this.router.navigateByUrl('/cursos');},error:()=>{this.enrolling.set(false);this.error.set('No fue posible inscribirte. Revisa los cupos o tu perfil.');}});
  }
}
