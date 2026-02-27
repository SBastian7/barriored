import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

export async function GET() {
  try {
    // Read the service worker file from the public directory
    const filePath = join(process.cwd(), 'public', 'service-worker.js')
    const fileContents = await readFile(filePath, 'utf8')

    // Return the file with proper headers
    return new NextResponse(fileContents, {
      status: 200,
      headers: {
        'Content-Type': 'application/javascript',
        'Service-Worker-Allowed': '/',
        'Cache-Control': 'public, max-age=0, must-revalidate',
      },
    })
  } catch (error) {
    console.error('Error serving service worker:', error)
    return new NextResponse('Service Worker not found', { status: 404 })
  }
}

// Disable static optimization for this route
export const dynamic = 'force-dynamic'
