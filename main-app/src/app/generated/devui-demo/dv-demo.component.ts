import { Component } from '@angular/core';

@Component({
  selector: 'app-dv-demo',
  templateUrl: './dv-demo.component.html',
  styleUrls: ['./dv-demo.component.scss'],
})
export class DvDemoComponent {
  // 来自 docs/accordion.md 的示例数据
  accordionItems = [
    { title: '第一项', content: '这是从 docs/accordion.md 提取的示例内容。', open: true },
    { title: '第二项', content: '更多手风琴内容示例。' },
  ];

  // 来自 docs/tabs.md 的示例数据
  tabs = [
    { id: 'tab1', title: 'Tab 1', content: '来自 docs/tabs.md 的示例内容：Tab 1' },
    { id: 'tab2', title: 'Tab 2', content: '来自 docs/tabs.md 的示例内容：Tab 2' },
  ];

  activeTab = 0;

  setActive(index: number) {
    this.activeTab = index;
  }
}
