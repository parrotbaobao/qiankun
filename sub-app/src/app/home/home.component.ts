import { AfterViewInit, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import * as echarts from 'echarts';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, AfterViewInit {
  public chartDom: HTMLElement | null | undefined;
  public myChart: any;
  public option = {
    xAxis: {
      type: 'category',
      data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        data: [120, 200, 150, 80, 70, 110, 130],
        type: 'bar'
      }
    ]
  };


  constructor(private router: Router) {

  }

  ngAfterViewInit(): void {
    this.chartDom = document.getElementById('main');
    this.myChart = echarts.init(this.chartDom)
    this.option && this.myChart.setOption(this.option);
  }

  ngOnInit(): void {
  }

  onDownload(): void {
    // chart 是 echarts.init(dom) 返回的实例
    const dataURL = this.myChart.getDataURL({
      type: 'png',        // 'png' | 'jpeg'
      pixelRatio: 2,      // 放大倍数，提高清晰度
      backgroundColor: '#fff', // 背景色（不传则透明/继承）
      // excludeComponents: ['toolbox'] // 可选：排除某些组件
    });

    const a = document.createElement('a');
    a.style.display = "none"
    a.href = dataURL;
    a.download = 'chart.png';
    a.click();
  }

  public async onExport() {
    const res = await fetch("/api/export/excel");
    const bolb = await res.blob(); // 解析成二进制数据
    const url = URL.createObjectURL(bolb); // 根据域名创建url
    console.log(url)
    const a = document.createElement("a");
    a.href = url;
    a.download = "name.xlsx";
    a.click();
    URL.revokeObjectURL(url); // 注销/释放之前 URL.createObjectURL(blob) 生成的那个 blob: 临时地址
  }

  public onClick() {
    this.router.navigateByUrl('/ad')
  }
}
