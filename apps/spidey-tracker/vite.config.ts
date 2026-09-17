import { defineConfig } from 'vite'
import { galleryManifestPlugin } from './vite-plugin-gallery-manifest.ts'

// Project page under chord-chen-30.github.io → set base to '/spidey-tracker/'
// User/org root site → keep '/'
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [galleryManifestPlugin()],
})
