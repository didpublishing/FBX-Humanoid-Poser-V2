import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeSkeleton = async (boneNames: string[]): Promise<AIAnalysisResult> => {
  const modelId = "gemini-2.5-flash";
  
  const prompt = `
    I have a 3D character model with the following bone hierarchy names:
    ${boneNames.slice(0, 50).join(', ')}... (list truncated for brevity)

    1. Identify what kind of creature or character this likely is based on the bone naming convention (e.g., Mixamo, Humanoid, Animal).
    2. Suggest 3 dynamic poses I could try to create with this rig.
  `;

  const response = await ai.models.generateContent({
    model: modelId,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          description: {
            type: Type.STRING,
            description: "A brief description of the character type based on bones."
          },
          poseSuggestions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING, description: "Which bones to move and how." }
              }
            }
          }
        }
      }
    }
  });

  const text = response.text;
  if (!text) {
    throw new Error("No response from Gemini");
  }

  return JSON.parse(text) as AIAnalysisResult;
};
