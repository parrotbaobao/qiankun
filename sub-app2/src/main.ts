import '../public-path';

import { NgZone } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';
import { getSingleSpaExtraProviders, singleSpaAngular } from 'single-spa-angular';
import { Subject } from 'rxjs';
import { MfeAgent } from '@your-org/mfe-state';

export const singleSpaPropsSubject = new Subject<any>();

if (!(window as any).__POWERED_BY_QIANKUN__) {
  platformBrowserDynamic()
    .bootstrapModule(AppModule)
    .catch(err => console.error(err));
}

let portalAgent: MfeAgent | null = null;

export const createAgent = (singleSpaProps: any): void => {
  portalAgent = new MfeAgent(singleSpaProps);
};

const lifecycles = singleSpaAngular({
  bootstrapFunction: (singleSpaProps: any) => {
    if (singleSpaProps) {
      createAgent(singleSpaProps);
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
  portalAgent?.destroy();
  portalAgent = null;
  return (lifecycles.unmount as LifecycleFn)(props);
};
