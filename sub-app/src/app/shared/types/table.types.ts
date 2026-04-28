export interface User {
  id: number;
  name: string;
  age: number;
  city: string;
  department: string;
}

export interface PaginationConfig {
  pageIndex: number;
  pageSize: number;
  total: number;
}

export interface FilterConfig {
  searchText: string;
  departmentFilter: string;
}

export type DepartmentColorMap = Record<string, string>;