import { action } from "./_generated/server";
import { v } from "convex/values";

export const sendWhatsApp = action({
  args: {
    score: v.number(),
    category: v.string(),
    recommendation: v.string(),
    phone: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.FONNTE_API_KEY;
    if (!apiKey) {
      throw new Error("FONNTE_API_KEY not set");
    }

    const message = `📊 LAPORAN KEBERSIHAN JALAN

Skor: ${args.score}%
Kategori: ${args.category}

Rekomendasi:
${args.recommendation}`;

    // Fonnte accepts form data or json, usually json works if header is set or x-www-form-urlencoded
    const response = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        "Authorization": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        target: args.phone,
        message: message,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Fonnte Error:", errText);
      throw new Error("Failed to send WhatsApp message");
    }

    const result = await response.json();
    return result;
  },
});
