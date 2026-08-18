"use client";

import React, { useRef, useState } from "react";
import { Video, X, Loader2 } from "lucide-react";
import { uploadVideoToCloudinary } from "../lib/cloudinary.js";

export default function VideoUploader({ video, onChange }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  async function handleFile(file) {
    setError("");
    setUploading(true);
    try {
      const result = await uploadVideoToCloudinary(file, setProgress);
      onChange(result.url);
    } catch (err) {
      setError(err.message || "Upload failed.");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  if (video) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <video src={video} className="w-20 h-14 rounded border border-border object-cover" muted />
        <button type="button" onClick={() => onChange(null)} className="text-destructive text-xs hover:underline">
          Remove video
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-2 text-xs border border-dashed border-border rounded-md px-3 py-2 text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-50"
      >
        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Video className="h-3.5 w-3.5" />}
        {uploading ? `Uploading… ${progress}%` : "Add a short video (optional)"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        hidden
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      {error && <p className="text-destructive text-xs mt-1">{error}</p>}
    </div>
  );
}
