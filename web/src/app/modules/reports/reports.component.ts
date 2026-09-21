import { Component, EventEmitter, OnInit, Output, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../core/auth/auth.service';
import { DocumentItem, DocumentsApiService } from './documents-api.service';
import { DashboardStats, ReportsApiService } from './reports-api.service';

@Component({ selector: 'pana-reports', standalone: true, imports: [FormsModule, MatButtonModule, DecimalPipe],
  templateUrl: './reports.component.html', styleUrl: './reports.component.scss' })
export class ReportsComponent implements OnInit {
  private readonly reportsApi = inject(ReportsApiService);
  private readonly documentsApi = inject(DocumentsApiService);
  readonly auth = inject(AuthService);
  @Output() close = new EventEmitter<void>();
  readonly dashboard = signal<DashboardStats | null>(null);
  readonly rows = signal<Record<string, unknown>[]>([]);
  readonly people = signal<{ id: number; first_name: string; last_name: string }[]>([]);
  readonly entities = signal<{ id: number; label: string }[]>([]);
  readonly documents = signal<DocumentItem[]>([]);
  readonly error = signal('');
  tab = 'dashboard'; reportType = 'attendance'; personId: number | '' = ''; from = ''; to = '';
  docType = 'person'; entityId: number | '' = ''; entityQuery = ''; file: File | null = null; uploading = false;

  ngOnInit(): void {
    if (this.auth.hasPermission('reports.read')) { this.loadDashboard(); this.loadPeople(); }
    else this.tab = 'documents';
    if (this.canReadDocuments()) this.loadEntities();
  }
  canReadDocuments(): boolean { return this.auth.hasPermission('documents.read') || this.auth.hasPermission('documents.manage'); }
  canManageDocuments(): boolean { return this.auth.hasPermission('documents.manage'); }
  setTab(tab: string): void {
    this.tab = tab;
    if (tab === 'dashboard') this.loadDashboard();
    if (tab === 'reports') this.loadReport();
    if (tab === 'documents') { this.loadEntities(); this.loadDocuments(); }
  }
  loadDashboard(): void { this.reportsApi.dashboard().subscribe({ next: (value) => this.dashboard.set(value.dashboard),
    error: () => this.error.set('No se pudo cargar el dashboard.') }); }
  loadPeople(): void { this.reportsApi.people().subscribe((result) => this.people.set(result.people)); }
  loadReport(): void { this.reportsApi.report({ type: this.reportType, person_id: this.personId, from: this.from, to: this.to }).subscribe({
    next: (result) => { this.rows.set(result.rows); this.error.set(''); }, error: () => this.error.set('No se pudo generar el reporte.') }); }
  loadEntities(): void { this.documentsApi.entities(this.docType, this.entityQuery).subscribe({
    next: (result) => this.entities.set(result.entities), error: () => this.error.set('No se pudieron cargar los registros.') }); }
  loadDocuments(): void { this.documentsApi.list(this.docType, this.entityId).subscribe({
    next: (result) => this.documents.set(result.documents), error: () => this.error.set('No se pudieron cargar los documentos.') }); }
  changeDocumentType(): void { this.entityId = ''; this.loadEntities(); this.loadDocuments(); }
  onFile(event: Event): void { this.file = (event.target as HTMLInputElement).files?.[0] ?? null; }
  upload(): void {
    if (!this.file || !this.entityId || this.uploading) return;
    if (this.file.size > 8 * 1024 * 1024) { this.error.set('El archivo supera el máximo de 8 MB.'); return; }
    this.uploading = true;
    this.documentsApi.upload(this.docType, this.entityId, this.file).subscribe({
      next: () => { this.uploading = false; this.file = null; this.loadDocuments(); },
      error: () => { this.uploading = false; this.error.set('Tipo de archivo no permitido o fallo al subirlo.'); },
    });
  }
  download(document: DocumentItem): void { this.documentsApi.download(document.id).subscribe((blob) => {
    const link = window.document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = document.original_name;
    link.click(); URL.revokeObjectURL(link.href);
  }); }
  remove(document: DocumentItem): void {
    if (!window.confirm(`¿Eliminar ${document.original_name}?`)) return;
    this.documentsApi.delete(document.id).subscribe({ next: () => this.loadDocuments(),
      error: () => this.error.set('No se pudo eliminar el documento.') });
  }
  exportCsv(): void {
    const data = this.rows(); if (!data.length) return;
    const columns = Object.keys(data[0]);
    const cell = (value: unknown) => {
      let text = value === null || value === undefined ? '' : String(value);
      if (/^[=+\-@]/.test(text)) text = `'${text}`;
      return `"${text.replaceAll('"', '""')}"`;
    };
    const csv = '\uFEFF' + [columns.map(cell).join(','), ...data.map((row) => columns.map((key) => cell(row[key])).join(','))].join('\r\n');
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = `reporte-${this.reportType}.csv`; link.click(); URL.revokeObjectURL(link.href);
  }
  columns(): string[] { return this.rows().length ? Object.keys(this.rows()[0]) : []; }
}
