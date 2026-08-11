import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormSubmissionComponent } from './form-submission.component';
import { AttachmentUploadModule } from '../attachment-upload/attachment-upload.module';

@NgModule({
  declarations: [FormSubmissionComponent],
  imports: [
    CommonModule,
    FormsModule,
    AttachmentUploadModule
  ],
  exports: [FormSubmissionComponent]
})
export class FormSubmissionComponentModule { }
