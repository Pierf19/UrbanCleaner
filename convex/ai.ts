import { action } from "./_generated/server";
import { v } from "convex/values";

export const analyzeImage = action({
  args: {
    imageBase64: v.string(), // Provide image as base64 without data URI prefix
    mimeType: v.string(),
  },
  handler: async (ctx, args) => {
    // API KEY is strictly read from Environment Variable for Security
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY not set in Convex Dashboard");
    }

    const promptText = `Analisis gambar jalan ini dan nilai tingkat kebersihannya berdasarkan jumlah sampah dan kondisi lingkungan. 
Output JSON strictly in this format:
{
  "cleanliness_score": number, // 0 to 100
  "category": string, // e.g. "Sangat Kotor", "Kotor", "Bersih", "Sangat Bersih"
  "recommendation": string
}`;

    const response = await fetch(
      `https://api.openai.com/v1/chat/completions`,
      {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini", // GPT-4o-mini is fast, cheap, and supports vision natively
          response_format: { type: "json_object" },
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: promptText },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${args.mimeType};base64,${args.imageBase64}`
                  }
                }
              ]
            }
          ]
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenAI Error:", errText);
      
      // FALLBACK SIMULASI BILA KUOTA HABIS
      if (response.status === 429 || errText.includes("insufficient_quota")) {
        console.log("Menggunakan Fallback Simulasi karena Quota API Habis...");
        const randomScore = Math.floor(Math.random() * 60) + 20; // Skor acak 20-80
        return {
          score: randomScore,
          category: randomScore > 50 ? "Banyak Sampah Ringan (Simulasi Fallback)" : "Sangat Kotor (Simulasi Fallback)",
          recommendation: "PERHATIAN: Ini adalah hasil simulasi. API Key Anda tertolak oleh server Pusat (karena kuota/billing nol). Namun secara fungsional, jika ini gambar asli, disarankan segera mengerahkan tim pembersih jalan ke lokasi."
        };
      }

      throw new Error(`OpenAI API Error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const resultText = data.choices[0]?.message?.content;
    
    if (!resultText) {
      throw new Error("Invalid response format from OpenAI");
    }

    try {
      const parsed = JSON.parse(resultText.trim());
      return {
        score: parsed.cleanliness_score,
        category: parsed.category,
        recommendation: parsed.recommendation,
      };
    } catch (e) {
      console.error("Failed to parse OpenAI JSON:", e, "Raw output:", resultText);
      throw new Error("Failed to parse OpenAI output as JSON: " + resultText);
    }
  },
});
