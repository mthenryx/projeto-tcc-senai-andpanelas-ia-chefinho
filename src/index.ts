import { criarApp } from "./app";
import { AGENT, env } from "./config/env";

if (!env.googleApiKey) {
  console.warn("Atenção: GOOGLE_API_KEY não configurada. As rotas de IA vão falhar até configurá-la no .env.");
}
if (!env.apiKey) {
  console.warn("Atenção: CHEFINHO_API_KEY não configurada. A API está sem autenticação (ok apenas em desenvolvimento).");
}

criarApp().listen(env.port, () => {
  console.log(`${AGENT.name} ${AGENT.version} rodando em http://localhost:${env.port}/v1/chefinho/status`);
});
