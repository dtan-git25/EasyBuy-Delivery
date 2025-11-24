import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Determine environment-specific folder prefix
const ENV = process.env.NODE_ENV === 'production' ? 'prod' : 'dev';
const FOLDER_PREFIX = `easybuydelivery-${ENV}`;

// Helper to get folder paths
export const getCloudinaryFolder = {
  logos: () => `${FOLDER_PREFIX}/logos`,
  merchants: (merchantId: string) => `${FOLDER_PREFIX}/merchants/${merchantId}`,
  menuItems: (merchantId: string) => `${FOLDER_PREFIX}/menu_items/${merchantId}`,
  riderDocuments: (riderId: string) => `${FOLDER_PREFIX}/riders/${riderId}/documents`,
};

// Helper to extract public_id from Cloudinary URL
export function extractPublicId(url: string): string | null {
  if (!url || !url.includes('res.cloudinary.com')) {
    return null;
  }
  
  try {
    const parts = url.split('/upload/');
    if (parts.length < 2) return null;
    
    const pathAfterUpload = parts[1];
    const pathParts = pathAfterUpload.split('/');
    
    // Remove version if present (starts with 'v' followed by numbers)
    const startIndex = pathParts[0].match(/^v\d+$/) ? 1 : 0;
    
    // Join remaining parts and remove file extension
    const publicIdWithExt = pathParts.slice(startIndex).join('/');
    const publicId = publicIdWithExt.replace(/\.[^/.]+$/, '');
    
    return publicId;
  } catch (error) {
    console.error('Error extracting public_id from URL:', error);
    return null;
  }
}

// Helper to delete image from Cloudinary
export async function deleteCloudinaryImage(url: string): Promise<boolean> {
  const publicId = extractPublicId(url);
  if (!publicId) {
    console.warn('Could not extract public_id from URL:', url);
    return false;
  }
  
  try {
    await cloudinary.uploader.destroy(publicId);
    console.log(`Deleted image from Cloudinary: ${publicId}`);
    return true;
  } catch (error) {
    console.error(`Failed to delete image from Cloudinary (${publicId}):`, error);
    return false;
  }
}

// Validate Cloudinary configuration
export function validateCloudinaryConfig(): boolean {
  const isConfigured = !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
  
  if (!isConfigured) {
    console.warn('Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables.');
  }
  
  return isConfigured;
}

export { cloudinary };
