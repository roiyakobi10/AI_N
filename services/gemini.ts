
import { GoogleGenAI, Type } from "@google/genai";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async getMissionInsight(goal: string, context: string): Promise<string> {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `אני חוקר את יעד הניצחון: "${goal}". 
                   הקשר: ${context}
                   תן לי תובנה קצרה וממוקדת (עד 3 משפטים) על איך היעד הזה תורם לעתיד של ארגון לומד ומוביל בעידן ה-AI. 
                   ענה בעברית מקצועית ומעוררת השראה, ללא שימוש במילה "אסטרטגיה".`,
        config: {
          temperature: 0.7,
          topP: 0.95,
        }
      });
      return response.text || "לא ניתן היה להפיק תובנה כעת.";
    } catch (error) {
      console.error("Gemini API Error:", error);
      return "שגיאה בחיבור ליועץ ה-AI המקצועי.";
    }
  }

  async generateBackground(prompt: string): Promise<string | null> {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: prompt }]
        },
        config: {
          imageConfig: {
            aspectRatio: "4:3"
          }
        }
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
      return null;
    } catch (error) {
      console.error("Image Generation Error:", error);
      return null;
    }
  }
}

export const geminiService = new GeminiService();