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

// True only when REAL Cloudinary credentials are present. The literal
// "mock_cloud" placeholder (dev default) is treated as NOT configured so the
// platform never pretends to have cloud persistence when it does not.
export const isCloudinaryConfigured = () =>
  Boolean(
    ENV.CLOUDINARY_CLOUD_NAME &&
    ENV.CLOUDINARY_API_KEY &&
    ENV.CLOUDINARY_API_SECRET &&
    ENV.CLOUDINARY_CLOUD_NAME !== 'mock_cloud'
  );

if (isCloudinaryConfigured()) {
  cloudinary.config({
    cloud_name: ENV.CLOUDINARY_CLOUD_NAME,
    api_key: ENV.CLOUDINARY_API_KEY,
    api_secret: ENV.CLOUDINARY_API_SECRET
  });
}

// Upload a processed buffer to Cloudinary and resolve { url, publicId } from
// the uploader result. Rejects on any Cloudinary error.
const uploadBufferToCloudinary = (buffer, publicId) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'franchise_auction_players',
        format: 'webp',
        public_id: publicId
      },
      (error, result) => {
        if (error || !result) return reject(error || new Error('Empty Cloudinary upload result'));
        // secure_url is the permanent HTTPS delivery URL — safe to persist in
        // the database and to render from ANY device without this server up.
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(buffer);
  });

// Process Image Function: Sharp resize to 512x512 -> WebP Q80 -> Cloudinary / Local
//
// Returns a persistent descriptor object:
//   { url, publicId }
//     - url      → value stored in the DB imageUrl field (Cloudinary
//                  secure_url in production; local /uploads path ONLY in
//                  unconfigured dev mode).
//     - publicId → Cloudinary asset id for lifecycle cleanup (null for local).
//
// Persistence guarantee: when Cloudinary IS configured, a failed upload NEVER
// silently falls back to a local file — that is what produced images bound to
// one machine. Instead it returns { url: null } so callers keep whatever
// placeholder behavior they already had (null imageUrl → generic artwork).
export const processAndUploadImage = async (fileBuffer, fileNameHint = 'player') => {
  try {
    // 1. Sharp image pipeline: resize 512x512, webp quality 80
    const processedWebpBuffer = await sharp(fileBuffer)
      .resize(512, 512, { fit: 'cover' })
      .toFormat('webp', { quality: 80 })
      .toBuffer();

    // 2. Cloudinary (production path — permanent, globally reachable URL)
    if (isCloudinaryConfigured()) {
      try {
        return await uploadBufferToCloudinary(processedWebpBuffer, `${fileNameHint}_${Date.now()}`);
      } catch (clErr) {
        console.error('[imageService] Cloudinary upload FAILED — refusing to store a device-bound local URL.', clErr?.message || clErr);
        // Signal "no image" instead of persisting a localhost-only path.
        return { url: null, publicId: null };
      }
    }

    // 3. Dev-only fallback: no real Cloudinary credentials configured.
    //    Files live under backend/public/uploads and are served by THIS server
    //    process only — fine for local development, never for production.
    console.warn(
      '[imageService] Cloudinary NOT configured (set CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET). ' +
      'Storing image LOCALLY — it will NOT be visible from other devices or after deployment.'
    );
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const fileName = `${fileNameHint}_${Date.now()}.webp`;
    const filePath = path.join(uploadsDir, fileName);
    await fs.promises.writeFile(filePath, processedWebpBuffer);

    return { url: `/uploads/${fileName}`, publicId: null };
  } catch (error) {
    console.error('Image Processing Error:', error);
    // On failure, return null url so the client renders its generic footballer
    // placeholder (original SVG) rather than a broken/persistent-broken image.
    return { url: null, publicId: null };
  }
};

// Delete a Cloudinary asset permanently by public_id.
// Best-effort + idempotent-safe: missing/invalid ids and Cloudinary outages are
// logged and swallowed so cleanup can never break a business transaction that
// already succeeded. Local /uploads paths are ignored (not cloud assets).
export const deleteCloudinaryAsset = async (publicId) => {
  try {
    if (!publicId || typeof publicId !== 'string') return false;
    if (!isCloudinaryConfigured()) {
      console.warn(`[imageService] Skipped Cloudinary destroy for '${publicId}' — Cloudinary not configured.`);
      return false;
    }
    const result = await cloudinary.uploader.destroy(publicId);
    if (result?.result === 'not found') {
      console.warn(`[imageService] Cloudinary asset '${publicId}' already absent.`);
      return true; // nothing left to clean — treat as success
    }
    console.log(`[imageService] Cloudinary asset '${publicId}' destroyed.`);
    return true;
  } catch (err) {
    // Never throw from cleanup — log loudly so operators can retry manually.
    console.error(`[imageService] Failed to destroy Cloudinary asset '${publicId}':`, err?.message || err);
    return false;
  }
};
