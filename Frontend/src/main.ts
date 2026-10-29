import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// Arranca la aplicación standalone con su configuración y registra fallos de inicio.
bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
