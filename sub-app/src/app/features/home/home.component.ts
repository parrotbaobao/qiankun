import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  dialogOpen = false;
  sharedColor = '';
  hostPrimary = '';

  constructor(public translate: TranslateService) {}

  ngOnInit(): void {
    const s = getComputedStyle(document.documentElement);
    this.sharedColor = s.getPropertyValue('--shared-color').trim() || '（未定义）';
    this.hostPrimary  = s.getPropertyValue('--host-primary').trim()  || '（未定义）';
  }
}
