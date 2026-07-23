import { AfterViewInit, Component, HostListener, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import { ProductService, Product } from '../../services/product.service';
import { measure } from '../../core/perf';
import { StatsService } from '../../services/stats.service';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import filter from 'lodash/filter';
import orderBy from 'lodash/orderBy';
import Quill from 'quill';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ScrollingModule],
  template: `
    <div class="wrapper">
      <div class="toolbar">
        <input class="search" type="text" placeholder="搜索商品名称 / SKU / 分类"
               [(ngModel)]="keyword" (input)="onSearch()">
        <select [(ngModel)]="category" (change)="onSearch()">
          <option value="">全部分类</option>
          <option *ngFor="let c of categories; trackBy: trackByCategory" [value]="c">{{ c }}</option>
        </select>
        <select [(ngModel)]="sortField" (change)="onSearch()">
          <option value="id">默认排序</option>
          <option value="price">按价格</option>
          <option value="sales">按销量</option>
          <option value="stock">按库存</option>
          <option value="createdAt">按创建时间</option>
        </select>
        <button (click)="toggleSortDir()">{{ sortDir === 'asc' ? '升序' : '降序' }}</button>
        <span class="count">共 {{ getFilteredCount() }} 条</span>
      </div>

      <cdk-virtual-scroll-viewport [itemSize]="rowHeight" class="viewport">
        <div class="grid-row" *cdkVirtualFor="let row of rows; trackBy: trackByRowIndex">
          <div class="card" *ngFor="let p of row; trackBy: trackById">
            <img [src]="p.thumbnail" [alt]="p.name" loading="lazy" decoding="async" width="240" height="160">
            <div class="info">
              <div class="name">
                <a [routerLink]="['/products', p.id]">{{ p.name }}</a>
              </div>
              <div class="meta">
                <span class="cat">{{ p.category }}</span>
                <span class="sku">{{ p.sku }}</span>
              </div>
              <div class="row">
                <span class="price">{{ formatPrice(p) }}</span>
                <span class="stock" [class.low]="isLowStock(p)">库存 {{ p.stock }}</span>
              </div>
              <div class="row secondary">
                <span>销量 {{ p.sales }}</span>
                <span>{{ formatTime(p.createdAt) }}</span>
              </div>
              <div class="row">
                <span class="status" [class.off]="p.status === 'off'">{{ getStatusText(p) }}</span>
                <span class="tag">{{ getPriceTier(p) }}</span>
              </div>
            </div>
          </div>
        </div>
      </cdk-virtual-scroll-viewport>
    </div>
  `,
  styles: [`
    .wrapper { display: flex; flex-direction: column; height: 100%; }
    .toolbar { background: #fff; padding: 14px 16px; border-radius: 6px; margin-bottom: 16px; display: flex; gap: 12px; align-items: center; flex-shrink: 0; }
    .toolbar .search { flex: 1; padding: 8px 12px; border: 1px solid #dcdfe6; border-radius: 4px; }
    .toolbar select, .toolbar button { padding: 8px 12px; border: 1px solid #dcdfe6; border-radius: 4px; background: #fff; }
    .toolbar .count { color: #909399; margin-left: auto; font-size: 13px; }
    .viewport { flex: 1; min-height: 0; width: 100%; }
    .grid-row { display: flex; gap: 14px; height: 320px; align-items: flex-start; }
    .card { width: 240px; height: 306px; background: #fff; border-radius: 6px; overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
    .card img { width: 100%; height: 160px; object-fit: cover; display: block; }
    .info { padding: 12px; }
    .name a { font-weight: 600; color: #303133; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .meta { display: flex; gap: 8px; font-size: 12px; color: #909399; margin: 4px 0 8px; }
    .row { display: flex; justify-content: space-between; align-items: center; margin-top: 6px; font-size: 13px; }
    .row.secondary { color: #909399; }
    .price { color: #f56c6c; font-weight: 600; font-size: 16px; }
    .stock.low { color: #e6a23c; }
    .status { color: #67c23a; }
    .status.off { color: #909399; }
    .tag { background: #ecf5ff; color: #409eff; padding: 2px 6px; border-radius: 2px; font-size: 12px; }
  `]
})
export class ProductListComponent implements OnInit, AfterViewInit {
  @ViewChild(CdkVirtualScrollViewport) viewport?: CdkVirtualScrollViewport;

  all: Product[] = [];
  filtered: Product[] = [];
  rows: Product[][] = [];
  columns = 4;
  keyword = '';
  category = '';
  sortField: 'id' | 'price' | 'sales' | 'stock' | 'createdAt' = 'id';
  sortDir: 'asc' | 'desc' = 'asc';
  categories = ['数码', '家电', '服饰', '食品', '美妆', '母婴', '运动', '图书'];

  // 卡片固定宽高 → 行高固定，虚拟滚动才能按 itemSize 精确定位
  private readonly cardWidth = 240;
  private readonly gap = 14;
  readonly rowHeight = 320;

  constructor(private productService: ProductService, private stats: StatsService) {}

  ngOnInit(): void {
    // Quill — 拉进整个富文本编辑器包
    console.log('[product-list] Quill version:', Quill.version);

    this.productService.products$.subscribe(list => {
      this.all = list;
      this.applyFilter();
    });
    this.stats.tick$.subscribe(v => {
      void v;
    });
  }

  ngAfterViewInit(): void {
    // 视口渲染后按实际宽度算列数并重建行
    setTimeout(() => this.recomputeColumns());
  }

  @HostListener('window:resize')
  onResize(): void {
    this.recomputeColumns();
  }

  onSearch(): void {
    this.applyFilter();
  }

  toggleSortDir(): void {
    this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    this.applyFilter();
  }

  applyFilter(): void {
    measure('product-list:filter', () => {
      const kw = this.keyword.trim().toLowerCase();
      let list = this.all;
      if (kw) {
        list = filter(list, p =>
          p.name.toLowerCase().includes(kw) ||
          p.sku.toLowerCase().includes(kw) ||
          p.category.toLowerCase().includes(kw)
        );
      }
      if (this.category) {
        list = filter(list, p => p.category === this.category);
      }
      list = orderBy(list, [this.sortField], [this.sortDir]);
      this.filtered = list;
    });
    this.rebuildRows();
    this.viewport?.scrollToIndex(0);
  }

  private rebuildRows(): void {
    const cols = this.columns;
    const rows: Product[][] = [];
    for (let i = 0; i < this.filtered.length; i += cols) {
      rows.push(this.filtered.slice(i, i + cols));
    }
    this.rows = rows;
  }

  private recomputeColumns(): void {
    const el = this.viewport?.elementRef.nativeElement;
    const width = el && el.clientWidth ? el.clientWidth : window.innerWidth;
    const cols = Math.max(1, Math.floor((width + this.gap) / (this.cardWidth + this.gap)));
    if (cols !== this.columns) {
      this.columns = cols;
      this.rebuildRows();
    }
    this.viewport?.checkViewportSize();
  }

  getFilteredCount(): number {
    return this.filtered.length;
  }

  trackByRowIndex(i: number): number {
    return i;
  }

  trackById(_: number, p: Product): number {
    return p.id;
  }

  trackByCategory(_: number, c: string): string {
    return c;
  }

  formatPrice(p: Product): string {
    return '¥' + p.price.toFixed(2);
  }

  formatTime(t: number): string {
    return dayjs(t).locale('zh-cn').format('YYYY-MM-DD');
  }

  isLowStock(p: Product): boolean {
    return p.stock < 50;
  }

  getStatusText(p: Product): string {
    return p.status === 'on' ? '在售' : '下架';
  }

  getPriceTier(p: Product): string {
    if (p.price < 100) return '低价';
    if (p.price < 1000) return '中价';
    return '高价';
  }
}
