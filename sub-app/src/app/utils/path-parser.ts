/**
 * 解析字段路径，支持如 data.age, data.user.name, items[0].id 等格式
 * @param obj 要查询的对象
 * @param path 字段路径
 * @returns 字段值
 */
export function parsePath(obj: any, path: string): any {
  if (!path) return obj;
  
  const segments = path.split('.');
  
  return segments.reduce((current, segment) => {
    if (current === undefined || current === null) {
      return undefined;
    }
    
    // 处理数组索引，如 items[0]
    const arrayMatch = segment.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, arrayName, index] = arrayMatch;
      const array = current[arrayName];
      if (Array.isArray(array)) {
        return array[parseInt(index, 10)];
      }
      return undefined;
    }
    
    return current[segment];
  }, obj);
}