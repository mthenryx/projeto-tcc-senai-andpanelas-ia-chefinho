# POST /v1/chefinho/chat

Conversa direta do usuário com o Chefinho. O Chefinho responde como assistente culinário do Entre Panelas: amigável, em português, e restrito a receitas e culinária.

- **Método:** `POST`
- **URL:** `/v1/chefinho/chat`
- **Headers:** `Content-Type: application/json` (e `x-api-key`, se a autenticação estiver ligada)

## Quem controla o histórico

> **O backend é responsável por selecionar e enviar as 10 mensagens mais recentes. O Chefinho não consulta o histórico por conta própria e não aplica limite de 10.**

O que chega em `historico_conversa` é tratado como o contexto recente da conversa e usado para interpretar `pergunta_atual`. O Chefinho não guarda nada entre requisições.

## Body

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `historico_conversa` | array | Não (padrão `[]`) | Mensagens anteriores, da mais antiga para a mais recente |
| `historico_conversa[].papel` | string | Sim | `"user"` (usuário) ou `"agente"` (Chefinho) |
| `historico_conversa[].mensagem` | string | Sim | Texto da mensagem (1 a 10.000 caracteres) |
| `pergunta_atual` | string | Sim | Nova mensagem do usuário (1 a 2.000 caracteres) |

Como o Chefinho usa o histórico:

- `papel = "user"` vira mensagem do usuário e `papel = "agente"` vira mensagem do Chefinho.
- O Gemini exige que a conversa comece pelo usuário e alterne os papéis. Por isso, mensagens do `agente` no início do histórico são descartadas, e mensagens seguidas do mesmo papel são juntadas em uma só.
- Se a **última** mensagem do histórico for do usuário e igual a `pergunta_atual` (ou seja, o backend já salvou a pergunta e a incluiu no histórico), ela é contada uma vez só.

## Exemplo de request

```json
{
  "historico_conversa": [
    {
      "papel": "user",
      "mensagem": "Oi! Tô com uns peitos de frango na geladeira e queria fazer algo diferente hoje. Dá pra fazer alguma receita legal com frango rápida?"
    },
    {
      "papel": "agente",
      "mensagem": "Dá sim! Que tal um frango xadrez caseiro ou um frango ao molho cremoso de requeijão e milho? Ambas ficam prontas em menos de 20 minutos."
    },
    { "papel": "user", "mensagem": "Gostei da ideia do frango cremoso! Como que faz?" },
    { "papel": "agente", "mensagem": "É bem simples: corte o frango em cubos..." }
  ],
  "pergunta_atual": "E o que eu posso fazer de café da manhã amanhã?"
}
```

## Resposta de sucesso (200)

```json
{
  "status_code": 200,
  "success": true,
  "agent": { "name": "Chefinho", "version": "1.0.0" },
  "message": "Operação realizada com sucesso.",
  "response_ia": { "message": "Que tal uma panqueca de banana? Fica pronta em 10 minutos..." },
  "error": null
}
```

O texto do Chefinho está em `response_ia.message`. É o backend que salva essa resposta no histórico.

## Exemplo de erro (400)

```json
{
  "status_code": 400,
  "success": false,
  "agent": { "name": "Chefinho", "version": "1.0.0" },
  "message": "Dados inválidos.",
  "response_ia": null,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "O campo 'pergunta_atual' é obrigatório.",
    "details": [{ "campo": "pergunta_atual", "mensagem": "campo obrigatório" }]
  }
}
```

## Códigos HTTP e de erro possíveis

| HTTP | `error.code` |
|---|---|
| 200 | — |
| 400 / 413 | `INVALID_REQUEST` |
| 401 | `UNAUTHORIZED` |
| 502 | `AI_RESPONSE_INVALID` |
| 503 | `AI_SERVICE_UNAVAILABLE` |
| 504 | `AI_TIMEOUT` |
| 500 | `INTERNAL_ERROR` |

Veja a tabela completa em [README.md](README.md#códigos-de-erro).
