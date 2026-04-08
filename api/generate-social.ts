import { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from "@google/genai";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
    const { clientName, extraInfo, images, subPackage } = req.body;
    const subPackageId = subPackage?.id;

    // Determinar cantidad de posts y reels según el paquete contratado
    let numPosts = 4; // default
    if (subPackageId === 'sm-1') numPosts = 8;
    else if (subPackageId === 'sm-2') numPosts = 15;
    else if (subPackageId === 'sm-3') numPosts = 20;
    else if (subPackageId === 'sm-4') numPosts = 25;

    const packageContext = subPackage ? `Paquete: ${subPackage.name}. Características: ${subPackage.features.join(', ')}.` : '';

    console.log(`Generating ${numPosts} social media items for package ${subPackageId}`);

    // Convert images to Gemini parts if they exist
    const imageParts = (images || []).map((img: any) => {
      const imageString = typeof img === 'string' ? img : img?.url;
      if (!imageString || typeof imageString !== 'string') {
        throw new Error('Formato de imagen no válido');
      }
      const base64Data = imageString.includes(',') ? imageString.split(',')[1] : imageString;
      const mimeType = imageString.startsWith('data:') ? imageString.split(':')[1].split(';')[0] : 'image/jpeg';
      return {
        inlineData: {
          data: base64Data,
          mimeType
        }
      };
    });

    // Función auxiliar para generar social sin imágenes si hay problemas
    const generateSocialWithoutImages = async () => {
      console.log('Generating social media posts without images due to size limits');
      const simplePrompt = `
        Eres el Social Media Manager de DigiMarket RD.
        Crea una tanda de EXACTAMENTE ${numPosts} publicaciones para las redes sociales del cliente: "${clientName}".
        ${packageContext}
        Información adicional: "${extraInfo}".

        IMPORTANTE: Si el paquete incluye Reels y Posts, alterna la creación de ambos.

        Para cada publicación debes generar:
        1. El texto (copy) persuasivo con emojis.
        2. Los hashtags recomendados.
        3. Un prompt detallado en INGLÉS para generar la imagen (solo si es post de imagen).

        Responde SOLO con el JSON, sin explicaciones ni markdown.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: simplePrompt }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              strategy: { type: Type.STRING },
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

      return JSON.parse(response.text || "{}");
    };

    const prompt = `
      Eres el Social Media Manager de DigiMarket RD.
      Crea una tanda de EXACTAMENTE ${numPosts} publicaciones (mezcla de Posts y Reels) para el cliente: "${clientName}".
      ${packageContext}
      Información adicional: "${extraInfo}".

      TU PRIORIDAD MÁXIMA es mantener EXACTAMENTE el mismo estilo visual en TODAS las publicaciones basándote en las imágenes provistas.

      Para cada publicación debes generar un JSON con:
      1. copy: Texto persuasivo
      2. hashtags: Recomendados
      3. imagePrompt: El Prompt en inglés para generar la imagen visual adaptada al post. (Ejemplo: modern corporate office photography...).
      
      IMPORTANTE: No te detengas hasta cumplir la meta de ${numPosts} publicaciones detalladas que indica el paquete.
    `;

    let socialData;
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              ...imageParts
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              strategy: { type: Type.STRING, description: "Breve resumen de la estrategia y contenido" },
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

      try {
        socialData = JSON.parse(response.text || "{}");
      } catch (parseError) {
        console.error('Error parsing Gemini response as JSON:', parseError);
        socialData = await generateSocialWithoutImages();
      }
    } catch (error) {
      console.warn('Error with images in social media generation, trying without images:', error);
      socialData = await generateSocialWithoutImages();
    }

    // Generate/Map Images
    const generatedPosts = [];
    const validImages = images || [];
    
    // Safety check just in case it ignored our hard limit
    const postCount = Math.max(socialData.posts?.length || 0, numPosts);

    for (let i = 0; i < socialData.posts.length; i++) {
      const post = socialData.posts[i];
      let imageUrl = "";

      // Usar en orden cada imagen que haya subido el cliente para las primeras publicaciones
      if (i < validImages.length && validImages[i]) {
        imageUrl = typeof validImages[i] === 'string' ? validImages[i] : validImages[i].url;
        console.log(`Post ${i + 1}: Using reference image ${i + 1}`);
      } else {
        // Los demás posts generan imágenes nuevas usando Pollinations
        const stylePrompt = post.imagePrompt || `Professional photography for business`;
        const encodedPrompt = encodeURIComponent(stylePrompt + " --quality 2");
        const seed = Math.floor(Math.random() * 10000000);
        imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?seed=${seed}&width=1080&height=1080&nologo=true`;
        console.log(`Post ${i + 1}: Generating new AI image`);
      }

      generatedPosts.push({
        ...post,
        imageUrl,
        postNumber: i + 1
      });
    }

    console.log(`Successfully generated ${generatedPosts.length} posts`);
    res.json({ success: true, data: { strategy: socialData.strategy, posts: generatedPosts } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}
