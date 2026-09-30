import { AfterViewChecked, Component, HostListener, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { DocumentsApiService } from '../reports/documents-api.service';
import { AttendanceApiService } from '../attendance/attendance-api.service';
import { PaginatorComponent } from '../../shared/paginator.component';
import { StepDialogComponent } from '../../shared/step-dialog.component';
import { ConfirmationDialogComponent } from '../../shared/confirmation-dialog.component';
import { CourseSectionSkeletonComponent } from '../../shared/course-section-skeleton.component';
import { CourseNavItem, CourseSectionNavComponent } from '../../shared/course-section-nav.component';
import { SkeletonLoaderComponent } from '../../shared/skeleton-loader.component';
import { ViewPersonButtonComponent } from '../../shared/view-person-button.component';
import { Observable, forkJoin } from 'rxjs';
import { LucideBan, LucideBookOpen, LucideCheck, LucideClipboardCheck, LucideUsersRound, LucideClock3, LucidePlus, LucideFileText, LucideUpload, LucideEye, LucideArrowDownUp, LucideList, LucidePencil, LucideTrash, LucidePower, LucideArrowLeft, LucidePaperclip, LucideDownload, LucideHouse, LucidePanelLeftClose, LucidePanelLeftOpen } from '@lucide/angular';
import { LucideGraduationCap, LucideUserRound, LucideWrench } from '@lucide/angular';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Course, CourseSections, CoursesApiService } from './courses-api.service';

type CourseTab = 'overview' | 'participants' | 'attendance' | 'activities' | 'evaluations';
type ParticipantTableRow = CourseSections['participants'][number] & { isTechnicianRow?: boolean; technician_active?: boolean; participant_active?: boolean; participant_status?: 'active'|'inactive' };
  @Component({ selector: 'pana-course-detail', standalone: true, imports: [FormsModule, PaginatorComponent, StepDialogComponent, ConfirmationDialogComponent, CourseSectionSkeletonComponent, CourseSectionNavComponent, SkeletonLoaderComponent, ViewPersonButtonComponent, LucideBan, LucideBookOpen, LucideCheck, LucideClipboardCheck, LucideUsersRound, LucideClock3, LucidePlus, LucideFileText, LucideUpload, LucideEye, LucideArrowDownUp, LucideList, LucidePencil, LucideTrash, LucidePower, LucideArrowLeft, LucidePaperclip, LucideDownload, LucideHouse, LucidePanelLeftClose, LucidePanelLeftOpen, LucideGraduationCap, LucideUserRound, LucideWrench], templateUrl: './course-detail.component.html', styleUrl: './course-detail.component.scss' })
export class CourseDetailComponent implements OnInit, AfterViewChecked {
  private readonly route=inject(ActivatedRoute); private readonly router=inject(Router);
  private readonly api=inject(CoursesApiService);
  private readonly documentsApi=inject(DocumentsApiService);
  private readonly attendanceApi=inject(AttendanceApiService);
  readonly auth=inject(AuthService);
  readonly course=input.required<Course>(); readonly back=output<void>();
  readonly data=signal<CourseSections|null>(null); readonly loading=signal(true); readonly sectionLoading=signal(false); readonly error=signal('');
  private loadingStartedAt=0;
  readonly active=signal<CourseTab>('participants');
  readonly markingAttendance=signal<number|null>(null); readonly attendanceError=signal('');
  readonly participantBulkActivating=signal(false);
    readonly attendanceRowErrors=signal<Record<number,{message:string;field:'in'|'out'}>>({});
  readonly maxAttendanceDate=this.today(); readonly attendanceDate=signal(this.maxAttendanceDate);
  readonly attendancePage=signal(1); readonly attendancePageSize=10;
  readonly participantPage=signal(1); readonly participantPageSize=10;
  readonly tabs: {id: CourseTab; label: string}[]=[{id:'participants',label:'Participantes'},
    {id:'attendance',label:'Asistencia'},
    {id:'activities',label:'Actividades'},{id:'evaluations',label:'Evidencias'}];
  readonly visibleTabs = computed(() => this.isLearner() ? this.tabs.filter(tab => tab.id !== 'participants' && tab.id !== 'evaluations') : this.tabs);
  readonly navigationItems = computed<CourseNavItem[]>(() => this.visibleTabs().map(tab => ({ id: tab.id, label: tab.label, count: !this.loading() && this.data() && (tab.id !== 'attendance' || this.isStudent()) ? `(${tab.id === 'attendance' ? this.attendanceHours() : this.tabCount(tab.id)})` : undefined })));
  readonly attendanceHours=computed(()=>{const hours=(this.data()?.participants??[]).reduce((sum,row)=>sum+Number(row.attendance_minutes??0),0)/60;return Number.isInteger(hours)?String(hours):hours.toFixed(1);});
  readonly completedTasks=computed(()=>((this.data()?.activities??[]).filter(task=>task.status==='completed').length));
  capacityPercent(): number { const limit=Number(this.course().max_participants??0); return limit>0 ? Math.min(100,Math.round(Number(this.course().participant_count??0)*100/limit)) : 0; }
  readonly participantQuery=signal('');
  readonly participantProfileFilter=signal<'all'|'beneficiary'|'student'|'technician'>('all');
  readonly participantProfileCounts=computed(()=>{const participants=this.data()?.participants??[];const technicians=this.data()?.technicians??[];return {all:participants.length+technicians.length,beneficiary:participants.filter(person=>person.profile==='Beneficiario').length,student:participants.filter(person=>person.profile==='Estudiante').length,technician:technicians.length};});
  readonly allParticipantsActive=computed(()=>{const participants=this.data()?.participants??[];return participants.length>0&&participants.every(person=>person.participant_status!=='inactive');});
  readonly participantRows=computed<ParticipantTableRow[]>(()=>{const q=this.participantQuery().trim().toLocaleLowerCase();const participants=(this.data()?.participants??[]).map(person=>({...person,participant_active:true})) as ParticipantTableRow[];const technicians=(this.data()?.technicians??[]).map((technician,index)=>({id:-Number(technician.id||index+1),ci:technician.ci??'—',phone:technician.phone,sector:null,self_identification:null,has_disability:null,disability_type:null,education:null,birth_city:null,first_name:technician.first_name,last_name:technician.last_name,birth_date:null,name:`${technician.first_name} ${technician.last_name}`.trim(),profile:'Responsable',attendance_count:0,attendance_minutes:0,last_attendance:null,last_attendance_status:null,selected_attendance_id:null,selected_attendance_status:null,selected_check_in:null,selected_check_out:null,task_count:0,evaluation_count:0,technician_active:technician.status!=='inactive',isTechnicianRow:true} as ParticipantTableRow));return [...participants,...technicians].filter(p=>!q||p.name.toLocaleLowerCase().includes(q));});
  readonly filteredParticipantRows=computed(()=>{const profile=this.participantProfileFilter();return this.participantRows().filter(person=>profile==='all'||(profile==='technician'&&person.isTechnicianRow)||(profile==='beneficiary'&&!person.isTechnicianRow&&person.profile==='Beneficiario')||(profile==='student'&&!person.isTechnicianRow&&person.profile==='Estudiante'));});
  readonly participantPageRows=computed(()=>{const rows=this.filteredParticipantRows();const start=(this.participantPage()-1)*this.participantPageSize;return rows.slice(start,start+this.participantPageSize).map(person=>({...person,phone:person.phone??'',first_name:`${person.last_name}\n${person.first_name.replace(new RegExp('^'+person.last_name+'\\s*','i'),'').trim()}`,last_name:this.ageFromBirthDate(person.birth_date),evaluation_count:person.phone as unknown as number}));});
  readonly attendanceSort=signal<'participant'|'technician'>('participant'); readonly attendanceSortDirection=signal<'asc'|'desc'>('asc');
  readonly attendanceEditing=signal<{personId:number;field:'in'|'out'}|null>(null); readonly attendanceEditTime=signal('');
  readonly attendanceDeleteTarget=signal<{personId:number;attendanceId:number;field:'in'|'out';checkIn:string|null;checkOut:string|null}|null>(null);
  readonly attendanceTimes=Array.from({length: 8 * 60 + 1}, (_, index) => { const minutes=8 * 60 + 30 + index; return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`; });
  readonly attendancePageRows=computed(()=>{const records=this.data()?.attendance??[];const selectedDate=this.attendanceDate();const people=[...(this.data()?.participants??[])].map(person=>{const record=records.find(row=>Number(row.participant_id)===Number(person.id)&&String(row.attendance_date).slice(0,10)===selectedDate);return record?{...person,selected_attendance_id:Number(record.id),selected_attendance_status:record.status,selected_check_in:record.check_in,selected_check_out:record.check_out}:person;});const field=this.attendanceSort();const direction=this.attendanceSortDirection()==='asc'?1:-1;people.sort((a,b)=>{const first=(field==='participant'?`${a.last_name} ${a.first_name}`:this.technicianFor(a.id)||'').trim();const second=(field==='participant'?`${b.last_name} ${b.first_name}`:this.technicianFor(b.id)||'').trim();return first.localeCompare(second,'es',{sensitivity:'base'})*direction;});const start=(this.attendancePage()-1)*this.attendancePageSize;return people.slice(start,start+this.attendancePageSize);});
  readonly taskError=signal(''); readonly taskSaving=signal(false); readonly uploadingTask=signal<number|null>(null); readonly taskAttachmentDragging=signal(false); taskAttachment: File|null=null;
  readonly evidenceFeedback=signal<{task:number;type:'success'|'error';text:string}|null>(null);
  readonly weeklyEvidenceRows=signal<NonNullable<CourseSections['weeks']>>([]); readonly weeklyUploading=signal<number|null>(null); readonly weeklyFeedback=signal('');
  readonly pdfDialog=signal(false); readonly pdfGenerating=signal(false); readonly pdfGenerated=signal(false); readonly pdfProfiles=signal({beneficiary:true,student:false,technician:false});
  readonly taskDialog=signal(false); readonly taskStep=signal(0); readonly taskEditing=signal<number|null>(null); readonly taskEditingStatus=signal('planned'); readonly taskExistingAttachment=signal<CourseSections['documents'][number]|null>(null); readonly taskToDelete=signal<CourseSections['activities'][number]|null>(null); readonly taskActionSaving=signal(false); readonly taskStatusFilter=signal<'active'|'inactive'|'all'>('active');
  readonly expandedTask=signal<number|null>(null); readonly draggingTask=signal<number|null>(null);
  readonly activityPage=signal(false);
  readonly navigationCollapsed=signal(this.readNavigationCollapsed());
  taskForm={title:'',description:'',responsible:'',start_at:'',end_at:'',participant_ids:[] as number[]};
  toggleNavigation(): void { this.navigationCollapsed.update(collapsed=>{ const next=!collapsed; this.persistNavigationCollapsed(next); return next; }); }
  private navigationStorageKey(): string { return `pana.course-navigation.collapsed.${this.auth.user()?.id ?? 'default'}`; }
  private readNavigationCollapsed(): boolean { try { return typeof localStorage !== 'undefined' && localStorage.getItem(this.navigationStorageKey()) === 'true'; } catch { return false; } }
  private persistNavigationCollapsed(collapsed:boolean): void { try { if(typeof localStorage !== 'undefined') localStorage.setItem(this.navigationStorageKey(),String(collapsed)); } catch { /* La preferencia visual no debe bloquear la navegación. */ } }
  ngAfterViewChecked(): void { const people=this.participantPageRows(); document.querySelectorAll<HTMLTableElement>('.participant-table-technician,.participant-table-phone,.participant-table-profile').forEach(table=>Array.from(table.tBodies[0]?.rows||[]).forEach((row,index)=>{const person=people[index];const disabled=!person?.phone;row.classList.toggle('whatsapp-disabled',disabled);row.querySelector('.whatsapp-phone-chip')?.classList.toggle('whatsapp-disabled',disabled);})); }
  ngOnInit(): void { this.navigationCollapsed.set(this.readNavigationCollapsed()); const activityId=Number(this.route.snapshot.paramMap.get('activityId')); const today=this.today(); const start=this.course().start_date; const end=this.attendanceMaxDate(); this.attendanceDate.set(today<start?start:today>end?end:today); if(this.route.snapshot.queryParamMap.get('tab')==='participants'&&!this.isLearner())this.active.set('participants'); if(this.isLearner())this.active.set('attendance'); if(activityId>0){this.activityPage.set(true);this.active.set('activities');this.expandedTask.set(activityId);} this.loadWeeklyEvidence(); this.reload(); }
  loadWeeklyEvidence(): void { this.api.weeklyEvidence(this.course().id).subscribe({next:result=>this.weeklyEvidenceRows.set(result.weeks??[]),error:()=>this.weeklyFeedback.set('No se pudo cargar la evidencia semanal.')}); }
  uploadWeeklyEvidence(week:number,event:Event): void { const file=(event.target as HTMLInputElement).files?.[0]; if(!file)return; if(file.type!=='application/pdf'){this.weeklyFeedback.set('Solo se permite un archivo PDF por semana.');return;} this.weeklyUploading.set(week); this.weeklyFeedback.set(''); this.api.uploadWeeklyEvidence(this.course().id,week,file).subscribe({next:()=>{this.weeklyUploading.set(null);this.loadWeeklyEvidence();},error:()=>{this.weeklyUploading.set(null);this.weeklyFeedback.set('No se pudo subir la evidencia semanal.');}}); (event.target as HTMLInputElement).value=''; }
  deleteWeeklyEvidence(row:NonNullable<CourseSections['weeks']>[number]): void { if(!row.id||!this.isTechnician())return; this.api.deleteWeeklyEvidence(this.course().id,row.id).subscribe({next:()=>this.loadWeeklyEvidence(),error:()=>this.weeklyFeedback.set('No se pudo eliminar la evidencia semanal.')}); }
  downloadWeeklyEvidence(row:NonNullable<CourseSections['weeks']>[number]): void { if(!row.id||!row.original_name)return; this.api.downloadWeeklyEvidence(this.course().id,row.id).subscribe(blob=>{const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=row.original_name??'evidencia.pdf';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}); }
  reload(afterLoad?:()=>void): void { this.loadingStartedAt=Date.now();this.loading.set(true);this.api.sections(this.course().id,this.attendanceDate()).subscribe({next:value=>this.finishLoad(value,afterLoad),error:()=>{this.error.set('No se pudo cargar la información de este curso.');this.finishLoad(null);}}); }
  private reloadAttendance(afterLoad?:()=>void): void { this.api.sections(this.course().id,this.attendanceDate()).subscribe({next:value=>{this.data.set(value);afterLoad?.();},error:()=>{this.attendanceError.set('No se pudo actualizar la asistencia.');}}); }
  private finishLoad(value:CourseSections|null,afterLoad?:()=>void): void { const wait=Math.max(0,700-(Date.now()-this.loadingStartedAt));setTimeout(()=>{if(value)this.data.set(value);this.loading.set(false);afterLoad?.();},wait); }
    attendanceMaxDate(): string { const today=this.today(); const end=this.course().end_date; return end<today?end:today; }
    setAttendanceDate(date:string): void { if(!date||date<this.course().start_date||date>this.attendanceMaxDate())return; this.attendanceDate.set(date);this.attendancePage.set(1);this.attendanceError.set('');this.attendanceRowErrors.set({});this.reload(); }
  changeAttendancePage(page:number): void { this.attendancePage.set(page); }
  sortAttendance(field:'participant'|'technician'): void { if(this.attendanceSort()===field)this.attendanceSortDirection.update(value=>value==='asc'?'desc':'asc'); else { this.attendanceSort.set(field); this.attendanceSortDirection.set('asc'); } this.attendancePage.set(1); }
  setParticipantQuery(query:string): void { this.participantQuery.set(query);this.participantPage.set(1); }
  setParticipantProfileFilter(profile:'all'|'beneficiary'|'student'|'technician'): void { this.participantProfileFilter.set(profile);this.participantPage.set(1); }
  changeParticipantPage(page:number): void { this.participantPage.set(page); }
  openPerson(id:number): void {
    const personId=id<0?Math.abs(id):id;
    const person=this.participantRows().find(row=>Math.abs(Number(row.id))===personId);
    const preview=person ? { first_name: person.first_name, last_name: person.last_name, types: [person.isTechnicianRow ? 'technician' : person.profile] } : undefined;
    void this.router.navigate(['/cursos', this.course().id, 'participantes', personId], {state: {person: preview}});
  }
  @HostListener('click', ['$event'])
  openParticipantWhatsApp(event: MouseEvent): void { const target=event.target as HTMLElement; const cell=target.closest('td') as HTMLTableCellElement|null; const table=target.closest('table') as HTMLTableElement|null; if(!cell||!table||!table.matches('.participant-table-technician,.participant-table-phone,.participant-table-profile')||cell.cellIndex!==3)return; const row=cell.parentElement; const rows=table.tBodies[0]?.rows; const rowIndex=row&&rows?Array.from(rows).indexOf(row as HTMLTableRowElement):-1; const person=rowIndex>=0?this.participantPageRows()[rowIndex]:null; if(!person||!person.phone)return; const phone=String(person.phone).replace(/\D/g,''); if(!phone)return; const normalized=phone.startsWith('593')?phone:phone.startsWith('0')?'593'+phone.slice(1):'593'+phone; const role=person.isTechnicianRow||person.profile==='Responsable'?'técnico':person.profile==='Estudiante'?'estudiante voluntario':'beneficiario'; const text=`Hola, eres ${role} del curso ${this.course().name} en fecha ${this.course().start_date} al ${this.course().end_date}.`; const encoded=encodeURIComponent(text); const mobile=/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent); const url=mobile?`whatsapp://send?phone=${normalized}&text=${encoded}`:`https://web.whatsapp.com/send?phone=${normalized}&text=${encoded}`; if(mobile)window.location.href=url; else window.open(url,'_blank','noopener,noreferrer'); }
  @HostListener('mouseover', ['$event'])
  updateWhatsAppState(event: MouseEvent): void { const target=event.target as HTMLElement; const cell=target.closest('td') as HTMLTableCellElement|null; const table=target.closest('table') as HTMLTableElement|null; if(!cell||!table||!table.matches('.participant-table-technician,.participant-table-phone,.participant-table-profile')||cell.cellIndex!==3)return; const row=cell.parentElement; const rows=table.tBodies[0]?.rows; const rowIndex=row&&rows?Array.from(rows).indexOf(row as HTMLTableRowElement):-1; const person=rowIndex>=0?this.participantPageRows()[rowIndex]:null; row?.classList.toggle('whatsapp-disabled',!person?.phone); }
  printParticipants(): void { this.pdfProfiles.set({beneficiary:true,student:false,technician:false}); this.pdfGenerated.set(false); this.pdfDialog.set(true); }
  cancelPdfDialog(): void { if(!this.pdfGenerating())this.pdfDialog.set(false); }
  togglePdfProfile(profile:'beneficiary'|'student'|'technician'): void { this.pdfProfiles.update(value=>({...value,[profile]:!value[profile]})); }
  generatePdf(): void { if(this.pdfGenerating())return; this.pdfGenerating.set(true); setTimeout(()=>{this.generateParticipantsPdf(); this.pdfGenerating.set(false); this.pdfGenerated.set(true);},550); }
  private pdfProfileSelected(person: ParticipantTableRow): boolean { const selection=this.pdfProfiles(); const profile=person.isTechnicianRow||person.profile==='Responsable'?'technician':person.profile==='Estudiante'?'student':'beneficiary'; return selection[profile]; }
  private generateParticipantsPdf(): void {
    const doc = new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
    const courseName = this.course().name || 'Curso';
    const generatedAt = new Intl.DateTimeFormat('es-EC',{dateStyle:'medium',timeStyle:'short'}).format(new Date());
    const generatedBy = this.pdfGeneratedBy();
    doc.setProperties({title:`Participantes - ${courseName}`,subject:'Listado de participantes'});
    const rows = this.participantRows().filter(person=>this.pdfProfileSelected(person)).map((person,index)=>[
      String(index+1), person.name, this.ageFromBirthDate(person.birth_date), person.ci || '-', person.phone || '-',
      person.sector || '-', person.self_identification || '-', person.has_disability === 'Si' ? (person.disability_type || 'Si') : 'No',
      person.education || '-', person.birth_city || '-'
    ]);
    autoTable(doc,{startY:42,margin:{top:42,right:12,bottom:16,left:12},head:[['No.','Apellidos y nombres','Edad','Cédula','Teléfono','Sector','Auto-identificación','Discapacidad','Instrucción','Ciudad de nacimiento']],body:rows,
      theme:'grid',tableWidth:'wrap',styles:{font:'helvetica',fontSize:6.5,overflow:'linebreak',cellPadding:1.8,cellWidth:'wrap',lineColor:[0,0,0],lineWidth:.3},headStyles:{fillColor:[255,255,255],textColor:[0,0,0],fontStyle:'normal',fontSize:6.5,overflow:'linebreak',lineColor:[0,0,0],lineWidth:.3},alternateRowStyles:{fillColor:[248,248,248],textColor:[0,0,0]},columnStyles:{0:{cellWidth:8},1:{cellWidth:30},2:{cellWidth:10},3:{cellWidth:20},4:{cellWidth:20},5:{cellWidth:20},6:{cellWidth:25},7:{cellWidth:20},8:{cellWidth:20},9:{cellWidth:21}},didDrawPage:()=>{
        doc.setFontSize(15);doc.setTextColor(0,0,0);doc.text('Listado de participantes',12,15);
        doc.setFontSize(9);doc.setTextColor(0,0,0);doc.text(courseName,12,22);doc.text(`Generado: ${generatedAt}`,12,27);doc.text(`Generado por: ${generatedBy}`,12,32);
        doc.setFontSize(8);doc.setTextColor(0,0,0);doc.text(`Página ${doc.getNumberOfPages()}`,285,202,{align:'right'});
        doc.setFontSize(8);doc.setTextColor(0,0,0);doc.text(`Pagina ${doc.getNumberOfPages()}`,198,287,{align:'right'});
      }});
    doc.save(`${this.fileName(courseName)}_${this.pdfTimestamp()}.pdf`);
  }
  private pdfGeneratedBy(): string { const user=this.auth.user(); const name=[user?.first_name,user?.last_name].filter(value=>typeof value==='string'&&value.trim()).join(' ')||user?.email||'Usuario'; const role=user?.roles?.[0]??''; const feminine=['femenino','mujer'].includes((user?.gender??'').toLocaleLowerCase()); const labels:Record<string,string>={coordinator:feminine?'Coordinadora':'Coordinador',admin:feminine?'Administradora':'Administrador',tecnico:'Técnico',student:'Estudiante',volunteer:'Voluntario',beneficiary:'Beneficiario'}; return `${name} · ${labels[role]??role}`; }
  private fileName(value:string): string { return value.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'') || 'curso'; }
  private pdfTimestamp(): string { const now=new Date(); const pad=(value:number)=>String(value).padStart(2,'0'); return `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`; }
  participantAttendanceHours(person: CourseSections['participants'][number]): string { const hours=Number(person.attendance_minutes ?? 0)/60; return Number.isInteger(hours)?String(hours):hours.toFixed(1); }
  profileChipClass(person:{profile:string;isTechnicianRow?:boolean}): string { if(person.isTechnicianRow&&!this.isTechnician()){ person.isTechnicianRow=false; return 'profile-chip technician-chip'; } if(person.profile==='Responsable')return 'profile-chip technician-chip'; if(person.profile==='Beneficiario')return 'profile-chip beneficiary-chip'; if(person.profile==='Estudiante')return 'profile-chip student-chip'; return 'profile-chip'; }
  attendanceTotalDuration(minutes:number|null|undefined): string { const total=Math.max(0,Number(minutes??0)); return `${Math.floor(total/60)}h ${total%60}m`; }
  ageFromBirthDate(value: string | null): string { if (!value) return '—'; const birth = new Date(`${value}T00:00:00`), today = new Date(); let age = today.getFullYear() - birth.getFullYear(); const beforeBirthday = today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate()); return String(age - (beforeBirthday ? 1 : 0)); }
  isTechnician(): boolean { const roles=this.auth.user()?.roles??[]; return roles.some(role=>['tecnico','technician','tutor'].includes(role.toLowerCase())); }
  isCoordinator(): boolean { return this.auth.user()?.roles.includes('coordinator') ?? false; }
  canManageTechnicianStatus(): boolean { return this.auth.hasPermission('courses.manage') || this.auth.hasPermission('courses.manage.all'); }
  canToggleParticipantStatus(person: ParticipantTableRow): boolean { return !person.isTechnicianRow && (this.isTechnician() || this.canManageTechnicianStatus()); }
  toggleParticipantStatus(person: ParticipantTableRow): void { if (!this.canToggleParticipantStatus(person)) return; const status=person.participant_status==='inactive'?'active':'inactive'; this.api.setParticipantStatus(this.course().id,person.id,status).subscribe({next:()=>this.data.update(value=>value?{...value,participants:value.participants.map(row=>row.id===person.id?{...row,participant_status:status}:row)}:value),error:()=>this.error.set('No se pudo cambiar el estado del participante.')}); }
  toggleAllParticipants(): void {
    if(!this.isTechnician()||this.participantBulkActivating())return;
    const participants=this.data()?.participants??[];
    if(!participants.length)return;
    const status=this.allParticipantsActive()?'inactive':'active';
    this.participantBulkActivating.set(true); this.error.set('');
    forkJoin(participants.map(person=>this.api.setParticipantStatus(this.course().id,person.id,status))).subscribe({
      next:()=>{this.data.update(value=>value?{...value,participants:value.participants.map(person=>({...person,participant_status:status}))}:value);this.participantBulkActivating.set(false);},
      error:()=>{this.participantBulkActivating.set(false);this.error.set('No se pudo cambiar el estado de todos los participantes. Se actualizará el estado real.');this.reload();},
    });
  }
  toggleTechnicianStatus(person: ParticipantTableRow): void { if (!person.isTechnicianRow || !this.canManageTechnicianStatus()) return; const technicianId=Math.abs(person.id); const status=person.technician_active===false?'active':'inactive'; this.api.setTecnicoStatus(this.course().id,technicianId,status).subscribe({next:()=>this.data.update(value=>value?{...value,technicians:value.technicians.map(row=>row.id===technicianId?{...row,status}:row)}:value),error:()=>this.error.set('No se pudo cambiar el estado del técnico.')}); }
  canMarkAttendance(): boolean { return this.auth.hasPermission('attendance.manage') && !this.isLearner(); }
  isBeneficiary(): boolean { return this.auth.user()?.roles.includes('beneficiary') ?? false; }
  isStudent(): boolean { return this.auth.user()?.roles.includes('student') ?? false; }
  isLearner(): boolean { const roles = this.auth.user()?.roles ?? []; return roles.includes('beneficiary') || roles.includes('student'); }
  attendanceLabel(status:string|null): string { return status==='present'?'Presente':status==='absent'?'Ausente':status==='excused'?'Justificado':'Sin registros'; }
  attendanceDisplayStatus(person:{selected_attendance_status:'present'|'absent'|'excused'|null;selected_check_in:string|null}): string {
    return person.selected_attendance_status==='present'&&this.isLate(person.selected_check_in)?'Atraso':this.attendanceLabel(person.selected_attendance_status);
  }
  isLate(time:string|null): boolean { return !!time&&time.slice(0,5)>'08:00'; }
  editAttendanceTime(person:{id:number;selected_check_in:string|null;selected_check_out:string|null}, field:'in'|'out'): void {
    this.attendanceEditing.set({personId:person.id,field});
    this.attendanceEditTime.set((field==='in'?person.selected_check_in:person.selected_check_out)?.slice(0,5) ?? this.currentTime());
  }
    cancelAttendanceEdit(): void { this.attendanceEditing.set(null); this.attendanceEditTime.set(''); }
    requestDeleteAttendance(person:{id:number;selected_attendance_id:number|null;selected_check_in:string|null;selected_check_out:string|null},field:'in'|'out'): void {
      if(!person.selected_attendance_id||field==='in'&&!!person.selected_check_out)return;
      if(field==='out'&&!person.selected_check_out)return;
      this.attendanceDeleteTarget.set({personId:person.id,attendanceId:Number(person.selected_attendance_id),field,checkIn:person.selected_check_in,checkOut:person.selected_check_out});
    }
    closeDeleteAttendance(): void { if(this.markingAttendance()===null)this.attendanceDeleteTarget.set(null); }
    confirmDeleteAttendance(): void {
      const target=this.attendanceDeleteTarget();
      if(!target||this.markingAttendance()!==null)return;
      this.markingAttendance.set(target.personId);
      const checkIn=target.field==='in'?'':target.checkIn?.slice(0,5)??'';
      const checkOut=target.field==='out'?'':target.checkOut?.slice(0,5)??'';
      this.attendanceApi.correct({id:target.attendanceId,participant_id:target.personId,attendance_date:this.attendanceDate(),status:'present',check_in:checkIn,check_out:checkOut,note:'',correction_reason:target.field==='in'?'Eliminación de hora de llegada':'Eliminación de hora de salida'}).subscribe({
        next:()=>{this.markingAttendance.set(null);this.attendanceDeleteTarget.set(null);this.reloadAttendance(()=>this.active.set('attendance'));},
        error:()=>{this.markingAttendance.set(null);this.attendanceDeleteTarget.set(null);this.setAttendanceError(target.personId,'No se pudo eliminar la hora.',target.field);}
      });
    }
    attendanceTimeChanged(person:{selected_check_in:string|null;selected_check_out:string|null}): boolean {
      const editing=this.attendanceEditing();
      if(!editing) return false;
      const original=(editing.field==='in'?person.selected_check_in:person.selected_check_out)?.slice(0,5) ?? '';
      return this.attendanceEditTime()!==original;
    }
    saveAttendanceTime(person:{id:number;selected_attendance_id:number|null;selected_check_in:string|null;selected_check_out:string|null}): void {
      const recordId=person.selected_attendance_id;
      const editing=this.attendanceEditing();
      if (!recordId || !editing || !this.attendanceEditTime()) return;
      if (!this.attendanceTimeChanged(person)) { this.cancelAttendanceEdit(); return; }
    const checkIn=editing.field==='in'?this.attendanceEditTime():(person.selected_check_in?.slice(0,5) ?? '');
    const checkOut=editing.field==='out'?this.attendanceEditTime():(person.selected_check_out?.slice(0,5) ?? '');
    this.markingAttendance.set(person.id);
    this.attendanceApi.correct({id:recordId,participant_id:person.id,attendance_date:this.attendanceDate(),status:'present',check_in:checkIn,check_out:checkOut,note:'',correction_reason:'Edición de hora de asistencia'}).subscribe({
        next:()=>{ this.markingAttendance.set(null); this.cancelAttendanceEdit(); this.reloadAttendance(()=>this.active.set('attendance')); },
        error:()=>{ this.markingAttendance.set(null); this.setAttendanceError(person.id,'No se pudo actualizar la hora de asistencia.',editing.field); }
      });
    }
    attendanceRowError(id:number,field:'in'|'out'='in'): string { const error=this.attendanceRowErrors()[id]; return error?.field===field?error.message:''; }
    private setAttendanceError(id:number,message:string,field:'in'|'out'='in'): void {
      if(this.isTechnician()) this.attendanceRowErrors.update(errors=>({...errors,[id]:{message,field}}));
      else this.attendanceError.set(message);
    }
    private clearAttendanceError(id:number): void {
      this.attendanceRowErrors.update(errors=>{const next={...errors};delete next[id];return next;});
      if(!this.isTechnician()) this.attendanceError.set('');
    }
    markAttendance(person:{id:number;selected_attendance_id:number|null;selected_attendance_status:'present'|'absent'|'excused'|null;selected_check_in:string|null;selected_check_out:string|null}): void {
      if(this.markingAttendance()!==null)return;
      this.clearAttendanceError(person.id);
      const isExit=person.selected_attendance_status==='present'&&!!person.selected_check_in&&!person.selected_check_out;
      if(person.selected_check_in&&person.selected_check_out){this.setAttendanceError(person.id,'La asistencia ya está completa para esta fecha.','out');return;}
      this.markingAttendance.set(person.id);this.attendanceError.set('');
      const currentTime=isExit?this.attendanceExitTime():this.attendanceEntryTime();
      const request:Observable<unknown>=isExit
        ? this.attendanceApi.checkout({participant_id:person.id,attendance_date:this.attendanceDate(),check_out:currentTime})
        : person.selected_attendance_id
          ? this.attendanceApi.correct({id:person.selected_attendance_id,participant_id:person.id,attendance_date:this.attendanceDate(),status:'present',check_in:currentTime,check_out:person.selected_check_out ?? '',note:'',correction_reason:'Registro de hora de llegada'})
          : this.attendanceApi.create({participant_id:person.id,attendance_date:this.attendanceDate(),status:'present',check_in:currentTime,check_out:'',note:''});
      request.subscribe({
        next:()=>{this.markingAttendance.set(null);this.clearAttendanceError(person.id);this.reloadAttendance(()=>this.active.set('attendance'));},
        error:()=>{this.markingAttendance.set(null);this.setAttendanceError(person.id,isExit?'No se pudo registrar la hora de salida.':'No se pudo marcar la hora de llegada. Revisa si ya existe un registro en esa fecha.',isExit?'out':'in');}
      });
  }
  private today():string { const date=new Date();date.setMinutes(date.getMinutes()-date.getTimezoneOffset());return date.toISOString().slice(0,10); }
    private currentTime():string { const now=new Date();return `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`; }
    private attendanceEntryTime(): string { const current=this.currentTime(); return current<='08:30'?'08:29':current>'16:29'?'16:29':current; }
    private attendanceExitTime(): string { const current=this.currentTime(); return current<='08:30'?'08:30':current>'16:30'?'16:30':current; }
  canManageTasks(): boolean { return this.auth.hasPermission('courses.manage.all')||this.auth.hasPermission('courses.manage'); }
  canSubmitEvidence(): boolean { return this.auth.hasPermission('activities.submit_evidence')||this.auth.hasPermission('documents.manage'); }
  toggleTaskParticipant(id:number,checked:boolean): void { this.taskForm.participant_ids=checked?[...new Set([...this.taskForm.participant_ids,id])]:this.taskForm.participant_ids.filter(v=>v!==id); }
  openTaskDialog(): void { const participants=this.data()?.participants??[]; this.taskEditing.set(null); this.taskExistingAttachment.set(null); this.taskEditingStatus.set('planned'); this.taskForm={title:'',description:'',responsible:this.course().tecnico_name?.trim()||'Coordinación del curso',start_at:this.taskStartMin(),end_at:'',participant_ids:participants.map(person=>person.id)};this.taskAttachment=null;this.taskStep.set(0);this.taskError.set('');this.taskDialog.set(true); }
  openTaskEdit(task:CourseSections['activities'][number],people:CourseSections['participants']): void { this.taskEditing.set(task.id); this.taskExistingAttachment.set(this.documentsForTask(task.id)[0]??null); this.documentsApi.list('activity',task.id).subscribe({next:page=>this.taskExistingAttachment.set(page.documents[0]??null)}); this.taskEditingStatus.set(task.status); this.taskForm={title:task.title,description:task.description??'',responsible:task.responsible,start_at:this.taskDateInput(task.start_at),end_at:this.taskDateInput(task.end_at),participant_ids:people.map(person=>person.id)};this.taskAttachment=null;this.taskError.set('');this.taskDialog.set(true); }
  taskDateInput(value:string): string { return value.replace(' ','T').slice(0,16); }
  visibleTasks(tasks:CourseSections['activities']): CourseSections['activities'] { const filter=this.taskStatusFilter(); return filter==='all'?tasks:tasks.filter(task=>filter==='inactive'?task.status==='cancelled':task.status!=='cancelled'); }
  taskCount(filter:'active'|'inactive'|'all',tasks:CourseSections['activities']): number { return this.visibleTasksFor(filter,tasks).length; }
  private visibleTasksFor(filter:'active'|'inactive'|'all',tasks:CourseSections['activities']): CourseSections['activities'] { return filter==='all'?tasks:tasks.filter(task=>filter==='inactive'?task.status==='cancelled':task.status!=='cancelled'); }
  closeTaskDialog(): void { if(!this.taskSaving())this.taskDialog.set(false); }
  nextTaskStep(): void { if(this.taskForm.title.trim())this.taskStep.set(1); }
  previousTaskStep(): void { this.taskStep.set(0); }
  canContinueTask(): boolean { return !!this.taskForm.title.trim()&&this.taskForm.title.length<=150; }
  taskStartMin(): string { return `${this.today()}T00:00`; }
  taskEndMax(): string { return `${this.course().end_date}T23:59`; }
  onTaskStartChange(value:string): void { this.taskForm.start_at=value; if(this.taskForm.end_at&&this.taskForm.end_at<value)this.taskForm.end_at=''; }
  selectTaskAttachment(event:Event): void { const input=event.target as HTMLInputElement; this.setTaskAttachment(input.files?.[0]??null); input.value=''; }
  taskAttachmentDragOver(event:DragEvent): void { event.preventDefault(); this.taskAttachmentDragging.set(true); }
  taskAttachmentDragLeave(): void { this.taskAttachmentDragging.set(false); }
  taskAttachmentDrop(event:DragEvent): void { event.preventDefault(); this.taskAttachmentDragging.set(false); this.setTaskAttachment(event.dataTransfer?.files?.[0]??null); }
  removeTaskAttachment(): void { this.taskAttachment=null; }
  private setTaskAttachment(file:File|null): void { if(!file)return; if(!this.isEvidenceFile(file)||file.size>50*1024*1024){this.taskError.set('Adjunta un PDF, imagen o video de hasta 50 MB.');return;} this.taskAttachment=file;this.taskError.set(''); }
  canSaveTask(people:CourseSections['participants']): boolean { return this.canContinueTask()&&!!this.taskForm.start_at&&!!this.taskForm.end_at&&this.taskForm.start_at>=this.taskStartMin()&&this.taskForm.end_at>this.taskForm.start_at&&this.taskForm.end_at<=this.taskEndMax()&&people.length>0; }
  allTaskParticipantsSelected(people:CourseSections['participants']): boolean { return people.length>0&&this.taskForm.participant_ids.length===people.length; }
  toggleAllTaskParticipants(checked:boolean,people:CourseSections['participants']): void { this.taskForm.participant_ids=checked?people.map(person=>person.id):[]; }
  taskStatus(status:string): string { return ({planned:'Planificada',in_progress:'En curso',completed:'Completada',cancelled:'Cancelada'} as Record<string,string>)[status]??status; }
  toggleTaskDetails(id:number): void { const closing=this.expandedTask()===id; this.expandedTask.set(closing?null:id); this.activityPage.set(!closing); if(closing)void this.router.navigate(['/cursos',this.course().id]); else void this.router.navigate(['/cursos',this.course().id,'actividades',id]); }
   assignedNames(value:string|null): string[] { return value ? value.split(',').map(name=>name.trim()).filter(Boolean) : []; }
  assignedParticipant(name:string,people:CourseSections['participants']): CourseSections['participants'][number] | undefined { return people.find(person=>person.name===name); }
  formatActivityDate(value:string): string { const date=new Date(value.replace(' ','T')); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('es-EC',{day:'2-digit',month:'short',year:'numeric'}).format(date); }
  formatActivityTime(value:string): string { const date=new Date(value.replace(' ','T')); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('es-EC',{hour:'2-digit',minute:'2-digit',hour12:false}).format(date); }
  taskSummary(description:string|null): string { const text=description?.trim()||'Sin descripción.'; return text.length>120?`${text.slice(0,117).trimEnd()}…`:text; }
  timeRemaining(endAt:string,status:string): string {
    if(status==='completed')return 'Completada'; if(status==='cancelled')return 'Cancelada';
    const due=new Date(endAt.replace(' ','T')).getTime(), remaining=due-Date.now();
    if(!Number.isFinite(due))return 'Fecha de entrega pendiente'; if(remaining<=0)return 'Entrega vencida';
    const days=Math.floor(remaining/86400000), hours=Math.floor((remaining%86400000)/3600000);
    return days?`Entrega en ${days}d ${hours}h`:`Entrega en ${Math.max(1,hours)}h`;
  }
  onTaskDragOver(id:number,event:DragEvent): void { event.preventDefault(); this.draggingTask.set(id); }
  onTaskDragLeave(id:number): void { if(this.draggingTask()===id)this.draggingTask.set(null); }
  onTaskDrop(id:number,event:DragEvent): void { event.preventDefault(); this.draggingTask.set(null); const file=event.dataTransfer?.files[0]; if(file)this.submitEvidence(id,file); }
  toggleTaskStatus(task:CourseSections['activities'][number]): void { if(this.taskActionSaving())return; const status=task.status==='cancelled'?'planned':'cancelled'; this.taskActionSaving.set(true); this.api.setTaskStatus(this.course().id,task.id,status).subscribe({next:()=>{this.taskActionSaving.set(false);this.reload();},error:()=>{this.taskActionSaving.set(false);this.taskError.set('No se pudo cambiar el estado de la tarea.');}}); }
  requestTaskDelete(task:CourseSections['activities'][number]): void { if(!this.taskActionSaving())this.taskToDelete.set(task); }
  closeTaskDelete(): void { if(!this.taskActionSaving())this.taskToDelete.set(null); }
  confirmTaskDelete(): void { const task=this.taskToDelete(); if(!task||this.taskActionSaving())return; this.taskActionSaving.set(true); this.api.deleteTask(this.course().id,task.id).subscribe({next:()=>{this.taskActionSaving.set(false);this.taskToDelete.set(null);this.reload();},error:()=>{this.taskActionSaving.set(false);this.taskError.set('No se pudo eliminar la tarea.');this.taskToDelete.set(null);}}); }
  saveTask(course:CourseSections): void {
    if(this.taskSaving()||!this.canContinueTask()||!this.canSaveTask(course.participants)) return;
    this.taskSaving.set(true); this.taskError.set('');
    const participantIds=this.taskForm.participant_ids.length?this.taskForm.participant_ids:course.participants.map(person=>person.id); const id=this.taskEditing(); const input={...this.taskForm,participant_ids:participantIds,status:id?this.taskEditingStatus():'planned'};
    const request=id?this.api.updateTask(this.course().id,id,input):this.api.createTask(this.course().id,input);
    request.subscribe({next:result=>{const activityId=id??result.id; const finish=()=>{this.taskSaving.set(false);this.taskDialog.set(false);this.taskAttachment=null;this.taskEditing.set(null);this.taskExistingAttachment.set(null);this.taskForm={title:'',description:'',responsible:'',start_at:'',end_at:'',participant_ids:[]};this.reload();}; const uploadError=(error:any)=>{this.taskSaving.set(false);const code=error?.error?.error??'';const messages:Record<string,string>={nextcloud_storage_not_configured:'El almacenamiento de archivos no está configurado.',nextcloud_storage_unavailable:'No se pudo conectar con el almacenamiento de archivos.',nextcloud_credentials_rejected:'Las credenciales del almacenamiento de archivos fueron rechazadas.',unsupported_file_type:'El tipo de archivo no está permitido.',invalid_upload:'El archivo no llegó correctamente al servidor.'};this.taskError.set(`La actividad se guardó, pero ${messages[code]??'no se pudo subir el archivo adjunto.'}`);this.reload();}; if(this.taskAttachment)this.api.uploadEvidence(this.course().id,activityId,this.taskAttachment).subscribe({next:finish,error:uploadError}); else finish();},error:()=>{this.taskSaving.set(false);this.taskError.set('No se pudo guardar la actividad. Verifica los datos ingresados.');}});
  }
  uploadEvidence(task:number,event:Event): void {
    const file=(event.target as HTMLInputElement).files?.[0]; if(!file)return;
    this.submitEvidence(task,file); (event.target as HTMLInputElement).value='';
  }
  private submitEvidence(task:number,file:File): void {
    if(this.uploadingTask()!==null)return;
    if(!this.isEvidenceFile(file)||file.size>50*1024*1024){this.evidenceFeedback.set({task,type:'error',text:'Selecciona una foto, video o PDF de hasta 50 MB.'});return;}
    this.uploadingTask.set(task); this.evidenceFeedback.set(null); this.api.uploadEvidence(this.course().id,task,file).subscribe({next:()=>{this.uploadingTask.set(null);this.evidenceFeedback.set({task,type:'success',text:'Evidencia subida correctamente.'});this.reload();},error:()=>{this.uploadingTask.set(null);this.evidenceFeedback.set({task,type:'error',text:'No se pudo subir la evidencia. Confirma que esta actividad está asignada a tu cuenta.'});}});
  }
  private isEvidenceFile(file:File): boolean { return ['application/pdf','image/jpeg','image/png','video/mp4','video/webm'].includes(file.type); }
  documentsForTask(task:number) { return (this.data()?.documents??[]).filter(file=>file.entity_type==='activity'&&file.entity_id===task); }
  downloadDocument(id:number,name:string): void { this.documentsApi.download(id).subscribe(blob=>{const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}); }
  selectCourseTab(tab: string): void { if (['participants', 'attendance', 'activities', 'evaluations'].includes(tab)) this.select(tab as CourseTab); }
  select(tab: CourseTab): void { if(tab===this.active())return;this.active.set(tab);if(!this.data())return;this.sectionLoading.set(true);setTimeout(()=>this.sectionLoading.set(false),500); }
  private coursePeriodDays(): number { const start=new Date(`${this.course().start_date}T00:00:00`); const end=new Date(`${this.course().end_date}T00:00:00`); const days=Math.floor((end.getTime()-start.getTime())/86400000)+1; return Number.isFinite(days)&&days>0?days:0; }
  attendancePercent(): number { const data=this.data(); if(this.isBeneficiary())return Number(data?.attendance_percentage??0); const people=data?.participants??[]; const expected=this.coursePeriodDays()*people.length; const attended=people.reduce((total,person)=>total+Number(person.attendance_count??0),0); return expected>0?Math.min(100,Math.round(attended*100/expected)):0; }
  attendanceDuration(checkIn:string|null,checkOut:string|null): string { if(!checkIn||!checkOut)return '—'; const start=new Date(`1970-01-01T${checkIn}`),end=new Date(`1970-01-01T${checkOut}`); const minutes=Math.max(0,Math.round((end.getTime()-start.getTime())/60000)); return `${Math.floor(minutes/60)}h ${minutes%60}m`; }
    technicianFor(participantId:number): string|null { const date=this.attendanceDate(); return this.data()?.attendance.find(row=>Number(row.participant_id)===Number(participantId)&&String(row.attendance_date).slice(0,10)===date)?.technician_name ?? null; }
  tabCount(tab: CourseTab): number { const data=this.data(); if(!data)return 0; if(tab==='participants')return data.participants.length; if(tab==='attendance')return this.attendancePercent(); if(tab==='activities')return data.activities.length; if(tab==='evaluations')return this.weeklyEvidenceRows().length; return 0; }
}
