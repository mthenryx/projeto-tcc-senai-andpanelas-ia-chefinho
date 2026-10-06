import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

// Função para converter imagem local em Base64 para o modelo ler
function fileToBase64(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  return fileBuffer.toString("base64");
}

async function main() {
  // 1. Inicializa o modelo Gemini Flash gratuito via LangChain
  const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    temperature: 0.7,
    apiKey: process.env.GOOGLE_API_KEY,
  });

  // 2. Coloque uma imagem de teste na mesma pasta e coloque o nome dela aqui
  const imagePath = path.join(__dirname, "teste.jpg");
  const base64Image = fileToBase64(imagePath);

  // 3. Monta a mensagem multimodal (Texto + Imagem)
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
  
  // 4. Executa a chamada
  const response = await model.invoke([message]);
  
  console.log("\nResposta da IA:");
  console.log(response.content);
}

main().catch(console.error);