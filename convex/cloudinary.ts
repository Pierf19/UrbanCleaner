"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";
import crypto from "crypto";

interface CloudinaryResult {
  secure_url: string;
  public_id: string;
}

export const uploadImage = action({
  args: {
    imageBase64: v.string(),
    mimeType: v.string(),
  },
  handler: async (_ctx, args): Promise<{ url: string }> => {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error("Cloudinary credentials not set in Convex Dashboard");
    }

    // Generate timestamp and signature server-side
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = crypto
      .createHash("sha1")
      .update(`timestamp=${timestamp}${apiSecret}`)
      .digest("hex");

    // Determine resource type based on mime type
    const resourceType = args.mimeType.startsWith("video/") ? "video" : "image";

    // Convert base64 to data URL for Cloudinary
    const dataUrl = `data:${args.mimeType};base64,${args.imageBase64}`;

    // Create form data for upload
    const formData = new URLSearchParams();
    formData.append("file", dataUrl);
    formData.append("api_key", apiKey);
    formData.append("timestamp", timestamp.toString());
    formData.append("signature", signature);
    formData.append("cloud_name", cloudName);
    formData.append("resource_type", resourceType);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString(),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Cloudinary upload failed: ${errText}`);
    }

    const result: CloudinaryResult = await response.json();
    return { url: result.secure_url };
  },
});