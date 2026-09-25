import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
export interface EventItem { id:number; name:string; description:string|null; event_date:string; event_time:string|null; location:string|null; meeting_point:string|null; requirements:string|null; status:'active'|'inactive'; max_participants:number; participant_count:number; enrolled:boolean; }
@Injectable({providedIn:'root'}) export class EventsApiService {
  private readonly http=inject(HttpClient); private readonly url=`${environment.apiBaseUrl}/events`;
  list(){return this.http.get<{events:EventItem[]}>(this.url);}
  enroll(id:number,input:EventRegistration){return this.http.post(`${this.url}/enroll?id=${id}`,input);}
  create(input:EventInput){return this.http.post<{id:number}>(this.url,input);}
}
export interface EventInput { name:string; description:string; event_date:string; event_time:string; location:string; meeting_point:string; requirements:string; max_participants:number; }
export interface EventRegistration { full_name:string; email:string; gender:string; gender_other:string; category:string; phone:string; address:string; }
