import { Component } from '@angular/core';
import { DrawerService, IDrawerOpenResult } from 'ng-devui/drawer';
import { DialogService } from 'ng-devui/modal';
import { DrawerContentComponent } from './drawer-content.component';

interface User {
  id: number;
  name: string;
  department: string;
  role: string;
  status: string;
}

@Component({
  selector: 'app-ui-demo',
  templateUrl: './ui-demo.component.html',
  styleUrls: ['./ui-demo.component.scss'],
})
export class UiDemoComponent {
  constructor(
    private drawerService: DrawerService,
    private dialogService: DialogService,
  ) {}

  // ── Table ─────────────────────────────────────────────────────────────────
  tableData: User[] = [
    { id: 1, name: '王建国', department: '技术部', role: '架构师',   status: '在职' },
    { id: 2, name: '李晓明', department: '产品部', role: '产品经理', status: '在职' },
    { id: 3, name: '张雪芬', department: '设计部', role: 'UI 设计师', status: '在职' },
    { id: 4, name: '陈志远', department: '技术部', role: '前端工程师', status: '离职' },
    { id: 5, name: '刘美丽', department: '运营部', role: '运营专员',  status: '在职' },
  ];

  tableWidthConfig = [
    { field: 'id',         width: '80px' },
    { field: 'name',       width: '120px' },
    { field: 'department', width: '120px' },
    { field: 'role',       width: '160px' },
    { field: 'status',     width: '100px' },
  ];

  // ── Drawer ────────────────────────────────────────────────────────────────
  openDrawer() {
    const result: IDrawerOpenResult = this.drawerService.open({
      drawerContentComponent: DrawerContentComponent,
      width: '400px',
      isCover: true,
      backdropCloseable: true,
      escKeyCloseable: true,
      position: 'right',
      onClose: () => { result.drawerInstance.hide(); },
      afterOpened: () => {
        result.drawerContentInstance.drawer = result.drawerInstance;
      },
    });
  }

  // ── Modal (Dialog) ────────────────────────────────────────────────────────
  openModal() {
    const results = this.dialogService.open({
      id: 'ui-demo-dialog',
      width: '480px',
      maxHeight: '600px',
      title: '确认操作',
      content: '你确定要执行此操作吗？此操作不可撤销，请谨慎确认。',
      backdropCloseable: true,
      dialogtype: 'standard',
      showCloseBtn: true,
      buttons: [
        {
          cssClass: 'primary',
          text: '确 认',
          autofocus: true,
          handler: ($event: Event) => {
            results.modalInstance.hide();
          },
        },
        {
          cssClass: 'common',
          text: '取 消',
          handler: ($event: Event) => {
            results.modalInstance.hide();
          },
        },
      ],
    });
  }
}
