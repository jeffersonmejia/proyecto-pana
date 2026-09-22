import { UserProfile } from './admin-api.service';

export function emptyProfile(): UserProfile {
  return { position: '', institutional_phone: '', institution: '', university: '', career: '',
    process_type: '', hours_required: '', hours_completed: 0, start_date: '', end_date: '',
    birth_date: '', address: '', entry_date: '', observations: '', is_active: true, student_person_ids: [] };
}

export function validIdentity(user: { ci: string; first_name: string; last_name: string; email: string }): boolean {
  return /^[A-Za-z0-9-]{5,20}$/.test(user.ci.trim()) && !!user.first_name.trim()
    && !!user.last_name.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email.trim());
}

export function validProfile(role: string, profile: UserProfile): boolean {
  if (role === 'coordinator') return !!profile.position?.trim();
  if (role === 'tutor') return !!profile.institution?.trim();
  if (role === 'student') return !!profile.university?.trim() && !!profile.career?.trim()
    && !!profile.process_type?.trim() && String(profile.hours_required ?? '').trim() !== ''
    && Number(profile.hours_required) >= 0 && !!profile.start_date;
  return role !== 'volunteer' || !!profile.entry_date;
}
