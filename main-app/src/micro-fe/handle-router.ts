import { getApps } from '.';
import { importHTML } from './import-html';
import { getNextRoute, getPrevRoute } from './rewrite-router';

export const handleRouter = async () => {

  const apps = getApps();
  const app = apps.find((item) =>
    window.location.pathname.startsWith(item.activeRule)
  );
  if (!app) {
    return;
  }

  // 卸载上个应用
  const prevApp = apps.find(item => {
    return getPrevRoute().startsWith(item.activeRule)
  })
  const nextApp = apps.find(item => {
    return getNextRoute().startsWith(item.activeRule)
  })

  if (prevApp) {
    await unmount(prevApp)
  }
  // 3、加载挂载子应用

  const container = document.querySelector(app.container);
  const { tempalte, getExternalScripts, execScripts } = await importHTML(app.entry);
  container.appendChild(tempalte);


  getExternalScripts().then((data: any) => {
    console.log(data)
  })


  window.__POWERED_BY_QIANKUN__ = true;


  const appExports: any = await execScripts();
  console.log(appExports)
  app.bootstrap = appExports.bootstrap;
  app.mount = appExports.mount;
  app.unmount = appExports.unmount;

  await bootstrap(app);
  await mount(app);
  await unmount(app);

  async function bootstrap(app: any) { app.bootstrap && (await app.bootstrap()) }

  async function mount(app: any) {
    app.mount && (await app.mount(
      {
        container: document.querySelector(app.container),
      }
    ))
  }

  async function unmount(app: any) {
    app.unmount && (await app.unmount({
      container: document.querySelector(app.container),
    }))
  }




  //   手动加载子应用的script eval或者new function
  // 4、渲染子应用
};
