# Chefinho — API de IA do Entre Panelas

API em Node.js + TypeScript que usa LangChain e o Google Gemini (`gemini-3.5-flash-lite`) para três funções:

1. **Chat** com o usuário (assistente culinário)
2. **Moderação de denúncias** (receita, comunidade e perfil)
3. **Pesquisa inteligente** de receitas

O Chefinho é independente do backend do Entre Panelas: o backend envia os dados por HTTP e recebe a resposta.

## Começando

```bash
npm install
cp .env.example .env     # no Windows: copy .env.example .env
# preencha GOOGLE_API_KEY no .env
npm run dev
```

Teste: `http://localhost:3001/v1/chefinho/status`

## Estrutura

```text
src/
├── index.ts          # inicia o servidor
├── app.ts            # monta o Express
├── routes/           # endpoints e ligação com os controllers
├── controllers/      # validam a entrada e chamam o service
├── services/         # lógica de cada função (chat, pesquisa, moderacao/*)
├── tools/            # mídia: image.tool.ts e video.tool.ts
├── prompts/          # um prompt por função
├── schemas/          # contratos de entrada e saída (Zod)
├── config/           # variáveis de ambiente e instância do Gemini
├── middlewares/      # autenticação opcional e tratamento de erros
├── utils/            # envelope de resposta, erros, validação, download seguro
└── tests/            # testes automatizados (npm test)
docs/                 # documentação das rotas
```

## Documentação das rotas

Veja a pasta [`docs/`](docs/README.md).

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Roda em desenvolvimento |
| `npm run build` | Compila para `dist/` |
| `npm start` | Roda a versão compilada |
| `npm run typecheck` | Verifica os tipos |
| `npm test` | Roda os testes |

> **Aviso:** Como ainda não possuo conhecimento aprofundado sobre todos os assuntos abordados neste projeto, algumas informações foram obtidas de fontes externas. Abaixo, deixo os links e os devidos créditos aos autores.
>
> A Inteligência Artificial também foi utilizada como ferramenta de apoio durante o desenvolvimento, auxiliando em pesquisas, dúvidas, organização e implementação.
>
> **Fontes e créditos:**  
> - [OpenAI e LangChain na Prática: Criando um agente multi-ferramentas com Node.js, Express e TypeScript](https://www.youtube.com/live/BG6klyyHI2o?si=0tq_PsQqz468TAFl) — Daniel Castro
