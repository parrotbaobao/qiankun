import { AfterViewInit, Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { registerMicroApps, start } from 'qiankun';
import { filter } from 'rxjs/operators';

let qiankunStarted = false;

@Component({
  selector: 'sub-app',
  templateUrl: './sub-app.component.html',
  styleUrls: ['./sub-app.component.scss'],
})
export class SubSppComponent {
  constructor(private router: Router) { }

}
