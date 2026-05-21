const appName = require('../package.json').name;
module.exports = {
  mode: 'development', // 👈 development 模式默认不会压缩

  devServer: {
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },

  output: {
    library: `${appName}-[name]`,
    libraryTarget: 'umd',
    chunkLoadingGlobal: `webpackJsonp_${appName}`,
  },
};