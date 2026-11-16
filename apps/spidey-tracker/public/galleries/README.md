# City galleries — quick update guide

From `apps/spidey-tracker/`, update photos like this:

```bash
# 1. Put originals in the matching place folder
public/galleries/<city>__<country>/

# 2. Compress/convert photos and refresh the gallery manifest
npm run galleries:update

# 3. Preview or build
npm run dev
# or: npm run build:gh-pages
```

Folder rules:

- lowercase
- spaces → `-`
- city and country separated by `__` (two underscores)

Examples:

| Place | Folder |
|-------|--------|
| Miami, USA | `miami__usa/` |
| Key West, USA | `key-west__usa/` |
| New York, USA | `new-york__usa/` |
| Shanghai, China | `shanghai__china/` |

The folder name must match the `city` and `country` fields in
`src/data/sightings.ts`; otherwise that pin will keep showing a placeholder.

Browser formats: `.jpg` `.jpeg` `.png` `.webp` `.gif` `.avif`.
HEIC files (including fake `*.HEIC.JPG`) are converted to JPEG by macOS `sips`.
Install Pillow once if needed:

```bash
python3 -m pip install pillow
```

`npm run galleries:update` resizes large images to a 1600 px longest edge,
uses JPEG quality 85, converts HEIC, and rewrites
`src/data/gallery-manifest.json`. Files are displayed in natural filename order
(`2.jpg` before `10.jpg`). Regular builds also refresh the manifest, but do not
compress originals, so run the update command before committing new photos.
