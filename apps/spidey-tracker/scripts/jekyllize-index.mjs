#!/usr/bin/env node
/**
 * Prepend Jekyll front matter so GitHub Pages (Jekyll) publishes the SPA at
 * /spidey-tracker/ instead of collapsing permalink to /index/.
 */
import fs from 'node:fs'
import path from 'node:path'

const indexPath = path.resolve('dist/index.html')
const html = fs.readFileSync(indexPath, 'utf8')
if (html.startsWith('---\n')) {
  console.log('jekyllize-index: already has front matter')
  process.exit(0)
}
const matter = `---
layout: null
permalink: /spidey-tracker/
---
`
fs.writeFileSync(indexPath, matter + html)
console.log('jekyllize-index: wrote front matter →', indexPath)
