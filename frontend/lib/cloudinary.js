// Uploads a file straight from the browser to Cloudinary using an unsigned upload preset.
// Setup: create a free account at https://cloudinary.com, then Settings → Upload →
// add an "Unsigned" upload preset. Put the cloud name + preset name in frontend/.env.local as
// NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET.

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export function isCloudinaryConfigured() {
  return Boolean(CLOUD_NAME && UPLOAD_PRESET);
}

export async function uploadImageToCloudinary(file, onProgress) {
  return uploadToCloudinary(file, "image", "techarcade/products", onProgress);
}

// For review/RMA short video clips (5-10 seconds recommended to keep uploads fast).
export async function uploadVideoToCloudinary(file, onProgress) {
  return uploadToCloudinary(file, "video", "techarcade/videos", onProgress);
}

function uploadToCloudinary(file, resourceType, folder, onProgress) {
  if (!isCloudinaryConfigured()) {
    throw new Error(
      "Cloudinary is not set up yet. Add NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET to frontend/.env.local"
    );
  }

  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", folder);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (e) => {
      if (onProgress && e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      try {
        const res = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && res.secure_url) {
          resolve({ url: res.secure_url, publicId: res.public_id });
        } else {
          reject(new Error(res.error?.message || "Upload failed."));
        }
      } catch {
        reject(new Error("Upload failed."));
      }
    };
    xhr.onerror = () => reject(new Error("Network error while uploading."));
    xhr.send(formData);
  });
}
