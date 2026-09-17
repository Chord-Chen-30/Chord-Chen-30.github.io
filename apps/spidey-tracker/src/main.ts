import './style.css'
import { Map, Marker, Popup, setWorkerUrl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { assetUrl } from './assetUrl'
import { sightings, type Sighting, type SightingKind } from './data/sightings'
import { villains } from './data/webwatch'
import { getGalleryForPlace, photoUrl } from './data/galleries'
import { spideyMapStyle, applySpideyMapColors, darkRasterFallback } from './map/basemap'
import {
  eyeBadgeUrl,
  hangSheet,
  logoUrl,
  pinUrl,
  playSheetLoop,
  spiderWatermarkUrl,
  type EyeFrame,
  type SheetPlayer,
} from './sprites'
import {
  isSoundEnabled,
  playBoot,
  playClick,
  playClose,
  playOpen,
  playPin,
  setSoundEnabled,
  unlockAudio,
} from './audio/sfx'

setWorkerUrl(maplibreWorkerUrl)

/** Public PNGs used from CSS — must include Vite `base` on GitHub Pages. */
const rootStyle = document.documentElement.style
rootStyle.setProperty('--asset-filter-white', `url("${assetUrl('filter_white.png')}")`)
rootStyle.setProperty('--asset-filter-green', `url("${assetUrl('filter_green.png')}")`)
rootStyle.setProperty('--asset-filter-red', `url("${assetUrl('filter_red.png')}")`)
rootStyle.setProperty('--asset-stand-sheet', `url("${assetUrl('spidey-stand-sheet.png')}")`)

type PanelId = 'activity' | 'webwatch' | 'events' | 'help' | null

const app = document.querySelector<HTMLDivElement>('#app')!
const logo = logoUrl()
const eyeBadge = eyeBadgeUrl()
const watermark = spiderWatermarkUrl()
const chromeSpider = assetUrl('chrome-spider.png')
const pins = {
  confirmed: pinUrl('confirmed'),
  rumored: pinUrl('rumored'),
  event: pinUrl('event'),
}

const filters: Record<SightingKind, boolean> = {
  confirmed: true,
  rumored: true,
  event: true,
}

let map: Map
let activePanel: PanelId = null
let markers: Marker[] = []
let activePopup: Popup | null = null
let userMarker: Marker | null = null
let selectedId: string | null = null
let toastTimer: number | undefined
let standTimer: number | undefined
let hangPlayer: SheetPlayer | undefined
let hangResizeBound: (() => void) | undefined
let vuTimer: number | undefined

app.innerHTML = `
  <div class="site">
    <div class="monitor">
      <div class="bezel">
        <img class="chrome-eye" src="${eyeBadge}" alt="" />
        <button class="chrome-spider-btn" id="btn-filters" type="button" title="Map filters">
          <img src="${chromeSpider}" alt="filters" />
        </button>

        <div class="side-tabs">
          <button class="side-tab side-tab--confirmed" type="button" data-side="confirmed" title="Confirmed" aria-label="Confirmed filter"></button>
          <button class="side-tab side-tab--rumored" type="button" data-side="rumored" title="Rumored" aria-label="Rumored filter"></button>
        </div>

        <img class="bezel-title" id="bezel-title" src="${logo}" alt="Spidey Tracker" />

        <div class="screen">
          <div class="start" id="start">
            <img class="start__watermark" src="${watermark}" alt="" />
            <div class="hang-stage">
              <div class="hang-web"></div>
              <div class="hang-spidey" id="hang-spidey" role="img" aria-label="hanging spider-man"></div>
            </div>
            <div class="start__copy" id="start-copy">
              <p class="start__headline">WELCOME TO THE SPIDEY TRACKER.
INTERACT WITH THE MAP TO VIEW
SPIDER-MAN SIGHTINGS
ALL OVER THE WORLD.</p>
              <div class="start__bars" aria-hidden="true">
                ${Array.from({ length: 10 }, () => `<i class="start__bar"></i>`).join('')}
              </div>
              <p class="start__continue">CHOOSE YOUR SETTINGS AND START TRACKING</p>
              <div class="start__actions" id="sound-actions">
                <button class="bit-btn" type="button" data-sound-enabled="true"><span>SOUND ON</span></button>
                <button class="bit-btn" type="button" data-sound-enabled="false"><span>SOUND OFF</span></button>
              </div>
            </div>
          </div>

          <div class="pre-map is-hidden" id="pre-map" aria-hidden="true">
            <div class="pre-map__label">LOADING</div>
          </div>

          <div class="map-screen" id="map-screen" hidden>
            <div id="map"></div>
            <div class="hud" id="hud">
              <img class="map-logo" src="${logo}" alt="Spidey Tracker" />
              <div class="top-actions">
                <button class="btn" id="btn-sound" type="button">Sound On</button>
              </div>
              <div class="map-controls">
                <button class="btn" id="zoom-in" type="button" title="Zoom in" aria-label="Zoom in">+</button>
                <button class="btn" id="zoom-out" type="button" title="Zoom out" aria-label="Zoom out">−</button>
                <button class="btn" id="zoom-global" type="button" title="World view" aria-label="World view">
                  <svg class="globe-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/>
                    <ellipse cx="12" cy="12" rx="3.6" ry="9" fill="none" stroke="currentColor" stroke-width="1.5"/>
                    <path d="M3.2 12h17.6M5.2 7.2h13.6M5.2 16.8h13.6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  </svg>
                </button>
                <button class="btn btn-locate" id="btn-locate" type="button" title="定位到当前位置" aria-label="定位">
                  <svg class="locate-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M12 2c-3.9 0-7 3.1-7 7 0 5.3 7 13 7 13s7-7.7 7-13c0-3.9-3.1-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"
                    />
                  </svg>
                </button>
              </div>
              <nav class="bottom-nav" aria-label="Main">
                <button class="nav-item" data-panel="activity" type="button">ACTIVITY<br/>LOG</button>
                <button class="nav-item" data-panel="webwatch" type="button">WEB<br/>WATCH</button>
                <button class="nav-item" data-panel="events" type="button">EVENTS</button>
                <button class="nav-item" data-panel="help" type="button">HELP</button>
              </nav>
              <div class="map-toast" id="map-toast" hidden></div>

              <aside class="panel" id="panel-activity">
                <div class="panel-head">
                  <h2>ACTIVITY LOG</h2>
                  <button class="btn" data-close-panel type="button">CLOSE</button>
                </div>
                <div class="panel-body">
                  <div class="panel-info">Select a sighting — or open a pin preview, then expand here.</div>
                  <div id="activity-list"></div>
                </div>
              </aside>

              <aside class="panel" id="panel-webwatch">
                <div class="panel-head">
                  <h2>WEB WATCH 1.0</h2>
                  <button class="btn" data-close-panel type="button">CLOSE</button>
                </div>
                <div class="panel-body">
                  <div class="panel-info">Bad-guy intel from sightings.</div>
                  <div id="webwatch-list"></div>
                </div>
              </aside>

              <aside class="panel" id="panel-events">
                <div class="panel-head">
                  <h2>EVENTS</h2>
                  <button class="btn" data-close-panel type="button">CLOSE</button>
                </div>
                <div class="panel-body">
                  <div class="panel-info">Community gatherings.</div>
                  <div id="events-list"></div>
                </div>
              </aside>

              <aside class="panel" id="panel-help">
                <div class="panel-head">
                  <h2>HELP</h2>
                  <button class="btn" data-close-panel type="button">CLOSE</button>
                </div>
                <div class="panel-body">
                  <div class="panel-info">Tap a pin: map zooms in and shows a photo preview. Tap again (or OPEN GALLERY) for the city gallery on the right.</div>
                  <div class="legend">
                    <div class="legend-row">
                      <div class="legend-pin"><img src="${pins.confirmed}" alt="" /></div>
                      <div>CONFIRMED</div>
                    </div>
                    <div class="legend-row">
                      <div class="legend-pin"><img src="${pins.rumored}" alt="" /></div>
                      <div>RUMORED</div>
                    </div>
                    <div class="legend-row">
                      <div class="legend-pin"><img src="${pins.event}" alt="" /></div>
                      <div>EVENT</div>
                    </div>
                  </div>
                </div>
              </aside>

              <div class="filters" id="filters">
                <strong style="font-size:8px">MAP FILTERS</strong>
                <label class="filter-row"><input type="checkbox" data-filter="confirmed" checked /> CONFIRMED</label>
                <label class="filter-row"><input type="checkbox" data-filter="rumored" checked /> RUMORED</label>
                <label class="filter-row"><input type="checkbox" data-filter="event" checked /> EVENTS</label>
              </div>

              <article class="detail" id="detail">
                <div class="detail-head">
                  <h3 id="detail-title">—</h3>
                  <button class="btn" id="detail-close" type="button">✕</button>
                </div>
                <div class="detail-body" id="detail-body"></div>
              </article>
            </div>
          </div>
        </div>

        <div class="stand-spidey" id="stand-spidey" data-frame="open" role="img" aria-hidden="true"></div>

        <div class="ticker-bar">
          <div class="ticker-bar__text" id="ticker">SELECT SOUND OPTION</div>
          <button class="ticker-bar__vol" id="ticker-vol" type="button" title="Sound">♪</button>
        </div>
      </div>
    </div>

    <section class="site-about" aria-label="About">
      <p class="site-about__name">Z tracker</p>
      <a class="site-about__home" href="https://chord-chen-30.github.io/">Home Page</a>
    </section>
  </div>
`

const startEl = $('#start')
const preMap = $('#pre-map')
const mapScreen = $('#map-screen')
const detail = $('#detail')
const filtersEl = $('#filters')
const ticker = $('#ticker')
const hangImg = $('#hang-spidey')
const standImg = $('#stand-spidey')
const soundBtn = $('#btn-sound') as HTMLButtonElement
const tickerVol = $('#ticker-vol') as HTMLButtonElement
const hangStage = app.querySelector('.hang-stage') as HTMLElement

function $<T extends HTMLElement = HTMLElement>(sel: string): T {
  return app.querySelector(sel) as T
}

function tagHtml(kind: SightingKind) {
  return `<span class="tag tag-${kind}">${kind.toUpperCase()}</span>`
}

/** Irregular VU meter — random heights, not a steady pulse. */
function startIrregularVu() {
  const bars = Array.from(app.querySelectorAll<HTMLElement>('.start__bar'))
  if (!bars.length) return
  const tick = () => {
    for (const bar of bars) {
      const h = 3 + Math.floor(Math.random() * 12)
      bar.style.height = `${h}px`
      bar.style.opacity = String(0.5 + Math.random() * 0.5)
      bar.classList.toggle('is-hot', h > 9)
    }
    vuTimer = window.setTimeout(tick, 70 + Math.floor(Math.random() * 160))
  }
  tick()
}

function stopIrregularVu() {
  if (vuTimer !== undefined) window.clearTimeout(vuTimer)
  vuTimer = undefined
}

function animateBlink(el: HTMLElement, store: 'hang' | 'stand') {
  if (store === 'hang') {
    hangPlayer?.stop()
    if (hangResizeBound) window.removeEventListener('resize', hangResizeBound)
    hangPlayer = playSheetLoop(el, hangSheet)
    let resizeTimer: number | undefined
    hangResizeBound = () => {
      window.clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(() => hangPlayer?.resize(), 150)
    }
    window.addEventListener('resize', hangResizeBound)
    return
  }

  const seq: EyeFrame[] = [
    'open',
    'open',
    'open',
    'open',
    'open',
    'open',
    'open',
    'open',
    'mid',
    'blink',
    'blink',
    'mid',
    'open',
    'open',
    'open',
    'open',
    'open',
    'mid',
    'blink',
    'mid',
    'open',
  ]
  let i = 0
  window.clearInterval(standTimer)
  standTimer = window.setInterval(() => {
    i = (i + 1) % seq.length
    el.dataset.frame = seq[i]
  }, 100)
}

function fillLists() {
  const activity = [...sightings].sort((a, b) => b.time.localeCompare(a.time))
  $('#activity-list').innerHTML = activity
    .map(
      (s) => `
      <button class="log-item" type="button" data-goto="${s.id}">
        <div class="log-meta">${tagHtml(s.kind)}<span>${s.time}</span></div>
        <div>${s.title}</div>
        <div class="log-meta"><span>${s.city}, ${s.country}</span></div>
      </button>`,
    )
    .join('')

  $('#webwatch-list').innerHTML = villains
    .map(
      (v) => `
      <div class="watch-item">
        <div class="watch-meta"><strong>${v.alias}</strong><span class="threat">${'▲'.repeat(v.threat)}</span></div>
        <div>${v.name}</div>
        <div class="watch-meta"><span>LAST: ${v.lastSeen}</span></div>
        <div style="color:var(--muted)">${v.notes}</div>
      </div>`,
    )
    .join('')

  const events = sightings.filter((s) => s.kind === 'event')
  $('#events-list').innerHTML = events
    .map(
      (s) => `
      <button class="event-item" type="button" data-goto="${s.id}">
        <div class="log-meta">${tagHtml('event')}<span>${s.time}</span></div>
        <div>${s.title}</div>
        <div class="log-meta"><span>${s.city}, ${s.country}</span></div>
      </button>`,
    )
    .join('')
}

function openPanel(id: PanelId) {
  activePanel = id
  ;(['activity', 'webwatch', 'events', 'help'] as const).forEach((p) => {
    $(`#panel-${p}`).classList.toggle('is-open', p === id)
  })
  app.querySelectorAll('.nav-item').forEach((el) => {
    el.classList.toggle('is-active', el.getAttribute('data-panel') === id)
  })
  if (id) {
    playOpen()
    filtersEl.classList.remove('is-open')
  }
}

function closePanels() {
  if (activePanel) playClose()
  openPanel(null)
}

function closePopup() {
  activePopup?.remove()
  activePopup = null
}

function highlightActivity(id: string | null) {
  app.querySelectorAll('.log-item').forEach((el) => {
    el.classList.toggle('is-selected', el.getAttribute('data-goto') === id)
  })
}

/** Step 1: fly to pin + show placeholder photo preview. */
function showPinPreview(s: Sighting) {
  const samePin = selectedId === s.id && activePopup

  selectedId = s.id
  highlightActivity(s.id)
  markers.forEach((m) => {
    m.getElement().classList.toggle('is-active', m.getElement().dataset.id === s.id)
  })

  // Second click on the same pin → open city gallery
  if (samePin) {
    playClick()
    openCityGallery(s)
    return
  }

  closePopup()
  detail.classList.remove('is-open')

  map.flyTo({
    center: [s.lng, s.lat],
    // Regional view so neighboring cities stay visible
    zoom: 5.4,
    padding: { top: 48, bottom: 220, left: 40, right: 40 },
    essential: true,
    speed: 1.2,
  })

  const gallery = getGalleryForPlace(s.city, s.country)
  const cover = gallery.images[0]
  const coverUrl = photoUrl(cover, 420, 260)

  const html = `
    <div class="pin-preview">
      <button class="pin-preview__photo" type="button" data-expand="${s.id}" title="Open gallery">
        <img src="${coverUrl}" alt="" />
        <span class="pin-preview__photo-hint">TAP AGAIN / OPEN GALLERY</span>
      </button>
      <div class="pin-preview__title">${s.title}</div>
      <div class="pin-preview__meta">${tagHtml(s.kind)} · ${s.city}, ${s.country}</div>
      <div class="pin-preview__blurb">${s.blurb}</div>
      <button class="pin-preview__open" type="button" data-expand="${s.id}">OPEN GALLERY ▶</button>
    </div>
  `
  activePopup = new Popup({
    closeButton: true,
    closeOnClick: false,
    offset: 28,
    maxWidth: '260px',
    className: 'pin-popup',
  })
    .setLngLat([s.lng, s.lat])
    .setHTML(html)
    .addTo(map)

  playPin()

  requestAnimationFrame(() => {
    document.querySelectorAll<HTMLButtonElement>(`[data-expand="${s.id}"]`).forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        playClick()
        openCityGallery(s)
      })
    })
  })
}

/** Step 2: right-side gallery for this city-country. */
function openCityGallery(s: Sighting) {
  selectedId = s.id
  highlightActivity(s.id)
  closePopup()
  closePanels()

  const gallery = getGalleryForPlace(s.city, s.country)
  detail.classList.add('is-open')
  $('#detail-title').textContent = `${gallery.city}, ${gallery.country}`
  $('#detail-body').innerHTML = `
    <p class="gallery-lead">${tagHtml(s.kind)} · ${s.title}</p>
    <p class="gallery-meta">${s.time}</p>
    <p class="gallery-blurb">${s.blurb}</p>
    <div class="gallery-focus" id="gallery-focus">
      <img src="${photoUrl(gallery.images[0], 960, 720)}" alt="" />
    </div>
    <div class="gallery-thumbs" data-place="${gallery.city}|${gallery.country}">
      ${gallery.images
        .map(
          (img, i) => `
        <button class="gallery-tile${i === 0 ? ' is-active' : ''}" type="button" data-gallery-idx="${i}" title="${img.label}">
          <img src="${photoUrl(img, 240, 160)}" alt="${img.label}" />
        </button>`,
        )
        .join('')}
    </div>
  `

  const focus = $('#gallery-focus') as HTMLElement
  detail.querySelectorAll<HTMLButtonElement>('[data-gallery-idx]').forEach((btn) => {
    btn.addEventListener('click', () => {
      playClick()
      const idx = Number(btn.dataset.galleryIdx)
      const img = gallery.images[idx]
      if (!img) return
      detail.querySelectorAll('.gallery-tile').forEach((t) => t.classList.remove('is-active'))
      btn.classList.add('is-active')
      focus.innerHTML = `<img src="${photoUrl(img, 960, 720)}" alt="${img.label}" />`
    })
  })

  playOpen()
}

/** @deprecated use openCityGallery */
function expandSidebarDetail(s: Sighting) {
  openCityGallery(s)
}

function clearDetail() {
  selectedId = null
  detail.classList.remove('is-open')
  highlightActivity(null)
  markers.forEach((m) => m.getElement().classList.remove('is-active'))
  closePopup()
}

function showMapToast(message: string) {
  const el = document.querySelector<HTMLElement>('#map-toast')
  if (!el) return
  el.hidden = false
  el.textContent = message
  if (toastTimer !== undefined) window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    el.hidden = true
  }, 4200)
}

function locateUser() {
  if (!map) return
  if (!window.isSecureContext) {
    showMapToast('定位需要 HTTPS 或 localhost')
    return
  }
  if (!navigator.geolocation) {
    showMapToast('当前浏览器不支持定位')
    return
  }

  showMapToast('正在定位…')
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lng = pos.coords.longitude
      const lat = pos.coords.latitude
      map.flyTo({ center: [lng, lat], zoom: 12, essential: true, speed: 1.2 })

      const el = document.createElement('div')
      el.className = 'user-dot'
      el.title = 'Your location'
      userMarker?.remove()
      userMarker = new Marker({ element: el, anchor: 'center' }).setLngLat([lng, lat]).addTo(map)
      showMapToast('已定位到当前位置')
    },
    (err) => {
      const msg =
        err.code === err.PERMISSION_DENIED
          ? '定位被拒绝：请在浏览器地址栏允许位置权限后重试'
          : err.code === err.POSITION_UNAVAILABLE
            ? '暂时拿不到位置，请检查系统定位是否开启'
            : err.code === err.TIMEOUT
              ? '定位超时，请再试一次'
              : `定位失败（${err.message || err.code}）`
      showMapToast(msg)
    },
    {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 15000,
    },
  )
}

function clearMarkers() {
  markers.forEach((m) => m.remove())
  markers = []
}

function renderMarkers() {
  clearMarkers()
  closePopup()
  for (const s of sightings) {
    if (!filters[s.kind]) continue
    const el = document.createElement('div')
    el.className = 'pin'
    el.dataset.id = s.id
    el.innerHTML = `<img src="${pins[s.kind]}" alt="${s.kind}" />`
    el.title = `${s.title} · ${s.city}`
    el.addEventListener('click', (e) => {
      e.stopPropagation()
      showPinPreview(s)
    })
    markers.push(new Marker({ element: el, anchor: 'center' }).setLngLat([s.lng, s.lat]).addTo(map))
  }
}

function initMap() {
  mapScreen.hidden = false
  mapScreen.style.opacity = '0'
  mapScreen.style.pointerEvents = 'none'

  map = new Map({
    container: 'map',
    style: spideyMapStyle,
    center: [-40, 28],
    zoom: 1.15,
    minZoom: 1,
    maxZoom: 18,
    attributionControl: { compact: true },
  })

  const onReady = () => {
    try {
      applySpideyMapColors(map)
    } catch (err) {
      console.warn('[map] color apply failed', err)
    }
    renderMarkers()
    map.resize()
  }

  map.on('load', onReady)
  map.on('error', (e) => {
    console.warn('[map]', e.error)
    if (!(map as unknown as { __fellBack?: boolean }).__fellBack) {
      ;(map as unknown as { __fellBack?: boolean }).__fellBack = true
      map.setStyle(darkRasterFallback)
      map.once('load', () => {
        renderMarkers()
        map.resize()
      })
    }
  })
  map.on('click', () => {
    closePopup()
  })
}

function revealMap() {
  preMap.classList.add('is-fading')
  setTimeout(() => {
    preMap.classList.add('is-hidden')
    preMap.classList.remove('is-fading')
    mapScreen.hidden = false
    mapScreen.style.opacity = ''
    mapScreen.style.pointerEvents = ''
    mapScreen.classList.remove('is-entered')
    mapScreen.classList.add('is-entering')
    app.querySelector('.site')?.classList.add('is-on-map')
    soundBtn.textContent = isSoundEnabled() ? 'Sound On' : 'Sound Off'
    ticker.textContent = 'TAP PINS TO PREVIEW SIGHTINGS'
    animateBlink(standImg, 'stand')
    map?.resize()
    // Highest view (min zoom): start a touch closer, ease back for a continuous pull-out
    map?.jumpTo({ center: [-40, 28], zoom: 1.35 })
    map?.easeTo({ center: [-40, 28], zoom: 1, duration: 1400, essential: true })
    window.setTimeout(() => {
      mapScreen.classList.add('is-entered')
      mapScreen.classList.remove('is-entering')
      map?.resize()
    }, 1400)
  }, 520)
}

function launchToMap() {
  playBoot()
  ticker.textContent = 'LOADING'
  startEl.classList.add('is-hidden')
  stopIrregularVu()
  hangPlayer?.stop()
  if (hangResizeBound) {
    window.removeEventListener('resize', hangResizeBound)
    hangResizeBound = undefined
  }
  hangPlayer = undefined
  window.clearInterval(standTimer)
  preMap.classList.remove('is-hidden')
  preMap.setAttribute('aria-hidden', 'false')

  initMap()

  const minWait = new Promise<void>((r) => setTimeout(r, 900))
  const mapReady = new Promise<void>((resolve) => {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      resolve()
    }
    map.once('load', finish)
    setTimeout(finish, 4000)
  })
  Promise.all([minWait, mapReady]).then(() => revealMap())
}

function bindIntro() {
  const startCopy = $('#start-copy')
  // Hang Spidey drops first; copy fades in after the drop settles
  requestAnimationFrame(() => hangStage.classList.add('is-dropped'))
  animateBlink(hangImg, 'hang')
  animateBlink(standImg, 'stand')
  window.setTimeout(() => startCopy.classList.add('is-visible'), 1500)
  startIrregularVu()

  const buttons = Array.from(
    app.querySelectorAll<HTMLButtonElement>('#sound-actions [data-sound-enabled]'),
  )
  let chosen = false

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (chosen) return
      chosen = true
      buttons.forEach((b) => {
        b.classList.remove('is-selected')
        b.disabled = true
      })
      btn.classList.add('is-selected')

      const on = btn.dataset.soundEnabled === 'true'
      setSoundEnabled(on)
      tickerVol.classList.toggle('is-off', !on)
      unlockAudio()
      playClick()
      ticker.textContent = 'LOADING'
      // Enter map immediately — no second tap
      setTimeout(() => launchToMap(), 280)
    })
  })

  tickerVol.addEventListener('click', () => {
    if (!startEl.classList.contains('is-hidden') && !chosen) return
    const next = !isSoundEnabled()
    setSoundEnabled(next)
    tickerVol.classList.toggle('is-off', !next)
    if (next) unlockAudio()
    playClick()
    if (!mapScreen.hidden) soundBtn.textContent = next ? 'Sound On' : 'Sound Off'
  })
}

function bindHud() {
  soundBtn.addEventListener('click', () => {
    const next = !isSoundEnabled()
    setSoundEnabled(next)
    if (next) unlockAudio()
    soundBtn.textContent = next ? 'Sound On' : 'Sound Off'
    tickerVol.classList.toggle('is-off', !next)
    playClick()
  })

  $('#btn-filters').addEventListener('click', () => {
    if (mapScreen.hidden) return
    playClick()
    filtersEl.classList.toggle('is-open')
    closePanels()
  })

  filtersEl.querySelectorAll<HTMLInputElement>('[data-filter]').forEach((input) => {
    input.addEventListener('change', () => {
      filters[input.dataset.filter as SightingKind] = input.checked
      playClick()
      renderMarkers()
    })
  })

  // Left green/red tabs: filter focus + expand selected into sidebar
  app.querySelectorAll<HTMLButtonElement>('[data-side]').forEach((tab) => {
    tab.addEventListener('click', () => {
      if (mapScreen.hidden) return
      playClick()
      const kind = tab.dataset.side as SightingKind
      app.querySelectorAll('.side-tab').forEach((t) => t.classList.remove('is-active'))
      tab.classList.add('is-active')

      // Prefer expanding currently selected pin of that kind
      const selected = selectedId ? sightings.find((s) => s.id === selectedId) : null
      if (selected && selected.kind === kind) {
        expandSidebarDetail(selected)
        return
      }
      // Else open activity log filtered visually + preview first matching pin
      const first = sightings.find((s) => s.kind === kind && filters[s.kind])
      if (first) {
        showPinPreview(first)
        openPanel('activity')
      }
    })
  })

  app.querySelectorAll<HTMLButtonElement>('.nav-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.panel as PanelId
      // Activity log with a selected pin → expand large detail
      if (id === 'activity' && selectedId) {
        const s = sightings.find((x) => x.id === selectedId)
        if (s) {
          expandSidebarDetail(s)
          openPanel('activity')
          return
        }
      }
      if (activePanel === id) closePanels()
      else openPanel(id)
    })
  })

  app.querySelectorAll('[data-close-panel]').forEach((btn) => {
    btn.addEventListener('click', () => closePanels())
  })

  $('#detail-close').addEventListener('click', () => {
    playClose()
    clearDetail()
  })

  $('#zoom-in').addEventListener('click', () => {
    playClick()
    map.zoomIn()
  })
  $('#zoom-out').addEventListener('click', () => {
    playClick()
    map.zoomOut()
  })
  $('#zoom-global').addEventListener('click', () => {
    playClick()
    clearDetail()
    map.flyTo({
      center: [-40, 28],
      zoom: 1,
      essential: true,
      speed: 2.6,
      curve: 1.2,
      duration: 700,
    })
  })
  $('#btn-locate').addEventListener('click', () => {
    playClick()
    locateUser()
  })

  app.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-goto]')
    if (!t) return
    const s = sightings.find((x) => x.id === t.dataset.goto)
    if (!s) return
    // List: preview+zoom first; second click opens city gallery
    if (selectedId === s.id && detail.classList.contains('is-open')) {
      return
    }
    if (selectedId === s.id && activePopup) {
      openCityGallery(s)
      return
    }
    showPinPreview(s)
  })
}

fillLists()
bindIntro()
bindHud()
