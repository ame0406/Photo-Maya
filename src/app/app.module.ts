import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms'; // Importer FormsModule

import { AppComponent } from './app.component';
import { ImageEditorComponent } from './image-editor/image-editor.component';

@NgModule({
  declarations: [
    AppComponent,
    ImageEditorComponent // Déclarez le composant ici
  ],
  imports: [
    BrowserModule,
    FormsModule // Ajoutez FormsModule ici
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
