import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { APP_BASE_HREF } from '@angular/common';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule
  ],
  providers: [{
    provide: APP_BASE_HREF,
    useValue: (window as any).__POWERED_BY_QIANKUN__ ? '/sub2-app2' : '/',
  },],
  bootstrap: [AppComponent]
})
export class AppModule { }
