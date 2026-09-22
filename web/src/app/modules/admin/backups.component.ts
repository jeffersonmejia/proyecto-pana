import { HttpErrorResponse, HttpEventType, HttpResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { LucideDownload, LucideUpload } from '@lucide/angular';
import { AuthService } from '../../core/auth/auth.service';
import { BackupApiService } from './backup-api.service';

interface BackupEntry { name: string; date: string; time: number; bytes: number; }
const STORAGE_KEY = 'pana.backup-history.v1';

@Component({ selector: 'pana-backups', standalone: true, imports: [LucideDownload, LucideUpload], templateUrl: './backups.component.html', styleUrl: './backups.component.scss' })
export class BackupsComponent {
  private readonly api = inject(BackupApiService);
  private readonly auth = inject(AuthService);
  readonly busy = signal(false); readonly progress = signal(0); readonly message = signal(''); readonly error = signal('');
  readonly operation = signal<'download' | 'restore' | null>(null);
  readonly entries = signal<BackupEntry[]>(this.readHistory());
  readonly rows = computed(() => [...this.entries()].sort((a, b) => b.time - a.time).slice(0, 10));
  readonly latest = computed(() => this.rows()[0] ?? null);

  create(): void {
    this.busy.set(true); this.operation.set('download'); this.progress.set(0); this.message.set('Preparando el respaldo…'); this.error.set('');
    this.api.create().subscribe({ next: event => {
      if (event.type === HttpEventType.DownloadProgress) {
        if (event.total) this.progress.set(Math.min(100, Math.round(event.loaded * 100 / event.total)));
        this.message.set('Descargando el archivo…');
      }
      if (event.type === HttpEventType.Response) this.finish(event);
    }, error: () => { this.busy.set(false); this.operation.set(null); this.error.set('No se pudo generar el respaldo. Inténtalo de nuevo.'); this.message.set(''); } });
  }

  restoreSelected(event: Event): void {
    const input = event.target as HTMLInputElement; const file = input.files?.[0];
    if (!file) return;
    if (!file.name.toLocaleLowerCase().endsWith('.sql')) { this.error.set('Selecciona un archivo SQL de respaldo de PANA.'); input.value = ''; return; }
    const confirmed = confirm('La restauración reemplazará todos los datos actuales por los del respaldo y cerrará tu sesión. ¿Deseas continuar?');
    if (!confirmed) { input.value = ''; return; }
    this.busy.set(true); this.operation.set('restore'); this.progress.set(0); this.message.set('Enviando el archivo…'); this.error.set('');
    this.api.restore(file).subscribe({ next: event => {
      if (event.type === HttpEventType.UploadProgress) {
        if (event.total) this.progress.set(Math.min(100, Math.round(event.loaded * 100 / event.total)));
        if (this.progress() === 100) this.message.set('Aplicando el respaldo…');
      }
      if (event.type === HttpEventType.Response && event.body?.status === 'restored') {
        this.progress.set(100); this.message.set('Respaldo restaurado. Cerrando sesión…'); input.value = '';
        setTimeout(() => this.auth.clearSession(), 900);
      }
    }, error: (failure: HttpErrorResponse) => {
      this.busy.set(false); this.operation.set(null); this.message.set(''); input.value = '';
      const code = failure.error?.error;
      this.error.set(code === 'invalid_backup_signature' ? 'El archivo fue modificado o no es válido.' : 'No se pudo cargar el respaldo. Revisa el archivo e inténtalo de nuevo.');
    } });
  }

  formatSize(bytes: number): string { return bytes < 1048576 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1048576).toFixed(2)} MB`; }

  private finish(response: HttpResponse<Blob>): void {
    const blob = response.body;
    if (!blob) { this.busy.set(false); this.operation.set(null); this.error.set('El servidor no devolvió el archivo de respaldo.'); return; }
    const name = /filename="?([^";]+)"?/i.exec(response.headers.get('Content-Disposition') ?? '')?.[1] ?? `pana_respaldo_${Date.now()}.sql`;
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = name; document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    const entry: BackupEntry = { name, date: new Date().toLocaleString('es-EC'), time: Date.now(), bytes: blob.size };
    const entries = [entry, ...this.entries()].slice(0, 10); this.entries.set(entries);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch { /* La descarga ya está completa. */ }
    this.progress.set(100); this.message.set('Respaldo descargado.'); this.busy.set(false); this.operation.set(null);
  }

  private readHistory(): BackupEntry[] {
    try { const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); return Array.isArray(value) ? value.filter(row => row && typeof row.name === 'string' && typeof row.bytes === 'number').slice(0, 10) : []; }
    catch { return []; }
  }
}
