import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

// Função para converter imagem local em Base64
function fileToBase64(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  return fileBuffer.toString("base64");
}

async function main() {
  // Inicializa o modelo Gemini Flash
  const model = new ChatGoogleGenerativeAI({
    model: "gemini-3.8-flash",   // era "gemini-2.5-flash"
    temperature: 0.7,
    apiKey: process.env.GOOGLE_API_KEY,
  });

  // Caminho da imagem considerando a pasta utils/teste.jpg
  // Usamos process.cwd() para pegar a raiz do projeto de forma segura
  const imagePath = path.join(process.cwd(), "src", "utils", "teste.jpg");
  const base64Image = fileToBase64(imagePath);

  // Monta a mensagem multimodal
  const message = new HumanMessage({
    content: [
      {
        type: "text",
        text: "Analise esta imagem e descreva o que você vê.",
      },
      {
        type: "image_url",
        image_url: {
          url: `data:image/jpeg;base64,${base64Image}`,
        },
      },
    ],
  });

  console.log("Enviando imagem e texto para o Gemini Flash...");
  const response = await model.invoke([message]);
  
  console.log("\nResposta da IA:");
  console.log(response.content);
}

main().catch(console.error);