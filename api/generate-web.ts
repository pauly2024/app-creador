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
Crea la estructura y copy para la web o web app de: "${clientName}".
${packageContext} 
Información adicional: "${extraInfo}". 
${imageContext}

Responde SOLO con JSON siguiendo exactamente esta estructura:
{
  "sitemap": ["Inicio", "Servicios", "Contacto"],
  "heroCopy": { "title": "Título", "subtitle": "Subtítulo", "cta": "Botón" },
  "mockupPrompt": "modern website landing page design for [industry], UI/UX, dribbble style"
}
Asegúrate de que 'mockupPrompt' incluya detalles del contexto visual si se proporcionó y esté en INGLÉS para el motor de generación.` }],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const webData = JSON.parse(completion.choices[0].message.content || "{}");
    // Mejorar dramáticamente el prompt de la imagen para que parezca un Mockup Web real y profesional
    const imagePrompt = `Award winning modern UI UX website landing page design for ${clientName}, ${webData.mockupPrompt}. Desktop view, high resolution, dribbble trending, clear interface, clean typography, hyper-realistic web mockup.`;
    
    // Generar únicamente URL (para no sobrecargar el límite de 1MB de la base de datos de Firebase)
    const seed = Math.floor(Math.random() * 10000000);
    const mockupImage = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}?seed=${seed}&width=1280&height=800&nologo=true`;

    res.json({ success: true, data: { ...webData, mockupImage } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}