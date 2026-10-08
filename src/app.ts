import express from "express";
import { rotaNaoEncontrada, tratarErros } from "./middlewares/erros";
import routes from "./routes";

export function criarApp() {
  const app = express();
  app.disable("x-powered-by");

  // Log simples de cada requisição (sem corpo, para não registrar dados dos usuários)
  app.use((req, res, next) => {
    const inicio = Date.now();
    res.on("finish", () => {
      if (process.env.NODE_ENV === "test") return;
      console.log(`${req.method} ${req.originalUrl.split("?")[0]} ${res.statusCode} ${Date.now() - inicio}ms`);
    });
    next();
  });

  app.use(express.json({ limit: "1mb" }));
  app.use("/v1/chefinho", routes);
  app.use(rotaNaoEncontrada);
  app.use(tratarErros);

  return app;
}
