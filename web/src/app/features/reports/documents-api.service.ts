import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface DocumentItem {
  id: number; entity_type: string; entity_id: number; original_name: string;
  mime_type: string; file_size: number; created_at: string; uploader: string | null;
}
export interface DocumentsPage { page: number; page_size: number; total: number; pages: number; }

@Injectable({ providedIn: 'root' })
export class DocumentsApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/documents`;
  entities(type: string, q = '') {
    return this.http.get<{ entities: { id: number; label: string }[] }>(`${this.url}/entities`, { params: { type, q } });
  }
  list(type: string, id: number | '', page = 1) {
    let params = new HttpParams().set('type', type);
    if (id) params = params.set('entity_id', id);
    return this.http.get<{ documents: DocumentItem[]; pagination: DocumentsPage }>(this.url, { params: params.set('page', page) });
  }
  upload(type: string, id: number, file: File) {
    const form = new FormData(); form.append('entity_type', type); form.append('entity_id', String(id)); form.append('file', file);
    return this.http.post<{ id: number }>(this.url, form);
  }
  download(id: number) { return this.http.get(`${this.url}?id=${id}`, { responseType: 'blob' }); }
  delete(id: number) { return this.http.delete(this.url, { params: { id } }); }
}
