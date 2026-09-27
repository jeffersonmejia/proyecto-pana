import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { LucideCalendarDays, LucideCheck, LucidePlus, LucideUsersRound } from '@lucide/angular';
import { EventInput, EventItem, EventRegistration, EventsApiService } from './events-api.service';
@Component({selector:'pana-events',standalone:true,imports:[FormsModule,LucideCalendarDays,LucideCheck,LucidePlus,LucideUsersRound],templateUrl:'./events.component.html',styleUrl:'./events.component.scss'})
export class EventsComponent {
  readonly auth=inject(AuthService); private readonly api=inject(EventsApiService); readonly events=signal<EventItem[]>([]); readonly loading=signal(true); readonly error=signal(''); readonly saving=signal(false);
  readonly filter=signal<'active'|'inactive'|'all'|'enrolled'|'not_enrolled'>('active'); readonly dialog=signal(false); readonly enrolled=signal(false);
  form:EventInput={name:'',description:'',event_date:'',event_time:'',location:'',meeting_point:'',requirements:'',max_participants:30};
  registrationDialog=signal(false); selectedEvent=signal<EventItem|null>(null); registration:EventRegistration={full_name:'',email:'',gender:'',gender_other:'',category:'',phone:'',address:''};
  readonly isLearner=computed(()=>{const roles=this.auth.user()?.roles??[];return roles.includes('student')||roles.includes('beneficiary');});
  readonly isManager=computed(()=>{const roles=this.auth.user()?.roles??[];return roles.includes('admin')||roles.includes('coordinator');});
  readonly visible=computed(()=>this.events().filter(event=>this.isLearner()?this.filter()==='enrolled'?event.enrolled:!event.enrolled:this.filter()==='all'||event.status===this.filter()));
  readonly enrolledCount=computed(()=>this.events().filter(event=>event.enrolled).length); readonly notEnrolledCount=computed(()=>this.events().filter(event=>!event.enrolled).length);
  readonly activeCount=computed(()=>this.events().filter(event=>event.status==='active').length); readonly inactiveCount=computed(()=>this.events().filter(event=>event.status==='inactive').length);
  constructor(){this.filter.set(this.isLearner()?'enrolled':'active');this.load();}
  load():void{this.loading.set(true);this.api.list().subscribe({next:r=>{this.events.set(r.events);this.loading.set(false);},error:()=>{this.error.set('No se pudieron cargar los eventos.');this.loading.set(false);}});}
  openCreate():void{this.form={name:'',description:'',event_date:'',event_time:'',location:'',meeting_point:'',requirements:'',max_participants:30};this.dialog.set(true);}
  closeCreate():void{if(!this.saving())this.dialog.set(false);}
  save():void{if(!this.form.name.trim()||!this.form.event_date||!this.form.event_time||!this.form.location.trim()||this.form.max_participants<1||this.saving())return;this.saving.set(true);this.api.create({...this.form,name:this.form.name.trim(),description:this.form.description.trim()}).subscribe({next:()=>{this.saving.set(false);this.dialog.set(false);this.load();},error:()=>{this.saving.set(false);this.error.set('No se pudo crear el evento. Revisa sus datos.');}});}
  openEnrollment(event:EventItem):void{if(event.enrolled)return;const user=this.auth.user();this.selectedEvent.set(event);this.registration={full_name:`${user?.first_name??''} ${user?.last_name??''}`.trim(),email:user?.email??'',gender:'',gender_other:'',category:'',phone:user?.phone??'',address:''};this.registrationDialog.set(true);}
  closeEnrollment():void{if(!this.enrolled())this.registrationDialog.set(false);}
  enroll(event?:EventItem):void{if(event){this.openEnrollment(event);return;}const selected=this.selectedEvent();if(!selected||!this.registration.full_name.trim()||!this.registration.email.trim()||!this.registration.gender||!this.registration.category.trim()||!this.registration.phone.trim()||!this.registration.address.trim())return;this.enrolled.set(true);this.api.enroll(selected.id,this.registration).subscribe({next:()=>{this.enrolled.set(false);this.registrationDialog.set(false);this.load();},error:()=>{this.enrolled.set(false);this.error.set('No se pudo completar la inscripción al evento.');}});}
  formatDate(value:string):string{const date=new Date(`${value}T00:00:00`);return new Intl.DateTimeFormat('es-EC',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(date);}
}
