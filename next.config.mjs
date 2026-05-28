import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export so Capacitor can package the build into an Android APK.
  // `next dev` still works; the export is produced by `next build`.
  output: 'export',
  // Static export emits foo/index.html for each route, so trailing slashes
  // line up cleanly when the app is loaded from the device file system.
  trailingSlash: true,
  turbopack: {
    root: __dirname,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  devIndicators: false,
}

export default nextConfig
