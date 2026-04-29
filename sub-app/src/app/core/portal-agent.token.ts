import { InjectionToken } from '@angular/core';
import type { MfeAgent } from '@your-org/mfe-state';

export const PORTAL_AGENT = new InjectionToken<MfeAgent>('PortalAgent');
