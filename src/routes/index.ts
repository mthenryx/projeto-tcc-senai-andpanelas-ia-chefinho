import { Router } from "express";
import { autenticar } from "../middlewares/auth";
import chatRoutes from "./chat.routes";
import moderacaoComunidadeRoutes from "./moderacao-comunidade.routes";
import moderacaoPerfilRoutes from "./moderacao-perfil.routes";
import moderacaoReceitaRoutes from "./moderacao-receita.routes";
import pesquisaRoutes from "./pesquisa.routes";
import statusRoutes from "./status.routes";

// Todas as rotas ficam sob /v1/chefinho
const router = Router();

router.use("/status", statusRoutes); // pública (não depende do Gemini)

router.use(autenticar);
router.use("/chat", chatRoutes);
router.use("/moderacao/receita", moderacaoReceitaRoutes);
router.use("/moderacao/comunidade", moderacaoComunidadeRoutes);
router.use("/moderacao/perfil", moderacaoPerfilRoutes);
router.use("/pesquisa", pesquisaRoutes);

export default router;
