import type { Request, Response } from "express";
import { sendResponse, successResponse } from "../utils/response";

// Não depende do Gemini
export function statusController(_req: Request, res: Response): void {
  sendResponse(res, successResponse({ message: "Chefinho está funcionando!" }));
}
