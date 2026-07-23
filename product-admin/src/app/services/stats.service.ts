import { Injectable } from '@angular/core';
import * as rxjs from 'rxjs';

@Injectable({ providedIn: 'root' })
export class StatsService {
  tick$ = rxjs.interval(500).pipe(rxjs.map(i => ({ i, t: Date.now() })));
}
