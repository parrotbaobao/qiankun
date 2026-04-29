function getMobileUrlHash(urlHash) {
  switch (urlHash) {
    case 'doc':
      return '#/api-detail/doc';
    case 'debug':
      return '#/debug';
    case 'debughistory':
      return '#/api-detail/debug-history';
    case 'sdk':
      return '#/api-detail/doc';
    case 'cli':
      return '#/api-detail/doc';
    case 'mock':
      return '#/api-detail/doc';
    case 'devsample':
      return '#/api-detail/doc';
    default:
      return '#/product-apis';
  }
}
function browserRedirect() {
  const mobile = navigator.userAgent.match(
    /(phone|pad|pod|iPhone|iPod|ios|iPad|Android|Mobile|BlackBerry|IEMobile|MQQBrowser|JUC|Fennec|wOSBrowser|BrowserNG|WebOS|Symbian|Windows Phone)/i,
  );
  if (!mobile) {
    return;
  }
  const pathHash = window.location.hash.split('/');
  const service = pathHash[1] || '';
  if (service === 'openapi') {
    const page = pathHash[2];
    const tab = pathHash[3];
    if (page === 'overview') {
      window.location.href = '/apiexplorer/H5/#/home/overview';
    } else if (page === 'historys') {
      window.location.href = '/apiexplorer/H5/#/home/history';
    } else if (tab && tab.includes('?')) {
      // 产品详情页
      const tabName = tab.split('?')[0];
      const tabParam = tab.split('?')[1];
      if (tab.includes('historyId=')) {
        window.location.href = `/apiexplorer/H5/#/debug?${tabParam}&productshort=${page}`;
      } else {
        const mobileUrl = this.getMobileUrlHash(tabName);
        window.location.href = `/apiexplorer/H5/${mobileUrl}?productshort=${page}&${tabParam.replace('api=', 'name=')}`;
      }
    } else {
      window.location.href = '/apiexplorer/H5';
    }
  } else {
    window.location.href = '/apiexplorer/H5';
  }
}
if (window.platform === 'hws' && window.service_cf3_config?.is_loading_mobile === 'true') {
  browserRedirect();
}
