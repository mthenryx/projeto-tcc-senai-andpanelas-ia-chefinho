# POST /v1/chefinho/moderacao/comunidade

Analisa uma **denúncia de comunidade** e devolve a decisão. O Chefinho **não apaga nada**: só indica se a comunidade deve ser apagada. Quem executa a exclusão é o backend.

- **Método:** `POST`
- **URL:** `/v1/chefinho/moderacao/comunidade`
- **Headers:** `Content-Type: application/json` (e `x-api-key`, se a autenticação estiver ligada)

## Body

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `motivo` | string | Sim | Motivo escolhido na denúncia (1 a 300 caracteres) |
| `detalhe` | string | Não | Detalhe do denunciante (até 2.000). Pode ser `""` ou `null` |
| `comunidade` | objeto | Sim | Comunidade denunciada |
| `comunidade.nome` | string | Sim | Nome |
| `comunidade.descricao` | string | Não | Descrição |
| `comunidade.foto_url` | string (URL) | Não | URL `http`/`https` da foto. Será baixada e analisada |
| `comunidade.banner_url` | string (URL) | Não | URL `http`/`https` do banner. Será baixado e analisado |
| `comunidade.id_categoria_principal` | string ou número | Não | Categoria principal |

Campos extras são ignorados. Regras de mídia: veja [README.md](README.md#mídia-imagens-e-vídeos).

## Exemplo de request

```json
{
  "motivo": "Não tem relação com culinária",
  "detalhe": "A comunidade está sendo utilizada para publicar conteúdo não relacionado à culinária.",
  "comunidade": {
    "nome": "Veganos Criativos",
    "descricao": "Receitas plant-based e adaptações.",
    "foto_url": "https://exemplo.com/comunidade.jpg",
    "banner_url": "https://exemplo.com/banner.jpg",
    "id_categoria_principal": "Vegana"
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
| `response_ia.apagar` | boolean | `true`: a comunidade deve ser apagada. `false`: deve ser mantida |

O Chefinho é conservador: em caso de dúvida real, devolve `apagar: false`.

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
    "message": "O campo 'comunidade.nome' é obrigatório.",
    "details": [{ "campo": "comunidade.nome", "mensagem": "campo obrigatório" }]
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
