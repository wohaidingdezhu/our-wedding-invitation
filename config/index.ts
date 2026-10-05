import { defineConfig } from '@tarojs/cli';

export default defineConfig({
  projectName: 'our-wedding-invitation',
  date: '2026-10-03',
  designWidth: 750,
  deviceRatio: { 640: 2.34 / 2, 750: 1, 828: 1.81 / 2 },
  sourceRoot: 'src',
  outputRoot: process.env.TARO_ENV === 'h5' ? 'dist-h5' : 'dist',
  framework: 'react',
  compiler: { type: 'webpack5', prebundle: { enable: false } },
  cache: { enable: false },
  copy: { patterns: [{ from: 'src/assets', to: (process.env.TARO_ENV === 'h5' ? 'dist-h5' : 'dist') + '/assets' }], options: {} },
  mini: { postcss: { pxtransform: { enable: true }, autoprefixer: { enable: true } } },
  h5: {
    publicPath: '/',
    staticDirectory: 'static',
    router: { mode: 'hash' },
    devServer: { host: '127.0.0.1', port: 10086 },
    postcss: { pxtransform: { enable: true }, autoprefixer: { enable: true } }
  }
});
