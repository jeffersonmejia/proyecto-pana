import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucidePencil, LucidePlus, LucideTrash } from '@lucide/angular';
import { PaginatorComponent, PageInfo } from '../../shared/paginator.component';
import { StepDialogComponent } from '../../shared/step-dialog.component';
import { AdminApiService, ManagedPermission, ManagedRole } from './admin-api.service';

@Component({ selector: 'pana-admin-roles', standalone: true, imports: [FormsModule, PaginatorComponent, StepDialogComponent, LucidePencil, LucidePlus, LucideTrash], templateUrl: './admin-roles.component.html', styleUrls: ['./admin-roles.component.scss'] })
export class AdminRolesComponent implements OnInit {
  private readonly api=inject(AdminApiService);
  readonly roles=signal<ManagedRole[]>([]); readonly permissions=signal<ManagedPermission[]>([]);
  readonly page=signal<PageInfo>({page:1,page_size:5,total:0,pages:1});
  readonly dialog=signal(false); readonly step=signal(0); readonly busy=signal(false); readonly error=signal(''); readonly message=signal('');
  form={id:null as number|null,code:'',name:'',description:'',is_active:true,permissions:[] as string[]};
  ngOnInit(): void { this.load(); }
  load(): void {
    this.api.roles(this.page().page).subscribe({next:r=>{this.roles.set(r.roles);this.page.set(r.pagination);},error:()=>this.error.set('No se pudieron cargar los roles.')});
    this.api.permissions().subscribe({next:r=>this.permissions.set(r),error:()=>this.error.set('No se pudieron cargar los permisos.')});
  }
  edit(role:ManagedRole): void { this.form={...role,description:role.description??'',permissions:[...role.permissions]};this.step.set(0);this.dialog.set(true); }
  create(): void { this.form={id:null,code:'',name:'',description:'',is_active:true,permissions:[]};this.step.set(0);this.dialog.set(true); }
  save(): void { this.busy.set(true);this.error.set('');if(!this.form.id)this.page.update(p=>({...p,page:1}));
    this.api.saveRole(this.form,this.form.id).subscribe({next:()=>{this.busy.set(false);this.dialog.set(false);this.message.set('Rol guardado.');this.load();},error:()=>{this.busy.set(false);this.error.set('No se pudo guardar el rol.');}}); }
  remove(id:number): void { if(confirm('¿Eliminar este rol? Solo se puede eliminar si no está asignado.')) this.api.deleteRole(id).subscribe({next:()=>{this.message.set('Rol eliminado.');this.page.update(p=>({...p,page:1}));this.load();},error:()=>this.error.set('No se pudo eliminar el rol.')}); }
  changePage(page:number): void { this.page.update(p=>({...p,page}));this.load(); }
  canContinue(): boolean { return this.step()>0||(/^[a-z0-9_-]{1,80}$/.test(this.form.code)&&!!this.form.name.trim()); }
  next(): void { if(this.canContinue())this.step.set(1); }
  toggle(event:Event,code:string): void { const checked=(event.target as HTMLInputElement).checked;this.form.permissions=checked?[...new Set([...this.form.permissions,code])]:this.form.permissions.filter(p=>p!==code); }
  permissionName(code:string): string { return this.permissions().find(p=>p.code===code)?.name??code; }
}
