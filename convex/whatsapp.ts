import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

interface UserDoc {
  _id: string;
  phone: string;
  name: string;
  active: boolean;
}

interface ActionResult {
  status: string;
  sent?: number;
}

export const sendWhatsApp = action({
  args: {
    score: v.number(),
    category: v.string(),
    recommendation: v.string(),
    imageUrl: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<ActionResult> => {
    const fonnteToken = process.env.FONNTE_TOKEN;
    if (!fonnteToken) {
      throw new Error("FONNTE_TOKEN not set in Convex Dashboard");
    }

    // @ts-ignore
    const allUsers: UserDoc[] = await ctx.runQuery(api.reports.getAllUsers);
    const activeUsers = allUsers.filter((u) => u.active);
    
    if (activeUsers.length === 0) {
      return { status: "no_active_users", sent: 0 };
    }

    const targetNumbers = activeUsers.map((u) => u.phone).join(",");
    
    const locationText = args.latitude && args.longitude 
      ? `\n📍 Lokasi: https://maps.google.com/?q=${args.latitude},${args.longitude}`
      : "\n📍 Lokasi: Tidak tersedia";

    const imageText = args.imageUrl 
      ? `\n📷 Foto: ${args.imageUrl}`
      : "";

    const message = `🚨 PERINGATAN KEBERSIHAN JALAN

Skor: ${args.score}% - Status: ${args.category === "kotor" ? "KRITIS" : "AMAN"}
${locationText}
${imageText}

Rekomendasi:
${args.recommendation}

---
Dilaporkan via UrbanClean AI`;

    // Fonnte format: POST /send with form-data and Authorization header
    const formData = new URLSearchParams();
    formData.append("target", targetNumbers);
    formData.append("message", message);
    if (args.imageUrl) {
      formData.append("url", args.imageUrl);
    }

    const response = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        "Authorization": fonnteToken,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to send WhatsApp: ${errText}`);
    }

    await response.json();
    return { status: "success", sent: activeUsers.length };
  },
});

export const sendWhatsAppSingle = action({
  args: {
    score: v.number(),
    category: v.string(),
    recommendation: v.string(),
    phone: v.string(),
    imageUrl: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
  },
  handler: async (_ctx, args): Promise<ActionResult> => {
    const fonnteToken = process.env.FONNTE_TOKEN;
    if (!fonnteToken) {
      throw new Error("FONNTE_TOKEN not set in Convex Dashboard");
    }

    const locationText = args.latitude && args.longitude 
      ? `\n📍 Lokasi: https://maps.google.com/?q=${args.latitude},${args.longitude}`
      : "\n📍 Lokasi: Tidak tersedia";

    const imageText = args.imageUrl 
      ? `\n📷 Foto: ${args.imageUrl}`
      : "";

    const message = `📊 LAPORAN KEBERSIHAN JALAN

Skor: ${args.score}% (${args.category})
${locationText}
${imageText}

Rekomendasi:
${args.recommendation}

---
UrbanClean AI`;

    // Fonnte format: POST /send with form-data and Authorization header
    const formData = new URLSearchParams();
    formData.append("target", args.phone);
    formData.append("message", message);
    if (args.imageUrl) {
      formData.append("url", args.imageUrl);
    }

    const response = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        "Authorization": fonnteToken,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to send WhatsApp: ${errText}`);
    }

    await response.json();
    return { status: "success" };
  },
});