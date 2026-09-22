import { Component, OnInit, computed, inject, output, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { StepDialogComponent } from '../../shared/step-dialog.component';
import { LucideBookOpen, LucidePencil, LucidePlus, LucideTrash, LucideUsersRound, LucideX, LucideClock3, LucideFileText } from '@lucide/angular';
import { Course, CourseInput, CourseSections, CoursesApiService } from './courses-api.service';
import { CourseDetailComponent } from './course-detail.component';

@Component({ selector: 'pana-courses-home', standalone: true, imports: [FormsModule, StepDialogComponent, CourseDetailComponent, LucideBookOpen, LucidePencil, LucidePlus, LucideTrash, LucideUsersRound, LucideX, LucideClock3, LucideFileText], templateUrl: './courses-home.component.html', styleUrl: './courses-home.component.scss' })
export class CoursesHomeComponent implements OnInit {
  readonly detailChange=output<boolean>();
  private readonly api = inject(CoursesApiService); readonly auth = inject(AuthService);
  readonly greetingName=computed(()=>((this.auth.user()?.first_name??this.auth.user()?.email??'').trim().split(/\s+/)[0]));
  readonly courses = signal<Course[]>([]); readonly tutors = signal<{ id: number; name: string }[]>([]);
  readonly statusFilter=signal<'active'|'inactive'|'all'>('active'); readonly togglingCourse=signal<number|null>(null);
  readonly pendingMode=signal(false); readonly pendingTasks=signal<(CourseSections['activities'][number]&{course_id:number;course_name:string})[]>([]);
  readonly coursesLoaded=signal(false);
  readonly pendingLoading=signal(false); readonly pendingError=signal(''); readonly uploadingTask=signal<number|null>(null);
  readonly visibleCourses=computed(()=>this.courses().filter(course=>this.statusFilter()==='all'||course.status===this.statusFilter()));
  readonly participants = signal<{ id: number; name: string; profile: string }[]>([]);
  readonly capacities = Array.from({ length: 30 }, (_, index) => index + 1);
  participantQuery = '';
  readonly selected = signal<Course | null>(null); readonly dialog = signal(false); readonly step = signal(0);
  readonly error = signal(''); readonly saving = signal(false); form: CourseInput = this.blank();
  ngOnInit(): void { this.load(); }
  canCreate(): boolean { const roles = this.auth.user()?.roles ?? []; return roles.includes('admin') || roles.includes('coordinator'); }
  canManage(_course: Course): boolean { return this.auth.hasPermission('courses.manage.all') || (this.auth.hasPermission('courses.manage') && (this.auth.user()?.roles.includes('coordinator') ?? false)); }
  load(): void { this.api.list().subscribe({ next: r => { this.courses.set(r.courses); this.coursesLoaded.set(true); this.error.set(''); if(this.pendingMode())this.loadPending(); }, error: () => { this.coursesLoaded.set(true); this.pendingLoading.set(false); this.error.set('No se pudieron cargar los cursos.'); if(this.pendingMode())this.pendingError.set('No se pudieron cargar las tareas pendientes.'); } }); }
  togglePending(): void { this.pendingMode.update(value=>!value); if(this.pendingMode()){if(this.coursesLoaded())this.loadPending();else this.pendingLoading.set(true);} }
  loadPending(): void {
    if(!this.coursesLoaded()){this.pendingLoading.set(true);return;}
    const courses=this.courses(); this.pendingLoading.set(true); this.pendingError.set('');
    if(!courses.length){this.pendingTasks.set([]);this.pendingLoading.set(false);return;}
    forkJoin(courses.map(course=>this.api.sections(course.id,this.localDate()).pipe(map(data=>data.activities
      .filter(task=>task.status!=='completed'&&task.status!=='cancelled').map(task=>({...task,course_id:course.id,course_name:course.name}))))))
      .subscribe({next:groups=>{this.pendingTasks.set(groups.flat().sort((a,b)=>a.end_at.localeCompare(b.end_at)));this.pendingLoading.set(false);},error:()=>{this.pendingLoading.set(false);this.pendingError.set('No se pudieron cargar las tareas pendientes.');}});
  }
  canSubmitEvidence(): boolean { return this.auth.hasPermission('activities.submit_evidence')||this.auth.hasPermission('documents.manage'); }
  remaining(endAt:string): string {
    const due=new Date(endAt.replace(' ','T')).getTime(),ms=due-Date.now(); if(!Number.isFinite(due))return 'Sin fecha';
    if(ms<=0)return 'Vencida'; const days=Math.floor(ms/86400000),hours=Math.floor(ms%86400000/3600000);
    return days?`${days} d ${hours} h`:`${Math.max(1,hours)} h`;
  }
  submitPending(task:{id:number;course_id:number},event:Event): void {
    const input=event.target as HTMLInputElement,file=input.files?.[0]; if(!file)return; input.value='';
    if(!file.name.toLocaleLowerCase().endsWith('.pdf')||file.size>8*1024*1024){this.pendingError.set('Selecciona un PDF de hasta 8 MB.');return;}
    this.uploadingTask.set(task.id);this.pendingError.set('');this.api.uploadEvidence(task.course_id,task.id,file).subscribe({next:()=>{this.uploadingTask.set(null);this.loadPending();},error:()=>{this.uploadingTask.set(null);this.pendingError.set('No se pudo agregar la entrega. Confirma que esta tarea está asignada a tu cuenta.');}});
  }
  private localDate():string { const now=new Date();now.setMinutes(now.getMinutes()-now.getTimezoneOffset());return now.toISOString().slice(0,10); }
  create(): void { this.selected.set(null); this.form = this.blank(); this.openDialog(); }
  edit(course: Course): void { this.selected.set(course); this.form = { name: course.name, description: course.description ?? '', start_date: course.start_date, end_date: course.end_date, status: course.status, tutor_user_id: course.tutor_user_id, max_participants: course.max_participants, participant_ids: [...course.participant_ids] }; this.openDialog(); }
  closeDialog(): void { this.dialog.set(false); this.selected.set(null); }
  openDialog(): void { this.step.set(0); this.dialog.set(true);
    this.api.tutors().subscribe({ next: r => this.tutors.set(r.tutors), error: () => this.error.set('No se pudieron cargar los tutores.') });
    this.api.participants().subscribe({ next: r => this.participants.set(r.participants), error: () => this.error.set('No se pudieron cargar los participantes.') }); }
  studentResults(): { id: number; name: string; profile: string }[] {
    const query=this.participantQuery.trim().toLocaleLowerCase();
    if (query.length < 2) return [];
    return this.participants().filter(person=>person.profile==='Estudiante' && !this.form.participant_ids.includes(person.id)
      && person.name.toLocaleLowerCase().includes(query)).slice(0,8);
  }
  selectedStudents(): { id: number; name: string; profile: string }[] {
    return this.participants().filter(person=>this.form.participant_ids.includes(person.id));
  }
  hasStudents(): boolean { return this.participants().some(person=>person.profile==='Estudiante'); }
  addStudent(id: number): void {
    if (this.form.participant_ids.includes(id) || this.form.participant_ids.length >= (this.form.max_participants ?? 0)) return;
    this.form.participant_ids=[...this.form.participant_ids,id]; this.participantQuery='';
  }
  removeStudent(id: number): void { this.form.participant_ids=this.form.participant_ids.filter(value=>value!==id); }
  view(course: Course): void { this.selected.set(course); this.detailChange.emit(true); }
  closeView(): void { this.selected.set(null); this.detailChange.emit(false); }
  toggleStatus(course:Course): void {
    if(!this.canManage(course)||this.togglingCourse()!==null)return;
    const previous=course.status;const status=previous==='active'?'inactive':'active';this.togglingCourse.set(course.id);this.error.set('');
    this.api.setStatus(course.id,status).subscribe({next:()=>{this.courses.update(items=>items.map(item=>item.id===course.id?{...item,status}:item));this.togglingCourse.set(null);},error:()=>{this.togglingCourse.set(null);this.error.set('No se pudo cambiar el estado del curso.');}});
  }
  toggle(course: Course): void { if (course.status === 'active') this.api.deactivate(course.id).subscribe({ next: () => this.load(), error: () => this.error.set('No se pudo desactivar el curso.') }); }
  remove(course: Course): void { if (globalThis.confirm(`¿Eliminar el curso "${course.name}"? Se marcará como inactivo.`)) this.toggle(course); }
  canContinue(): boolean { return !!this.form.name.trim() && this.form.name.length <= 150 && !!this.form.description.trim() && !!this.form.max_participants; }
  valid(): boolean { return this.canContinue() && !!this.form.start_date && !!this.form.end_date && this.form.end_date >= this.form.start_date
    && this.form.tutor_user_id !== null && this.form.participant_ids.length > 0 && this.form.participant_ids.length <= (this.form.max_participants ?? 0); }
  continue(): void { if (this.canContinue()) this.step.update(v => Math.min(v + 1, 1)); }
  previous(): void { this.step.set(0); }
  save(): void { if (!this.valid() || this.saving()) return; this.saving.set(true); const current = this.selected();
    const request = current ? this.api.update(current.id, this.form) : this.api.create(this.form);
    request.subscribe({ next: () => { this.saving.set(false); this.dialog.set(false); this.selected.set(null); this.load(); }, error: () => { this.saving.set(false); this.error.set('No se pudo guardar el curso. Revisa los campos y las fechas.'); } }); }
  private blank(): CourseInput { return { name: '', description: '', start_date: '', end_date: '', status: 'active', tutor_user_id: null, max_participants: null, participant_ids: [] }; }
}
