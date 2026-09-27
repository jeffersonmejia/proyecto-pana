import { Component } from '@angular/core';
import { RegistrationFacade } from '../../facade/registration.facade';
import { REGISTRATION_UI_IMPORTS } from '../../ui/registration-ui.imports';

@Component({
  selector: 'pana-registration',
  standalone: true,
  imports: REGISTRATION_UI_IMPORTS,
  templateUrl: './registration.component.html',
  styleUrl: './registration.component.scss'
})
export class RegistrationComponent extends RegistrationFacade {}
