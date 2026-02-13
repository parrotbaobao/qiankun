import { handleRouter } from './handle-router';
import { rewriterRouter } from './rewrite-router';

let _apps: any[] = [];
export const registerMicroApps: any = (apps: any[]) => {
  _apps = apps;
};

export const getApps = () => {
  return _apps;
};

export const start: any = () => {
  // 1、监视路有变化
  rewriterRouter();

  // 初始化
  handleRouter(); 
};
