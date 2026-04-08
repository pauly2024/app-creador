import Replicate from "replicate";
import { VercelRequest, VercelResponse } from '@vercel/node';
import Groq from "groq-sdk";
import { GoogleGenAI } from "@google/genai";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });
    const { clientName, extraInfo, images, subPackage } = req.body;

    let imageContext = "";
    if (images && images.length > 0 && process.env.GEMINI_API_KEY) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const parts: any[] = [{ text: "Describe brevemente el estilo visual, paleta de colores y vibra de estas imágenes de referencia para incorporarlo al diseño web." }];
        images.forEach((img: any) => {
          const [header, data] = img.url.split(',');
          const mimeType = header.split(':')[1].split(';')[0];
          parts.push({ inlineData: { mimeType, data } });
        });
        const visionResponse = await ai.models.generateContent({ model: "gemini-1.5-flash", contents: [{ role: "user", parts }] });
        imageContext = `\nContexto visual extraído de imágenes subidas por el cliente: ${visionResponse.text}`;
      } catch (e) {
        console.warn("Failed to extract visual context", e);
      }
    }

    const packageContext = subPackage ? `Paquete solicitado: ${subPackage.name}. Características incluidas: ${subPackage.features.join(', ')}.` : '';

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: `Eres el Director de Desarrollo Web de DigiMarket RD.
Crea la estructura, copy y genera el CÓDIGO FUNCIONAL para la web o web app de: "${clientName}".
${packageContext} 
Información adicional: "${extraInfo}". 
${imageContext}

IMPORTANTE: El paquete dicta la complejidad. Si es una Landing Page, genera un index.html con CSS. Si es un E-commerce o App Web, diseña una estructura apropiada generándola en HTML/JS/CSS funcional y estético (UI moderna, premium).

Responde SOLO con JSON siguiendo exactamente esta estructura:
{
  "sitemap": ["Inicio", "Servicios", "Contacto"],
  "heroCopy": { "title": "Título", "subtitle": "Subtítulo", "cta": "Botón" },
  "mockupPrompt": "modern website landing page design for [industry], UI/UX, dribbble style",
  "code": {
    "index.html": "<!DOCTYPE html>...",
    "style.css": "body { ... }",
    "main.js": "..."
  }
}
Asegúrate de que 'mockupPrompt' incluya detalles del contexto visual y de que en 'code' devuelvas el código HTML, CSS y JS completamente desarrollado y alineado con los requerimientos.` }],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const webData = JSON.parse(completion.choices[0].message.content || "{}");
    const imagePrompt = webData.mockupPrompt + " modern website UI UX design, high quality, dribbble, behance";
    let mockupImage = "";

    // 1. Replicate
    if (process.env.REPLICATE_API_TOKEN && !mockupImage) {
      try {
        const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
        const output = await replicate.run("black-forest-labs/flux-schnell", {
          input: { prompt: imagePrompt, aspect_ratio: "16:9" }
        }) as any[];

        if (output && output[0]) {
          const reader = output[0].getReader();
          const chunks: Uint8Array[] = [];
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
          }
          const buffer = Buffer.concat(chunks);
          mockupImage = `data:image/png;base64,${buffer.toString('base64')}`;
        }
      } catch (e) {
        console.warn("Replicate failed, trying HuggingFace:", e);
      }
    }

    // 2. HuggingFace
    if (process.env.HUGGINGFACE_API_KEY && !mockupImage) {
      try {
        const hfResponse = await fetch(
          "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ inputs: imagePrompt })
          }
        );
        if (hfResponse.ok) {
          const buffer = Buffer.from(await hfResponse.arrayBuffer());
          mockupImage = `data:image/jpeg;base64,${buffer.toString('base64')}`;
        }
      } catch (e) {
        console.warn("HuggingFace failed, using Pollinations");
      }
    }

    // 3. Pollinations Fallback
    if (!mockupImage) {
      const seed = Math.floor(Math.random() * 100000);
      mockupImage = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}?seed=${seed}&width=1280&height=800&nologo=true`;
    }

    res.json({ success: true, data: { ...webData, mockupImage } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}