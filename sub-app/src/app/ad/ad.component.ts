import { Component, OnInit } from '@angular/core';
import { UploadService } from '../services/upLoad.service';

type AdviceType = 'PERF' | 'SEC' | 'COST' | 'BEST';
type Priority = 'HIGH' | 'MED';

interface AdviceItem {
  id: string;
  type: AdviceType;
  priority: Priority;
  service: string;
  title: string;
  desc: string;
  category: string;
  regions: string[];
}

@Component({
  selector: 'app-ad',
  templateUrl: './ad.component.html',
  styleUrls: ['./ad.component.scss'],
})
export class AdComponent implements OnInit {
  public progress = 0;
  public uploadSub: any;
  constructor(private uploadService: UploadService) {

  }
  ngOnInit(): void {
    this.renderList();
  }

  cancel() {
  }

  onChange(ev: any) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0]; if (!file) return;
    // 可选：清空 input，避免选同一个文件不触发 change
    input.value = '';
    this.progress = 0;
    this.uploadSub?.unsubscribe();


    this.uploadSub = this.uploadService.uploadFile('/api/upload', file, {

    }).subscribe((res: any) => {
      console.log(res, "res")
      if (res?.type === "progress") {
        this.progress = res?.progress;
        console.log(this.progress)
      } else {
        console.log(res?.body?.data.filename)
      }

    })
  }

  private renderList() {
    const viewport: HTMLElement = document.getElementById('viewport') as HTMLElement;
    const phantom: HTMLElement = document.getElementById('phantom') as HTMLElement;
    const list: HTMLElement = document.getElementById('list') as HTMLElement;

    // 模拟 10000 条数据
    const data = Array.from({ length: 10000 }, (_, i) => ({
      id: i,
      text: `第 ${i + 1} 项`
    }))

    // 固定参数
    const itemHeight = 50
    const buffer = 3 // 上下多渲染几条，避免滚快了出现空白

    // 容器能显示多少条
    const visibleCount = Math.ceil(viewport.clientHeight / itemHeight)

    // 整个列表总高度，用来撑开滚动条
    phantom.style.height = `${data.length * itemHeight}px`

    function render() {
      // 已经滚动的距离
      const scrollTop = viewport.scrollTop

      // 当前从哪一项开始显示
      let startIndex = Math.floor(scrollTop / itemHeight) - buffer
      startIndex = Math.max(startIndex, 0)

      // 当前显示到哪一项
      let endIndex = startIndex + visibleCount + buffer * 2
      endIndex = Math.min(endIndex, data.length)

      // 截取当前需要渲染的数据
      const visibleData = data.slice(startIndex, endIndex)

      // 当前这段内容应该向下偏移多少
      const offsetY = startIndex * itemHeight

      // 把列表挪到正确位置
      list.style.transform = `translateY(${offsetY}px)`

      // 只渲染可视区附近的数据
      list.innerHTML = visibleData
        .map(
          item => `
        <div class="item">
          ${item.text}
        </div>
      `
        )
        .join('')
    }

    // 初始渲染
    render()

    // 滚动时重新计算并渲染
    viewport.addEventListener('scroll', render)
  }


}
