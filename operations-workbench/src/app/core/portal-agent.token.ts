import { InjectionToken } from '@angular/core';
import type { MfeAgent } from '@mfe-demo/microfrontend-state';

export const PORTAL_AGENT = new InjectionToken<MfeAgent>('PortalAgent');
