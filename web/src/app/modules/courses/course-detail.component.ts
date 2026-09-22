import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { DocumentsApiService } from '../reports/documents-api.service';
import { AttendanceApiService } from '../attendance/attendance-api.service';
import { PaginatorComponent } from '../../shared/paginator.component';
import { StepDialogComponent } from '../../shared/step-dialog.component';
import { Observable } from 'rxjs';
import { LucideBookOpen, LucideChartNoAxesCombined, LucideClipboardCheck, LucideUsersRound, LucideClock3, LucidePlus, LucideFileText, LucideUpload } from '@lucide/angular';
import { Course, CourseSections, CoursesApiService } from './courses-api.service';

type CourseTab = 'overview' | 'participants' | 'attendance' | 'activities' | 'evaluations';
@Component({ selector: 'pana-course-detail', standalone: true, imports: [FormsModule, PaginatorComponent, StepDialogComponent, LucideBookOpen, LucideChartNoAxesCombined, LucideClipboardCheck, LucideUsersRound, LucideClock3, LucidePlus, LucideFileText, LucideUpload], templateUrl: './course-detail.component.html', styleUrl: './course-detail.component.scss' })
export class CourseDetailComponent implements OnInit {
  private readonly api=inject(CoursesApiService);
  private readonly documentsApi=inject(DocumentsApiService);
  private readonly attendanceApi=inject(AttendanceApiService);
  readonly auth=inject(AuthService);
  readonly course=input.required<Course>(); readonly back=output<void>();
  readonly data=signal<CourseSections|null>(null); readonly loading=signal(true); readonly error=signal('');
  readonly active=signal<CourseTab>('overview');
  readonly markingAttendance=signal<number|null>(null); readonly attendanceError=signal('');
  readonly maxAttendanceDate=this.today(); readonly attendanceDate=signal(this.maxAttendanceDate);
  readonly attendancePage=signal(1); readonly attendancePageSize=10;
  readonly participantPage=signal(1); readonly participantPageSize=10;
  readonly tabs: {id: CourseTab; label: string}[]=[{id:'overview',label:'Resumen'},{id:'participants',label:'Participantes'},
    {id:'attendance',label:'Asistencia'},
    {id:'activities',label:'Actividades'},{id:'evaluations',label:'Evaluaciones'}];
  readonly attendanceHours=computed(()=>(((this.data()?.participants??[]).reduce((sum,row)=>sum+Number(row.attendance_minutes??0),0)/60).toFixed(1)));
  readonly evidenceCount=computed(()=>((this.data()?.documents??[]).filter(file=>file.entity_type==='activity').length));
  readonly completedTasks=computed(()=>((this.data()?.activities??[]).filter(task=>task.status==='completed').length));
  readonly alphabet=Array.from({length:26},(_,i)=>String.fromCharCode(65+i));
  readonly firstInitial=signal(''); readonly lastInitial=signal(''); readonly participantQuery=signal('');
  readonly participantRows=computed(()=>{const q=this.participantQuery().trim().toLocaleLowerCase(); return (this.data()?.participants??[]).filter(p=>(!this.firstInitial()||p.first_name.toLocaleUpperCase().startsWith(this.firstInitial()))&&(!this.lastInitial()||p.last_name.toLocaleUpperCase().startsWith(this.lastInitial()))&&(!q||p.name.toLocaleLowerCase().includes(q)));});
  readonly participantPageRows=computed(()=>{const rows=this.participantRows();const start=(this.participantPage()-1)*this.participantPageSize;return rows.slice(start,start+this.participantPageSize);});
  readonly attendancePageRows=computed(()=>{const people=this.data()?.participants??[];const start=(this.attendancePage()-1)*this.attendancePageSize;return people.slice(start,start+this.attendancePageSize);});
  readonly taskError=signal(''); readonly taskSaving=signal(false); readonly uploadingTask=signal<number|null>(null);
  readonly taskDialog=signal(false); readonly taskStep=signal(0);
  readonly expandedTask=signal<number|null>(null); readonly draggingTask=signal<number|null>(null);
  taskForm={title:'',description:'',responsible:'',start_at:'',end_at:'',participant_ids:[] as number[]};
  ngOnInit(): void { this.reload(); }
  reload(afterLoad?:()=>void): void { this.api.sections(this.course().id,this.attendanceDate()).subscribe({next:value=>{this.data.set(value);this.loading.set(false);afterLoad?.();},error:()=>{this.error.set('No se pudo cargar la información de este curso.');this.loading.set(false);}}); }
  setAttendanceDate(date:string): void { if(!date)return; this.attendanceDate.set(date);this.attendancePage.set(1);this.attendanceError.set('');this.reload(); }
  changeAttendancePage(page:number): void { this.attendancePage.set(page); }
  setParticipantQuery(query:string): void { this.participantQuery.set(query);this.participantPage.set(1); }
  setFirstInitial(letter:string): void { this.firstInitial.set(this.firstInitial()===letter?'':letter);this.participantPage.set(1); }
  clearFirstInitial(): void { this.firstInitial.set('');this.participantPage.set(1); }
  setLastInitial(letter:string): void { this.lastInitial.set(this.lastInitial()===letter?'':letter);this.participantPage.set(1); }
  clearLastInitial(): void { this.lastInitial.set('');this.participantPage.set(1); }
  changeParticipantPage(page:number): void { this.participantPage.set(page); }
  canMarkAttendance(): boolean { return this.auth.hasPermission('attendance.manage'); }
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
  toggleTaskDetails(id:number): void { this.expandedTask.update(current=>current===id?null:id); }
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
    if(!file.name.toLocaleLowerCase().endsWith('.pdf')||file.size>8*1024*1024){this.taskError.set('Selecciona un PDF de hasta 8 MB.');return;}
    this.uploadingTask.set(task); this.taskError.set(''); this.api.uploadEvidence(this.course().id,task,file).subscribe({next:()=>{this.uploadingTask.set(null);this.reload();},error:()=>{this.uploadingTask.set(null);this.taskError.set('No se pudo subir la evidencia. Confirma que esta actividad está asignada a tu cuenta.');}});
  }
  documentsForTask(task:number) { return (this.data()?.documents??[]).filter(file=>file.entity_type==='activity'&&file.entity_id===task); }
  downloadDocument(id:number,name:string): void { this.documentsApi.download(id).subscribe(blob=>{const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}); }
  select(tab: CourseTab): void { this.active.set(tab); }
}
