import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class RegistrationDateService {
  readonly years = Array.from({ length: 12 }, (_, index) => new Date().getFullYear() - 18 - index);
  readonly months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  availableMonths(year: string): number[] { if (!year) return this.months.map((_, index) => index + 1); return this.months.map((_, index) => index + 1).filter(month => this.daysForMonth(Number(year), month).length > 0); }
  days(year: string, month: string): number[] { return !year || !month ? Array.from({ length: 31 }, (_, index) => index + 1) : this.daysForMonth(Number(year), Number(month)); }
  sync(year: string, month: string, day: string): { year: string; month: string; day: string; date: string } {
    if (year && !this.availableMonths(year).includes(Number(month))) month = '';
    if (month && !this.days(year, month).includes(Number(day))) day = '';
    return { year, month, day, date: !year || !month || !day ? '' : `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}` };
  }
  age(birthDate: string): number | null { if (!birthDate) return null; const birth = new Date(`${birthDate}T00:00:00`); const today = new Date(); let value = today.getFullYear() - birth.getFullYear(); if (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate())) value--; return value; }
  isAllowed(year: number, month: number, day: number): boolean { const date = new Date(year, month - 1, day); const today = new Date(); return date >= new Date(today.getFullYear() - 29, today.getMonth(), today.getDate()) && date <= new Date(today.getFullYear() - 18, today.getMonth(), today.getDate()); }
  private daysForMonth(year: number, month: number): number[] { const max = new Date(year, month, 0).getDate(); return Array.from({ length: max }, (_, index) => index + 1).filter(day => this.isAllowed(year, month, day)); }
}
