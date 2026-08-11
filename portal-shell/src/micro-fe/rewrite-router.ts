import { handleRouter } from './handle-router';
//  history路由
//  1、history.go back forwrd 使用popstate事件
//  2、pushState、replaceState需要重写函数


let prevRoute = '';
let nextRoute = window.location.pathname;

export const getPrevRoute = () => prevRoute;
export const getNextRoute = () => nextRoute;

export const rewriterRouter = () => {
  const rawReplaceStae = window.history.replaceState;
  const rawPushState = window.history.pushState;



  window.addEventListener('popstate', () => {
    // 监听浏览器的前进后退
    prevRoute = nextRoute;
    nextRoute = window.location.pathname; 
    handleRouter();
  });

  window.history.pushState = (...args) => {
    prevRoute = window.location.pathname;
    rawPushState.apply(window.history, args);
    nextRoute = window.location.pathname;
    handleRouter();

  };

  window.history.replaceState = (...args) => {
    rawReplaceStae.apply(window.history, args);
    handleRouter();
  };
};
