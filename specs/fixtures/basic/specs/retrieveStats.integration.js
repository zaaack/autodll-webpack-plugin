const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const { SyncHook } = require('tapable');
const config = require('../webpack.config.js');
const test = require('ava');

const {
  routeCalls,
  createRunner,
  createClearCache,
  createMakeChange,
} = require('../../../helpers/integration');
const { default: AutoDLLPlugin } = require('../../../../lib/plugin.js');

const runner = createRunner(webpack, WebpackDevServer);

const clearCache = createClearCache(__dirname);
const makeChange = createMakeChange(__dirname, '../src/text.js');

console.log('Ensure stats retrieved from the currect source');

test.serial('Ensure stats retrieved from the currect source', async t => {
  clearCache();
  makeChange('initial');

  console.log('clean run (cache deleted)');

  await runner(config, ({ done, compiler }) => {
    AutoDLLPlugin.getHooks(compiler).autodllStatsRetrieved = new SyncHook(['stats', 'source']);
    AutoDLLPlugin.getHooks(compiler).autodllStatsRetrieved.call(
      routeCalls(
        (stats, source) => {
          t.is(source, 'build', 'should retreive stats from build');
        },
        (stats, source) => {
          t.is(source, 'memory', 'should retreive stats from memory');
        }
      )
    );

    compiler.hooks.done.tap(
      'AutoDllPlugin',
      routeCalls(
        () => makeChange('some change'),
        () => done()
      )
    );
  });

  console.log('second run (with cached dll bundle from previous run)');

  await runner(config, ({ done, compiler }) => {
    // compiler.hooks.autodllStatsRetrieved = new SyncHook(['stats', 'source']);
    AutoDLLPlugin.getHooks(compiler).autodllStatsRetrieved.tap(
      'test',
      routeCalls(
        (stats, source) => {
          t.is(source, 'fs', 'should retreive stats from fs');
        },
        (stats, source) => {
          t.is(source, 'memory', 'should retreive stats from memory');
        }
      )
    );

    compiler.hooks.done.tap(
      'AutoDllPlugin',
      routeCalls(
        () => makeChange('some other change'),
        () => done()
      )
    );
  });
});
