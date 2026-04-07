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
      const { clientName, subPackage, extraInfo, images } = req.body;
      const { features, name } = subPackage;

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

      // 1. Use Gemini to generate the Brand Strategy and Logo Prompts
      const prompt = `
        Eres el Director Creativo de DigiMarket RD.
        Crea la identidad visual para el cliente: "${clientName}".
        Información adicional: "${extraInfo}".
        
        PAQUETE SELECCIONADO: ${name}
        CARACTERÍSTICAS OBLIGATORIAS A ENTREGAR:
        ${features.map((f: string) => `- ${f}`).join('\n')}
        
        IMPORTANTE: Se han proporcionado ${imageParts.length} imágenes de referencia. 
        Analiza estas imágenes para entender el estilo visual preferido del cliente.
        
        DEBES GENERAR UNA RESPUESTA JSON CON:
        1. "brandManual": Manual de marca en Markdown.
        2. "colorPalette": Array de objetos {hex, name, usage}.
        3. "typography": Array de objetos {name, usage}.
        4. "logoPrompts": Array de prompts detallados para generar logos.
        5. "code": Objeto con los archivos necesarios (ej. {"manual.md": "...", "estilos.css": "..."}) que implementen TODAS las características obligatorias listadas arriba.
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
                description: "Prompts en inglés para generar logos"
              },
              code: {
                type: Type.OBJECT,
                additionalProperties: { type: Type.STRING },
                description: "Mapa de archivos: nombre del archivo -> contenido del código"
              }
            },
            required: ["brandManual", "colorPalette", "typography", "logoPrompts", "code"]
          }
        }
      });

      const resultText = response.text || "{}";
      const brandingData = JSON.parse(resultText);

      res.json({
        success: true,
        data: brandingData
      });

    } catch (error: any) {
      console.error("Error generating branding:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/generate-web", async (req, res) => {
    try {
      const { clientName, subPackage, extraInfo, images } = req.body;
      const { features, name } = subPackage;

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
        
        PAQUETE SELECCIONADO: ${name}
        CARACTERÍSTICAS OBLIGATORIAS A ENTREGAR:
        ${features.map((f: string) => `- ${f}`).join('\n')}
        
        IMPORTANTE: Se han proporcionado ${imageParts.length} imágenes de referencia. 
        Analiza estas imágenes para entender la marca, el estilo y el contenido. 
        Úsalas para proponer un diseño coherente.
        
        DEBES GENERAR UNA RESPUESTA JSON CON:
        1. "sitemap": Array de páginas.
        2. "heroCopy": Objeto con {title, subtitle, cta}.
        3. "mockupPrompt": Prompt para generar mockup.
        4. "code": Objeto con los archivos necesarios (ej. {"index.html": "...", "style.css": "...", "script.js": "..."}) que implementen TODAS las características obligatorias listadas arriba.
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
              mockupPrompt: { type: Type.STRING },
              code: {
                type: Type.OBJECT,
                additionalProperties: { type: Type.STRING },
                description: "Mapa de archivos: nombre del archivo -> contenido del código"
              }
            },
            required: ["sitemap", "heroCopy", "mockupPrompt", "code"]
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

  app.post("/api/ai/image", async (req, res) => {
    try {
      const { prompt, quality } = req.body;
      const model = quality === 'high' ? 'gemini-3-pro-image-preview' : 'gemini-3.1-flash-image-preview';
      
      const response = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });
      
      res.json({ success: true, data: response.text });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/ai/video", async (req, res) => {
    try {
      const { prompt, aspectRatio } = req.body;
      const response = await ai.models.generateContent({
        model: 'veo-3.1-fast-generate-preview',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          generationConfig: {
            aspectRatio: aspectRatio || '16:9'
          }
        }
      });
      
      res.json({ success: true, data: response.text });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { prompt, complexity } = req.body;
      let model = 'gemini-3-flash-preview';
      if (complexity === 'high') model = 'gemini-3.1-pro-preview';
      if (complexity === 'fast') model = 'gemini-3.1-flash-lite-preview';
      
      const response = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });
      
      res.json({ success: true, data: response.text });
    } catch (error: any) {
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
