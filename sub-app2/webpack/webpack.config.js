const appName = require('../package.json').name;
module.exports = {
  devServer: {
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
  output: {
    library: `${appName}-[name]`,
    libraryTarget: 'umd',
    jsonpFunction: `webpackJsonp_${appName}`, // webpack 5 需要把 jsonpFunction 替换成 chunkLoadingGlobal
  },
};