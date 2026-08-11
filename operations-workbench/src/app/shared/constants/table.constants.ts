import { DepartmentColorMap } from '../types/table.types';

export const DEPARTMENTS = ['', 'Engineering', 'Marketing', 'Sales'] as const;

export const DEPARTMENT_COLORS: DepartmentColorMap = {
  'Engineering': 'blue',
  'Marketing': 'purple',
  'Sales': 'green'
} as const;

export const PAGE_SIZE_OPTIONS = [5, 10, 20] as const;

export const DEFAULT_PAGE_SIZE = 5;
export const DEFAULT_PAGE_INDEX = 1;

export const SEARCH_PLACEHOLDER = '请输入姓名或城市';
export const ALL_DEPARTMENTS_LABEL = '全部部门';