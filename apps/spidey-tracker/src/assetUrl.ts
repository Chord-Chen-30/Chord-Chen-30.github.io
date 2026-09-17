/** Public-folder asset URL that respects Vite `base` (e.g. `/spidey-tracker/` on GitHub Pages). */
export function assetUrl(path: string): string {
  const base = import.meta.env.BASE_URL || '/'
  const cleaned = path
    .replace(/^\//, '')
    // Manifest may have been written during a gh-pages build; strip that prefix for local/dev.
    .replace(/^spidey-tracker\//, '')
  const encoded = cleaned
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/')
  return `${base.endsWith('/') ? base : `${base}/`}${encoded}`
}
