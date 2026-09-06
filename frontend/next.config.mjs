import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  // pnpm workspace hoists deps to the repo root; without this, Vercel
  // serverless traces miss modules and every route returns FUNCTION_INVOCATION_FAILED.
  outputFileTracingRoot: path.join(__dirname, '..'),
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
