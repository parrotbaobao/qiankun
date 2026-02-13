import { fetchResource } from "./fetch-resource";

export const importHTML = async (url: any) => {
  const html = await fetchResource(url);
  const tempalte = document.createElement("div");
  tempalte.innerHTML = html;

  const scripts: any = tempalte.querySelectorAll("script");

  // 获取所有script
  async function getExternalScripts() {
    return Promise.all(Array.from(scripts).map((script: any) => {
      const src = script.getAttribute('src');
      if (!src) {
        return Promise.resolve(script.innerHTML)
      } else {
        (src)
        return fetchResource(src.startsWith('http') ? src : url + src)
      }
    }))
  }


  // 执行所有script
  async function execScripts() {
    const scripts = await getExternalScripts();
    const module = { exports: {} };
    const exports = module.exports;
    scripts.forEach((script: any) => { eval(script) });
    return module.exports;
  }

  return {
    tempalte,
    getExternalScripts,
    execScripts,
  };
};
