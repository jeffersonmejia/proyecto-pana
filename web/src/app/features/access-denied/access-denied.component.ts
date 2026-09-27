import { Component } from '@angular/core';

@Component({selector:'pana-access-denied',standalone:true,template:`<section class="denied"><h1>Acceso no disponible</h1><p>Tu rol no tiene permiso para abrir esta sección.</p></section>`,styles:[`.denied{max-width:640px;margin:48px auto;padding:28px;border:1px solid #d7e2f2;border-radius:18px;background:#fff;color:#202124}.denied h1{margin:0 0 8px;font-size:1.25rem}.denied p{margin:0;color:#5f6f84}`]})
export class AccessDeniedComponent {}
