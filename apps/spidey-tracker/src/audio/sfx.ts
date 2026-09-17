/** Tiny Web Audio beeps — no external audio assets required. */

let ctx: AudioContext | null = null
let enabled = true

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  return ctx
}

export function setSoundEnabled(on: boolean) {
  enabled = on
}

export function isSoundEnabled() {
  return enabled
}

export function unlockAudio() {
  const c = getCtx()
  if (c.state === 'suspended') void c.resume()
}

function beep(freq: number, duration = 0.08, type: OscillatorType = 'square', gain = 0.04) {
  if (!enabled) return
  const c = getCtx()
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.value = freq
  g.gain.value = gain
  osc.connect(g)
  g.connect(c.destination)
  const t = c.currentTime
  g.gain.setValueAtTime(gain, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + duration)
  osc.start(t)
  osc.stop(t + duration)
}

export function playClick() {
  beep(880, 0.06)
}

export function playOpen() {
  beep(520, 0.05)
  setTimeout(() => beep(780, 0.08), 50)
}

export function playClose() {
  beep(780, 0.05)
  setTimeout(() => beep(420, 0.08), 50)
}

export function playPin() {
  beep(660, 0.05)
  setTimeout(() => beep(990, 0.1), 40)
}

export function playBoot() {
  ;[220, 330, 440, 660].forEach((f, i) => setTimeout(() => beep(f, 0.07), i * 70))
}
