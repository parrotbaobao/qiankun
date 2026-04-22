import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-user-search-form',
  templateUrl: './user-search-form.component.html',
  styleUrls: ['./user-search-form.component.scss']
})
export class UserSearchFormComponent {
  @Output() search = new EventEmitter<{ name: string; status: string }>();
  @Output() reset = new EventEmitter<void>();

  name = '';
  status = '';

  statusOptions = [
    { label: '全部', value: '' },
    { label: '启用', value: 'active' },
    { label: '禁用', value: 'inactive' }
  ];

  onSearch(): void {
    this.search.emit({ name: this.name, status: this.status });
  }

  onReset(): void {
    this.name = '';
    this.status = '';
    this.reset.emit();
  }
}
