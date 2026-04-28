import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FormSubmissionComponent } from './components/form-submission/form-submission.component';

const routes: Routes = [
  {
    path: '',
    component: FormSubmissionComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FormSubmissionRoutingModule { }
