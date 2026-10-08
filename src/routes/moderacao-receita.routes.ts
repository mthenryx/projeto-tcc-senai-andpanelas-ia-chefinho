import { Router } from "express";
import { moderacaoReceitaController } from "../controllers/moderacao-receita.controller";

const router = Router();

router.post("/", moderacaoReceitaController);

export default router;
