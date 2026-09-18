// Turn the demo build into the fragment the Artifact tool publishes:
// no doctype/html/head wrapper, asset paths left exactly as Vite emitted them.
// Run after: VITE_DEMO=1 vite build --outDir dist-demo --base=./
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'

const html = readFileSync('dist-demo/index.html', 'utf8')
const pick = (re) => [...html.matchAll(re)].map((m) => m[0]).join('\n')

const parts = [
  '<title>Makams Ops</title>',
  pick(/<link rel="icon"[^>]*>/g),
  pick(/<link rel="apple-touch-icon"[^>]*>/g),
  pick(/<script type="module"[^>]*><\/script>/g),
  pick(/<link rel="stylesheet"[^>]*>/g),
  '<div id="root"></div>',
].filter(Boolean)

writeFileSync('dist-demo/artifact.html', parts.join('\n') + '\n')

const files = readdirSync('dist-demo/assets').map((f) => `assets/${f}`)
  .concat(readdirSync('dist-demo').filter((f) => f.endsWith('.png')))
console.log(JSON.stringify(Object.fromEntries(files.map((f) => [f, f])), null, 0))
