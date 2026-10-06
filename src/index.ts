import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

function fileToBase64(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  return fileBuffer.toString("base64");
}

async function main() {

  const model = new ChatGoogleGenerativeAI({
    model: "gemini-3.8-flash",  
    temperature: 0.7,
    apiKey: process.env.GOOGLE_API_KEY,
  });

  const imagePath = path.join(process.cwd(), "src", "utils", "teste.jpg");
  const base64Image = fileToBase64(imagePath);

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