import { Component, OnInit } from '@angular/core';
import { UploadService } from '../../core/services/upload.service';

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
  selector: 'app-upload',
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.scss'],
})
export class UploadComponent implements OnInit {
  public progress = 0;
  public uploadSub: any;

  constructor(private uploadService: UploadService) {}

  ngOnInit(): void {
    this.renderList();
  }

  cancel() {}

  onChange(ev: any) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    input.value = '';
    this.progress = 0;
    this.uploadSub?.unsubscribe();

    this.uploadSub = this.uploadService.uploadFile('/api/upload', file, {}).subscribe((res: any) => {
      if (res?.type === 'progress') {
        this.progress = res?.progress;
      } else {
        console.log(res?.body?.data.filename);
      }
    });
  }

  private renderList() {
    const viewport = document.getElementById('viewport') as HTMLElement;
    const phantom = document.getElementById('phantom') as HTMLElement;
    const list = document.getElementById('list') as HTMLElement;

    const data = Array.from({ length: 10000 }, (_, i) => ({ id: i, text: `第 ${i + 1} 项` }));
    const itemHeight = 50;
    const buffer = 3;
    const visibleCount = Math.ceil(viewport.clientHeight / itemHeight);

    phantom.style.height = `${data.length * itemHeight}px`;

    function render() {
      const scrollTop = viewport.scrollTop;
      let startIndex = Math.max(Math.floor(scrollTop / itemHeight) - buffer, 0);
      let endIndex = Math.min(startIndex + visibleCount + buffer * 2, data.length);
      const visibleData = data.slice(startIndex, endIndex);
      list.style.transform = `translateY(${startIndex * itemHeight}px)`;
      list.innerHTML = visibleData.map(item => `<div class="item">${item.text}</div>`).join('');
    }

    render();
    viewport.addEventListener('scroll', render);
  }
}
