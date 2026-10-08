import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("❌ GEMINI_API_KEY is not set in .env or .env.local");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

async function checkModels() {
  console.log("🔍 Checking available models for your API key...\n");

  try {
    const response = await ai.models.list();
    console.log("=== Active Models On Your Key ===");

    for await (const model of response) {
      // Filter to models that support text generation
      const methods =
        model.supportedActions || model.supportedGenerationMethods || [];
      const canGenerate =
        Array.isArray(methods) &&
        (methods.includes("generateContent") || methods.length === 0);

      if (canGenerate) {
        console.log(`• ${model.name.replace("models/", "")}`);
      }
    }
    console.log("\n✅ Done.");
  } catch (err) {
    console.error("❌ Error listing models:", err?.message || err);
  }
}

checkModels();
