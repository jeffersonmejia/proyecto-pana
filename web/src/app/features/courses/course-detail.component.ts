import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { DocumentsApiService } from '../reports/documents-api.service';
import { AttendanceApiService } from '../attendance/attendance-api.service';
import { PaginatorComponent } from '../../shared/paginator.component';
import { StepDialogComponent } from '../../shared/step-dialog.component';
import { CourseSectionSkeletonComponent } from '../../shared/course-section-skeleton.component';
import { SkeletonLoaderComponent } from '../../shared/skeleton-loader.component';
import { Observable } from 'rxjs';
import { LucideBookOpen, LucideClipboardCheck, LucideUsersRound, LucideClock3, LucidePlus, LucideFileText, LucideUpload, LucideEye } from '@lucide/angular';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Course, CourseSections, CoursesApiService } from './courses-api.service';

type CourseTab = 'overview' | 'participants' | 'attendance' | 'activities' | 'evaluations';
@Component({ selector: 'pana-course-detail', standalone: true, imports: [FormsModule, PaginatorComponent, StepDialogComponent, CourseSectionSkeletonComponent, SkeletonLoaderComponent, LucideBookOpen, LucideClipboardCheck, LucideUsersRound, LucideClock3, LucidePlus, LucideFileText, LucideUpload, LucideEye], templateUrl: './course-detail.component.html', styleUrl: './course-detail.component.scss' })
export class CourseDetailComponent implements OnInit {
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
  readonly maxAttendanceDate=this.today(); readonly attendanceDate=signal(this.maxAttendanceDate);
  readonly attendancePage=signal(1); readonly attendancePageSize=10;
  readonly participantPage=signal(1); readonly participantPageSize=10;
  readonly tabs: {id: CourseTab; label: string}[]=[{id:'participants',label:'Participantes'},
    {id:'attendance',label:'Asistencia'},
    {id:'activities',label:'Actividades'},{id:'evaluations',label:'Evaluaciones'}];
  readonly visibleTabs = computed(() => this.isBeneficiary() ? this.tabs.filter(tab => tab.id === 'activities' || tab.id === 'attendance') : this.tabs);
  readonly attendanceHours=computed(()=>{const hours=(this.data()?.participants??[]).reduce((sum,row)=>sum+Number(row.attendance_minutes??0),0)/60;return Number.isInteger(hours)?String(hours):hours.toFixed(1);});
  readonly evidenceCount=computed(()=>((this.data()?.documents??[]).filter(file=>file.entity_type==='activity').length));
  readonly completedTasks=computed(()=>((this.data()?.activities??[]).filter(task=>task.status==='completed').length));
  capacityPercent(): number { const limit=Number(this.course().max_participants??0); return limit>0 ? Math.min(100,Math.round(Number(this.course().participant_count??0)*100/limit)) : 0; }
  readonly participantQuery=signal('');
  readonly participantRows=computed(()=>{const q=this.participantQuery().trim().toLocaleLowerCase(); return (this.data()?.participants??[]).filter(p=>!q||p.name.toLocaleLowerCase().includes(q));});
  readonly participantPageRows=computed(()=>{const rows=this.participantRows();const start=(this.participantPage()-1)*this.participantPageSize;return rows.slice(start,start+this.participantPageSize).map(person=>({...person,first_name:`${person.last_name}\n${person.first_name.replace(new RegExp('^'+person.last_name+'\\s*','i'),'').trim()}`,last_name:this.ageFromBirthDate(person.birth_date),evaluation_count:person.phone as unknown as number}));});
  readonly attendanceSort=signal<'participant'|'technician'>('participant'); readonly attendanceSortDirection=signal<'asc'|'desc'>('asc');
  readonly attendancePageRows=computed(()=>{const people=[...(this.data()?.participants??[])];const field=this.attendanceSort();const direction=this.attendanceSortDirection()==='asc'?1:-1;people.sort((a,b)=>{const first=(field==='participant'?a.name:this.technicianFor(a.id)||'').trim();const second=(field==='participant'?b.name:this.technicianFor(b.id)||'').trim();return first.localeCompare(second,'es',{sensitivity:'base'})*direction;});const start=(this.attendancePage()-1)*this.attendancePageSize;return people.slice(start,start+this.attendancePageSize);});
  readonly taskError=signal(''); readonly taskSaving=signal(false); readonly uploadingTask=signal<number|null>(null);
  readonly evidenceFeedback=signal<{task:number;type:'success'|'error';text:string}|null>(null);
  readonly taskDialog=signal(false); readonly taskStep=signal(0);
  readonly expandedTask=signal<number|null>(null); readonly draggingTask=signal<number|null>(null);
  readonly activityPage=signal(false);
  taskForm={title:'',description:'',responsible:'',start_at:'',end_at:'',participant_ids:[] as number[]};
  ngOnInit(): void { const activityId=Number(this.route.snapshot.paramMap.get('activityId')); if(this.route.snapshot.queryParamMap.get('tab')==='participants')this.active.set('participants'); if(this.isBeneficiary())this.active.set('activities'); if(activityId>0){this.activityPage.set(true);this.active.set('activities');this.expandedTask.set(activityId);} this.reload(); }
  reload(afterLoad?:()=>void): void { this.loadingStartedAt=Date.now();this.loading.set(true);this.api.sections(this.course().id,this.attendanceDate()).subscribe({next:value=>this.finishLoad(value,afterLoad),error:()=>{this.error.set('No se pudo cargar la información de este curso.');this.finishLoad(null);}}); }
  private finishLoad(value:CourseSections|null,afterLoad?:()=>void): void { const wait=Math.max(0,700-(Date.now()-this.loadingStartedAt));setTimeout(()=>{if(value)this.data.set(value);this.loading.set(false);afterLoad?.();},wait); }
  setAttendanceDate(date:string): void { if(!date)return; this.attendanceDate.set(date);this.attendancePage.set(1);this.attendanceError.set('');this.reload(); }
  changeAttendancePage(page:number): void { this.attendancePage.set(page); }
  sortAttendance(field:'participant'|'technician'): void { if(this.attendanceSort()===field)this.attendanceSortDirection.update(value=>value==='asc'?'desc':'asc'); else { this.attendanceSort.set(field); this.attendanceSortDirection.set('asc'); } this.attendancePage.set(1); }
  setParticipantQuery(query:string): void { this.participantQuery.set(query);this.participantPage.set(1); }
  changeParticipantPage(page:number): void { this.participantPage.set(page); }
  openPerson(id:number): void { void this.router.navigate(['/cursos', this.course().id, 'participantes', id]); }
  printParticipants(): void {
    const doc = new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
    const courseName = this.course().name || 'Curso';
    doc.setProperties({title:`Participantes - ${courseName}`,subject:'Listado de participantes'});
    const rows = this.participantRows().map((person,index)=>[
      String(index+1), person.name, this.ageFromBirthDate(person.birth_date), person.ci || '-', person.phone || '-',
      person.sector || '-', person.self_identification || '-', person.has_disability === 'Si' ? (person.disability_type || 'Si') : 'No',
      person.education || '-', person.birth_city || '-'
    ]);
    autoTable(doc,{startY:34,margin:{top:34,right:12,bottom:16,left:12},head:[['No.','Apellidos y nombres','Edad','Cédula','Teléfono','Sector','Auto-identificación','Discapacidad','Instrucción','Ciudad de nacimiento']],body:rows,
      theme:'grid',tableWidth:'wrap',styles:{font:'helvetica',fontSize:6.5,overflow:'linebreak',cellPadding:1.8,cellWidth:'wrap',lineColor:[0,0,0],lineWidth:.3},headStyles:{fillColor:[255,255,255],textColor:[0,0,0],fontStyle:'normal',fontSize:6.5,overflow:'linebreak',lineColor:[0,0,0],lineWidth:.3},alternateRowStyles:{fillColor:[248,248,248],textColor:[0,0,0]},columnStyles:{0:{cellWidth:8},1:{cellWidth:30},2:{cellWidth:10},3:{cellWidth:20},4:{cellWidth:20},5:{cellWidth:20},6:{cellWidth:25},7:{cellWidth:20},8:{cellWidth:20},9:{cellWidth:21}},didDrawPage:()=>{
        doc.setFontSize(15);doc.setTextColor(0,0,0);doc.text('Listado de participantes',12,15);
        doc.setFontSize(9);doc.setTextColor(0,0,0);doc.text(courseName,12,22);doc.text(`Generado: ${new Intl.DateTimeFormat('es-EC',{dateStyle:'medium'}).format(new Date())}`,12,27);
        doc.setFontSize(8);doc.setTextColor(0,0,0);doc.text(`Página ${doc.getNumberOfPages()}`,285,202,{align:'right'});
        doc.setFontSize(8);doc.setTextColor(0,0,0);doc.text(`Pagina ${doc.getNumberOfPages()}`,198,287,{align:'right'});
      }});
    doc.save(`${this.fileName(courseName)}_${this.pdfTimestamp()}.pdf`);
  }
  private fileName(value:string): string { return value.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'') || 'curso'; }
  private pdfTimestamp(): string { const now=new Date(); const pad=(value:number)=>String(value).padStart(2,'0'); return `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`; }
  participantAttendanceHours(person: CourseSections['participants'][number]): string { const hours=Number(person.attendance_minutes ?? 0)/60; return Number.isInteger(hours)?String(hours):hours.toFixed(1); }
  ageFromBirthDate(value: string | null): string { if (!value) return '—'; const birth = new Date(`${value}T00:00:00`), today = new Date(); let age = today.getFullYear() - birth.getFullYear(); const beforeBirthday = today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate()); return String(age - (beforeBirthday ? 1 : 0)); }
  canMarkAttendance(): boolean { return this.auth.hasPermission('attendance.manage'); }
  isBeneficiary(): boolean { return this.auth.user()?.roles.includes('beneficiary') ?? false; }
  isStudent(): boolean { return this.auth.user()?.roles.includes('student') ?? false; }
  isLearner(): boolean { const roles = this.auth.user()?.roles ?? []; return roles.includes('beneficiary') || roles.includes('student'); }
  attendanceLabel(status:string|null): string { return status==='present'?'Presente':status==='absent'?'Ausente':status==='excused'?'Justificado':'Sin registros'; }
  attendanceDisplayStatus(person:{selected_attendance_status:'present'|'absent'|'excused'|null;selected_check_in:string|null}): string {
    return person.selected_attendance_status==='present'&&this.isLate(person.selected_check_in)?'Atraso':this.attendanceLabel(person.selected_attendance_status);
  }
  isLate(time:string|null): boolean { return !!time&&time.slice(0,5)>'08:00'; }
  markAttendance(person:{id:number;selected_attendance_status:'present'|'absent'|'excused'|null;selected_check_out:string|null}): void {
    if(this.markingAttendance()!==null)return;
    const isExit=person.selected_attendance_status==='present';
    if(person.selected_attendance_status&&(!isExit||person.selected_check_out)){this.attendanceError.set('La asistencia ya está completa para esta fecha.');return;}
    this.markingAttendance.set(person.id);this.attendanceError.set('');
    const request:Observable<unknown>=isExit?this.attendanceApi.checkout({participant_id:person.id,attendance_date:this.attendanceDate(),check_out:this.currentTime()}):this.attendanceApi.create({participant_id:person.id,attendance_date:this.attendanceDate(),status:'present',check_in:this.currentTime(),check_out:'',note:''});
    request.subscribe({
      next:()=>{this.markingAttendance.set(null);this.reload(()=>this.active.set('attendance'));},
      error:()=>{this.markingAttendance.set(null);this.attendanceError.set(isExit?'No se pudo registrar la hora de salida.':'No se pudo marcar la hora de llegada. Revisa si ya existe un registro en esa fecha.');}
    });
  }
  private today():string { const date=new Date();date.setMinutes(date.getMinutes()-date.getTimezoneOffset());return date.toISOString().slice(0,10); }
  private currentTime():string { const now=new Date();return `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`; }
  canManageTasks(): boolean { return this.auth.hasPermission('courses.manage.all')||this.auth.hasPermission('courses.manage'); }
  canSubmitEvidence(): boolean { return this.auth.hasPermission('activities.submit_evidence')||this.auth.hasPermission('documents.manage'); }
  toggleTaskParticipant(id:number,checked:boolean): void { this.taskForm.participant_ids=checked?[...new Set([...this.taskForm.participant_ids,id])]:this.taskForm.participant_ids.filter(v=>v!==id); }
  openTaskDialog(): void { this.taskForm={title:'',description:'',responsible:'',start_at:'',end_at:'',participant_ids:[]};this.taskStep.set(0);this.taskError.set('');this.taskDialog.set(true); }
  closeTaskDialog(): void { if(!this.taskSaving())this.taskDialog.set(false); }
  nextTaskStep(): void { if(this.taskForm.title.trim())this.taskStep.set(1); }
  previousTaskStep(): void { this.taskStep.set(0); }
  canContinueTask(): boolean { return !!this.taskForm.title.trim()&&this.taskForm.title.length<=150; }
  canSaveTask(people:CourseSections['participants']): boolean { return !!this.taskForm.responsible.trim()&&!!this.taskForm.start_at&&!!this.taskForm.end_at&&this.taskForm.end_at>this.taskForm.start_at&&this.taskForm.participant_ids.length>0&&this.taskForm.participant_ids.length<=people.length; }
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
    return days?`Entrega en ${days} d ${hours} h`:`Entrega en ${Math.max(1,hours)} h`;
  }
  onTaskDragOver(id:number,event:DragEvent): void { event.preventDefault(); this.draggingTask.set(id); }
  onTaskDragLeave(id:number): void { if(this.draggingTask()===id)this.draggingTask.set(null); }
  onTaskDrop(id:number,event:DragEvent): void { event.preventDefault(); this.draggingTask.set(null); const file=event.dataTransfer?.files[0]; if(file)this.submitEvidence(id,file); }
  createTask(course:CourseSections): void {
    if(this.taskSaving()||!this.canContinueTask()||!this.canSaveTask(course.participants)) return;
    this.taskSaving.set(true); this.taskError.set('');
    this.api.createTask(this.course().id,{...this.taskForm,status:'planned'}).subscribe({next:()=>{this.taskSaving.set(false);this.taskDialog.set(false);this.taskForm={title:'',description:'',responsible:'',start_at:'',end_at:'',participant_ids:[]};this.reload();},error:()=>{this.taskSaving.set(false);this.taskError.set('No se pudo crear la actividad. Verifica las asignaciones del curso.');}});
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
  select(tab: CourseTab): void { if(tab===this.active())return;this.active.set(tab);if(!this.data())return;this.sectionLoading.set(true);setTimeout(()=>this.sectionLoading.set(false),500); }
  private coursePeriodDays(): number { const start=new Date(`${this.course().start_date}T00:00:00`); const end=new Date(`${this.course().end_date}T00:00:00`); const days=Math.floor((end.getTime()-start.getTime())/86400000)+1; return Number.isFinite(days)&&days>0?days:0; }
  attendancePercent(): number { const data=this.data(); if(this.isBeneficiary())return Number(data?.attendance_percentage??0); const people=data?.participants??[]; const expected=this.coursePeriodDays()*people.length; const attended=people.reduce((total,person)=>total+Number(person.attendance_count??0),0); return expected>0?Math.min(100,Math.round(attended*100/expected)):0; }
  attendanceDuration(checkIn:string|null,checkOut:string|null): string { if(!checkIn||!checkOut)return '—'; const start=new Date(`1970-01-01T${checkIn}`),end=new Date(`1970-01-01T${checkOut}`); const minutes=Math.max(0,Math.round((end.getTime()-start.getTime())/60000)); return `${Math.floor(minutes/60)}h ${minutes%60}m`; }
  technicianFor(participantId:number): string|null { const date=this.attendanceDate(); return this.data()?.attendance.find(row=>row.participant_id===participantId&&row.attendance_date===date)?.technician_name ?? null; }
  tabCount(tab: CourseTab): number { const data=this.data(); if(!data)return 0; if(tab==='participants')return data.participants.length; if(tab==='attendance')return this.attendancePercent(); if(tab==='activities')return data.activities.length; if(tab==='evaluations')return data.evaluations.length; return 0; }
}
