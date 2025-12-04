import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import path from 'path'
import { BrowserCommands } from '@vitest/browser/context'
import { type BrowserCommandContext } from 'vitest/node'
import { readFile } from 'fs/promises'
import { playwright } from '@vitest/browser-playwright'

type CustomCommand<K extends keyof BrowserCommands> = (
  context: BrowserCommandContext,
  ...args: Parameters<BrowserCommands[K]>
) => Promise<Awaited<ReturnType<BrowserCommands[K]>>>

const waitForDownload: CustomCommand<'waitForDownload'> = async (ctx) => {
  const download = await ctx.page.waitForEvent('download')
  return {
    suggestedFilename: download.suggestedFilename(),
    text: await readFile(await download.path(), 'utf-8'),
  }
}

const waitForUpload: CustomCommand<'waitForUpload'> = async (ctx, file) => {
  const fileChooser = await ctx.page.waitForEvent('filechooser')
  await fileChooser.setFiles({
    name: file.name,
    mimeType: file.mimeType,
    buffer: Buffer.from(file.text),
  })
}

declare module '@vitest/browser/context' {
  interface Locator {
    element(): HTMLElement
  }
  interface BrowserCommands {
    waitForDownload: () => Promise<{
      suggestedFilename: string
      text: string
    }>
    waitForUpload: (file: {
      name: string
      mimeType: string
      text: string
    }) => Promise<void>
  }
}

export default defineConfig({
  plugins: [svelte()],
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}'],
    exclude: ['src/**/e2e/*'],
    browser: {
      enabled: true,
      provider: playwright(),
      // https://vitest.dev/guide/browser/playwright
      instances: [{ browser: 'chromium', headless: true }],
      commands: {
        waitForDownload,
        waitForUpload,
      },
    },
  },
  resolve: {
    alias: {
      $lib: path.resolve('./src/lib'),
    },
  },
})
