"use client";

import React, { useRef, useState } from "react";
import { X, Upload, Loader2 } from "lucide-react";
import { uploadImageToCloudinary, isCloudinaryConfigured } from "../lib/cloudinary.js";

export default function ImageUploader({ images, onChange }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  async function handleFiles(files) {
    setError("");
    if (!isCloudinaryConfigured()) {
      setError("Cloudinary is not configured yet — see README.md 'Cloudinary setup'.");
      return;
    }
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const result = await uploadImageToCloudinary(file, setProgress);
        onChange([...images, result.url]);
      }
    } catch (err) {
      setError(err.message || "Upload failed.");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  function removeImage(url) {
    onChange(images.filter((i) => i !== url));
  }

  return (
    <div>
      <span className="text-sm text-muted-foreground block mb-1">Product images</span>
      <div className="flex flex-wrap gap-2 mb-2">
        {images.map((url) => (
          <div key={url} className="relative w-16 h-16 rounded border border-border overflow-hidden group">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removeImage(url)}
              className="absolute inset-0 bg-background/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
            >
              <X className="h-4 w-4 text-destructive" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-16 h-16 rounded border border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          <span className="text-[10px] mt-1">{uploading ? `${progress}%` : "Add"}</span>
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => e.target.files?.length && handleFiles(e.target.files)}
      />
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
