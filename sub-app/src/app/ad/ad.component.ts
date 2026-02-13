import { Component, OnInit } from '@angular/core';
import { UploadService } from '../service/upLoad.service';

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
}
