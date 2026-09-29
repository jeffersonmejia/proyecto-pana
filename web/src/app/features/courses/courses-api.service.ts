import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface Course {
  id: number; name: string; description: string | null; qr_link: string | null; start_date: string; end_date: string;
  status: 'active' | 'inactive'; es_evento?: boolean; cover_available: boolean; enrolled?: boolean; max_participants: number | null; tecnico_user_ids: number[];
  tecnico_name: string; tutor_name?: string; participant_count: number; participant_names: string | null;
  participant_ids: number[]; is_event?: boolean;
}
export interface CourseInput {
  name: string; description: string; qr_link: string; start_date: string; end_date: string;
  status: 'active' | 'inactive'; tecnico_user_ids: number[]; max_participants: number | null;
  participant_ids: number[]; is_event?: boolean;
}
export interface CourseSections {
  course: Course;
  attendance_percentage?: number;
  attendance: { id: number; participant_id: number; attendance_date: string; status: 'present'|'absent'|'excused'; check_in: string | null; check_out: string | null; technician_name: string | null }[];
  participants: { id: number; ci: string; phone: string | null; sector: string | null; self_identification: string | null; has_disability: string | null; disability_type: string | null; education: string | null; birth_city: string | null; first_name: string; last_name: string; birth_date: string | null; name: string; profile: string; attendance_count: number; attendance_minutes: number; last_attendance: string | null; last_attendance_id?: number | null; last_attendance_status: 'present'|'absent'|'excused'|null; selected_attendance_id: number|null; selected_attendance_status: 'present'|'absent'|'excused'|null; selected_check_in: string|null; selected_check_out: string|null; task_count: number; evaluation_count: number }[];
  technicians: { id: number; ci: string | null; phone: string | null; first_name: string; last_name: string; email: string; status?: 'active'|'inactive' }[];
  activities: { id: number; title: string; description: string | null; start_at: string; end_at: string; status: string; responsible: string; participants: string | null }[];
  activity_logs: { id: number; activity_title: string; event_type: string; details: string; created_at: string; participant_id: number | null; participant_name: string | null; actor_email: string | null }[];
  evaluations: { id: number; evaluation_type: string; evaluated_on: string; satisfaction_score: number | null; observations: string | null; first_name: string; last_name: string; average_score: number | null }[];
  documents: { id: number; entity_type: string; entity_id: number; original_name: string; mime_type: string; file_size: number; created_at: string; uploader: string | null }[];
  weeks?: { id: number; week_number: number; week_start: string; week_end: string; original_name: string | null; mime_type: string | null; file_size: number | null; uploader: string | null }[];
}
export interface PublicCourse { id: number; name: string; description: string | null; cover_available: boolean; }
@Injectable({ providedIn: 'root' })
export class CoursesApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/courses`;
  list(isEvent=false) { return this.http.get<{ courses: Course[] }>(this.url, { params: { type: isEvent ? 'event' : 'course' } }); }
  available(isEvent=false) { return this.http.get<{ courses: Course[] }>(`${this.url}/available`, { params: { type: isEvent ? 'event' : 'course' } }); }
  enroll(id:number) { return this.http.post(`${this.url}/enroll?id=${id}`,{}); }
  uploadCover(id: number, file: File) { const form = new FormData(); form.append('file', file); return this.http.post(`${this.url}/cover?id=${id}`, form); }
  publicWelcome(id: number) { return this.http.get<{ course: PublicCourse }>(`${environment.apiBaseUrl}/public/courses/welcome`, { params: { id } }); }
  publicCoverUrl(id: number) { return `${environment.apiBaseUrl}/public/courses/cover?id=${id}`; }
  sections(id: number,attendanceDate:string) { return this.http.get<CourseSections>(`${this.url}/sections`, { params: { id,attendance_date:attendanceDate } }); }
  createTask(courseId: number,input: { title: string; description: string; responsible: string; start_at: string; end_at: string; status: string; participant_ids: number[] }) {
    return this.http.post<{ id: number }>(`${this.url}/tasks`,input,{params:{course_id:courseId}});
  }
  updateTask(courseId:number,taskId:number,input: { title: string; description: string; responsible: string; start_at: string; end_at: string; status: string; participant_ids: number[] }) { return this.http.put<{id:number}>(`${this.url}/tasks?id=${taskId}`,input,{params:{course_id:courseId}}); }
  setTaskStatus(courseId:number,taskId:number,status:string) { return this.http.patch(`${this.url}/tasks/status?id=${taskId}`,{status},{params:{course_id:courseId}}); }
  deleteTask(courseId:number,taskId:number) { return this.http.delete(`${this.url}/tasks?id=${taskId}`,{params:{course_id:courseId}}); }
  uploadEvidence(courseId: number,activityId: number,file: File) {
    const form=new FormData(); form.append('course_id',String(courseId)); form.append('entity_type','activity'); form.append('entity_id',String(activityId)); form.append('file',file);
    return this.http.post<{id:number}>(`${environment.apiBaseUrl}/courses/evidence`,form);
  }
  weeklyEvidence(courseId:number) { return this.http.get<{weeks: CourseSections['weeks']}>(`${this.url}/weekly-evidence`,{params:{course_id:courseId}}); }
  uploadWeeklyEvidence(courseId:number,weekNumber:number,file:File) { const form=new FormData(); form.append('course_id',String(courseId)); form.append('week_number',String(weekNumber)); form.append('file',file); return this.http.post(`${this.url}/weekly-evidence`,form); }
  deleteWeeklyEvidence(courseId:number,id:number) { return this.http.delete(`${this.url}/weekly-evidence`,{params:{course_id:courseId,id}}); }
  weeklyEvidenceUrl(courseId:number,id:number) { return `${this.url}/weekly-evidence/file?course_id=${courseId}&id=${id}`; }
  downloadWeeklyEvidence(courseId:number,id:number) { return this.http.get(this.weeklyEvidenceUrl(courseId,id),{responseType:'blob'}); }
  tecnicos() { return this.http.get<{ tecnicos: { id: number; name: string }[] }>(`${this.url}/tecnicos`); }
  participants() { return this.http.get<{ participants: { id: number; name: string; profile: string }[] }>(`${this.url}/participants`); }
  create(input: CourseInput) { return this.http.post<{ id: number }>(this.url, input); }
  update(id: number, input: CourseInput) { return this.http.put(`${this.url}?id=${id}`, { ...input, id }); }
  setStatus(id:number,status:'active'|'inactive') { return this.http.patch(`${this.url}/status?id=${id}`,{status}); }
  setTecnicoStatus(courseId:number,tecnicoId:number,status:'active'|'inactive') { return this.http.patch(`${this.url}/tecnico-status?course_id=${courseId}&id=${tecnicoId}`,{status}); }
  setParticipantStatus(courseId:number,personId:number,status:'active'|'inactive') { return this.http.patch(`${this.url}/participant-status?course_id=${courseId}&id=${personId}`,{status}); }
  delete(id: number) { return this.http.delete(`${this.url}?id=${id}`); }
}
