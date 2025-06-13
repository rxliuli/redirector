import { $, globby } from 'zx'
import path from 'node:path'
import fs from 'node:fs/promises'
import dotenv from 'dotenv'

const rootPath = path.resolve(__dirname, '../../..')
dotenv.config({ path: path.resolve(rootPath, '.env.local') })

const ProjectName = 'URL Redirector'
const AppCategory = 'public.app-category.productivity'
const DevelopmentTeam = process.env.DEVELOPMENT_TEAM

await $`pnpm wxt build -b safari`
await $`xcrun safari-web-extension-converter --bundle-identifier com.rxliuli.url-redirector --force --project-location .output .output/safari-mv3`
async function updateProjectConfig() {
  const projectConfigPath = path.resolve(
    rootPath,
    `.output/${ProjectName}/${ProjectName}.xcodeproj/project.pbxproj`,
  )
  const packageJson = await import(path.resolve(rootPath, 'package.json'))
  const content = await fs.readFile(projectConfigPath, 'utf-8')
  const newContent = content
    .replaceAll(
      'MARKETING_VERSION = 1.0;',
      `MARKETING_VERSION = ${packageJson.version};`,
    )
    .replace(
      new RegExp(
        `INFOPLIST_KEY_CFBundleDisplayName = ("?${ProjectName}"?);`,
        'g',
      ),
      `INFOPLIST_KEY_CFBundleDisplayName = $1;\n				INFOPLIST_KEY_LSApplicationCategoryType = "${AppCategory}";`,
    )
    .replace(
      new RegExp(
        `INFOPLIST_KEY_CFBundleDisplayName = ("?${ProjectName}"?);`,
        'g',
      ),
      `INFOPLIST_KEY_CFBundleDisplayName = $1;\n				INFOPLIST_KEY_ITSAppUsesNonExemptEncryption = NO;`,
    )
    .replaceAll(
      `COPY_PHASE_STRIP = NO;`,
      DevelopmentTeam
        ? `COPY_PHASE_STRIP = NO;\n				DEVELOPMENT_TEAM = ${DevelopmentTeam};`
        : 'COPY_PHASE_STRIP = NO;',
    )
    .replace(
      /CURRENT_PROJECT_VERSION = \d+;/g,
      `CURRENT_PROJECT_VERSION = ${parseProjectVersion(packageJson.version)};`,
    )
  await fs.writeFile(projectConfigPath, newContent)
}

async function updateInfoPlist() {
  const projectPath = path.resolve(rootPath, '.output', ProjectName)
  const files = await globby('**/*.plist', {
    cwd: projectPath,
  })
  for (const file of files) {
    const content = await fs.readFile(path.resolve(projectPath, file), 'utf-8')
    await fs.writeFile(
      path.resolve(projectPath, file),
      content.replaceAll(
        '</dict>\n</plist>',
        '	<key>CFBundleVersion</key>\n	<string>$(CURRENT_PROJECT_VERSION)</string>\n</dict>\n</plist>',
      ),
    )
  }
}

function parseProjectVersion(version: string) {
  const [major, minor, patch] = version.split('.').map(Number)
  return major * 10000 + minor * 100 + patch
}

await updateProjectConfig()
await updateInfoPlist()
