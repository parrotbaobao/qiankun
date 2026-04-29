import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';

interface ErrorItem {
  code: string;
  service: string;
  httpStatus: number;
  descZh: string;
  descEn: string;
  solutionZh: string;
  solutionEn: string;
}

@Component({
  selector: 'app-error-center',
  templateUrl: './error-center.component.html',
  styleUrls: ['./error-center.component.scss'],
})
export class ErrorCenterComponent implements OnInit, OnDestroy {
  services: string[] = [];
  errors: ErrorItem[] = [];
  total = 0;
  loading = false;

  keyword = '';
  selectedService = '';
  page = 1;
  pageSize = 10;

  expandedCode = '';

  private keyword$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(private http: HttpClient, public translate: TranslateService) {}

  ngOnInit(): void {
    this.http.get<{ code: number; data: string[] }>('/api/errors/services')
      .subscribe(res => { this.services = res.data; });

    this.keyword$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
    ).subscribe(() => { this.page = 1; this.fetchErrors(); });

    this.fetchErrors();
  }

  fetchErrors(): void {
    this.loading = true;
    const params = new HttpParams()
      .set('service', this.selectedService)
      .set('keyword', this.keyword)
      .set('page', String(this.page))
      .set('pageSize', String(this.pageSize));

    this.http.get<{ code: number; data: { total: number; list: ErrorItem[] } }>('/api/errors', { params })
      .subscribe({
        next: (res) => { this.errors = res.data.list; this.total = res.data.total; this.loading = false; },
        error: () => { this.loading = false; },
      });
  }

  onKeywordChange(v: string): void { this.keyword$.next(v); }

  onServiceChange(): void { this.page = 1; this.fetchErrors(); }

  onPageChange(p: number): void { this.page = p; this.fetchErrors(); }

  get totalPages(): number { return Math.ceil(this.total / this.pageSize); }

  get pages(): number[] {
    const arr: number[] = [];
    for (let i = 1; i <= this.totalPages; i++) arr.push(i);
    return arr;
  }

  getDesc(item: ErrorItem): string {
    return this.translate.currentLang === 'en' ? item.descEn : item.descZh;
  }

  getSolution(item: ErrorItem): string {
    return this.translate.currentLang === 'en' ? item.solutionEn : item.solutionZh;
  }

  statusClass(status: number): string {
    if (status >= 500) return 'status--5xx';
    if (status >= 400) return 'status--4xx';
    return 'status--ok';
  }

  toggleExpand(code: string): void {
    this.expandedCode = this.expandedCode === code ? '' : code;
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
