import { Component, OnInit } from '@angular/core';
import { User, PaginationConfig, FilterConfig, DepartmentColorMap } from '../../shared/types/table.types';
import {
  DEPARTMENTS,
  DEPARTMENT_COLORS,
  PAGE_SIZE_OPTIONS,
  DEFAULT_PAGE_SIZE,
  DEFAULT_PAGE_INDEX,
  SEARCH_PLACEHOLDER,
  ALL_DEPARTMENTS_LABEL
} from '../../shared/constants/table.constants';

@Component({
  selector: 'app-user-table',
  templateUrl: './user-table.component.html',
  styleUrls: ['./user-table.component.scss']
})
export class UserTableComponent implements OnInit {
  searchText = '';
  departmentFilter = '';

  readonly users: User[] = [
    { id: 1, name: 'John', age: 25, city: 'New York', department: 'Engineering' },
    { id: 2, name: 'Jane', age: 30, city: 'London', department: 'Marketing' },
    { id: 3, name: 'Bob', age: 35, city: 'Paris', department: 'Engineering' },
    { id: 4, name: 'Alice', age: 28, city: 'Tokyo', department: 'Sales' },
    { id: 5, name: 'Charlie', age: 32, city: 'Sydney', department: 'Marketing' },
    { id: 6, name: 'David', age: 29, city: 'Berlin', department: 'Engineering' },
    { id: 7, name: 'Eva', age: 31, city: 'Beijing', department: 'Sales' },
    { id: 8, name: 'Frank', age: 33, city: 'Shanghai', department: 'Marketing' }
  ];

  filteredUsers: User[] = [...this.users];

  readonly departments = DEPARTMENTS;
  readonly pageSizeOptions = PAGE_SIZE_OPTIONS;
  readonly searchPlaceholder = SEARCH_PLACEHOLDER;
  readonly allDepartmentsLabel = ALL_DEPARTMENTS_LABEL;

  pageIndex = DEFAULT_PAGE_INDEX;
  pageSize = DEFAULT_PAGE_SIZE;
  total = this.filteredUsers.length;

  ngOnInit(): void {
    this.filterUsers();
  }

  onSearch(_searchValue?: string): void {
    this.pageIndex = DEFAULT_PAGE_INDEX;
    this.filterUsers();
  }

  onDepartmentChange(): void {
    this.pageIndex = DEFAULT_PAGE_INDEX;
    this.filterUsers();
  }

  filterUsers(): void {
    this.filteredUsers = this.users.filter((user: User) => {
      const matchesSearch = this.searchText === '' ||
        user.name.toLowerCase().includes(this.searchText.toLowerCase()) ||
        user.city.toLowerCase().includes(this.searchText.toLowerCase());
      const matchesDepartment = this.departmentFilter === '' || user.department === this.departmentFilter;
      return matchesSearch && matchesDepartment;
    });
    this.total = this.filteredUsers.length;
  }

  resetFilters(): void {
    this.searchText = '';
    this.departmentFilter = '';
    this.pageIndex = DEFAULT_PAGE_INDEX;
    this.filterUsers();
  }

  onPageChange(pageIndex: number, pageSize: number): void {
    this.pageIndex = pageIndex;
    this.pageSize = pageSize;
  }

  get departmentColorMap(): DepartmentColorMap {
    return DEPARTMENT_COLORS;
  }

  get paginatedUsers(): User[] {
    const start = (this.pageIndex - 1) * this.pageSize;
    return this.filteredUsers.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.total / this.pageSize);
  }

  getDepartmentColor(department: string): string {
    return this.departmentColorMap[department] || '';
  }
}
