redirect();

function redirect() {
  const urlHash = window.location.hash;
  let redirectHref;
  if (urlHash) {
    const pathParam = urlHash.slice(1);
    const newUrl = new URL(window.location.origin + pathParam);
    redirectHref = hashRedirect({ pathname: newUrl.pathname, searchParams: newUrl.searchParams });
  }
  if (redirectHref) {
    window.location.href = redirectHref;
  }
}

function hashRedirect({ pathname, searchParams }) {
  let redirectHref;
  if (!pathname || pathname === '/') {
    redirectHref = getIframeMappedHref({ searchParams });
  } else if (pathname.startsWith('/apiexplorer')) {
    redirectHref = getApiExplorerMappedHref({ pathname, searchParams });
  } else if (pathname.startsWith('/H5')) {
    redirectHref = getMobileMappedHref();
  } else if (pathname.startsWith('/assets')) {
    redirectHref = getAssetsMappedHref({ pathname });
  } else if (pathname.startsWith('/apidoc')) {
    redirectHref = getAPiDocMappedHref({ pathname, searchParams });
  } else if (pathname.startsWith('/apidebug')) {
    redirectHref = getAPiDebugMappedHref({ pathname, searchParams });
  } else if (pathname.startsWith('/apierrorcenter')) {
    redirectHref = getErrorCenterMappedHref({ pathname, searchParams });
  } else if (pathname.startsWith('/overview')) {
    redirectHref = getOverviewMappedHref();
  } else if (pathname.startsWith('/codelabs')) {
    redirectHref = getCodelabsMappedHref({ pathname, searchParams });
  } else if (pathname.startsWith('/terraform/terraform')) {
    redirectHref = getTerraformMappedHref({ pathname, searchParams });
  } else {
    // 没有匹配的映射关系，使用默认的地址
  }
  return redirectHref;
}

function nonHashRedirect({ pathname, searchParams }) {
  let redirectHref;
  if (pathname.startsWith('/apiexplorer')) {
    redirectHref = getApiExplorerMappedHref({ pathname, searchParams });
  } else if (pathname.startsWith('/apierrorcenter')) {
    redirectHref = getErrorCenterMappedHref({ pathname, searchParams });
  } else {
    // 没有匹配的映射关系，使用默认的地址
  }
  return redirectHref;
}

function getIframeMappedHref({ searchParams }) {
  return `/apiexplorer?${searchParams.toString()}`;
}

function getApiExplorerMappedHref({ pathname, searchParams }) {
  const paths = pathname.split('/');
  let path = '/apiexplorer/#/openapi';
  if (['overview', 'historys'].includes(paths[2])) {
    path += `/${paths[2]}`;
  } else if (searchParams.has('product')) {
    const product = searchParams.get('product');
    searchParams.delete('product');
    path += `/${product}/${paths[2]}`;
  } else {
    // 进入默认openapi首页
  }
  const searchParamsStr = searchParams.toString();
  const params = searchParamsStr ? `?${searchParamsStr}` : '';
  return path + params;
}

function getMobileMappedHref() {
  return `/apiexplorer/H5`;
}

function getAssetsMappedHref({ pathname }) {
  return `/apiexplorer${pathname}`;
}

function getAPiDocMappedHref({ pathname, searchParams }) {
  const paths = pathname.split('/');
  paths[1] = 'openapi';
  if (paths[3]) {
    searchParams.append('api', paths[3]);
    paths[3] = 'doc';
  }
  const searchParamsStr = searchParams.toString();
  const params = searchParamsStr ? `?${searchParamsStr}` : '';
  return '/apiexplorer/#' + paths.join('/') + params;
}

function getAPiDebugMappedHref({ pathname, searchParams }) {
  const paths = pathname.split('/');
  paths[1] = 'openapi';
  if (!paths[2]) {
    paths[2] = 'historys';
  }
  const searchParamsStr = searchParams.toString();
  const params = searchParamsStr ? `?${searchParamsStr}` : '';
  return '/apiexplorer/#' + paths.join('/') + params;
}

function getErrorCenterMappedHref({ pathname, searchParams }) {
  const paths = pathname.split('/');
  paths[1] = 'errorcenter';
  if (paths[2] && searchParams.has('product')) {
    paths[2] = searchParams.get('product');
  }
  const searchParamsStr = searchParams.toString();
  const params = searchParamsStr ? `?${searchParamsStr}` : '';
  return '/apiexplorer/#' + paths.join('/') + params;
}

function getSdkCenterMappedHref({ pathname, searchParams }) {
  if (searchParams.has('language')) {
    searchParams.append('lang', searchParams.get('language'));
    searchParams.delete('language');
  }
  const searchParamsStr = searchParams.toString();
  const params = searchParamsStr ? `?${searchParamsStr}` : '';
  return '/apiexplorer/#' + pathname + params;
}

function getTerraformMappedHref({ pathname, searchParams }) {
  if (pathname.includes('doc') && searchParams.has('product_short')) {
    const productShort = searchParams.get('product_short');
    searchParams.delete('product_short');
    const searchParamsStr = searchParams.toString();
    const params = searchParamsStr ? `?${searchParamsStr}` : '';
    return '/apiexplorer/#/terraform/' + productShort + params;
  } else {
    return '/apiexplorer/#/terraform';
  }
}

function getOverviewMappedHref() {
  return '/apiexplorer/#/openapi';
}

function getCodelabsMappedHref({ pathname, searchParams }) {
  const searchParamsStr = searchParams.toString();
  const params = searchParamsStr ? `?${searchParamsStr}` : '';
  return window.service_cf3_config.codelabs_origin + pathname + params;
}
