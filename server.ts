import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

// Load environment variables
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON bodies (with increased limit for images)
  app.use(express.json({ limit: '50mb' }));

  // API Routes will go here
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "DigiMarket RD Factory API is running" });
  });

  app.post("/api/generate-branding", async (req, res) => {
    try {
      const { clientName, subPackageId, extraInfo, images } = req.body;

      // Convert images to Gemini parts if they exist
      const imageParts = (images || []).map((img: string) => {
        const base64Data = img.split(',')[1] || img;
        return {
          inlineData: {
            data: base64Data,
            mimeType: "image/jpeg"
          }
        };
      });

      // Determine number of logo proposals based on package
      let numLogos = 3;
      if (subPackageId === 'branding-2') numLogos = 4;
      if (subPackageId === 'branding-3') numLogos = 5;
      if (subPackageId === 'branding-4') numLogos = 1;

      // 1. Use Gemini to generate the Brand Strategy and Logo Prompts
      const prompt = `
        Eres el Director Creativo de DigiMarket RD.
        Crea la identidad visual para el cliente: "${clientName}".
        Información adicional: "${extraInfo}".
        
        IMPORTANTE: Se han proporcionado ${imageParts.length} imágenes de referencia. 
        Analiza estas imágenes para entender el estilo visual preferido del cliente.
        
        Debes generar:
        1. Un manual de marca en formato Markdown (Misión, Visión, Tono de voz, Reglas de uso).
        2. Una paleta de colores (3 a 5 colores) con sus códigos HEX.
        3. Tipografías recomendadas (Principal y Secundaria).
        4. Exactamente ${numLogos} prompts detallados en INGLÉS para generar los logos en una IA de imágenes. Los prompts deben ser descriptivos, profesionales, indicando "vector logo, minimalist, flat design, white background" para asegurar buenos resultados.
      `;

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
              brandManual: { type: Type.STRING, description: "Manual de marca en Markdown" },
              colorPalette: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    hex: { type: Type.STRING, description: "Código HEX (ej. #FF0000)" },
                    name: { type: Type.STRING, description: "Nombre del color" },
                    usage: { type: Type.STRING, description: "Uso (ej. Principal, Fondo, Acento)" }
                  },
                  required: ["hex", "name", "usage"]
                }
              },
              typography: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    usage: { type: Type.STRING }
                  },
                  required: ["name", "usage"]
                }
              },
              logoPrompts: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: `Exactamente ${numLogos} prompts en inglés para generar logos`
              }
            },
            required: ["brandManual", "colorPalette", "typography", "logoPrompts"]
          }
        }
      });

      const resultText = response.text || "{}";
      const brandingData = JSON.parse(resultText);

      // 2. Generate Logos using Pollinations.ai (Free, No API Key needed) as fallback, 
      // or HuggingFace if API key is provided.
      const generatedLogos = [];
      for (let i = 0; i < brandingData.logoPrompts.length; i++) {
        const logoPrompt = brandingData.logoPrompts[i];
        
        if (process.env.HUGGINGFACE_API_KEY) {
          try {
            // Using Hugging Face FLUX.1-schnell
            const hfResponse = await fetch(
              "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell",
              {
                headers: {
                  Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
                  "Content-Type": "application/json",
                },
                method: "POST",
                body: JSON.stringify({ inputs: logoPrompt }),
              }
            );
            
            if (hfResponse.ok) {
              const arrayBuffer = await hfResponse.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              const base64 = buffer.toString('base64');
              generatedLogos.push(`data:image/jpeg;base64,${base64}`);
              continue; // Skip pollinations if HF succeeds
            } else {
              console.warn("HuggingFace failed, falling back to Pollinations");
            }
          } catch (e) {
            console.error("Error with HuggingFace:", e);
          }
        }
        
        // Fallback to Pollinations.ai
        const encodedPrompt = encodeURIComponent(logoPrompt + " professional vector logo, white background, high quality");
        // Add a random seed to avoid caching identical prompts
        const seed = Math.floor(Math.random() * 100000);
        generatedLogos.push(`https://image.pollinations.ai/prompt/${encodedPrompt}?seed=${seed}&width=1024&height=1024&nologo=true`);
      }

      res.json({
        success: true,
        data: {
          ...brandingData,
          generatedLogos
        }
      });

    } catch (error: any) {
      console.error("Error generating branding:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/generate-web", async (req, res) => {
    try {
      const { clientName, subPackageId, extraInfo, images } = req.body;

      // Convert images to Gemini parts if they exist
      const imageParts = (images || []).map((img: string) => {
        const base64Data = img.split(',')[1] || img;
        return {
          inlineData: {
            data: base64Data,
            mimeType: "image/jpeg"
          }
        };
      });

      const prompt = `
        Eres el Director de Desarrollo Web de DigiMarket RD.
        Crea la estructura y el copy para la web del cliente: "${clientName}".
        Información adicional: "${extraInfo}".
        
        IMPORTANTE: Se han proporcionado ${imageParts.length} imágenes de referencia. 
        Analiza estas imágenes para entender la marca, el estilo y el contenido. 
        Úsalas para proponer un diseño coherente.
        
        Debes generar:
        1. Un Sitemap (lista de páginas sugeridas).
        2. El Copy principal para la página de Inicio (Hero Title, Subtitle, Call to Action).
        3. Un prompt en INGLÉS para generar un mockup visual de la página web (ej. "modern website landing page design for [industry], UI/UX, dribbble style, clean, high resolution").
      `;

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
              sitemap: { type: Type.ARRAY, items: { type: Type.STRING } },
              heroCopy: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  subtitle: { type: Type.STRING },
                  cta: { type: Type.STRING }
                },
                required: ["title", "subtitle", "cta"]
              },
              mockupPrompt: { type: Type.STRING }
            },
            required: ["sitemap", "heroCopy", "mockupPrompt"]
          }
        }
      });

      const webData = JSON.parse(response.text || "{}");

      // Generate Mockup
      const encodedPrompt = encodeURIComponent(webData.mockupPrompt + " modern website UI UX design, high quality, dribbble, behance");
      const seed = Math.floor(Math.random() * 100000);
      const mockupImage = `https://image.pollinations.ai/prompt/${encodedPrompt}?seed=${seed}&width=1280&height=800&nologo=true`;

      res.json({ success: true, data: { ...webData, mockupImage } });
    } catch (error: any) {
      console.error("Error generating web:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/generate-social", async (req, res) => {
    try {
      const { clientName, subPackageId, extraInfo, images } = req.body;

      // Convert images to Gemini parts if they exist
      const imageParts = (images || []).map((img: string) => {
        const base64Data = img.split(',')[1] || img;
        return {
          inlineData: {
            data: base64Data,
            mimeType: "image/jpeg"
          }
        };
      });

      const prompt = `
        Eres el Social Media Manager de DigiMarket RD.
        Crea una tanda de 4 posts para las redes sociales del cliente: "${clientName}".
        Información adicional: "${extraInfo}".
        
        IMPORTANTE - GUÍA DE ESTILO: 
        Se ha proporcionado una imagen de referencia. 
        1. Analiza profundamente el estilo visual de esta imagen (colores, iluminación, tipo de fotografía, ambiente).
        2. El POST #1 DEBE usar obligatoriamente la imagen de referencia proporcionada (referenceImageIndex: 0).
        3. Para los POSTS #2, #3 y #4, debes generar prompts en INGLÉS que describan escenas NUEVAS pero que mantengan EXACTAMENTE el mismo estilo visual, paleta de colores y "vibe" de la imagen de referencia. Queremos que parezcan de la misma sesión de fotos.
        
        Para cada post debes generar:
        1. El texto (copy) persuasivo con emojis.
        2. Los hashtags recomendados.
        3. Un prompt detallado en INGLÉS para generar la imagen (solo para los posts que no usan la referencia).
        4. El índice de la imagen de referencia a usar (0 para el primer post, null para los demás).
      `;

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
              strategy: { type: Type.STRING, description: "Breve resumen de la estrategia de consistencia visual" },
              posts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    copy: { type: Type.STRING },
                    hashtags: { type: Type.STRING },
                    imagePrompt: { type: Type.STRING, description: "Prompt en inglés que IMITA el estilo de la referencia" },
                    referenceImageIndex: { type: Type.NUMBER, description: "0 para usar la foto subida, null para generar una nueva" }
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

      // Generate/Map Images
      const generatedPosts = [];
      for (let i = 0; i < socialData.posts.length; i++) {
        const post = socialData.posts[i];
        let imageUrl = "";

        // Si la IA dice que usemos la referencia (índice 0) y existe
        if (post.referenceImageIndex === 0 && images && images[0]) {
          imageUrl = images[0];
        } else {
          // Si no, generamos una nueva basada en el prompt de estilo
          const encodedPrompt = encodeURIComponent(post.imagePrompt + " --v 6.0 --style raw --ar 1:1");
          const seed = Math.floor(Math.random() * 100000);
          // Usamos un motor de renderizado más potente en el prompt
          imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?seed=${seed}&width=1080&height=1080&nologo=true&model=flux`;
        }
        
        generatedPosts.push({ ...post, imageUrl });
      }

      res.json({ success: true, data: { strategy: socialData.strategy, posts: generatedPosts } });
    } catch (error: any) {
      console.error("Error generating social:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
