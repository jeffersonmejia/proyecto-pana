import { Component, OnDestroy, OnInit, computed, inject, output, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { StepDialogComponent } from '../../shared/step-dialog.component';
import { SkeletonLoaderComponent } from '../../shared/skeleton-loader.component';
import { LucideBan, LucideBookOpen, LucideCalendarDays, LucideCheck, LucideCircleAlert, LucideCircleCheck, LucideList, LucidePencil, LucidePlus, LucideRefreshCw, LucideTrash, LucideUsersRound } from '@lucide/angular'; import * as QRCode from 'qrcode';
import { Course, CourseInput, CourseSections, CoursesApiService } from './courses-api.service';
import { CourseDetailComponent } from './course-detail.component';

@Component({ selector: 'pana-courses-home', standalone: true, imports: [FormsModule, StepDialogComponent, SkeletonLoaderComponent, CourseDetailComponent, LucideBan, LucideBookOpen, LucideCalendarDays, LucideCheck, LucideCircleAlert, LucideCircleCheck, LucideList, LucidePencil, LucidePlus, LucideRefreshCw, LucideTrash, LucideUsersRound], templateUrl: './courses-home.component.html', styleUrl: './courses-home.component.scss' })
export class CoursesHomeComponent implements OnInit, OnDestroy {
  readonly detailChange=output<boolean>(); readonly window = window;
  private readonly route=inject(ActivatedRoute); private readonly router=inject(Router); private routeCourseId:number|null=null;
  private readonly api = inject(CoursesApiService); readonly auth = inject(AuthService);
  readonly greetingName=computed(()=>((this.auth.user()?.first_name??this.auth.user()?.email??'').trim().split(/\s+/)[0]));
  isEvent(): boolean { return this.router.url.startsWith('/eventos'); }
  courseIntro(): string { const roles=this.auth.user()?.roles??[]; if (this.isEvent()) return roles.includes('coordinator') ? 'Crea nuevos eventos para que los beneficiarios participen.' : roles.includes('tecnico') ? 'Gestiona los eventos asignados por tu coordinador.' : 'Consulta los eventos especiales del Proyecto PANA.'; if (roles.includes('coordinator')) return 'Crea nuevos cursos para que los beneficiarios se inscriban.'; if (roles.includes('tecnico')) return 'Gestiona los cursos creados por tu coordinador.'; return 'Explora cursos de voluntariado en el Patronato Municipal de Santo Domingo.'; }
  readonly courses = signal<(Course & { enrolled?: boolean })[]>([]); readonly tecnicos = signal<{ id: number; name: string }[]>([]);
  readonly statusFilter=signal<'active'|'inactive'|'all'>('active'); readonly enrollmentFilter=signal<'enrolled'|'not_enrolled'>('enrolled'); readonly enrollmentLocked=signal(false); readonly togglingCourse=signal<number|null>(null);
  readonly pendingMode=signal(false); readonly pendingTasks=signal<(CourseSections['activities'][number]&{course_id:number;course_name:string})[]>([]);
  readonly coursesLoaded=signal(false);
  readonly navigationCollapsed=signal(false);
  readonly pendingLoading=signal(false); readonly pendingError=signal(''); readonly uploadingTask=signal<number|null>(null);
  readonly enrollmentSuccess=signal(false);
  readonly visibleCourses=computed(()=>this.isLearner() ? (this.enrollmentLocked() ? this.courses().filter(course=>course.enrolled) : this.courses().filter(course=>this.enrollmentFilter()==='enrolled' ? course.enrolled : !course.enrolled)) : this.courses().filter(course=>this.statusFilter()==='all'||course.status===this.statusFilter()));
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
  readonly selected = signal<Course | null>(null); readonly courseToDelete = signal<Course | null>(null); readonly dialog = signal(false); readonly step = signal(0); readonly qrPreview = signal(''); readonly coverFile = signal<File | null>(null); readonly coverPreview = signal('assets/login-pana.png'); readonly coverVersion = signal(Date.now());
  readonly error = signal(''); readonly saving = signal(false); readonly refreshing = signal(false); readonly copiedLink = signal(false); readonly draftCourseId = signal<number | null>(null); form: CourseInput = this.blank(); private loadingStartedAt = 0;
  ngOnInit(): void { document.body.classList.add('pana-courses-loading'); this.navigationCollapsed.set(this.readNavigationCollapsed()); this.route.paramMap.subscribe(params=>{const value=Number(params.get('courseId'));this.routeCourseId=value>0?value:null;if(this.coursesLoaded())this.selectRouteCourse();});this.load(); }
  ngOnDestroy(): void { document.body.classList.remove('pana-courses-loading'); }
  private navigationStorageKey(): string { return `pana.course-navigation.collapsed.${this.auth.user()?.id ?? 'default'}`; }
  private readNavigationCollapsed(): boolean { try { return typeof localStorage !== 'undefined' && localStorage.getItem(this.navigationStorageKey()) === 'true'; } catch { return false; } }
  canCreate(): boolean { return this.auth.user()?.roles.includes('coordinator') ?? false; }
  isDetailRoute(): boolean { return this.routeCourseId !== null; }
  isLearner(): boolean { const roles=this.auth.user()?.roles??[]; return roles.includes('student')||roles.includes('beneficiary'); }
  isBeneficiary(): boolean { return this.auth.user()?.roles.includes('beneficiary') ?? false; }
  isAdmin(): boolean { return this.auth.user()?.roles.includes('admin') ?? false; }
  isTechnician(): boolean { return this.auth.user()?.roles.includes('tecnico') ?? false; }
  canManageCourseFilters(): boolean { const roles=this.auth.user()?.roles??[]; return roles.includes('admin')||roles.includes('coordinator'); }
  canSeePending(): boolean { const roles = this.auth.user()?.roles ?? []; return !roles.includes('admin') && !roles.includes('coordinator'); }
  canEnroll(): boolean { return this.auth.user()?.roles.includes('beneficiary') ?? false; }
  canManage(_course: Course): boolean { const roles=this.auth.user()?.roles??[]; return this.auth.hasPermission('courses.manage.all') || (this.auth.hasPermission('courses.manage') && roles.includes('coordinator')); }
  load(): void { this.error.set(''); this.refreshing.set(true); this.loadingStartedAt=Date.now(); if(this.isLearner()){this.enrollmentFilter.set('not_enrolled');this.api.available(this.isEvent()).subscribe({next:r=>this.finishLoad(r.courses.map(c=>({...c,enrolled:Boolean(c.enrolled)}))),error:()=>{this.finishLoad([]);this.error.set(this.isEvent()?'No se pudieron cargar los eventos disponibles.':'No se pudieron cargar los cursos disponibles.');}});return;} this.api.list(this.isEvent()).subscribe({next:r=>this.finishLoad(r.courses.map(c=>({...c,enrolled:true}))),error:()=>{this.finishLoad([]);this.error.set(this.isEvent()?'No se pudieron cargar los eventos.':'No se pudieron cargar los cursos.');this.pendingError.set('No se pudieron cargar las tareas pendientes.');}}); }
  private finishLoad(courses:(Course & { enrolled?: boolean })[]): void { const wait=Math.max(0,700-(Date.now()-this.loadingStartedAt)); setTimeout(()=>{this.courses.set(courses);this.enrollmentLocked.set(this.isLearner() && courses.some(course=>course.enrolled));this.coursesLoaded.set(true);this.refreshing.set(false);this.pendingLoading.set(false);document.body.classList.remove('pana-courses-loading');this.selectRouteCourse();if(this.pendingMode())this.loadPending();},wait); }
  enroll(course: Course & { enrolled?: boolean }): void { this.api.enroll(course.id).subscribe({next:()=>this.load(),error:()=>this.error.set('No se pudo completar la inscripción. El curso puede estar lleno o inactivo.')}); }
  enrollOnce(course: Course & { enrolled?: boolean }): void { if(this.enrollmentLocked() || this.courseHasNoCapacity(course))return; this.api.enroll(course.id).subscribe({next:()=>{this.courses.update(items=>items.map(item=>({...item,enrolled:item.id===course.id})));this.enrollmentLocked.set(true);this.enrollmentSuccess.set(true);},error:(error)=>{const code=error?.error?.error??'';this.error.set(code==='already_enrolled'?'Ya tienes una inscripción activa en otro curso.':code==='course_full'?'Este curso ya no tiene cupos disponibles.':'No se pudo completar la inscripción. El curso puede estar lleno o inactivo.');}}); }
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
    this.form = { ...this.blank(), is_event: this.isEvent(), start_date: today, end_date: this.isEvent() ? today : this.thirtyDaysLater(today) };
    this.openDialog();
  }
  edit(course: Course): void { this.selected.set(course); this.form = { name: course.name, description: course.description ?? '', qr_link: course.qr_link ?? '', start_date: course.start_date, end_date: this.isEvent() ? course.start_date : course.end_date, status: course.status, tecnico_user_ids: [...course.tecnico_user_ids], max_participants: course.max_participants, participant_ids: [...course.participant_ids], is_event: this.isEvent() }; this.openDialog(); }
  closeDialog(): void { this.dialog.set(false); this.error.set(''); this.selected.set(null); this.coverFile.set(null); this.draftCourseId.set(null); }
  openDialog(): void { this.step.set(0); this.tecnicoQuery = ''; this.qrPreview.set(''); this.coverFile.set(null); this.draftCourseId.set(null); this.error.set(''); this.coverPreview.set(this.selected()?.cover_available ? this.courseCoverUrl(this.selected()!) : 'assets/login-pana.png'); this.dialog.set(true); if(!this.selected())void this.loadDefaultCover();
    this.api.tecnicos().subscribe({ next: r => this.tecnicos.set(r.tecnicos), error: () => this.error.set('No se pudieron cargar los técnicos.') });
  }
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
  allTecnicosSelected(): boolean { return this.tecnicos().length > 0 && this.tecnicos().every(item => this.form.tecnico_user_ids.includes(item.id)); }
  partialTecnicosSelection(): boolean { return this.form.tecnico_user_ids.length > 0 && !this.allTecnicosSelected(); }
  toggleAllTecnicos(): void { this.form.tecnico_user_ids=this.allTecnicosSelected()?[]:this.tecnicos().map(item=>item.id); }
  onCover(event: Event): void { const file=(event.target as HTMLInputElement).files?.[0] ?? null; this.coverFile.set(file); if(file)this.coverPreview.set(URL.createObjectURL(file)); }
  private async loadDefaultCover(): Promise<void> { try { const response=await fetch('assets/login-pana.png'); const blob=await response.blob(); this.coverFile.set(new File([blob],'login-pana.png',{type:blob.type||'image/png'})); } catch { this.error.set('No se pudo cargar la portada predeterminada.'); } }
  hasCover(): boolean { return !!this.coverFile() || !!this.selected()?.cover_available; }
  private refreshQrCode(id: number): void { const link=`${window.location.origin}/bienvenido?id=${id}`; this.form.qr_link=link; this.qrPreview.set(''); void QRCode.toDataURL(link,{width:240,margin:2}).then(data=>{if(this.form.qr_link===link)this.qrPreview.set(data);}); }
  courseCoverUrl(course: Course): string { return course.cover_available ? `${this.api.publicCoverUrl(course.id)}&v=${this.coverVersion()}` : 'assets/login-pana.png'; }
  onCoverError(event: Event): void { const image = event.target as HTMLImageElement; if (!image.src.endsWith('/assets/login-pana.png')) image.src = 'assets/login-pana.png'; }
  copyLink(): void { if(!this.form.qr_link)return; void navigator.clipboard.writeText(this.form.qr_link).then(()=>{this.copiedLink.set(true);setTimeout(()=>this.copiedLink.set(false),1800);}); }
  view(course: Course & { enrolled?: boolean }): void { if(this.isLearner()&&!course.enrolled)return; this.selected.set(course); this.detailChange.emit(true); void this.router.navigate([this.basePath(),course.id]); }
  formatDateRange(start: string, end: string): string {
    const parse = (value: string): { year: number; month: number; day: number } | null => {
      const [year, month, day] = value.split('-').map(Number);
      return year && month && day ? { year, month, day } : null;
    };
    const from = parse(start); const to = parse(end);
    if (!from || !to) return `${start} – ${end}`;
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const format = (date: { year: number; month: number; day: number }, includeYear = true): string => `${String(date.day).padStart(2, '0')} ${months[date.month - 1]}${includeYear ? ` ${date.year}` : ''}`;
    if (this.isEvent()) return format(from);
    return from.year === to.year ? `${format(from, false)} – ${format(to)}` : `${format(from)} – ${format(to)}`;
  }
  participantProgress(course: Course): number { return course.max_participants ? Math.min(100, (course.participant_count / course.max_participants) * 100) : 0; }
  courseHasNoCapacity(course: Course): boolean { return Number(course.max_participants ?? 0) > 0 && Number(course.participant_count ?? 0) >= Number(course.max_participants); }
  closeView(): void { this.selected.set(null); this.detailChange.emit(false); void this.router.navigateByUrl(this.basePath()); }
  toggleStatus(course:Course): void {
    if(!this.canManage(course)||this.togglingCourse()!==null)return;
    const previous=course.status;const status=previous==='active'?'inactive':'active';this.togglingCourse.set(course.id);this.error.set('');
    this.api.setStatus(course.id,status).subscribe({next:()=>{this.courses.update(items=>items.map(item=>item.id===course.id?{...item,status}:item));this.togglingCourse.set(null);},error:()=>{this.togglingCourse.set(null);this.error.set('No se pudo cambiar el estado del curso.');}});
  }
  deleteCourse(course: Course): void { this.api.delete(course.id).subscribe({ next: () => this.load(), error: () => this.error.set(`No se pudo eliminar el ${this.isEvent()?'evento':'curso'}.`) }); }
  remove(course: Course): void { this.courseToDelete.set(course); }
  cancelDelete(): void { this.courseToDelete.set(null); }
  confirmDelete(): void { const course=this.courseToDelete(); if(!course)return; this.courseToDelete.set(null); this.deleteCourse(course); }
  canContinue(): boolean { return !!this.form.name.trim() && this.form.name.length <= 150 && !!this.form.description.trim() && !!this.form.max_participants; }
  private validCreationDates(): boolean { return !!this.selected() || (this.form.start_date >= this.localDate() && this.form.end_date >= this.form.start_date); }
  valid(): boolean { return this.canContinue() && !!this.form.start_date && !!this.form.end_date && this.form.end_date >= this.form.start_date
    && this.validCreationDates() && this.form.tecnico_user_ids.length > 0 && this.form.participant_ids.length <= (this.form.max_participants ?? 0) && /^https?:\/\/[^\s]+$/i.test(this.form.qr_link.trim()) && this.form.qr_link.length <= 500; }
  canAdvance(): boolean { const step=this.step(); return step===0 ? this.canContinue() && !!this.form.start_date && !!this.form.end_date && this.form.end_date>=this.form.start_date && this.validCreationDates() : step===1 ? this.form.tecnico_user_ids.length>0 : this.hasCover(); }
  continue(): void { if(this.isEvent())this.form.end_date=this.form.start_date; if(!this.canAdvance())return; if(this.step()===1){this.prepareQr();return;} this.step.update(v=>v+1); }
  private prepareQr(): void { const stored=this.selected()?.id; if(stored)this.refreshQrCode(stored); else { const link=`https://pana.local/pending-${Date.now()}`; this.form.qr_link=link; this.qrPreview.set(''); void QRCode.toDataURL(link,{width:240,margin:2}).then(data=>{if(this.form.qr_link===link)this.qrPreview.set(data);}); } this.step.set(2); }
  previous(): void { this.step.update(v => Math.max(v - 1, 0)); }
    save(): void { if(!this.valid()||this.saving())return; this.saving.set(true); const complete=()=>{this.coverVersion.update(value=>value+1);this.saving.set(false);this.dialog.set(false);this.selected.set(null);this.load();}; const upload=(id:number)=>{const file=this.coverFile(); if(file)this.api.uploadCover(id,file).subscribe({next:complete,error:()=>{this.saving.set(false);this.error.set('No se pudo subir la portada.');}});else complete();}; const update=(id:number)=>this.api.update(id,this.form).subscribe({next:()=>upload(id),error:(error)=>{this.saving.set(false);const code=error?.error?.error??error?.error?.message??'';const messages:Record<string,string>={course_name_exists:'Ya existe un curso con ese nombre. Usa otro nombre.',invalid_participant:'Uno de los participantes asignados ya no esta disponible.',invalid_tecnicos:'Revisa los tecnicos asignados.',invalid_course:'Revisa los datos del curso.'};this.error.set(messages[code]??'No se pudo guardar el curso. Revisa los datos ingresados.');}}); const existing=this.selected()?.id; if(existing){update(existing);return;} this.api.create(this.form).subscribe({next:result=>{this.refreshQrCode(result.id);update(result.id);},error:(error)=>{this.saving.set(false);const code=error?.error?.error??error?.error?.message??'';this.error.set(code==='course_name_exists'?'Ya existe un curso con ese nombre. Usa otro nombre.':'No se pudo guardar el curso. Revisa los datos ingresados.');}}); }
  private blank(): CourseInput { return { name: '', description: '', qr_link: '', start_date: '', end_date: '', status: 'active', tecnico_user_ids: [], max_participants: this.capacities[this.capacities.length - 1] ?? 30, participant_ids: [], is_event: false }; }
  private basePath(): string { return this.isEvent() ? '/eventos' : '/cursos'; }
  private selectRouteCourse(): void { if(this.routeCourseId===null){this.selected.set(null);this.detailChange.emit(false);return;} const course=this.courses().find(item=>item.id===this.routeCourseId)??null;this.selected.set(course);this.detailChange.emit(!!course);if(!course){this.error.set(`No se encontró el ${this.isEvent()?'evento':'curso'} solicitado.`);void this.router.navigateByUrl(this.basePath(),{replaceUrl:true});} }
}
