// Remove TypeScript-only syntax for plain JS compatibility

if (window.__POWERED_BY_QIANKUN__) {
  __webpack_public_path__ = window.__INJECTED_PUBLIC_PATH_BY_QIANKUN__;
} else {
  __webpack_public_path__ = '/';
}
