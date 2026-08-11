import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../services/product.service';
import { StatsService } from '../../services/stats.service';
import { measure } from '../../core/perf';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);
import orderBy from 'lodash/orderBy';
import padStart from 'lodash/padStart';
import random from 'lodash/random';
import round from 'lodash/round';
import sample from 'lodash/sample';
import sumBy from 'lodash/sumBy';
import * as XLSX from 'xlsx';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
(pdfMake as any).vfs = (pdfFonts as any).pdfMake?.vfs ?? pdfFonts;

interface Order {
  id: string;
  productId: number;
  productName: string;
  count: number;
  total: number;
  buyer: string;
  createdAt: number;
  status: string;
}

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="wrapper">
      <div class="header">
        <h3>订单列表</h3>
        <div class="summary">
          <span>总订单：{{ getOrderCount() }}</span>
          <span>总金额：{{ formatMoney(getTotalRevenue()) }}</span>
          <button class="export-btn" (click)="exportXlsx()">导出 Excel</button>
          <button class="export-btn" (click)="exportPdf()">导出 PDF</button>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>订单号</th>
            <th>商品</th>
            <th>数量</th>
            <th>金额</th>
            <th>买家</th>
            <th>状态</th>
            <th>下单时间</th>
            <th>已过</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let o of orders; trackBy: trackByOrderId">
            <td class="mono">{{ o.id }}</td>
            <td>{{ o.productName }}</td>
            <td>{{ o.count }}</td>
            <td class="money">{{ formatMoney(o.total) }}</td>
            <td class="mono">{{ o.buyer }}</td>
            <td><span class="tag" [attr.data-status]="o.status">{{ getStatusText(o) }}</span></td>
            <td>{{ formatTime(o.createdAt) }}</td>
            <td class="muted">{{ getElapsed(o) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    .wrapper { background: #fff; padding: 20px; border-radius: 6px; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .header h3 { margin: 0; }
    .summary { display: flex; gap: 16px; font-size: 13px; color: #606266; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { padding: 8px 10px; text-align: left; border-bottom: 1px solid #ebeef5; }
    th { background: #fafbfc; color: #606266; font-weight: 500; }
    .money { color: #f56c6c; font-weight: 600; }
    .mono { font-family: Menlo, monospace; }
    .muted { color: #909399; }
    .tag { padding: 2px 8px; border-radius: 10px; font-size: 12px; background: #f4f4f5; color: #606266; }
    .tag[data-status="pending"] { background: #fdf6ec; color: #e6a23c; }
    .tag[data-status="paid"] { background: #ecf5ff; color: #409eff; }
    .tag[data-status="shipped"] { background: #f0f9eb; color: #67c23a; }
    .tag[data-status="done"] { background: #f0f9eb; color: #67c23a; }
    .tag[data-status="cancelled"] { background: #fef0f0; color: #f56c6c; }
    .export-btn { padding: 4px 12px; background: #409eff; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; }
  `]
})
export class OrdersComponent implements OnInit {
  orders: Order[] = [];

  constructor(private productService: ProductService, private stats: StatsService) {}

  ngOnInit(): void {
    measure('orders:generate', () => {
      const products = this.productService.getAll();
      const orders: Order[] = [];
      for (let i = 0; i < 3000; i++) {
        const p = products[random(0, products.length - 1)]!;
        const count = random(1, 5);
        orders.push({
          id: `ORD${padStart(String(i + 1), 8, '0')}`,
          productId: p.id,
          productName: p.name,
          count,
          total: round(p.price * count, 2),
          buyer: `user_${random(10000, 99999)}`,
          createdAt: Date.now() - random(0, 1000 * 60 * 60 * 24 * 60),
          status: sample(['pending', 'paid', 'shipped', 'done', 'cancelled'])!
        });
      }
      this.orders = orderBy(orders, ['createdAt'], ['desc']);
    });
    this.stats.tick$.subscribe(v => {
      void v;
    });
  }

  getOrderCount(): number {
    return this.orders.length;
  }

  trackByOrderId(_: number, o: Order): string {
    return o.id;
  }

  getTotalRevenue(): number {
    return sumBy(this.orders, o => o.total);
  }

  formatMoney(n: number): string {
    return '¥' + round(n, 2).toLocaleString();
  }

  formatTime(t: number): string {
    return dayjs(t).locale('zh-cn').format('YYYY-MM-DD HH:mm');
  }

  getElapsed(o: Order): string {
    return dayjs(o.createdAt).locale('zh-cn').fromNow();
  }

  exportPdf(): void {
    const body = [['订单号', '商品', '数量', '金额', '状态']];
    this.orders.slice(0, 100).forEach(o => {
      body.push([o.id, o.productName, String(o.count), `¥${o.total}`, this.getStatusText(o)]);
    });
    pdfMake.createPdf({ content: [{ table: { body } }] } as any).download(`orders-${dayjs().format('YYYYMMDD')}.pdf`);
  }

  exportXlsx(): void {
    const data = this.orders.map(o => ({
      '订单号': o.id,
      '商品': o.productName,
      '数量': o.count,
      '金额': o.total,
      '买家': o.buyer,
      '状态': this.getStatusText(o),
      '下单时间': dayjs(o.createdAt).format('YYYY-MM-DD HH:mm')
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '订单');
    XLSX.writeFile(wb, `orders-${dayjs().format('YYYYMMDD')}.xlsx`);
  }

  getStatusText(o: Order): string {
    switch (o.status) {
      case 'pending': return '待付款';
      case 'paid': return '已付款';
      case 'shipped': return '已发货';
      case 'done': return '已完成';
      case 'cancelled': return '已取消';
      default: return '-';
    }
  }
}
