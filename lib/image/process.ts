import sharp from 'sharp'

export async function processImage(
  buffer: Buffer,
  maxWidth: number,
  quality = 80
): Promise<Buffer> {
  return sharp(buffer)
    .resize({ width: maxWidth, withoutEnlargement: true })
    .webp({ quality })
    .toBuffer()
}
