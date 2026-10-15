import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createRequire } from 'node:module'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import { chromium } from '@playwright/test'

const exec = promisify(execFile)
const require = createRequire(import.meta.url)
const config = JSON.parse(await readFile(new URL('../lighthouse.config.json', import.meta.url), 'utf8'))
const output = new URL('../reports/lighthouse/', import.meta.url)
await mkdir(output, { recursive: true })
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]
const rows = []
// O preview deve estar rodando. Nenhum recurso é removido para a auditoria.
await fetch(config.origin).then(response => { if (!response.ok) throw new Error('Preview indisponível') })
for (const path of config.pages) {
  for (const profile of ['mobile', 'desktop']) {
    const measurements = []
    for (let run = 1; run <= config.runs; run++) {
      const name = `${path === '/' ? 'home' : 'detail'}-${profile}-${run}`
      const destination = new URL(name, output).pathname
      const args = [require.resolve('lighthouse/cli/index.js'), `${config.origin}${path}`, '--output=html', '--output=json', `--output-path=${destination}`, '--only-categories=performance,accessibility,best-practices,seo', `--chrome-flags=${process.env.LIGHTHOUSE_CHROME_FLAGS || '--headless --no-sandbox'}`, '--quiet']
      if (profile === 'desktop') args.push('--preset=desktop')
      console.log(`Auditoria ${name}`)
      await exec(process.execPath, args, { env: { ...process.env, CHROME_PATH: process.env.CHROME_PATH || chromium.executablePath() }, timeout: 180_000 })
      const report = JSON.parse(await readFile(`${destination}.report.json`, 'utf8'))
      measurements.push({
        performance: report.categories.performance.score * 100,
        accessibility: report.categories.accessibility.score * 100,
        bestPractices: report.categories['best-practices'].score * 100,
        seo: report.categories.seo.score * 100,
        LCP: report.audits['largest-contentful-paint'].numericValue,
        CLS: report.audits['cumulative-layout-shift'].numericValue,
        TBT: report.audits['total-blocking-time'].numericValue,
      })
    }
    rows.push({ path, profile, runs: measurements, median: Object.fromEntries(Object.keys(measurements[0]).map(key => [key, median(measurements.map(value => value[key]))])) })
  }
}
const summary = { stage: 'final', generatedAt: new Date().toISOString(), versions: { node: process.version, lighthouse: require('lighthouse/package.json').version, playwright: require('@playwright/test/package.json').version }, environment: { platform: os.platform(), release: os.release(), arch: os.arch(), cpu: os.cpus()[0]?.model, memoryGiB: Math.round(os.totalmem() / 1024 ** 3) }, config, results: rows }
await writeFile(new URL('summary.json', output), JSON.stringify(summary, null, 2))
console.table(rows.map(row => ({ page: row.path, profile: row.profile, ...row.median })))
