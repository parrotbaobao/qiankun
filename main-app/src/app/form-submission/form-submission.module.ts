import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormSubmissionRoutingModule } from './form-submission-routing.module';
import { FormSubmissionComponentModule } from './components/form-submission/form-submission.module';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    FormSubmissionRoutingModule,
    FormSubmissionComponentModule
  ]
})
export class FormSubmissionModule { }
