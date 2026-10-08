# POST /v1/chefinho/moderacao/perfil

Analisa uma **denúncia de perfil de usuário** e devolve a decisão. O Chefinho **não apaga nada**: só indica se o perfil deve ser apagado. Quem executa a exclusão é o backend.

- **Método:** `POST`
- **URL:** `/v1/chefinho/moderacao/perfil`
- **Headers:** `Content-Type: application/json` (e `x-api-key`, se a autenticação estiver ligada)

## Segurança e privacidade

- **Nunca envie a senha.** Se `dados_usuario` contiver `senha` (ou `password`), a requisição é recusada com `400 INVALID_REQUEST`, e nada é enviado ao Gemini. O valor recebido não é repetido na resposta nem gravado em log.
- Só `nome`, `username` e a foto de perfil são enviados ao Gemini. `email` e `data_nascimento` são aceitos, mas **não** são enviados (não são dados públicos e não ajudam na decisão). Você pode omiti-los.

## Body

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `motivo` | string | Sim | Motivo escolhido na denúncia (1 a 300 caracteres) |
| `detalhe` | string | Não | Detalhe do denunciante (até 2.000). Pode ser `""` ou `null` |
| `dados_usuario` | objeto | Sim | Dados do perfil denunciado |
| `dados_usuario.nome` | string | Sim | Nome |
| `dados_usuario.username` | string | Sim | Nome de usuário |
| `dados_usuario.foto_perfil` | string (URL) | Não | URL `http`/`https` da foto. Será baixada e analisada |
| `dados_usuario.email` | string | Não | Aceito, mas não enviado ao Gemini |
| `dados_usuario.data_nascimento` | string | Não | Aceita, mas não enviada ao Gemini |

Campos extras são ignorados (exceto `senha`/`password`, que são recusados). Regras de mídia: veja [README.md](README.md#mídia-imagens-e-vídeos).

## Exemplo de request

```json
{
  "motivo": "Spam ou propaganda",
  "detalhe": "O perfil publica repetidamente conteúdo promocional sem relação com a plataforma.",
  "dados_usuario": {
    "nome": "Carlos Ferreira",
    "username": "carlosf",
    "email": "carlos@email.com",
    "data_nascimento": "1990-05-15",
    "foto_perfil": "https://exemplo.com/foto.jpg"
  }
}
```

## Resposta de sucesso (200)

```json
{
  "status_code": 200,
  "success": true,
  "agent": { "name": "Chefinho", "version": "1.0.0" },
  "message": "Denúncia analisada com sucesso.",
  "response_ia": { "apagar": false },
  "error": null
}
```

| Campo | Tipo | Descrição |
|---|---|---|
| `response_ia.apagar` | boolean | `true`: o perfil deve ser apagado. `false`: deve ser mantido |

O Chefinho é conservador: em caso de dúvida real, devolve `apagar: false`.

## Exemplo de erro (senha enviada por engano)

```json
{
  "status_code": 400,
  "success": false,
  "agent": { "name": "Chefinho", "version": "1.0.0" },
  "message": "Dados inválidos.",
  "response_ia": null,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "O campo 'senha' não deve ser enviado ao Chefinho. Remova-o da requisição.",
    "details": [{ "campo": "dados_usuario.senha", "mensagem": "campo não permitido" }]
  }
}
```

## Códigos HTTP e de erro possíveis

| HTTP | `error.code` |
|---|---|
| 200 | — |
| 400 / 413 | `INVALID_REQUEST` |
| 401 | `UNAUTHORIZED` |
| 422 | `INVALID_IMAGE_URL` |
| 502 | `AI_RESPONSE_INVALID` |
| 503 | `AI_SERVICE_UNAVAILABLE` |
| 504 | `AI_TIMEOUT` |
| 500 | `INTERNAL_ERROR` |
