import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { WorkspaceShellComponent } from './app/layout/workspace-shell.component';

bootstrapApplication(WorkspaceShellComponent, appConfig).catch((error: unknown) => {
  console.error(error);
});
