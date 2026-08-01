import { defineConfig, UserManifest } from 'wxt'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifestVersion: 3,
  srcDir: 'src',
  modules: ['@wxt-dev/module-svelte', '@extport/wxt'],
  extport: {
    extension: 'ext_CA0VFul4shvoRANonrAY',
    safari: {
      appCategory: 'public.app-category.productivity',
      bundleIdentifier: 'com.rxliuli.URL-Redirector',
      developmentTeam: 'N2X78TUUFG',
    },
    // Daily anonymous usage ping (install count + version + language,
    // nothing else) + the Firefox data-collection declaration, both
    // injected by @extport/wxt. On by default (same opt-out model as
    // Firefox's own install-prompt toggle) with a visible switch in the
    // options menu — see PRIVACY.md "Anonymous Usage Statistics".
    analytics: true,
  },
  webExt: {
    disabled: true,
  },
  manifest: (env) => {
    const manifest: UserManifest = {
      name: 'Redirector',
      permissions: ['storage', 'webRequest', 'webNavigation'],
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
      commands: {
        'navigate-to-original': {
          suggested_key: {
            default: 'Alt+Shift+O',
          },
          description: 'Navigate to original page (before redirect)',
        },
      },
    }
    if (env.browser === 'firefox') {
      manifest.browser_specific_settings = {
        gecko: {
          id: 'redirector@rxliuli.com',
        },
        gecko_android: {},
      }
    }
    if (env.browser === 'safari') {
      manifest.name = 'URL Redirector'
      // TODO: https://developer.apple.com/forums/thread/735111
      manifest.permissions = manifest.permissions!.filter(
        (permission) => permission !== 'webRequest',
      )
      manifest.permissions.push('tabs')
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
