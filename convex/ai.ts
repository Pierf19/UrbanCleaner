import { action } from "./_generated/server";
import { v } from "convex/values";

export const analyzeImage = action({
  args: {
    imageBase64: v.string(),
    mimeType: v.string(),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.MISTRAL_API_KEY;
    
    if (!apiKey) {
      throw new Error("MISTRAL_API_KEY not set in Convex Dashboard");
    }

    const promptText = `Anda adalah ahli kebersihan lingkungan Indonesia. Analisis gambar jalan ini dan nilainya tingkat kotor berdasarkan jumlah sampah, kondisi lingkungan, dan kerusakan infrastruktur.
    
PENTING: Jawab dalam bahasa Indonesia dengan format JSON saja:
{
  "score": number, // 0-100 (semakin rendah semakin kotor)
  "category": "bersih" | "sedang" | "kotor", // kategori tingkat kebersihan
  "recommendation": string // rekomendasi tindakan dalam bahasa Indonesia
}

Panduan penilaian:
- Score 70-100: Bersih - jalan bersih, tidak ada sampah terlihat
- Score 40-69: Sedang - ada sedikit sampah, masih tertangani
- Score 0-39: Kotor - banyak sampah/tidak layak, butuh tindakan segera`;

    const response = await fetch(
      "https://api.mistral.ai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "pixtral-12b-2409",
          response_format: { type: "json_object" },
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: promptText },
                { type: "image_url", image_url: { url: `data:${args.mimeType};base64,${args.imageBase64}` } }
              ]
            }
          ]
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Mistral Error:", errText);
      
      if (response.status === 429 || errText.includes("quota") || errText.includes("Rate limit")) {
        console.log("Menggunakan Fallback karena API Quota Habis...");
        const score = Math.floor(Math.random() * 60) + 20;
        const category = score >= 70 ? "sedang" : score >= 40 ? "sedang" : "kotor";
        const recommendations: Record<string, string> = {
          bersih: "Jalan dalam kondisi baik. Pertahankan dengan perawatan rutin.",
          sedang: "Ada beberapa sampah. Segera bersihkan untuk mencegah penumpukan.",
          kotor: "Kondisi kritis! Segala bentuk tim pembersih diperlukan segera ke lokasi."
        };
        return {
          score,
          category,
          recommendation: `${recommendations[category]} (Hasil simulasi karena API error)`
        };
      }

      throw new Error(`Mistral API Error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const resultText = data.choices[0]?.message?.content;
    
    if (!resultText) {
      throw new Error("Invalid response from Mistral");
    }

    try {
      const parsed = JSON.parse(resultText.trim());
      
      // Handle recommendation - bisa object atau string
      let recText = parsed.recommendation;
      if (typeof recText === 'object' && recText !== null) {
        // Flatten object ke string
        recText = Object.entries(recText)
          .map(([key, value]) => `• ${key.replace(/_/g, ' ')}: ${value}`)
          .join('\n');
      }
      
      // Default jika recommendation kosong/null/undefined
      if (!recText) {
        recText = "Kondisi jalan perlu diperbaiki. Lakukan pembersihan dan perawatan rutin.";
      }
      
      return {
        score: parsed.score,
        category: parsed.category,
        recommendation: recText,
      };
    } catch (e) {
      console.error("Failed to parse Mistral JSON:", e, "Raw:", resultText);
      throw new Error("Failed to parse output as JSON: " + resultText);
    }
  },
});