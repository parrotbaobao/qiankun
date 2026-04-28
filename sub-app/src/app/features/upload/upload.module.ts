import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';

import { UploadComponent } from './upload.component';

const routes: Routes = [
  { path: '', component: UploadComponent },
];

@NgModule({
  declarations: [UploadComponent],
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    RouterModule.forChild(routes),
    TranslateModule,
  ],
  exports: [UploadComponent]
})
export class UploadModule {}
