import { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from "@google/genai";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
    const { clientName, subPackageId, extraInfo, images } = req.body;

    const prompt = `
      Eres el Social Media Manager de DigiMarket RD.
      Crea una tanda de 4 posts para las redes sociales del cliente: "${clientName}".
      Información adicional: "${extraInfo}".
      
      Para cada post debes generar:
      1. El texto (copy) persuasivo con emojis.
      2. Los hashtags recomendados.
      3. Un prompt detallado en INGLÉS para generar la imagen del post en una IA (ej. "professional photography of a coffee cup on a wooden table, cinematic lighting").
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            strategy: { type: Type.STRING, description: "Breve resumen de la estrategia" },
            posts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  copy: { type: Type.STRING },
                  hashtags: { type: Type.STRING },
                  imagePrompt: { type: Type.STRING }
                },
                required: ["copy", "hashtags", "imagePrompt"]
              }
            }
          },
          required: ["strategy", "posts"]
        }
      }
    });

    const socialData = JSON.parse(response.text || "{}");

    // Generate Images
    const generatedPosts = [];
    for (let i = 0; i < socialData.posts.length; i++) {
      const post = socialData.posts[i];
      const encodedPrompt = encodeURIComponent(post.imagePrompt + " high quality photography, social media post, professional");
      const seed = Math.floor(Math.random() * 100000);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?seed=${seed}&width=1080&height=1080&nologo=true`;
      generatedPosts.push({ ...post, imageUrl });
    }

    res.json({ success: true, data: { strategy: socialData.strategy, posts: generatedPosts } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}
