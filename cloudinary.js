/* ============================================================
   Cloudinary Image Storage Adapter
   Handles persistent cloud image storage for the portfolio.
   ============================================================ */

"use strict";

const cloudinary = require("cloudinary").v2;

let configured = false;

function configureCloudinary() {
  if (configured) return;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    console.warn("  Warning: Cloudinary not configured. Images will use local storage.");
    console.warn("  Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET");
    return;
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret
  });
  configured = true;
  console.log("  Cloudinary configured successfully");
}

function isConfigured() {
  return configured;
}

/**
 * Build a sanitized public_id that preserves the original file name.
 */
function sanitizePublicId(name) {
  return String(name || "")
    .replace(/\.[^.]+$/, "")
    .replace(/[^\w-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "file";
}

/**
 * Upload a resource preserving the original name. Never overwrites:
 * on a conflict the name is suffixed (-2, -3, ...) so existing files stay intact.
 */
async function uploadUnique(uploader, dataUrl, folder, name, resourceType) {
  const base = sanitizePublicId(name);
  let attempt = base;
  let suffix = 1;
  for (;;) {
    try {
      const result = await uploader(dataUrl, {
        folder: folder,
        resource_type: resourceType,
        public_id: attempt,
        overwrite: false
      });
      return {
        url: result.secure_url,
        publicId: result.public_id
      };
    } catch (err) {
      if (!/already exists|exist|duplicate|public_id/i.test(err.message || "") || suffix > 200) {
        throw err;
      }
      attempt = base + "-" + (++suffix);
    }
  }
}

/**
 * Upload an image to Cloudinary
 * @param {string} dataUrl - Base64 data URL (data:image/png;base64,...)
 * @param {string} folder - Cloudinary folder (e.g., "portfolio/image")
 * @param {string} originalName - Original filename for reference
 * @returns {Promise<{url: string, publicId: string}>}
 */
async function uploadImage(dataUrl, folder = "portfolio/image", originalName = "image") {
  if (!configured) {
    throw new Error("Cloudinary not configured");
  }

  return uploadUnique(cloudinary.uploader.upload, dataUrl, folder, originalName, "image");
}

/**
 * Upload a video to Cloudinary
 * @param {string} dataUrl - Base64 data URL (data:video/mp4;base64,...)
 * @param {string} folder - Cloudinary folder
 * @param {string} originalName - Original filename
 * @returns {Promise<{url: string, publicId: string}>}
 */
async function uploadVideo(dataUrl, folder = "portfolio/videos", originalName = "video") {
  if (!configured) {
    throw new Error("Cloudinary not configured");
  }

  return uploadUnique(cloudinary.uploader.upload, dataUrl, folder, originalName, "video");
}

/**
 * Upload a PDF to Cloudinary
 * @param {string} dataUrl - Base64 data URL (data:application/pdf;base64,...)
 * @param {string} folder - Cloudinary folder
 * @param {string} originalName - Original filename
 * @returns {Promise<{url: string, publicId: string}>}
 */
async function uploadPDF(dataUrl, folder = "portfolio/documents", originalName = "resume") {
  if (!configured) {
    throw new Error("Cloudinary not configured");
  }

  return uploadUnique(cloudinary.uploader.upload, dataUrl, folder, originalName, "raw");
}

/**
 * Delete an image from Cloudinary
 * @param {string} publicId - The public_id of the resource
 * @param {string} resourceType - "image", "video", or "raw"
 */
async function deleteFile(publicId, resourceType = "image") {
  if (!configured || !publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (e) {
    console.error("Failed to delete from Cloudinary:", e.message);
  }
}

/**
 * Extract Cloudinary public_id from a URL
 */
function extractPublicId(url) {
  if (!url || typeof url !== "string") return null;
  const match = url.match(/\/v\d+\/(.+?)\.\w+$/);
  return match ? match[1] : null;
}

/**
 * Check if a URL is a Cloudinary URL
 */
function isCloudinaryUrl(url) {
  return typeof url === "string" && url.includes("cloudinary.com");
}

module.exports = {
  configureCloudinary,
  isConfigured,
  uploadImage,
  uploadVideo,
  uploadPDF,
  deleteFile,
  extractPublicId,
  isCloudinaryUrl
};
