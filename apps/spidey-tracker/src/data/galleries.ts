/**
 * Sighting photo galleries keyed by city + country.
 *
 * Drop images into: `public/galleries/<city>__<country>/`
 * Folder slug = lowercase, spaces → `-`, e.g. New York / USA → `new-york__usa`
 * Supported: jpg, jpeg, png, webp, gif, avif (sorted by filename).
 * Empty / missing folder → SVG placeholders.
 */

import rawGalleryManifest from './gallery-manifest.json'
import { assetUrl } from '../assetUrl'

const galleryManifest = rawGalleryManifest as Record<string, string[]>

export interface GalleryImage {
  id: string
  label: string
  accent: string
  /** Real file URL when present; otherwise use placeholderPhotoUrl */
  src?: string
}

export interface CityGallery {
  city: string
  country: string
  images: GalleryImage[]
}

export function galleryKey(city: string, country: string): string {
  return `${city.trim().toLowerCase()}|${country.trim().toLowerCase()}`
}

/** Folder name under `public/galleries/` for a place. */
export function galleryFolderSlug(city: string, country: string): string {
  return `${slugify(city)}__${slugify(country)}`
}

function slugify(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const accents = ['#e64b41', '#5bb589', '#7ec8f0', '#c5e8f6', '#e8b84a', '#9b7edc']

function placeholders(city: string, country: string, count: number, seed = 0): GalleryImage[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${galleryKey(city, country)}-${i + 1}`,
    label: `${city} · shot ${String(i + 1).padStart(2, '0')}`,
    accent: accents[(seed + i) % accents.length],
  }))
}

function imagesFromFolder(city: string, country: string): GalleryImage[] | null {
  const folder = galleryFolderSlug(city, country)
  const urls = galleryManifest[folder]
  if (!urls?.length) return null

  return urls.map((rel, i) => {
    const file = decodeURIComponent(rel.split('/').pop() ?? `shot-${i + 1}`)
    const baseName = file.replace(/\.[^.]+$/, '')
    return {
      id: `${folder}-${i + 1}`,
      label: baseName,
      accent: accents[i % accents.length],
      src: assetUrl(rel),
    }
  })
}

export function getGalleryForPlace(city: string, country: string): CityGallery {
  const fromDisk = imagesFromFolder(city, country)
  return {
    city,
    country,
    images: fromDisk ?? placeholders(city, country, 3),
  }
}

/** Prefer real photo; fall back to SVG placeholder. */
export function photoUrl(img: GalleryImage, w = 480, h = 300): string {
  return img.src ?? placeholderPhotoUrl(img.label, img.accent, w, h)
}

/** SVG data-URL placeholder “photo” for previews / gallery tiles. */
export function placeholderPhotoUrl(label: string, accent: string, w = 480, h = 300): string {
  const safe = label.replace(/[<>&]/g, '')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1a2830"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0.55"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <rect x="12" y="12" width="${w - 24}" height="${h - 24}" fill="none" stroke="${accent}" stroke-width="3" stroke-dasharray="8 6" opacity="0.7"/>
  <text x="50%" y="48%" text-anchor="middle" fill="#c5e8f6" font-family="monospace" font-size="18" opacity="0.9">PHOTO PLACEHOLDER</text>
  <text x="50%" y="58%" text-anchor="middle" fill="#9ec2d4" font-family="monospace" font-size="13">${safe}</text>
</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
