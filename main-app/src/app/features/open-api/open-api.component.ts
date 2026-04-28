import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-open-api',
  templateUrl: './open-api.component.html',
  styleUrls: ['./open-api.component.scss'],
})
export class OpenApiComponent {
  keyword = '';

  regions = ['cn-north-4', 'cn-east-3', 'ap-southeast-1'];
  region = 'cn-north-4';

  services = ['全部服务', 'ECS', 'OBS', 'VPC', 'IAM'];
  service = '全部服务';

  // 示例统计（你可替换为接口返回）
  stats = {
    apis: 9100,
    sdks: 600,
    errors: 16000,
  };

  constructor(private router: Router) {}

  onKeyword(v: string) {
    this.keyword = v;
  }

  onRegion(v: string) {
    this.region = v;
    this.refresh();
  }

  onService(v: string) {
    this.service = v;
    this.refresh();
  }

  onSearch() {
    // 示例：跳到你自己的检索页，并带 query
    this.router.navigateByUrl(
      `/openapi/search?kw=${encodeURIComponent(this.keyword)}&region=${
        this.region
      }&svc=${this.service}`
    );
  }

  refresh() {
    // 示例：这里可以触发重新拉取统计/列表
    // console.log('refresh', this.region, this.service);
  }

  go(path: string) {
    this.router.navigateByUrl(path);
  }

  jump(key: string) {
    // 这里按你的项目路由约定改
    const map: Record<string, string> = {
      debug: '/openapi/debug',
      sdk: '/openapi/sdk',
      errorcode: '/openapi/errorcode',
      terraform: '/openapi/terraform',
    };
    this.router.navigateByUrl(map[key] || '/openapi/overview');
  }
}
