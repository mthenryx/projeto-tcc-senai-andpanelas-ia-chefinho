// Deve ser o primeiro import dos testes: configura o ambiente antes da leitura do .env
process.env.NODE_ENV = "test";
process.env.GOOGLE_API_KEY = "chave-de-teste";
process.env.AI_TIMEOUT_MS = "20000";
process.env.UNSPLASH_ACCESS_KEY = "chave-de-teste";
delete process.env.CHEFINHO_API_KEY;
