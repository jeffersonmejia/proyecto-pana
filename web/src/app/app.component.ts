import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { environment } from '../environments/environment';
import { AuthService } from './core/auth/auth.service';
import { LoginComponent } from './modules/auth/login.component';
import { AccessAdminComponent } from './modules/admin/access-admin.component';
import { PeopleComponent } from './modules/people/people.component';
import { AttendanceComponent } from './modules/attendance/attendance.component';
import { ActivitiesComponent } from './modules/activities/activities.component';
import { EvaluationsComponent } from './modules/evaluations/evaluations.component';

interface HealthResponse {
  status: 'ok' | 'error';
  database: 'connected' | 'unavailable';
}

@Component({
  selector: 'pana-root',
  standalone: true,
  imports: [MatButtonModule, MatCardModule, LoginComponent, AccessAdminComponent, PeopleComponent, AttendanceComponent, ActivitiesComponent, EvaluationsComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  private readonly http = inject(HttpClient);
  readonly auth = inject(AuthService);
  readonly sessionReady = signal(false);
  readonly showAdmin = signal(false);
  readonly showPeople = signal(false);
  readonly showAttendance = signal(false);
  readonly showActivities = signal(false);
  readonly showEvaluations = signal(false);
  readonly serviceStatus = signal<'checking' | 'ready' | 'error'>('checking');
  readonly databaseStatus = signal('Comprobando conexión…');

  ngOnInit(): void {
    this.refreshHealth();
    this.auth.restoreSession().subscribe(() => this.sessionReady.set(true));
  }

  logout(): void {
    this.showAdmin.set(false);
    this.showPeople.set(false);
    this.showAttendance.set(false);
    this.showActivities.set(false);
    this.showEvaluations.set(false);
    this.auth.logout().subscribe();
  }

  refreshHealth(): void {
    this.serviceStatus.set('checking');
    this.databaseStatus.set('Comprobando conexión…');
    this.http.get<HealthResponse>(`${environment.apiBaseUrl}/health`).subscribe({
      next: (health) => {
        this.serviceStatus.set(health.status === 'ok' ? 'ready' : 'error');
        this.databaseStatus.set(
          health.database === 'connected' ? 'Base de datos conectada' : 'Base de datos no disponible',
        );
      },
      error: () => {
        this.serviceStatus.set('error');
        this.databaseStatus.set('No se pudo conectar con el backend');
      },
    });
  }
}
