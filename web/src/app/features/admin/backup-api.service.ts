import { HttpClient, HttpEvent } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class BackupApiService {
  private readonly http = inject(HttpClient);
  list() { return this.http.get<{ backups: { name: string; date: string; time: number; bytes: number }[] }>(`${environment.apiBaseUrl}/admin/backups`); }
  create(): Observable<HttpEvent<{ status: string; name: string; bytes: number; date: string }>> {
    return this.http.post<{ status: string; name: string; bytes: number; date: string }>(`${environment.apiBaseUrl}/admin/backups`, null, {
      observe: 'events' as const, reportProgress: true,
    });
  }

  downloadStored(name: string): Observable<HttpEvent<Blob>> {
    return this.http.get(`${environment.apiBaseUrl}/admin/backups/download`, {
      params: { name }, observe: 'events' as const, reportProgress: true, responseType: 'blob' as const,
    });
  }

  restore(file: File): Observable<HttpEvent<{ status: string }>> {
    const form = new FormData(); form.append('backup', file, file.name);
    return this.http.post<{ status: string }>(`${environment.apiBaseUrl}/admin/backups/restore`, form, {
      observe: 'events' as const, reportProgress: true,
    });
  }

  restoreStored(name: string): Observable<HttpEvent<{ status: string }>> {
    return this.http.post<{ status: string }>(`${environment.apiBaseUrl}/admin/backups/restore-stored`, { name }, {
      observe: 'events' as const, reportProgress: true,
    });
  }
}
