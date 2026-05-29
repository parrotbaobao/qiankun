import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ElementRef, ViewChildren, QueryList,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import * as echarts from 'echarts';

const API = 'http://localhost:3100/api/charts';
const PALETTE = ['#5470c6','#91cc75','#fac858','#ee6666','#73c0de','#3ba272',
                 '#fc8452','#9a60b4','#ea7ccc','#48b8d0','#f0a500','#c23531'];

@Component({
  selector: 'app-charts',
  templateUrl: './charts.component.html',
  styleUrls: ['./charts.component.scss'],
})
export class ChartsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChildren('chartEl') chartEls!: QueryList<ElementRef<HTMLDivElement>>;

  loading = true;
  error = '';
  autoRefresh = true;
  refreshInterval = 3;
  lastRefresh = '';

  private barData: any = null;
  private lineData: any = null;
  private pieData: any = null;
  private instances: echarts.ECharts[] = [];
  private resizeObserver!: ResizeObserver;
  private refreshTimer: any = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchAll();
  }

  ngAfterViewInit(): void {
    this.resizeObserver = new ResizeObserver(() => {
      this.instances.forEach((c) => c.resize());
    });
  }

  ngOnDestroy(): void {
    this.stopRefresh();
    this.instances.forEach((c) => c.dispose());
    this.resizeObserver?.disconnect();
  }

  private fetchAll(): void {
    this.loading = !this.instances.length;
    forkJoin({
      bar: this.http.get<any>(`${API}/bar`),
      line: this.http.get<any>(`${API}/line`),
      pie: this.http.get<any>(`${API}/pie`),
    }).subscribe({
      next: ({ bar, line, pie }) => {
        this.barData = bar;
        this.lineData = line;
        this.pieData = pie;
        this.loading = false;
        this.lastRefresh = new Date().toLocaleTimeString();
        setTimeout(() => this.renderAll(), 0);
        if (this.autoRefresh) this.scheduleRefresh();
      },
      error: () => {
        this.error = '接口请求失败，请确认 mock-server 已启动（npm run mock）';
        this.loading = false;
      },
    });
  }

  private renderAll(): void {
    const els = this.chartEls.toArray();
    const opts = this.buildOptions();

    if (!this.instances.length) {
      // 首次初始化
      els.forEach((ref, i) => {
        if (!opts[i]) return;
        const inst = echarts.init(ref.nativeElement);
        inst.setOption(opts[i]);
        this.instances.push(inst);
        this.resizeObserver.observe(ref.nativeElement);
      });
    } else {
      // 刷新：全量 setOption（不合并，重新计算，制造主线程阻塞）
      this.instances.forEach((inst, i) => {
        if (opts[i]) inst.setOption(opts[i], true);
      });
    }
  }

  private scheduleRefresh(): void {
    this.stopRefresh();
    this.refreshTimer = setTimeout(() => this.fetchAll(), this.refreshInterval * 1000);
  }

  private stopRefresh(): void {
    if (this.refreshTimer) { clearTimeout(this.refreshTimer); this.refreshTimer = null; }
  }

  toggleRefresh(): void {
    this.autoRefresh = !this.autoRefresh;
    if (this.autoRefresh) this.scheduleRefresh();
    else this.stopRefresh();
  }

  private buildOptions(): echarts.EChartsOption[] {
    const b = this.barData;
    const l = this.lineData;
    const p = this.pieData;

    const line = (name: string, data: number[], i: number) => ({
      name, type: 'line' as const, data, smooth: true,
      showSymbol: false, lineStyle: { width: 1.5 },
      itemStyle: { color: PALETTE[i % PALETTE.length] },
    });

    const bar = (name: string, data: number[], i: number, stack?: string) => ({
      name, type: 'bar' as const, data,
      ...(stack ? { stack } : {}),
      barMaxWidth: 12,
      itemStyle: { color: PALETTE[i % PALETTE.length] },
    });

    return [
      // ① 5000天×12指标折线（最重，首屏直接卡）
      {
        title: { text: '12 核心指标趋势（5000 天）', left: 12, top: 10, textStyle: { fontSize: 13 } },
        tooltip: { trigger: 'axis', enterable: false },
        legend: { top: 36, type: 'scroll' },
        grid: { top: 72, bottom: 40, left: 65, right: 16 },
        xAxis: { type: 'category', data: l.bigMetrics.days, axisLabel: { interval: 249, fontSize: 9 } },
        yAxis: { type: 'value' },
        series: l.bigMetrics.series.map((s: any, i: number) => line(s.name, s.data, i)),
      },

      // ② 5000天×6区域面积折线
      {
        title: { text: '6 大区域销售趋势（5000 天）', left: 12, top: 10, textStyle: { fontSize: 13 } },
        tooltip: { trigger: 'axis', enterable: false },
        legend: { top: 36 },
        grid: { top: 72, bottom: 40, left: 65, right: 16 },
        xAxis: { type: 'category', data: l.regionTrend.days, axisLabel: { interval: 249, fontSize: 9 } },
        yAxis: { type: 'value' },
        series: l.regionTrend.series.map((s: any, i: number) => ({
          ...line(s.name, s.data, i),
          areaStyle: { opacity: 0.12 },
        })),
      },

      // ③ 30城市365天折线
      {
        title: { text: '30 城市活跃用户（365 天）', left: 12, top: 10, textStyle: { fontSize: 13 } },
        tooltip: { trigger: 'axis', enterable: false },
        legend: { top: 36, type: 'scroll' },
        grid: { top: 72, bottom: 40, left: 65, right: 16 },
        xAxis: { type: 'category', data: l.cityActivity.days, axisLabel: { interval: 29, fontSize: 9 } },
        yAxis: { type: 'value' },
        series: l.cityActivity.series.map((s: any, i: number) => line(s.name, s.data, i)),
      },

      // ④ 30城市×36月堆叠柱（列数最多）
      {
        title: { text: '30 城市月销售额（36 个月 × 30 系列）', left: 12, top: 10, textStyle: { fontSize: 13 } },
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        legend: { top: 36, type: 'scroll' },
        grid: { top: 72, bottom: 50, left: 65, right: 16 },
        xAxis: { type: 'category', data: b.cityMonth.months, axisLabel: { rotate: 45, fontSize: 9 } },
        yAxis: { type: 'value' },
        series: b.cityMonth.series.map((s: any, i: number) => bar(s.name, s.data, i, 'total')),
      },

      // ⑤ 12指标24月对比柱
      {
        title: { text: '12 核心指标月度对比柱（24 个月）', left: 12, top: 10, textStyle: { fontSize: 13 } },
        tooltip: { trigger: 'axis' },
        legend: { top: 36, type: 'scroll' },
        grid: { top: 72, bottom: 50, left: 55, right: 16 },
        xAxis: { type: 'category', data: b.metricTrend.months, axisLabel: { rotate: 30, fontSize: 9 } },
        yAxis: { type: 'value' },
        series: b.metricTrend.series.map((s: any, i: number) => bar(s.name, s.data, i)),
      },

      // ⑥ 区域36月堆叠柱
      {
        title: { text: '各区域月销售额（36 个月）', left: 12, top: 10, textStyle: { fontSize: 13 } },
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        legend: { top: 36 },
        grid: { top: 72, bottom: 50, left: 55, right: 16 },
        xAxis: { type: 'category', data: b.regionSales.months, axisLabel: { rotate: 45, fontSize: 9 } },
        yAxis: { type: 'value' },
        series: b.regionSales.series.map((s: any, i: number) => bar(s.name, s.data, i, 'total')),
      },

      // ⑦ 8产品×12季度
      {
        title: { text: '8 款产品季度销量', left: 12, top: 10, textStyle: { fontSize: 13 } },
        tooltip: { trigger: 'axis' },
        legend: { top: 36, type: 'scroll' },
        grid: { top: 72, bottom: 50, left: 55, right: 16 },
        xAxis: { type: 'category', data: b.productQuarter.quarters, axisLabel: { rotate: 30, fontSize: 10 } },
        yAxis: { type: 'value' },
        series: b.productQuarter.series.map((s: any, i: number) => bar(s.name, s.data, i)),
      },

      // ⑧ 10部门绩效
      {
        title: { text: '10 部门季度绩效', left: 12, top: 10, textStyle: { fontSize: 13 } },
        tooltip: { trigger: 'axis' },
        legend: { top: 36 },
        grid: { top: 72, bottom: 60, left: 50, right: 16 },
        xAxis: { type: 'category', data: b.deptPerf.depts, axisLabel: { rotate: 30, fontSize: 10 } },
        yAxis: { type: 'value', max: 100 },
        series: b.deptPerf.series.map((s: any, i: number) => bar(s.name, s.data, i)),
      },

      // ⑨ 渠道双轴
      {
        title: { text: '渠道获客成本 & 转化率', left: 12, top: 10, textStyle: { fontSize: 13 } },
        tooltip: { trigger: 'axis' },
        legend: { top: 36 },
        grid: { top: 72, bottom: 60, left: 55, right: 55 },
        xAxis: { type: 'category', data: b.channelCost.channels, axisLabel: { rotate: 30, fontSize: 9 } },
        yAxis: [{ type: 'value', name: '成本（元）' }, { type: 'value', name: '转化率（%）', position: 'right' }],
        series: [
          { name: '获客成本', type: 'bar', data: b.channelCost.costs, itemStyle: { color: PALETTE[0] } },
          { name: '转化率', type: 'line', yAxisIndex: 1, data: b.channelCost.conversions,
            smooth: true, itemStyle: { color: PALETTE[2] }, symbolSize: 6 },
        ],
      },

      // ⑩ 漏斗横向柱
      {
        title: { text: '用户转化漏斗', left: 12, top: 10, textStyle: { fontSize: 13 } },
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        grid: { top: 50, bottom: 30, left: 70, right: 80 },
        xAxis: { type: 'value' },
        yAxis: { type: 'category', data: b.funnel.stages },
        series: [{ type: 'bar', data: b.funnel.values,
          label: { show: true, position: 'right', formatter: (p: any) => (p.value as number).toLocaleString() },
          itemStyle: { color: (p: any) => PALETTE[p.dataIndex % PALETTE.length] as string } }],
      },

      // ⑪ 新增vs流失
      {
        title: { text: '近 12 月新增 vs 流失', left: 12, top: 10, textStyle: { fontSize: 13 } },
        tooltip: { trigger: 'axis' },
        legend: { top: 36 },
        grid: { top: 72, bottom: 40, left: 60, right: 16 },
        xAxis: { type: 'category', data: b.churn.months, axisLabel: { rotate: 30, fontSize: 10 } },
        yAxis: { type: 'value' },
        series: [
          { name: '新增', type: 'bar', data: b.churn.newUsers, itemStyle: { color: '#91cc75' } },
          { name: '流失', type: 'bar', data: b.churn.lostUsers, itemStyle: { color: '#ee6666' } },
        ],
      },

      // ⑫ DAU/WAU/MAU 365天
      {
        title: { text: 'DAU / WAU / MAU（365 天）', left: 12, top: 10, textStyle: { fontSize: 13 } },
        tooltip: { trigger: 'axis' },
        legend: { top: 36 },
        grid: { top: 72, bottom: 40, left: 65, right: 16 },
        xAxis: { type: 'category', data: l.userActivity.days, axisLabel: { interval: 29, fontSize: 9 } },
        yAxis: { type: 'value' },
        series: [
          { ...line('DAU', l.userActivity.dau, 0) },
          { ...line('WAU', l.userActivity.wau, 1) },
          { ...line('MAU', l.userActivity.mau, 2) },
        ],
      },

      // ⑬ 5台服务器负载
      {
        title: { text: '服务器 24h CPU 负载（%）', left: 12, top: 10, textStyle: { fontSize: 13 } },
        tooltip: { trigger: 'axis' },
        legend: { top: 36 },
        grid: { top: 72, bottom: 40, left: 50, right: 16 },
        xAxis: { type: 'category', data: l.serverLoad.hours },
        yAxis: { type: 'value', max: 100 },
        series: l.serverLoad.series.map((s: any, i: number) => line(s.name, s.data, i)),
      },

      // ⑭ 营收成本利润36月
      {
        title: { text: '36 月营收 / 成本 / 利润（万元）', left: 12, top: 10, textStyle: { fontSize: 13 } },
        tooltip: { trigger: 'axis' },
        legend: { top: 36 },
        grid: { top: 72, bottom: 50, left: 65, right: 16 },
        xAxis: { type: 'category', data: l.finance.months, axisLabel: { rotate: 45, fontSize: 9 } },
        yAxis: { type: 'value' },
        series: [
          { ...line('营收', l.finance.revenue, 0), areaStyle: { opacity: 0.15 } },
          { ...line('成本', l.finance.cost, 3), areaStyle: { opacity: 0.15 } },
          { ...line('利润', l.finance.profit, 1), areaStyle: { opacity: 0.15 } },
        ],
      },

      // ⑮ 延迟分位90天
      {
        title: { text: '接口延迟 p50/p95/p99（90天，ms）', left: 12, top: 10, textStyle: { fontSize: 13 } },
        tooltip: { trigger: 'axis' },
        legend: { top: 36 },
        grid: { top: 72, bottom: 50, left: 55, right: 16 },
        xAxis: { type: 'category', data: l.latency.days, axisLabel: { rotate: 45, fontSize: 9 } },
        yAxis: { type: 'value' },
        series: [
          line('p50', l.latency.p50, 1),
          line('p95', l.latency.p95, 2),
          line('p99', l.latency.p99, 3),
        ],
      },

      // ⑯ 留存率52周
      {
        title: { text: '用户留存率 D1/D7/D30（52 周）', left: 12, top: 10, textStyle: { fontSize: 13 } },
        tooltip: { trigger: 'axis' },
        legend: { top: 36 },
        grid: { top: 72, bottom: 40, left: 50, right: 16 },
        xAxis: { type: 'category', data: l.retention.weeks, axisLabel: { interval: 3 } },
        yAxis: { type: 'value', max: 100 },
        series: [
          line('D1', l.retention.d1, 0),
          line('D7', l.retention.d7, 1),
          line('D30', l.retention.d30, 2),
        ],
      },

      // ⑰ 15品类市场份额饼
      {
        title: { text: '15 品类市场份额', left: 12, top: 10, textStyle: { fontSize: 13 } },
        tooltip: { trigger: 'item', formatter: '{b}: {d}%' },
        legend: { top: 36, type: 'scroll' },
        series: [{ type: 'pie', radius: ['28%', '58%'], center: ['50%', '64%'], data: p.marketShare.data, label: { fontSize: 10 } }],
      },

      // ⑱ 渠道来源饼
      {
        title: { text: '10 渠道流量来源', left: 12, top: 10, textStyle: { fontSize: 13 } },
        tooltip: { trigger: 'item', formatter: '{b}: {d}%' },
        legend: { top: 36, type: 'scroll' },
        series: [{ type: 'pie', radius: '55%', center: ['50%', '64%'], data: p.trafficSource.data, label: { fontSize: 10 } }],
      },

      // ⑲ 设备分布饼
      {
        title: { text: '用户设备分布', left: 12, top: 10, textStyle: { fontSize: 13 } },
        tooltip: { trigger: 'item' },
        legend: { top: 36 },
        series: [{ type: 'pie', radius: ['32%', '58%'], center: ['50%', '64%'], data: p.deviceDist.data, label: { formatter: '{b}\n{d}%', fontSize: 10 } }],
      },

      // ⑳ 付费分层饼
      {
        title: { text: '付费用户分层', left: 12, top: 10, textStyle: { fontSize: 13 } },
        tooltip: { trigger: 'item' },
        legend: { top: 36 },
        series: [{ type: 'pie', radius: '55%', center: ['50%', '64%'], roseType: 'radius', data: p.userTier.data, label: { fontSize: 10 } }],
      },

      // ㉑ 30城市份额饼
      {
        title: { text: '30 城市销售份额', left: 12, top: 10, textStyle: { fontSize: 13 } },
        tooltip: { trigger: 'item', formatter: '{b}: {d}%' },
        legend: { top: 36, type: 'scroll' },
        series: [{ type: 'pie', radius: ['25%', '55%'], center: ['50%', '64%'], data: p.cityShare.data, label: { fontSize: 9 } }],
      },

      // ㉒ 12指标份额饼
      {
        title: { text: '12 指标贡献占比', left: 12, top: 10, textStyle: { fontSize: 13 } },
        tooltip: { trigger: 'item' },
        legend: { top: 36, type: 'scroll' },
        series: [{ type: 'pie', radius: '55%', center: ['50%', '64%'], data: p.metricShare.data, label: { fontSize: 10 } }],
      },
    ];
  }
}
