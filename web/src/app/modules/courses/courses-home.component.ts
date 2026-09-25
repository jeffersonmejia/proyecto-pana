import { Component, OnInit, computed, inject, output, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { StepDialogComponent } from '../../shared/step-dialog.component';
import { SkeletonLoaderComponent } from '../../shared/skeleton-loader.component';
import { LucideBan, LucideBookOpen, LucideCalendarDays, LucideCheck, LucideList, LucidePencil, LucidePlus, LucideTrash, LucideUsersRound, LucideClock3, LucideFileText } from '@lucide/angular';
import { Course, CourseInput, CourseSections, CoursesApiService } from './courses-api.service';
import { CourseDetailComponent } from './course-detail.component';

@Component({ selector: 'pana-courses-home', standalone: true, imports: [FormsModule, StepDialogComponent, SkeletonLoaderComponent, CourseDetailComponent, LucideBan, LucideBookOpen, LucideCalendarDays, LucideCheck, LucideList, LucidePencil, LucidePlus, LucideTrash, LucideUsersRound, LucideClock3, LucideFileText], templateUrl: './courses-home.component.html', styleUrl: './courses-home.component.scss' })
export class CoursesHomeComponent implements OnInit {
  readonly detailChange=output<boolean>();
  private readonly route=inject(ActivatedRoute); private readonly router=inject(Router); private routeCourseId:number|null=null;
  private readonly api = inject(CoursesApiService); readonly auth = inject(AuthService);
  readonly greetingName=computed(()=>((this.auth.user()?.first_name??this.auth.user()?.email??'').trim().split(/\s+/)[0]));
  courseIntro(): string { const roles=this.auth.user()?.roles??[]; if (roles.includes('coordinator')) return 'Crea nuevos cursos para que los beneficiarios se inscriban.'; if (roles.includes('tecnico')) return 'Gestiona los cursos creados por tu coordinador.'; return 'Explora cursos de voluntariado en el Patronato Municipal de Santo Domingo.'; }
  readonly courses = signal<(Course & { enrolled?: boolean })[]>([]); readonly tecnicos = signal<{ id: number; name: string }[]>([]);
  readonly statusFilter=signal<'active'|'inactive'|'all'>('active'); readonly enrollmentFilter=signal<'enrolled'|'not_enrolled'>('enrolled'); readonly togglingCourse=signal<number|null>(null);
  readonly pendingMode=signal(false); readonly pendingTasks=signal<(CourseSections['activities'][number]&{course_id:number;course_name:string})[]>([]);
  readonly coursesLoaded=signal(false);
  readonly pendingLoading=signal(false); readonly pendingError=signal(''); readonly uploadingTask=signal<number|null>(null);
  readonly visibleCourses=computed(()=>this.isLearner() ? this.courses().filter(course=>this.enrollmentFilter()==='enrolled' ? course.enrolled : !course.enrolled) : this.courses().filter(course=>this.statusFilter()==='all'||course.status===this.statusFilter()));
  readonly activeCount=computed(()=>this.courses().filter(course=>course.status==='active').length);
  readonly inactiveCount=computed(()=>this.courses().filter(course=>course.status==='inactive').length);
  readonly allCount=computed(()=>this.courses().length);
  readonly enrolledCount=computed(()=>this.courses().filter(course=>course.enrolled).length);
  readonly notEnrolledCount=computed(()=>this.courses().filter(course=>!course.enrolled).length);
  readonly participants = signal<{ id: number; name: string; profile: string }[]>([]);
  readonly capacities = Array.from({ length: 30 }, (_, index) => index + 1);
  participantQuery = '';
  tecnicoQuery = '';
  readonly filteredTecnicos = computed(() => {
    const query = this.tecnicoQuery.trim().toLocaleLowerCase();
    return this.tecnicos().filter(tecnico => !query || tecnico.name.toLocaleLowerCase().includes(query));
  });
  readonly selected = signal<Course | null>(null); readonly dialog = signal(false); readonly step = signal(0);
  readonly error = signal(''); readonly saving = signal(false); form: CourseInput = this.blank();
  private loadingStartedAt = 0;
  ngOnInit(): void { this.route.paramMap.subscribe(params=>{const value=Number(params.get('courseId'));this.routeCourseId=value>0?value:null;if(this.coursesLoaded())this.selectRouteCourse();});this.load(); }
  canCreate(): boolean { return this.auth.user()?.roles.includes('coordinator') ?? false; }
  isLearner(): boolean { const roles=this.auth.user()?.roles??[]; return roles.includes('student')||roles.includes('beneficiary'); }
  canManageCourseFilters(): boolean { const roles=this.auth.user()?.roles??[]; return roles.includes('admin')||roles.includes('coordinator'); }
  canSeePending(): boolean { const roles = this.auth.user()?.roles ?? []; return !roles.includes('admin') && !roles.includes('coordinator'); }
  canEnroll(): boolean { return this.auth.user()?.roles.includes('beneficiary') ?? false; }
  canManage(_course: Course): boolean { return this.auth.hasPermission('courses.manage.all') || (this.auth.hasPermission('courses.manage') && (this.auth.user()?.roles.includes('coordinator') ?? false)); }
  load(): void { this.loadingStartedAt=Date.now(); this.api.list().subscribe({next:r=>this.api.available().subscribe({next:a=>this.finishLoad([...r.courses.map(c=>({...c,enrolled:true})),...a.courses.filter(c=>!r.courses.some(x=>x.id===c.id)).map(c=>({...c,enrolled:false}))]),error:()=>this.finishLoad(r.courses.map(c=>({...c,enrolled:true})))}),error:()=>{this.finishLoad([]);this.error.set('No se pudieron cargar los cursos.');this.pendingError.set('No se pudieron cargar las tareas pendientes.');}}); }
  private finishLoad(courses:(Course & { enrolled?: boolean })[]): void { const wait=Math.max(0,700-(Date.now()-this.loadingStartedAt)); setTimeout(()=>{this.courses.set(courses);this.coursesLoaded.set(true);this.pendingLoading.set(false);this.selectRouteCourse();if(this.pendingMode())this.loadPending();},wait); }
  enroll(course: Course & { enrolled?: boolean }): void { this.api.enroll(course.id).subscribe({next:()=>this.load(),error:()=>this.error.set('No se pudo completar la inscripción. El curso puede estar lleno o inactivo.')}); }
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
    if(!['application/pdf','image/jpeg','image/png','video/mp4','video/webm'].includes(file.type)||file.size>50*1024*1024){this.pendingError.set('Selecciona una foto, video o PDF de hasta 50 MB.');return;}
    this.uploadingTask.set(task.id);this.pendingError.set('');this.api.uploadEvidence(task.course_id,task.id,file).subscribe({next:()=>{this.uploadingTask.set(null);this.loadPending();},error:()=>{this.uploadingTask.set(null);this.pendingError.set('No se pudo agregar la entrega. Confirma que esta tarea está asignada a tu cuenta.');}});
  }
  private localDate():string { const now=new Date();now.setMinutes(now.getMinutes()-now.getTimezoneOffset());return now.toISOString().slice(0,10); }
  creationDateMin(): string | null { return this.selected() ? null : this.localDate(); }
  private thirtyDaysLater(dateValue: string): string {
    const target = new Date(`${dateValue}T00:00:00`);
    target.setDate(target.getDate() + 30);
    target.setMinutes(target.getMinutes() - target.getTimezoneOffset());
    return target.toISOString().slice(0, 10);
  }
  create(): void {
    this.selected.set(null);
    const today = this.localDate();
    this.form = { ...this.blank(), start_date: today, end_date: this.thirtyDaysLater(today) };
    this.openDialog();
  }
  edit(course: Course): void { this.selected.set(course); this.form = { name: course.name, description: course.description ?? '', start_date: course.start_date, end_date: course.end_date, status: course.status, tecnico_user_ids: [...course.tecnico_user_ids], max_participants: course.max_participants, participant_ids: [...course.participant_ids] }; this.openDialog(); }
  closeDialog(): void { this.dialog.set(false); this.selected.set(null); }
  openDialog(): void { this.step.set(0); this.tecnicoQuery = ''; this.dialog.set(true);
    this.api.tecnicos().subscribe({ next: r => this.tecnicos.set(r.tecnicos), error: () => this.error.set('No se pudieron cargar los técnicos.') });
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
  toggleTecnico(id: number): void {
    const ids = this.form.tecnico_user_ids;
    this.form.tecnico_user_ids = ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id];
  }
  view(course: Course & { enrolled?: boolean }): void { if(this.canEnroll()&&!course.enrolled)return; this.selected.set(course); this.detailChange.emit(true); void this.router.navigate(['/cursos',course.id]); }
  formatDateRange(start: string, end: string): string {
    const parse = (value: string): { year: number; month: number; day: number } | null => {
      const [year, month, day] = value.split('-').map(Number);
      return year && month && day ? { year, month, day } : null;
    };
    const from = parse(start); const to = parse(end);
    if (!from || !to) return `${start} – ${end}`;
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const format = (date: { year: number; month: number; day: number }, includeYear = true): string => `${String(date.day).padStart(2, '0')} ${months[date.month - 1]}${includeYear ? ` ${date.year}` : ''}`;
    return from.year === to.year ? `${format(from, false)} – ${format(to)}` : `${format(from)} – ${format(to)}`;
  }
  participantProgress(course: Course): number { return course.max_participants ? Math.min(100, (course.participant_count / course.max_participants) * 100) : 0; }
  closeView(): void { this.selected.set(null); this.detailChange.emit(false); void this.router.navigateByUrl('/cursos'); }
  toggleStatus(course:Course): void {
    if(!this.canManage(course)||this.togglingCourse()!==null)return;
    const previous=course.status;const status=previous==='active'?'inactive':'active';this.togglingCourse.set(course.id);this.error.set('');
    this.api.setStatus(course.id,status).subscribe({next:()=>{this.courses.update(items=>items.map(item=>item.id===course.id?{...item,status}:item));this.togglingCourse.set(null);},error:()=>{this.togglingCourse.set(null);this.error.set('No se pudo cambiar el estado del curso.');}});
  }
  toggle(course: Course): void { if (course.status === 'active') this.api.deactivate(course.id).subscribe({ next: () => this.load(), error: () => this.error.set('No se pudo desactivar el curso.') }); }
  remove(course: Course): void { if (globalThis.confirm(`¿Eliminar el curso "${course.name}"? Se marcará como inactivo.`)) this.toggle(course); }
  canContinue(): boolean { return !!this.form.name.trim() && this.form.name.length <= 150 && !!this.form.description.trim() && !!this.form.max_participants; }
  private validCreationDates(): boolean {
    if (this.selected()) return true;
    const today = this.localDate();
    return this.form.start_date >= today && this.form.end_date >= this.form.start_date;
  }
  valid(): boolean { return this.canContinue() && !!this.form.start_date && !!this.form.end_date && this.form.end_date >= this.form.start_date
    && this.validCreationDates() && this.form.tecnico_user_ids.length > 0 && this.form.participant_ids.length <= (this.form.max_participants ?? 0); }
  canAdvance(): boolean {
    if (this.step() === 0) return this.canContinue();
    return !!this.form.start_date && !!this.form.end_date && this.form.end_date >= this.form.start_date && this.validCreationDates();
  }
  continue(): void { if (this.canAdvance()) this.step.update(v => Math.min(v + 1, 2)); }
  previous(): void { this.step.update(v => Math.max(v - 1, 0)); }
  save(): void { if (!this.valid() || this.saving()) return; this.saving.set(true); const current = this.selected();
    const request = current ? this.api.update(current.id, this.form) : this.api.create(this.form);
    request.subscribe({ next: () => { this.saving.set(false); this.dialog.set(false); this.selected.set(null); this.load(); }, error: () => { this.saving.set(false); this.error.set('No se pudo guardar el curso. Revisa los campos y las fechas.'); } }); }
  private blank(): CourseInput { return { name: '', description: '', start_date: '', end_date: '', status: 'active', tecnico_user_ids: [], max_participants: null, participant_ids: [] }; }
  private selectRouteCourse(): void { if(this.routeCourseId===null){this.selected.set(null);this.detailChange.emit(false);return;} const course=this.courses().find(item=>item.id===this.routeCourseId)??null;this.selected.set(course);this.detailChange.emit(!!course);if(!course){this.error.set('No se encontró el curso solicitado.');void this.router.navigateByUrl('/cursos',{replaceUrl:true});} }
}
