/**
 * Pixel helpers + PNG asset URLs for Spidey Tracker UI.
 */

import { assetUrl } from './assetUrl'

type Cell = string
const _ = '.'

const K = '#141414'
const W = '#ffffff'
const C = '#96e0f7'

function svgFromGrid(cells: Cell[][], scale = 3): string {
  const h = cells.length
  const w = cells[0]?.length ?? 0
  const rects: string[] = []
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = cells[y][x]
      if (!c || c === _) continue
      rects.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${c}"/>`)
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w * scale}" height="${h * scale}" shape-rendering="crispEdges">${rects.join('')}</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

function parse(rows: string[], map: Record<string, string>): Cell[][] {
  const width = Math.max(...rows.map((r) => r.length))
  return rows.map((row) =>
    [...row.padEnd(width, '.')].map((ch) => (ch === '.' ? _ : map[ch] ?? _)),
  )
}

function stamp(dst: Cell[][], src: Cell[][], ox: number, oy: number) {
  for (let y = 0; y < src.length; y++) {
    for (let x = 0; x < src[0].length; x++) {
      const c = src[y][x]
      if (c === _) continue
      const yy = oy + y
      const xx = ox + x
      if (yy >= 0 && yy < dst.length && xx >= 0 && xx < dst[0].length) dst[yy][xx] = c
    }
  }
}

export function pinUrl(kind: 'confirmed' | 'rumored' | 'event'): string {
  if (kind === 'event') return assetUrl('event_pin.png')
  if (kind === 'confirmed') return assetUrl('green_pin.png')
  return assetUrl('red_pin.png')
}

/** Large black spider for side tabs — readable on green/red. */
export function sideTabSpiderUrl(): string {
  return svgFromGrid(
    parse(
      [
        '................',
        'K.K..........K.K',
        '.K.K........K.K.',
        '..K.KK....KK.K..',
        '...KKKKKKKKKK...',
        '.K.KKKKKKKKKK.K.',
        'K.KK.KKKKKK.KK.K',
        '..KKKKKKKKKKKK..',
        '..KKKK.KK.KKKK..',
        '.K.KKKKKKKKKK.K.',
        'K...KKKKKKKK...K',
        '.....KKKKKK.....',
        '....K..KK..K....',
        '...K....KK....K.',
        '................',
      ],
      { K },
    ),
    4,
  )
}

/**
 * Hang / stand Spidey — PNG spritesheets, stepped via background-position
 * (same technique as spideytracker.net `spritesheet` helper).
 */

export type EyeFrame = 'open' | 'mid' | 'blink'

export const hangSheet = {
  get url() {
    return assetUrl('spidey-hang-sheet.png')
  },
  /** Native cell size in the PNG */
  period: 82,
  height: 124,
  frameCount: 77,
  /** Official site uses ~18fps through the full strip */
  fps: 18,
  /** Display width: mobile / desktop (matches official 50 / 71) */
  displayWidth: { mobile: 50, desktop: 71 },
}

export const standSheet = {
  get url() {
    return assetUrl('spidey-stand-sheet.png')
  },
  period: 74,
  height: 119,
  frames: { open: 0, mid: 10, blink: 14 } as Record<EyeFrame, number>,
}

export type SheetPlayer = {
  stop: () => void
  resize: () => void
}

/**
 * Loop an entire horizontal spritesheet by updating background-position,
 * matching official: background-size = (displayW * frames) × displayH.
 */
export function playSheetLoop(
  el: HTMLElement,
  sheet: {
    url: string
    period: number
    height: number
    frameCount: number
    fps: number
    displayWidth: { mobile: number; desktop: number }
  },
): SheetPlayer {
  let frame = 0
  let displayW = 50
  let timer: number | undefined

  const layout = () => {
    displayW = window.innerWidth <= 768 ? sheet.displayWidth.mobile : sheet.displayWidth.desktop
    const displayH = Math.round(sheet.height * (displayW / sheet.period))
    el.style.width = `${displayW}px`
    el.style.height = `${displayH}px`
    el.style.backgroundImage = `url("${sheet.url}")`
    el.style.backgroundSize = `${displayW * sheet.frameCount}px ${displayH}px`
    el.style.backgroundRepeat = 'no-repeat'
    el.style.backgroundPosition = `${-(frame * displayW)}px 0px`
    el.style.imageRendering = 'pixelated'
  }

  const tick = () => {
    frame = (frame + 1) % sheet.frameCount
    el.style.backgroundPosition = `${-(frame * displayW)}px 0px`
  }

  layout()
  timer = window.setInterval(tick, 1000 / sheet.fps)

  return {
    stop: () => {
      if (timer !== undefined) window.clearInterval(timer)
      timer = undefined
    },
    resize: layout,
  }
}

export function spideyHangUrl(_frame: EyeFrame = 'open'): string {
  return hangSheet.url
}

export function spideyChibiUrl(_frame: EyeFrame = 'open'): string {
  return standSheet.url
}


/** Faint watermark spider for start screen. */
export function spiderWatermarkUrl(): string {
  return svgFromGrid(
    parse(
      [
        '................................',
        '..K..K....................K..K..',
        '...K..K..................K..K...',
        '....K..KK....KKKK......KK..K....',
        '.....K..KK.KKKKKKKK..KK..K.....',
        '..K...KKKKKKKKKKKKKKKKKK...K..',
        '.K..K.KKKKKKKKKKKKKKKKKK.K..K.',
        'K....KKKK..KKKKKK..KKKKK....K',
        '.....KKKKKKKKKKKKKKKKKKK.....',
        '..K..KKKKKKKKKKKKKKKKKKK..K..',
        '.K....KKKKKKKKKKKKKKKK....K.',
        'K......KKKKKKKKKKKKKK......K',
        '........KKKKKKKKKKKK........',
        '.......K..KKKKKK..K.......',
        '......K....KKKK....K......',
        '.....K......KK......K.....',
        '................................',
      ],
      { K: '#3a3a3a' },
    ),
    8,
  )
}

const Peach = '#ebb078'

/** Bezel top-left eye badge (peach ring + lenses) — not the title head. */
export function eyeBadgeUrl(): string {
  const size = 28
  const out: Cell[][] = Array.from({ length: size }, () => Array(size).fill(_))
  const cx = (size - 1) / 2
  const cy = (size - 1) / 2
  const r = size * 0.48
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - cx, y - cy)
      if (d <= r) {
        if (d > r - 1.2) out[y][x] = K
        else if (d > r - 4.2) out[y][x] = Peach
        else out[y][x] = K
      }
    }
  }
  const eyes = parse(
    [
      '..KKKKKKKKKK..',
      '.KWWWWKKWWWWK.',
      'KWWWWWKKWWWWWK',
      'KWWWWWKKWWWWWK',
      'KWWWWWKKWWWWWK',
      'KWWWWWKKWWWWWK',
      '.KWWWWKKWWWWK.',
      '..KKKKKKKKKK..',
    ],
    { K, W },
  )
  stamp(out, eyes, Math.floor((size - eyes[0].length) / 2), 9)
  return svgFromGrid(out, 3)
}

/** Top-right: classic 8-leg black spider emblem. */
export function chromeSpiderUrl(): string {
  return svgFromGrid(
    parse(
      [
        '..................',
        '.K.K..........K.K.',
        '..K.K........K.K..',
        '...K.K......K.K...',
        '....K.KK..KK.K....',
        '.....KKKKKKKK.....',
        '...K.KKKKKKKK.K...',
        '..K.KK.KKKK.KK.K..',
        '.K..KKKKKKKKKK..K.',
        '....KKKKKKKKKK....',
        '...K.KK.KK.KK.K...',
        '..K...KKKKKK...K..',
        '.K.....KKKK.....K.',
        '......K....K......',
        '..................',
      ],
      { K },
    ),
    3,
  )
}

/**
 * Official-style title art extracted from spidey-spiderman-icon.png
 * (capsule + dot-matrix SPIDEY/TRACKER + mask head).
 */
export function logoUrl(): string {
  return assetUrl('spidey-title.png')
}

export function asciiSpideyUrl(): string {
  return svgFromGrid(
    parse(
      [
        '........................................',
        '..............CCCCCCCCCC................',
        '............CCCCCCCCCCCCCC..............',
        '..........CCCC..........CCCC............',
        '.........CCC.....CCCC.....CCC...........',
        '........CCC.....CC..CC.....CCC..........',
        '........CCC.....CCCCCC.....CCC..........',
        '........CCC.....CC..CC.....CCC..........',
        '.........CCC.............CCC............',
        '..........CCCC..........CCCC............',
        '........CCCC.CCCCCCCCCC.CCCC............',
        '.......CCC................CCC...........',
        '.......CCC......CCCC......CCC...........',
        '........CCC....CC..CC....CCC............',
        '.........CCCCCCCCCCCCCCCC...............',
        '........................................',
      ],
      { C },
    ),
    3,
  )
}
