import fs from 'node:fs'
import path from 'node:path'
import type { Plugin, ViteDevServer } from 'vite'

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'])

function listPlaceFolders(galleriesRoot: string): string[] {
  if (!fs.existsSync(galleriesRoot)) return []
  return fs
    .readdirSync(galleriesRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
    .map((d) => d.name)
    .sort()
}

function listImages(dir: string): string[] {
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && IMAGE_EXT.has(path.extname(e.name).toLowerCase()))
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
}

/** Scan `public/galleries/<city>__<country>/*` → `{ "city__country": ["galleries/..."] }` (no site base). */
export function scanGalleryManifest(publicDir: string, _base?: string): Record<string, string[]> {
  const galleriesRoot = path.join(publicDir, 'galleries')
  const out: Record<string, string[]> = {}

  for (const folder of listPlaceFolders(galleriesRoot)) {
    const files = listImages(path.join(galleriesRoot, folder))
    if (!files.length) continue
    // Store root-relative public paths; runtime prepends import.meta.env.BASE_URL.
    out[folder] = files.map((name) => `galleries/${folder}/${name}`)
  }
  return out
}

function writeManifest(outFile: string, manifest: Record<string, string[]>) {
  const next = `${JSON.stringify(manifest, null, 2)}\n`
  if (fs.existsSync(outFile) && fs.readFileSync(outFile, 'utf8') === next) return false
  fs.mkdirSync(path.dirname(outFile), { recursive: true })
  fs.writeFileSync(outFile, next)
  return true
}

/** Writes `src/data/gallery-manifest.json` so imports work even before/without virtual modules. */
export function galleryManifestPlugin(): Plugin {
  let publicDir = ''
  let base = '/'
  let root = process.cwd()
  let outFile = ''

  const rebuild = () => {
    const manifest = scanGalleryManifest(publicDir || path.join(root, 'public'), base)
    if (outFile) writeManifest(outFile, manifest)
    return manifest
  }

  return {
    name: 'gallery-manifest',
    configResolved(config) {
      root = config.root
      publicDir = config.publicDir
      base = config.base
      outFile = path.join(root, 'src/data/gallery-manifest.json')
      rebuild()
    },
    buildStart() {
      rebuild()
    },
    configureServer(server: ViteDevServer) {
      const watchRoot = path.join(publicDir || path.join(root, 'public'), 'galleries')
      if (!fs.existsSync(watchRoot)) fs.mkdirSync(watchRoot, { recursive: true })
      server.watcher.add(watchRoot)

      const invalidate = (file: string) => {
        if (!file.includes(`${path.sep}galleries${path.sep}`) && !file.endsWith(`${path.sep}galleries`)) return
        const changed = rebuild()
        if (changed !== undefined) server.ws.send({ type: 'full-reload' })
      }

      server.watcher.on('add', invalidate)
      server.watcher.on('unlink', invalidate)
      server.watcher.on('change', invalidate)
      server.watcher.on('addDir', invalidate)
      server.watcher.on('unlinkDir', invalidate)
    },
  }
}
