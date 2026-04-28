import { Component, OnInit } from '@angular/core';

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
  selector: 'app-cloud-advisor',
  templateUrl: './cloud-advisor.component.html',
  styleUrls: ['./cloud-advisor.component.scss'],
})
export class CloudAdvisorComponent implements OnInit {
  tab: 'overview' | 'recommend' | 'history' = 'overview';

  keyword = '';
  categories = ['全部', '计算', '网络', '存储', '安全', '数据库'];
  activeCategory = '全部';

  regions = ['cn-north-4', 'cn-east-3', 'ap-southeast-1'];
  region = 'cn-north-4';

  type: 'ALL' | AdviceType = 'ALL';
  onlyHigh = false;

  list: AdviceItem[] = [];
  viewList: AdviceItem[] = [];

  stats = { total: 0, high: 0, services: 0 };

  history: Array<{ title: string; time: string }> = [];

  ngOnInit(): void {
    // 示例数据
    this.list = [
      {
        id: 'a1',
        type: 'SEC',
        priority: 'HIGH',
        service: 'IAM',
        title: '建议开启 MFA',
        desc: '为高权限账号开启多因子认证，降低账号被盗风险。',
        category: '安全',
        regions: ['cn-north-4', 'cn-east-3'],
      },
      {
        id: 'a2',
        type: 'PERF',
        priority: 'MED',
        service: 'ECS',
        title: '建议为高峰流量开启弹性伸缩',
        desc: '结合 AS 伸缩策略，在流量高峰自动扩容，降低时延波动。',
        category: '计算',
        regions: ['cn-north-4'],
      },
      {
        id: 'a3',
        type: 'COST',
        priority: 'MED',
        service: 'OBS',
        title: '建议设置生命周期规则',
        desc: '对冷数据设置归档/删除策略，减少长期存储成本。',
        category: '存储',
        regions: ['cn-north-4', 'ap-southeast-1'],
      },
      {
        id: 'a4',
        type: 'BEST',
        priority: 'HIGH',
        service: 'VPC',
        title: '建议为关键子网配置更细粒度的安全组规则',
        desc: '收敛入站端口与来源，减少暴露面。',
        category: '网络',
        regions: ['cn-east-3', 'cn-north-4'],
      },
    ];

    this.applyFilters();
  }

  onSearch() {
    this.applyFilters();
    this.pushHistory(`搜索：${this.keyword || '(空)'}`);
    this.tab = 'recommend';
  }

  refresh() {
    // 示例：重算视图
    this.applyFilters();
    this.pushHistory('刷新数据');
  }

  selectCategory(c: string) {
    this.activeCategory = c;
    this.applyFilters();
  }

  applyFilters() {
    const kw = this.keyword.trim().toLowerCase();

    let next = this.list.filter((x) => x.regions.includes(this.region));

    if (this.activeCategory !== '全部') {
      next = next.filter((x) => x.category === this.activeCategory);
    }

    if (this.type !== 'ALL') {
      next = next.filter((x) => x.type === this.type);
    }

    if (this.onlyHigh) {
      next = next.filter((x) => x.priority === 'HIGH');
    }

    if (kw) {
      next = next.filter((x) => {
        return (
          x.title.toLowerCase().includes(kw) ||
          x.desc.toLowerCase().includes(kw) ||
          x.service.toLowerCase().includes(kw)
        );
      });
    }

    this.viewList = next;

    const services = new Set(next.map((x) => x.service));
    this.stats = {
      total: next.length,
      high: next.filter((x) => x.priority === 'HIGH').length,
      services: services.size,
    };
  }

  typeLabel(t: AdviceType) {
    return t === 'PERF' ? '性能' : t === 'SEC' ? '安全' : t === 'COST' ? '成本' : '最佳实践';
  }

  openDetail(item: AdviceItem) {
    this.pushHistory(`查看：${item.service} - ${item.title}`);
    // 示例：实际项目可弹窗/侧滑面板
    alert(`${item.service}\n\n${item.title}\n${item.desc}`);
  }

  ignore(item: AdviceItem) {
    this.list = this.list.filter((x) => x.id !== item.id);
    this.applyFilters();
    this.pushHistory(`忽略：${item.service} - ${item.title}`);
  }

  export() {
    this.pushHistory('导出建议（示例）');
    alert('已触发导出（示例）');
  }

  createTicket() {
    this.pushHistory('创建工单（示例）');
    alert('已创建工单（示例）');
  }

  private pushHistory(title: string) {
    const time = new Date().toLocaleString();
    this.history.unshift({ title, time });
  }
}
