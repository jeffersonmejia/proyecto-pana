import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class RegistrationLocationService {
  constructor(private readonly sanitizer: DomSanitizer) {}
  mapUrl(latitude: number, longitude: number): SafeResourceUrl { const point = `${latitude},${longitude}`; return this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.google.com/maps?q=${point}&ll=${point}&z=18&output=embed`); }
  isSantoDomingo(latitude: number, longitude: number): boolean { const latDistance = (latitude + 0.2504757) * 111.32; const lonDistance = (longitude + 79.168232) * 111.32 * Math.cos((-0.2504757 * Math.PI) / 180); return Math.sqrt(latDistance ** 2 + lonDistance ** 2) <= 35; }
}
