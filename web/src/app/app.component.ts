import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { environment } from '../environments/environment';

interface HealthResponse {
  status: 'ok' | 'error';
  database: 'connected' | 'unavailable';
}

@Component({
  selector: 'pana-root',
  standalone: true,
  imports: [MatButtonModule, MatCardModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  private readonly http = inject(HttpClient);
  readonly serviceStatus = signal<'checking' | 'ready' | 'error'>('checking');
  readonly databaseStatus = signal('Comprobando conexión…');

  ngOnInit(): void {
    this.refreshHealth();
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
