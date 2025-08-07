import { defineConfig } from 'wxt'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifestVersion: 3,
  srcDir: 'src',
  modules: ['@wxt-dev/module-svelte'],
  webExt: {
    disabled: true,
  },
  manifest: (env) => {
    const manifest = {
      name: 'Redirector',
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
    }
    if (env.browser === 'firefox') {
      // @ts-expect-error
      manifest.browser_specific_settings = {
        gecko: {
          id: 'redirector@rxliuli.com',
        },
      }
    }
    if (env.browser === 'safari') {
      manifest.name = 'URL Redirector'
      // TODO: https://developer.apple.com/forums/thread/735111
      manifest.permissions = manifest.permissions.filter(
        (permission) => permission !== 'webRequest',
      )
    }
    return manifest
  },
  vite: () => ({
    resolve: {
      alias: {
        $lib: path.resolve('./src/lib'),
      },
    },
    plugins: [tailwindcss() as any],
  }),
})
