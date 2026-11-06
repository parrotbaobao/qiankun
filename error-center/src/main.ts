import '../public-path';

import { NgZone } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';
import { getSingleSpaExtraProviders, singleSpaAngular } from 'single-spa-angular';
import { Subject } from 'rxjs';
import { initCommunication, destroyCommunication } from './communication';

export const singleSpaPropsSubject = new Subject<any>();

if (!(window as any).__POWERED_BY_QIANKUN__) {
  platformBrowserDynamic()
    .bootstrapModule(AppModule)
    .catch(err => console.error(err));
}

const lifecycles = singleSpaAngular({
  bootstrapFunction: (singleSpaProps: any) => {
    if (singleSpaProps) {
      initCommunication(singleSpaProps);
    }
    singleSpaPropsSubject.next(singleSpaProps);
    return platformBrowserDynamic(getSingleSpaExtraProviders()).bootstrapModule(AppModule);
  },
  template: '<sub-root />',
  NgZone,
});

export const bootstrap = lifecycles.bootstrap;

type LifecycleFn = (props: Record<string, unknown>) => Promise<void>;

export const mount = (props: Record<string, unknown>) => {
  return (lifecycles.mount as LifecycleFn)(props);
};

export const unmount = (props: Record<string, unknown>) => {
  destroyCommunication();
  return (lifecycles.unmount as LifecycleFn)(props);
};
