import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface Course {
  id: number; name: string; description: string | null; start_date: string; end_date: string;
  status: 'active' | 'inactive'; max_participants: number | null; tutor_user_id: number | null;
  tutor_name: string; participant_count: number; participant_names: string | null;
  participant_ids: number[];
}
export interface CourseInput {
  name: string; description: string; start_date: string; end_date: string;
  status: 'active' | 'inactive'; tutor_user_id: number | null; max_participants: number | null;
  participant_ids: number[];
}
export interface CourseSections {
  course: Course;
  participants: { id: number; first_name: string; last_name: string; name: string; profile: string; attendance_count: number; attendance_minutes: number; last_attendance: string | null; last_attendance_status: 'present'|'absent'|'excused'|null; selected_attendance_status: 'present'|'absent'|'excused'|null; selected_check_in: string|null; selected_check_out: string|null; task_count: number; evaluation_count: number }[];
  activities: { id: number; title: string; description: string | null; start_at: string; end_at: string; status: string; responsible: string; participants: string | null }[];
  activity_logs: { id: number; activity_title: string; event_type: string; details: string; created_at: string; participant_id: number | null; participant_name: string | null; actor_email: string | null }[];
  evaluations: { id: number; evaluation_type: string; evaluated_on: string; satisfaction_score: number | null; observations: string | null; first_name: string; last_name: string; average_score: number | null }[];
  documents: { id: number; entity_type: string; entity_id: number; original_name: string; mime_type: string; file_size: number; created_at: string; uploader: string | null }[];
}
@Injectable({ providedIn: 'root' })
export class CoursesApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/courses`;
  list() { return this.http.get<{ courses: Course[] }>(this.url); }
  sections(id: number,attendanceDate:string) { return this.http.get<CourseSections>(`${this.url}/sections`, { params: { id,attendance_date:attendanceDate } }); }
  createTask(courseId: number,input: { title: string; description: string; responsible: string; start_at: string; end_at: string; status: string; participant_ids: number[] }) {
    return this.http.post<{ id: number }>(`${this.url}/tasks`,input,{params:{course_id:courseId}});
  }
  uploadEvidence(courseId: number,activityId: number,file: File) {
    const form=new FormData(); form.append('course_id',String(courseId)); form.append('entity_type','activity'); form.append('entity_id',String(activityId)); form.append('file',file);
    return this.http.post<{id:number}>(`${environment.apiBaseUrl}/courses/evidence`,form);
  }
  tutors() { return this.http.get<{ tutors: { id: number; name: string }[] }>(`${this.url}/tutors`); }
  participants() { return this.http.get<{ participants: { id: number; name: string; profile: string }[] }>(`${this.url}/participants`); }
  create(input: CourseInput) { return this.http.post<{ id: number }>(this.url, input); }
  update(id: number, input: CourseInput) { return this.http.put(`${this.url}?id=${id}`, { ...input, id }); }
  setStatus(id:number,status:'active'|'inactive') { return this.http.patch(`${this.url}/status?id=${id}`,{status}); }
  deactivate(id: number) { return this.http.delete(`${this.url}?id=${id}`); }
}
