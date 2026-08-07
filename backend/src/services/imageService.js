import multer from 'multer';
import sharp from 'sharp';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import { ENV } from '../config/env.js';

// Multer Memory Storage setup
const storage = multer.memoryStorage();

// Multer Filter (Images only & <10MB)
export const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, WebP) are allowed'), false);
    }
  }
});

// Configure Cloudinary if keys present
if (ENV.CLOUDINARY_CLOUD_NAME && ENV.CLOUDINARY_CLOUD_NAME !== 'mock_cloud') {
  cloudinary.config({
    cloud_name: ENV.CLOUDINARY_CLOUD_NAME,
    api_key: ENV.CLOUDINARY_API_KEY,
    api_secret: ENV.CLOUDINARY_API_SECRET
  });
}

// Process Image Function: Sharp resize to 512x512 -> WebP Q80 -> Cloudinary / Local
export const processAndUploadImage = async (fileBuffer, fileNameHint = 'player') => {
  try {
    // 1. Sharp image pipeline: resize 512x512, webp quality 80
    const processedWebpBuffer = await sharp(fileBuffer)
      .resize(512, 512, { fit: 'cover' })
      .toFormat('webp', { quality: 80 })
      .toBuffer();

    // 2. If Cloudinary configured, try streaming to Cloudinary
    let cloudinaryUrl = null;
    if (ENV.CLOUDINARY_CLOUD_NAME && ENV.CLOUDINARY_CLOUD_NAME !== 'mock_cloud') {
      try {
        cloudinaryUrl = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: 'franchise_auction_players',
              format: 'webp',
              public_id: `${fileNameHint}_${Date.now()}`
            },
            (error, result) => {
              if (error) return reject(error);
              resolve(result.secure_url);
            }
          );
          stream.end(processedWebpBuffer);
        });
      } catch (clErr) {
        // Cloudinary unavailable/failed (bad keys, offline, etc.) — fall through
        // to local storage so the player's image is still saved.
        console.warn('[imageService] Cloudinary upload failed, using local storage:', clErr.message);
      }
    }

    // 3. Fallback: if Cloudinary failed or isn't configured, store locally
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    if (cloudinaryUrl) return cloudinaryUrl;

    const fileName = `${fileNameHint}_${Date.now()}.webp`;
    const filePath = path.join(uploadsDir, fileName);
    await fs.promises.writeFile(filePath, processedWebpBuffer);

    return `/uploads/${fileName}`;
  } catch (error) {
    console.error('Image Processing Error:', error);
    // On failure, return null so the client renders its generic footballer
    // placeholder (original SVG) rather than a copyrighted stock photo.
    return null;
  }
};
