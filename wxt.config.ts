import { defineConfig } from 'wxt'
import path from 'path'

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifestVersion: 3,
  srcDir: 'src',
  modules: ['@wxt-dev/module-svelte'],
  runner: {
    disabled: true,
  },
  manifest: (config) => ({
    name: config.browser === 'safari' ? 'URL Redirector' : 'Redirector',
    permissions: ['storage', 'tabs', 'webRequest', 'webNavigation'],
    host_permissions: ['<all_urls>'],
    action: {
      default_icon: {
        '16': 'icon/16.png',
        '32': 'icon/32.png',
        '48': 'icon/48.png',
        '96': 'icon/96.png',
        '128': 'icon/128.png',
      },
    },
  }),
  vite: () => ({
    resolve: {
      alias: {
        $lib: path.resolve('./src/lib'),
      },
    },
    build: {
      minify: false,
      sourcemap: 'inline',
    },
  }),
})
