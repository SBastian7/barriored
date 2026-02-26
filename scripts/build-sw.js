const esbuild = require('esbuild')
const fs = require('fs')
const path = require('path')

async function buildServiceWorker() {
  console.log('📦 Building service worker...')

  try {
    await esbuild.build({
      entryPoints: ['app/sw.ts'],
      bundle: true,
      outfile: 'public/sw.js',
      format: 'iife',
      target: 'es2020',
      minify: process.env.NODE_ENV === 'production',
      sourcemap: process.env.NODE_ENV !== 'production',
      define: {
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
      },
    })

    console.log('✅ Service worker built successfully → public/sw.js')

    // Verify the file was created
    const swPath = path.join(process.cwd(), 'public', 'sw.js')
    const stats = fs.statSync(swPath)
    console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`)
  } catch (error) {
    console.error('❌ Failed to build service worker:', error)
    process.exit(1)
  }
}

buildServiceWorker()
