import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormModule } from 'ng-devui/form';
import { TextInputModule } from 'ng-devui/text-input';
import { SelectModule } from 'ng-devui/select';
import { ButtonModule } from 'ng-devui/button';
import { UserSearchFormComponent } from './user-search-form.component';

@NgModule({
  declarations: [UserSearchFormComponent],
  imports: [
    CommonModule,
    FormsModule,
    FormModule,
    TextInputModule,
    SelectModule,
    ButtonModule
  ],
  exports: [UserSearchFormComponent]
})
export class UserSearchFormModule { }
