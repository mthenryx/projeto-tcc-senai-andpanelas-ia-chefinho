# POST /v1/chefinho/moderacao/receita

Analisa uma **denúncia de receita** e devolve a decisão. O Chefinho **não apaga nada**: só indica se a receita deve ser apagada. Quem executa a exclusão é o backend.

- **Método:** `POST`
- **URL:** `/v1/chefinho/moderacao/receita`
- **Headers:** `Content-Type: application/json` (e `x-api-key`, se a autenticação estiver ligada)

## Body

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `motivo` | string | Sim | Motivo escolhido na denúncia (1 a 300 caracteres) |
| `detalhe` | string | Não | Detalhe escrito pelo denunciante (até 2.000). Pode ser `""` ou `null` |
| `receita` | objeto | Sim | Receita denunciada |
| `receita.titulo` | string | Sim | Título |
| `receita.descricao` | string | Não | Descrição |
| `receita.foto` | string (URL) | Não | URL `http`/`https` da foto. Será baixada e analisada |
| `receita.video` | string (URL) | Não | URL `http`/`https` do vídeo. Será baixado e analisado |
| `receita.tempo` | string | Não | Tempo de preparo, ex.: `"00:40:00"` |
| `receita.id_custo`, `id_dificuldade`, `id_porcao` | número ou string | Não | Aceitos, mas **não** enviados ao Gemini (são apenas ids) |
| `receita.ingredientes` | array | Não | Itens `{ nome, quantidade, id_unidade_medida }` |
| `receita.modo_preparo` | array | Não | Itens `{ metodo_preparo, ordem_preparo }` |
| `receita.categorias` | array de string | Não | Categorias |
| `receita.tags` | array de string | Não | Tags |

Campos extras são ignorados. Regras de mídia (formatos, tamanhos): veja [README.md](README.md#mídia-imagens-e-vídeos).

## Exemplo de request

```json
{
  "motivo": "Violação de direitos autorais",
  "detalhe": "A publicação utiliza conteúdo de terceiros sem indicação de autoria.",
  "receita": {
    "titulo": "Frango ao Limão Siciliano",
    "descricao": "Frango marinado com limão siciliano e ervas.",
    "foto": "https://exemplo.com/frango.jpg",
    "video": "https://exemplo.com/frango.mp4",
    "tempo": "00:40:00",
    "id_custo": 1,
    "id_dificuldade": 1,
    "id_porcao": 4,
    "ingredientes": [
      { "nome": "Filé de frango", "quantidade": "600", "id_unidade_medida": "g" },
      { "nome": "Limão siciliano", "quantidade": "3", "id_unidade_medida": "un" }
    ],
    "modo_preparo": [
      { "metodo_preparo": "Aqueça uma frigideira e sele os filés.", "ordem_preparo": 1 },
      { "metodo_preparo": "Adicione os temperos e cozinhe até finalizar.", "ordem_preparo": 2 }
    ],
    "categorias": ["Almoço"],
    "tags": ["#ComidaRuim"]
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
| `response_ia.apagar` | boolean | `true`: a receita deve ser apagada. `false`: deve ser mantida |

O Chefinho é conservador: em caso de dúvida real, devolve `apagar: false`.

## Exemplo de erro (422)

```json
{
  "status_code": 422,
  "success": false,
  "agent": { "name": "Chefinho", "version": "1.0.0" },
  "message": "Não foi possível usar a imagem informada.",
  "response_ia": null,
  "error": {
    "code": "INVALID_IMAGE_URL",
    "message": "Não foi possível obter a imagem: o servidor da mídia respondeu com status 404.",
    "details": { "motivo": "o servidor da mídia respondeu com status 404" }
  }
}
```

## Códigos HTTP e de erro possíveis

| HTTP | `error.code` |
|---|---|
| 200 | — |
| 400 / 413 | `INVALID_REQUEST` |
| 401 | `UNAUTHORIZED` |
| 422 | `INVALID_IMAGE_URL`, `INVALID_VIDEO_URL` |
| 502 | `AI_RESPONSE_INVALID` |
| 503 | `AI_SERVICE_UNAVAILABLE` |
| 504 | `AI_TIMEOUT` |
| 500 | `INTERNAL_ERROR` |
