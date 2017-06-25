const log = require('./utils/log');
const { buildIfNeeded } = require('./cache');
const createCompiler = require('./createCompiler');
const { getManifests, getBundles, cacheDir } = require('./paths');
const webpack = require('webpack');
const { concat } = require('./utils');

const createPluginClass = dllSettings => {
  return class Plugin {
    constructor(options) {
      this.options = options;
    }

    apply(compiler) {
      const { context, inject } = this.options;

      getManifests(dllSettings).forEach(manifestPath => {
        const instance = new webpack.DllReferencePlugin({
          context: context,
          manifest: manifestPath
        });

        instance.apply(compiler);
      });

      compiler.plugin('before-compile', (params, callback) => {
        params.compilationDependencies = params.compilationDependencies
          .filter((path) => !path.startsWith(cacheDir));
          
        callback();
      });

      compiler.plugin('watch-run', (compiler, callback) => {
        buildIfNeeded(dllSettings, () => createCompiler(dllSettings))
          .then(log('---- dll created! ---'))
          .then(() => callback());
      });

      if (inject) {
        compiler.plugin('compilation', compilation => {
          compilation.plugin(
            'html-webpack-plugin-before-html-generation',
            (htmlPluginData, callback) => {
              console.log('injecting scripts to', htmlPluginData.outputName);
              getBundles(dllSettings).forEach((bundleName) => {
                console.log('injecting', bundleName);
              });

              htmlPluginData.assets.js = concat(
                getBundles(dllSettings),
                htmlPluginData.assets.js
              );

              callback();
            }
          );
        });
      }
    }
  };
};

module.exports = createPluginClass;
