import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class RegistrationAvailabilityService {
  slotKey(day: string, schedule: string): string { return `${day}::${schedule}`; }
  selected(slots: string[], day: string, schedule: string): boolean { return slots.includes(this.slotKey(day, schedule)); }
  allSelected(slots: string[], days: string[], schedule: string): boolean { return days.every(day => this.selected(slots, day, schedule)); }
  toggleSchedule(slots: string[], days: string[], schedule: string): string[] {
    const selected = this.allSelected(slots, days, schedule);
    return days.reduce((result, day) => { const key = this.slotKey(day, schedule); const has = result.includes(key); if (selected && has) result.splice(result.indexOf(key), 1); if (!selected && !has) result.push(key); return result; }, [...slots]);
  }
  toggle(slots: string[], day: string, schedule: string): string[] { const key = this.slotKey(day, schedule); return slots.includes(key) ? slots.filter(item => item !== key) : [...slots, key]; }
  arrays(slots: string[], days: string[], schedules: string[]): { days: string[]; schedules: string[] } {
    return { days: days.filter(day => slots.some(slot => slot.startsWith(`${day}::`))), schedules: schedules.filter(schedule => slots.some(slot => slot.endsWith(`::${schedule}`))) };
  }
}
