import { Router } from "express";
import { pesquisaController } from "../controllers/pesquisa.controller";

const router = Router();

router.post("/", pesquisaController);

export default router;
