import { HttpErrorResponse, HttpEventType, HttpResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { LucideDownload, LucidePlus, LucideRotateCcw, LucideTriangleAlert, LucideUpload } from '@lucide/angular';
import { AuthService } from '../../core/auth/auth.service';
import { BackupApiService } from './backup-api.service';

interface BackupEntry { name: string; date: string; time: number; bytes: number; }

@Component({ selector: 'pana-backups', standalone: true, imports: [LucideDownload, LucidePlus, LucideRotateCcw, LucideTriangleAlert, LucideUpload], templateUrl: './backups.component.html', styleUrl: './backups.component.scss' })
export class BackupsComponent implements OnInit {
  private readonly api = inject(BackupApiService);
  private readonly auth = inject(AuthService);
  readonly busy = signal(false); readonly progress = signal(0); readonly message = signal(''); readonly error = signal('');
  readonly operation = signal<'create' | 'download' | 'restore' | null>(null);
  readonly selectedBackup = signal('');
  readonly entries = signal<BackupEntry[]>([]);
  readonly rows = computed(() => [...this.entries()].sort((a, b) => b.time - a.time).slice(0, 10));
  readonly latest = computed(() => this.rows()[0] ?? null);

  ngOnInit(): void { this.refresh(); }

  refresh(): void {
    this.api.list().subscribe({ next: result => { this.entries.set(result.backups); this.error.set(''); },
      error: failure => this.error.set(failure.error?.error === 'nextcloud_storage_not_configured'
        ? 'Configura Nextcloud en el archivo .env del backend.' : 'No se pudo consultar Nextcloud.') });
  }

  create(): void {
    this.busy.set(true); this.operation.set('create'); this.progress.set(0); this.message.set('Guardando el respaldo en Nextcloud…'); this.error.set('');
    this.api.create().subscribe({ next: event => {
      if (event.type === HttpEventType.DownloadProgress) {
        if (event.total) this.progress.set(Math.min(100, Math.round(event.loaded * 100 / event.total)));
        this.message.set('Generando y guardando la copia…');
      }
      if (event.type === HttpEventType.Response) this.finishCreate();
    }, error: () => { this.busy.set(false); this.operation.set(null); this.error.set('No se pudo guardar el respaldo. Inténtalo de nuevo.'); this.message.set(''); } });
  }

  restoreSelected(event: Event): void {
    const input = event.target as HTMLInputElement; const file = input.files?.[0];
    if (!file) return;
    if (!file.name.toLocaleLowerCase().endsWith('.sql')) { this.error.set('Selecciona un archivo SQL de respaldo de PANA.'); input.value = ''; return; }
    const confirmed = confirm('La restauración causará una interrupción temporal: reemplazará la base de datos actual y cerrará tu sesión. ¿Deseas continuar?');
    if (!confirmed) { input.value = ''; return; }
    this.busy.set(true); this.operation.set('restore'); this.progress.set(0); this.message.set('Enviando el archivo…'); this.error.set('');
    this.uploadRestore(file, input);
  }

  restoreExisting(entry: BackupEntry): void {
    if (!confirm(`La restauración de ${entry.name} causará una interrupción temporal, reemplazará la base de datos actual y cerrará tu sesión. ¿Deseas continuar?`)) return;
    this.selectedBackup.set(entry.name); this.busy.set(true); this.operation.set('restore'); this.progress.set(0);
    this.message.set('Restaurando la copia guardada en Nextcloud…'); this.error.set('');
    this.api.restoreStored(entry.name).subscribe({ next: event => {
      if (event.type === HttpEventType.Response && event.body?.status === 'restored') this.finishRestore();
    }, error: () => this.restoreFailed() });
  }

  downloadStored(entry: BackupEntry): void {
    if (this.busy()) return;
    this.selectedBackup.set(entry.name); this.busy.set(true); this.operation.set('download'); this.progress.set(0); this.message.set('Preparando descarga…'); this.error.set('');
    this.api.downloadStored(entry.name).subscribe({ next: event => {
      if (event.type === HttpEventType.DownloadProgress && event.total) this.progress.set(Math.min(100, Math.round(event.loaded * 100 / event.total)));
      if (event.type === HttpEventType.Response) this.finish(event);
    }, error: () => { this.busy.set(false); this.operation.set(null); this.selectedBackup.set(''); this.error.set('No se pudo descargar el respaldo.'); this.message.set(''); } });
  }

  private uploadRestore(file: File, input: HTMLInputElement): void {
    this.busy.set(true); this.operation.set('restore'); this.progress.set(0); this.message.set('Enviando el archivo…'); this.error.set('');
    this.api.restore(file).subscribe({ next: event => {
      if (event.type === HttpEventType.UploadProgress) {
        if (event.total) this.progress.set(Math.min(100, Math.round(event.loaded * 100 / event.total)));
        if (this.progress() === 100) this.message.set('Aplicando el respaldo…');
      }
      if (event.type === HttpEventType.Response && event.body?.status === 'restored') {
        this.finishRestore(); input.value = '';
      }
    }, error: (failure: HttpErrorResponse) => { this.restoreFailed(failure); input.value = ''; } });
  }

  formatSize(bytes: number): string { return bytes < 1048576 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1048576).toFixed(2)} MB`; }

  private finish(response: HttpResponse<Blob>): void {
    const blob = response.body;
    if (!blob) { this.busy.set(false); this.operation.set(null); this.error.set('El servidor no devolvió el archivo de respaldo.'); return; }
    const name = /filename="?([^";]+)"?/i.exec(response.headers.get('Content-Disposition') ?? '')?.[1] ?? `pana_respaldo_${Date.now()}.sql`;
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = name; document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    this.progress.set(100); this.message.set('Respaldo descargado.'); this.busy.set(false); this.operation.set(null);
    this.refresh();
  }

  private finishCreate(): void { this.progress.set(100); this.message.set('Respaldo guardado en Nextcloud.'); this.busy.set(false); this.operation.set(null); this.refresh(); }

  private finishRestore(): void {
    this.progress.set(100); this.message.set('Respaldo restaurado. Cerrando sesión…');
    setTimeout(() => this.auth.clearSession(), 900);
  }

  private restoreFailed(failure?: HttpErrorResponse): void {
    this.busy.set(false); this.operation.set(null); this.message.set(''); this.selectedBackup.set('');
    this.error.set(failure?.error?.error === 'invalid_backup_signature'
      ? 'El archivo fue modificado o no es válido.' : 'No se pudo restaurar el respaldo. Revisa el archivo e inténtalo de nuevo.');
  }
}
