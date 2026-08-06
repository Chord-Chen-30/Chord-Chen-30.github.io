# Spidey Tracker — fan recreation

Personal / study recreation of the interaction and look of [spideytracker.net](https://spideytracker.net/).

**Not affiliated** with Sony Pictures, Marvel, or the official Spidey Tracker campaign.

## What’s here

Static Vite build hosted under this site path:

`https://chord-chen-30.github.io/spidey-tracker/`

Some UI pixels (title logo, hang/stand sheets, filter tabs, red/green/event pins, etc.) are taken from publicly loaded assets on the official site for layout matching. Do not treat this folder as redistributable product art.

## Source project

Editable source lives outside this Pages tree (local Vite app). Rebuild with `base=/spidey-tracker/` and copy `dist/` here when updating.

## Compress gallery photos

Phone / camera JPGs are often 10–13MB each. GitHub Pages deploy can **time out** if the `spidey-tracker/` artifact gets too large. Compress before deploying.

Script (same copy in the source repo under `scripts/`):

`scripts/compress-gallery-images.py`

### Setup

```bash
pip install pillow
# or inside the project conda env:
conda activate spidey-tracker && pip install pillow
```

### Usage (from the Vite source project root)

```bash
# Preview savings only
python3 scripts/compress-gallery-images.py public/galleries --dry-run

# Compress in place (recommended defaults)
python3 scripts/compress-gallery-images.py public/galleries

# Or via npm
npm run compress:galleries
```

If you only have this Pages folder checked out:

```bash
python3 scripts/compress-gallery-images.py galleries
```

### Defaults (clarity vs size)

| Flag | Default | Meaning |
|------|---------|---------|
| `--max-edge` | `1600` | Longest side in px (enough for the gallery UI) |
| `--quality` | `85` | JPEG quality; try `80`–`88` |
| `--min-bytes` | `400000` | Skip files already smaller than this |
| `--dry-run` | off | Estimate only, do not write |

Examples:

```bash
# Slightly smaller files
python3 scripts/compress-gallery-images.py public/galleries --quality 82 --max-edge 1400

# Keep more detail
python3 scripts/compress-gallery-images.py public/galleries --quality 88 --max-edge 1920
```

What it does: EXIF orientation fix → LANCZOS resize → progressive JPEG (`optimize=True`). Non-JPEG inputs become `.jpg`. After compressing, rebuild/deploy as usual (`npm run deploy:gh-pages`).

### If Pages deploy still times out

Compressing alone is not enough when GitHub’s branch deploy hangs. This repo also has Actions workflow `.github/workflows/deploy-pages.yml`. In GitHub:

**Settings → Pages → Build and deployment → Source → GitHub Actions**

Then re-run the failed workflow or push again.
