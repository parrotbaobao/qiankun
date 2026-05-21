import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';

window.addEventListener('beforeunload', (e) => {
  console.error('[beforeunload] 调用栈：');
  console.trace();
});

// 同时再 hook 一下 Location.prototype.reload
const _reload = Location.prototype.reload;
Location.prototype.reload = function (this: Location) {
  console.error('[Location.prototype.reload] 被调用');
  console.trace();
  debugger;  // ← 这里会在 reload 真正被调用的瞬间停下
  return _reload.call(this);
};
platformBrowserDynamic()
  .bootstrapModule(AppModule).then(() => {
    setInterval(() => {
      console.log('[interval pathname]', window.location.pathname);
    }, 500);
  })
  .catch((err) => console.error(err));
