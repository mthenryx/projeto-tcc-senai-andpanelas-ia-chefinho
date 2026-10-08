import { Router } from "express";
import { moderacaoComunidadeController } from "../controllers/moderacao-comunidade.controller";

const router = Router();

router.post("/", moderacaoComunidadeController);

export default router;
