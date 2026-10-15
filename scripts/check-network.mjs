import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'
import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
const root = fileURLToPath(new URL('../', import.meta.url))
const temp = await mkdtemp(path.join(os.tmpdir(), 'nft-network-check-'))
try {
  const entry = path.join(temp, 'network.mjs')
  await build({
    absWorkingDir: root, entryPoints: [process.argv[2] || 'scripts/check-network-entry.ts'], outfile: entry,
    bundle: true, platform: 'node', format: 'esm', external: ['node:*'],
    alias: { '@': './src' },
    define: { 'import.meta.env': JSON.stringify({ VITE_API_URL: 'http://localhost:5173/api' }) },
    banner: { js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);' },
  })
  const result = await promisify(execFile)(process.execPath, [entry], { timeout: 30_000 })
  console.log(result.stdout.trim())
} finally {
  await rm(temp, { recursive: true, force: true })
}
