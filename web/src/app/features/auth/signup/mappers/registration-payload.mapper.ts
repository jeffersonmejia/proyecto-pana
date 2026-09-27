import { Injectable } from '@angular/core';
import { RegistrationPayload } from '../models/registration-payload';
import { RegistrationDraft } from '../models/registration-draft';

@Injectable({ providedIn: 'root' })
export class RegistrationPayloadMapper {
  map(data: RegistrationDraft, phone: string, email: string): RegistrationPayload {
    return {
      ...data,
      phone,
      email,
      schedules: data.schedules.map((schedule) => this.scheduleValue(schedule)),
    } as RegistrationPayload;
  }

  private scheduleValue(schedule: string): string {
    if (schedule.startsWith("Ma")) return "08:30 a 12:30";
    if (schedule === "Tarde") return "14:30 a 16:30";
    return {
      Mañana: "08:30 a 12:30",
      Tarde: "14:30 a 16:30",
    }[schedule] ?? schedule;
  }
}
