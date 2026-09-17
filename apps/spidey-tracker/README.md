# Web Tracker — Fan Recreation

Unofficial UI study recreating the *interaction shell* of [Spidey Tracker](https://spideytracker.net/) (map + panels + pixel aesthetic).

**Not affiliated** with Marvel, Sony Pictures, Samsung, or Google. No official trademarks, billing blocks, trailer/ticket CTAs, X feeds, or promo downloads.

## Stack

- Vite + TypeScript
- [MapLibre GL JS](https://maplibre.org/) + [OpenFreeMap](https://openfreemap.org/) vector tiles
- Procedural pixel sprites (SVG data URLs)
- Web Audio UI beeps (no audio files)

Conda is only used here to provide Node.js. The app itself is a normal frontend project — Python/conda packages are not required at runtime.

## Setup

```bash
conda activate spidey-tracker   # Node 20 env created for this project
cd /Users/chordchen/cz/Chord-Chen-30.github.io/apps/spidey-tracker
npm install
npm run dev
```

## Publishing

The GitHub Pages workflow builds this app with the `/spidey-tracker/` base path
whenever `master` is updated. Do not commit `dist/`; it is a generated artifact.

## What’s included

- Intro screen (sound on/off → boot → map)
- Dark red/blue pixel HUD
- Confirmed / rumored / event pins
- Activity Log, Web Watch, Events, Help panels
- Map filters + zoom / global / NYC controls
- Sample fictional sightings (not real campaign data)

## What’s intentionally missing

- Official logos / wordmarks / film branding
- External promo links (trailer, tickets, social)
- Samsung exclusives / downloads
- Live social feed / Street View scavenger hunt
