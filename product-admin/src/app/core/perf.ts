const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
        console.log(entry.name, entry.startTime, entry.duration);
    }
});
observer.observe({ type: 'largest-contentful-paint', buffered: true });

// 自定义操作耗时（performance.measure 产生的 entry）
new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
        console.log(`[perf] ${entry.name}: ${entry.duration.toFixed(1)}ms`);
    }
}).observe({ type: 'measure', buffered: true });

// LCP
let lcp = 0;
new PerformanceObserver((list) => {
    const entries = list.getEntries();
    lcp = entries[entries.length - 1].startTime; // 取最新的
}).observe({ type: 'largest-contentful-paint', buffered: true });

let cls = 0;
new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
        // hadRecentInput:排除用户主动操作(点击后展开)引起的偏移
        if (!(entry as any).hadRecentInput) cls += (entry as any).value;
    }
}).observe({ type: 'layout-shift', buffered: true });

// PerformanceNavigationTiming — 页面导航各阶段耗时
function logNavigationTiming(): void {
    const [nav] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    if (!nav) return;

    const timing = {
        redirect:    nav.redirectEnd - nav.redirectStart,
        dns:         nav.domainLookupEnd - nav.domainLookupStart,
        tcp:         nav.connectEnd - nav.connectStart,
        ssl:         nav.secureConnectionStart > 0 ? nav.connectEnd - nav.secureConnectionStart : 0,
        ttfb:        nav.responseStart - nav.requestStart,
        download:    nav.responseEnd - nav.responseStart,
        domParse:    nav.domInteractive - nav.responseEnd,
        domReady:    nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart,
        loadEvent:   nav.loadEventEnd - nav.loadEventStart,
        total:       nav.loadEventEnd - nav.startTime,
    };

    console.table(timing);
    console.log(
        `[nav-timing] TTFB=${timing.ttfb.toFixed(0)}ms ` +
        `DOM解析=${timing.domParse.toFixed(0)}ms ` +
        `总耗时=${timing.total.toFixed(0)}ms`
    );
}

window.addEventListener('load', () => {
    // loadEventEnd 在 load 回调时还是 0，需要下一帧才能拿到
    requestAnimationFrame(() => requestAnimationFrame(logNavigationTiming));
});

// 同步操作打点：measure('模块:操作', () => {...})
export function measure<T>(name: string, fn: () => T): T {
    const startMark = `${name}::start`;
    performance.mark(startMark);
    try {
        return fn();
    } finally {
        performance.measure(name, startMark);
    }
}

// 异步操作打点：await measureAsync('模块:操作', () => somePromise)
export async function measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const startMark = `${name}::start`;
    performance.mark(startMark);
    try {
        return await fn();
    } finally {
        performance.measure(name, startMark);
    }
}
