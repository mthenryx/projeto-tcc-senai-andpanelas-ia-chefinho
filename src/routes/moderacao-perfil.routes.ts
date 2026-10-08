import { Router } from "express";
import { moderacaoPerfilController } from "../controllers/moderacao-perfil.controller";

const router = Router();

router.post("/", moderacaoPerfilController);

export default router;
