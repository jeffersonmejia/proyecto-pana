import { HttpClient, HttpEvent } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class BackupApiService {
  private readonly http = inject(HttpClient);
  create(): Observable<HttpEvent<Blob>> {
    return this.http.post(`${environment.apiBaseUrl}/admin/backups`, null, {
      observe: 'events' as const, reportProgress: true, responseType: 'blob' as const,
    });
  }

  restore(file: File): Observable<HttpEvent<{ status: string }>> {
    const form = new FormData(); form.append('backup', file, file.name);
    return this.http.post<{ status: string }>(`${environment.apiBaseUrl}/admin/backups/restore`, form, {
      observe: 'events' as const, reportProgress: true,
    });
  }
}
