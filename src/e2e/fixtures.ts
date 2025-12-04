import {
  test as base,
  chromium,
  type BrowserContext,
  type Worker,
} from '@playwright/test'
import { findUp } from 'find-up'
import path from 'path'
import { createTestServer } from './test-server'

export interface BrowserTestContext {
  context: BrowserContext
  extensionId: string
  serviceWorker: Worker
  testServer: {
    url: string
    close: () => void
  }
}

export const test = base.extend<BrowserTestContext>({
  testServer: async ({}, use) => {
    const server = createTestServer(3456)
    await use(server)
    server.close()
  },
  context: async ({}, use: any) => {
    const rootPath = path.dirname((await findUp('package.json'))!)
    const pathToExtension = path.join(rootPath, '.output/chrome-mv3')
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
      ],
    })
    await use(context)
    await context.close()
  },
  serviceWorker: async ({ context }, use) => {
    let [serviceWorker] = context.serviceWorkers()
    if (!serviceWorker)
      serviceWorker = await context.waitForEvent('serviceworker')

    await use(serviceWorker)
  },
  extensionId: async ({ serviceWorker }, use) => {
    const extensionId = serviceWorker.url().split('/')[2]
    await use(extensionId)
  },
})

export const expect = test.expect
