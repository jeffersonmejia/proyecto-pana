import { Component } from '@angular/core';
import { CoursesHomeComponent } from '../courses/courses-home.component';

@Component({
  selector: 'pana-events',
  standalone: true,
  imports: [CoursesHomeComponent],
  templateUrl: './events.component.html',
  styleUrl: './events.component.scss'
})
export class EventsComponent {}
