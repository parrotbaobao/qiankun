import { Component, OnInit } from '@angular/core';
import { abc } from '@your-org/my-shared-utils';


@Component({
  selector: 'sub-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  ngOnInit(): void {
    abc();
  }
  title = 'sub-app';
}
