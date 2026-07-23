import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ProductService } from '../../services/product.service';
import { StatsService } from '../../services/stats.service';
import { measure, measureAsync } from '../../core/perf';
import filter from 'lodash/filter';
import random from 'lodash/random';
import sumBy from 'lodash/sumBy';
import chain from 'lodash/chain';
import * as THREE from 'three';
import { Chart } from '@antv/g2';

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="wrapper">
      <div class="row">
        <div class="chart-card">
          <h4>分类销量分布</h4>
          <div #salesChart class="chart"></div>
        </div>
        <div class="chart-card">
          <h4>近 30 天销售趋势</h4>
          <div #trendChart class="chart"></div>
        </div>
      </div>
      <div class="row">
        <div class="chart-card full">
          <h4>价格 vs 销量 散点</h4>
          <div #scatterChart class="chart"></div>
        </div>
      </div>
      <div class="row">
        <div class="chart-card full">
          <h4>库存分布（柱状）</h4>
          <div #barChart class="chart"></div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .wrapper { display: flex; flex-direction: column; gap: 16px; }
    .row { display: flex; gap: 16px; }
    .chart-card { flex: 1; background: #fff; padding: 16px; border-radius: 6px; min-width: 0; }
    .chart-card.full { width: 100%; }
    .chart-card h4 { margin: 0 0 12px; }
    .chart { width: 100%; height: 360px; }
  `]
})
export class StatsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('salesChart') salesRef!: ElementRef<HTMLDivElement>;
  @ViewChild('trendChart') trendRef!: ElementRef<HTMLDivElement>;
  @ViewChild('scatterChart') scatterRef!: ElementRef<HTMLDivElement>;
  @ViewChild('barChart') barRef!: ElementRef<HTMLDivElement>;
  trendChart: any;
  salesChart: any;
  scatterChart: any;
  barChart: any;
  private subs = new Subscription();
  private onResize = () => {
    this.salesChart?.resize();
    this.trendChart?.resize();
    this.scatterChart?.resize();
    this.barChart?.resize();
  };

  constructor(private productService: ProductService, private stats: StatsService) { }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    window.removeEventListener('resize', this.onResize);
    this.salesChart?.dispose();
    this.trendChart?.dispose();
    this.scatterChart?.dispose();
    this.barChart?.dispose();
    this.salesChart = this.trendChart = this.scatterChart = this.barChart = null;
  }

  ngOnInit(): void {
    this.subs.add(this.stats.tick$.subscribe(v => {
      void v;
    }));
    this.subs.add(this.productService.push$.subscribe(v => {
      void v;
    }));
  }

  async ngAfterViewInit() {
    const echarts = await import('echarts');           // ← 唯一的拆包点

    const products = this.productService.getAll();

    const byCat = chain(products)
      .groupBy('category')
      .map((items, key) => ({ name: key, value: sumBy(items, 'sales') }))
      .value();

    this.salesChart = echarts.init(this.salesRef.nativeElement);
    this.salesChart.setOption({
      tooltip: { trigger: 'item' },
      legend: { bottom: 0 },
      series: [{
        type: 'pie',
        radius: ['40%', '65%'],
        data: byCat,
        label: { formatter: '{b}: {c}' }
      }]
    });

    const days: string[] = [];
    const values: number[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 3600 * 1000);
      days.push(`${d.getMonth() + 1}/${d.getDate()}`);
      values.push(random(30000, 120000));
    }
    this.trendChart = echarts.init(this.trendRef.nativeElement);
    this.trendChart.setOption({
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: days },
      yAxis: { type: 'value' },
      series: [{ type: 'line', smooth: true, data: values, areaStyle: {} }]
    });

    const scatterData = products.slice(0, 2000).map(p => [p.price, p.sales]);
    this.scatterChart = echarts.init(this.scatterRef.nativeElement);
    this.scatterChart.setOption({
      tooltip: { trigger: 'item' },
      xAxis: { type: 'value', name: '价格' },
      yAxis: { type: 'value', name: '销量' },
      series: [{ type: 'scatter', data: scatterData, symbolSize: 4 }]
    });

    const stockBuckets = [
      { name: '0-99', min: 0, max: 99 },
      { name: '100-499', min: 100, max: 499 },
      { name: '500-999', min: 500, max: 999 },
      { name: '1000-1999', min: 1000, max: 1999 },
      { name: '2000-2999', min: 2000, max: 2999 },
      { name: '3000+', min: 3000, max: Infinity }
    ];
    const bucketData = stockBuckets.map(b => ({
      name: b.name,
      value: filter(products, p => p.stock >= b.min && p.stock <= b.max).length
    }));
    this.barChart = echarts.init(this.barRef.nativeElement);
    this.barChart.setOption({
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: bucketData.map(b => b.name) },
      yAxis: { type: 'value' },
      series: [{ type: 'bar', data: bucketData.map(b => b.value), itemStyle: { color: '#409eff' } }]
    });

    window.addEventListener('resize', this.onResize);

    // three.js 场景 —— 纯粹为了把 three 打进包里
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x409eff });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);
    camera.position.z = 5;
    console.log('[stats] three.js scene vertices:', geometry.attributes['position'].count);

    // @antv/g2 — 拉进完整的 AntV 图表库
    const chart = new Chart({ container: document.createElement('div'), width: 1, height: 1 });
    console.log('[stats] @antv/g2 loaded, Chart:', typeof chart);
  }
}
