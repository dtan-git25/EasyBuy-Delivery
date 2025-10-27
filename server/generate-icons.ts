import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

interface IconSize {
  size: number;
  purpose?: string;
}

const ICON_SIZES: IconSize[] = [
  { size: 192, purpose: 'any' },
  { size: 512, purpose: 'any' },
  { size: 192, purpose: 'maskable' },
  { size: 512, purpose: 'maskable' },
];

export async function generatePWAIcons(): Promise<void> {
  try {
    const logoPath = path.join(process.cwd(), 'uploads', 'logo');
    const publicIconsPath = path.join(process.cwd(), 'client', 'public', 'icons');

    // Find the logo file (could be .png, .jpg, .jpeg, etc.)
    const files = await fs.readdir(logoPath);
    const logoFile = files.find(file => file.startsWith('logo.'));
    
    if (!logoFile) {
      console.log('No admin logo found, skipping icon generation');
      return;
    }

    const sourceLogoPath = path.join(logoPath, logoFile);
    
    // Ensure icons directory exists
    await fs.mkdir(publicIconsPath, { recursive: true });

    // Generate icons
    for (const { size, purpose } of ICON_SIZES) {
      const outputFileName = purpose === 'maskable' 
        ? `icon-${size}x${size}-maskable.png`
        : `icon-${size}x${size}.png`;
      
      const outputPath = path.join(publicIconsPath, outputFileName);

      if (purpose === 'maskable') {
        // For maskable icons, add padding (safe zone)
        const padding = Math.floor(size * 0.1); // 10% padding
        const iconSize = size - (padding * 2);
        
        await sharp(sourceLogoPath)
          .resize(iconSize, iconSize, {
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 0 }
          })
          .extend({
            top: padding,
            bottom: padding,
            left: padding,
            right: padding,
            background: { r: 255, g: 255, b: 255, alpha: 1 }
          })
          .png()
          .toFile(outputPath);
      } else {
        // Regular icons
        await sharp(sourceLogoPath)
          .resize(size, size, {
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 0 }
          })
          .png()
          .toFile(outputPath);
      }

      console.log(`Generated PWA icon: ${outputFileName}`);
    }

    // Generate favicon (16x16 and 32x32)
    await sharp(sourceLogoPath)
      .resize(32, 32, { fit: 'contain' })
      .png()
      .toFile(path.join(publicIconsPath, 'favicon-32x32.png'));

    await sharp(sourceLogoPath)
      .resize(16, 16, { fit: 'contain' })
      .png()
      .toFile(path.join(publicIconsPath, 'favicon-16x16.png'));

    // Generate Apple touch icon (180x180)
    await sharp(sourceLogoPath)
      .resize(180, 180, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toFile(path.join(publicIconsPath, 'apple-touch-icon.png'));

    console.log('PWA icons generated successfully from admin logo');
  } catch (error) {
    console.error('Error generating PWA icons:', error);
    throw error;
  }
}
