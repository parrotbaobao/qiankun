import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ProductService, Product } from '../../services/product.service';
import { StatsService } from '../../services/stats.service';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import chain from 'lodash/chain';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="wrapper" *ngIf="product">
      <a routerLink="/products" class="back">← 返回列表</a>
      <div class="detail">
        <img [src]="product.thumbnail" [alt]="product.name">
        <div class="info">
          <h2>{{ product.name }}</h2>
          <div class="row"><span class="label">SKU</span><span>{{ product.sku }}</span></div>
          <div class="row"><span class="label">分类</span><span>{{ product.category }}</span></div>
          <div class="row"><span class="label">价格</span><span class="price">{{ formatPrice(product) }}</span></div>
          <div class="row"><span class="label">库存</span><span>{{ product.stock }}</span></div>
          <div class="row"><span class="label">销量</span><span>{{ product.sales }}</span></div>
          <div class="row"><span class="label">状态</span><span>{{ getStatusText(product) }}</span></div>
          <div class="row"><span class="label">创建时间</span><span>{{ formatTime(product.createdAt) }}</span></div>
          <div class="row"><span class="label">上架天数</span><span>{{ getDaysSince(product) }} 天</span></div>
          <div class="row"><span class="label">预计月销</span><span>{{ getMonthlyEstimate(product) }}</span></div>
        </div>
      </div>
      <section class="related">
        <h3>同分类推荐</h3>
        <ul>
          <li *ngFor="let p of related; trackBy: trackById">
            <a [routerLink]="['/products', p.id]">{{ p.name }}</a>
            <span class="s">销量 {{ p.sales }}</span>
            <span class="p">{{ formatPrice(p) }}</span>
          </li>
        </ul>
      </section>
    </div>
    <div class="empty" *ngIf="!product">未找到商品</div>
  `,
  styles: [`
    .wrapper { background: #fff; padding: 20px; border-radius: 6px; }
    .back { color: #409eff; font-size: 13px; }
    .detail { display: flex; gap: 20px; margin-top: 12px; }
    .detail img { width: 320px; height: auto; border-radius: 6px; }
    .info { flex: 1; }
    .info h2 { margin-top: 0; }
    .row { display: flex; padding: 6px 0; border-bottom: 1px dashed #ebeef5; font-size: 14px; }
    .label { width: 90px; color: #909399; }
    .price { color: #f56c6c; font-weight: 600; font-size: 18px; }
    .related { margin-top: 24px; }
    .related h3 { margin: 0 0 10px; }
    .related ul { list-style: none; padding: 0; margin: 0; }
    .related li { display: grid; grid-template-columns: 1fr auto auto; gap: 16px; padding: 8px 0; border-bottom: 1px solid #f5f7fa; font-size: 13px; }
    .related .s { color: #909399; }
    .related .p { color: #f56c6c; font-weight: 600; }
    .empty { background: #fff; padding: 40px; text-align: center; color: #909399; border-radius: 6px; }
  `]
})
export class ProductDetailComponent implements OnInit {
  product?: Product;
  related: Product[] = [];

  constructor(
    private route: ActivatedRoute,
    private productService: ProductService,
    private stats: StatsService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = Number(params.get('id'));
      this.product = this.productService.getById(id);
      // 相关推荐只取决于当前商品，切换到不同 id 时才重算，而不是每轮变更检测
      this.related = this.computeRelated();
    });
    this.stats.tick$.subscribe(v => {
      void v;
    });
    this.productService.push$.subscribe(v => {
      void v;
    });
  }

  formatPrice(p: Product): string {
    return '¥' + p.price.toFixed(2);
  }

  formatTime(t: number): string {
    return dayjs(t).locale('zh-cn').format('YYYY-MM-DD HH:mm:ss');
  }

  getStatusText(p: Product): string {
    return p.status === 'on' ? '在售' : '下架';
  }

  getDaysSince(p: Product): number {
    return dayjs().diff(dayjs(p.createdAt), 'day');
  }

  getMonthlyEstimate(p: Product): number {
    const days = Math.max(this.getDaysSince(p), 1);
    return Math.round((p.sales / days) * 30);
  }

  trackById(_: number, p: Product): number {
    return p.id;
  }

  private computeRelated(): Product[] {
    if (!this.product) return [];
    const current = this.product;
    return chain(this.productService.getAll())
      .filter(p => p.category === current.category && p.id !== current.id)
      .orderBy(['sales'], ['desc'])
      .take(10)
      .value();
  }
}
