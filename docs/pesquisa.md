# POST /v1/chefinho/pesquisa

Pesquisa inteligente de receitas. O **backend faz a pesquisa inicial no banco** e envia ao Chefinho o que o usuário pesquisou e as receitas encontradas. O Chefinho analisa e verifica se existe uma receita relevante que **não** está nessa lista. Se existir, cria uma **receita completa**.

- **Método:** `POST`
- **URL:** `/v1/chefinho/pesquisa`
- **Headers:** `Content-Type: application/json` (e `x-api-key`, se a autenticação estiver ligada)

## Body

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `pesquisa_usuario` | string | Sim | O que o usuário pesquisou (1 a 200 caracteres) |
| `encontrados_db` | array | Não (padrão `[]`) | Receitas que o banco devolveu para a pesquisa |
| `encontrados_db[].titulo` | string | Sim | Título |
| `encontrados_db[].descricao` | string | Não | Descrição |
| `encontrados_db[].foto`, `video` | string | Não | Aceitos, mas **não** enviados ao Gemini |
| `encontrados_db[].tempo` | string | Não | Tempo de preparo |
| `encontrados_db[].custo` | string | Não | Ex.: `"Alto"` |
| `encontrados_db[].dificuldade` | string | Não | Ex.: `"Moderada"` |
| `encontrados_db[].porcao` | número ou string | Não | Porções |

## Exemplo de request

```json
{
  "pesquisa_usuario": "frango",
  "encontrados_db": [
    {
      "titulo": "Filé de frango",
      "descricao": "Filé de frango grelhado.",
      "foto": "https://exemplo.com/frango.jpg",
      "video": "",
      "tempo": "00:20:00",
      "custo": "Baixo",
      "dificuldade": "Fácil",
      "porcao": 2
    }
  ]
}
```

## Resposta de sucesso (200) — com sugestão

```json
{
  "status_code": 200,
  "success": true,
  "agent": { "name": "Chefinho", "version": "1.0.0" },
  "message": "Pesquisa analisada com sucesso.",
  "response_ia": {
    "possui_sugestao": true,
    "receita": {
      "titulo": "Macarrão com frango",
      "descricao": "Macarrão cremoso com frango desfiado.",
      "tempo": "00:30:00",
      "custo": "Baixo",
      "dificuldade": "Fácil",
      "porcao": 4,
      "ingredientes": [
        { "nome": "Macarrão", "quantidade": "500", "id_unidade_medida": "g" },
        { "nome": "Peito de frango", "quantidade": "400", "id_unidade_medida": "g" }
      ],
      "modo_preparo": [
        { "metodo_preparo": "Cozinhe o macarrão em água com sal.", "ordem_preparo": 1 },
        { "metodo_preparo": "Misture o frango desfiado e o molho.", "ordem_preparo": 2 }
      ],
      "categorias": ["Almoço"],
      "tags": ["#Rápido"],
      "foto": null,
      "video": null
    }
  },
  "error": null
}
```

## Resposta de sucesso (200) — sem sugestão

```json
{
  "status_code": 200,
  "success": true,
  "agent": { "name": "Chefinho", "version": "1.0.0" },
  "message": "Pesquisa analisada com sucesso.",
  "response_ia": { "possui_sugestao": false, "receita": null },
  "error": null
}
```

Isso acontece quando os resultados do banco já cobrem bem a pesquisa, quando a pesquisa não tem relação com culinária, ou quando a IA sugeriria uma receita que já está em `encontrados_db` (mesmo título).

## Sobre `foto` e `video` da receita gerada

Vêm das ferramentas de mídia. Como o provedor externo de imagem/vídeo **ainda não foi definido**, hoje chegam `null` (veja [README.md](README.md#provedores-de-imagem-e-vídeo-pendente)). Se o provedor falhar, a receita é entregue mesmo assim, com `null`.

## Contrato da receita gerada (provisório)

Os campos da receita seguem os exemplos já usados pelo backend (receita da moderação e itens de `encontrados_db`). **O contrato oficial de receita do Entre Panelas ainda será definido**; quando for, o ajuste fica concentrado em `src/schemas/pesquisa.schema.ts` e `src/schemas/receita.schema.ts`. Pontos em aberto: ids de custo/dificuldade/porção (hoje o Chefinho devolve textos, como em `encontrados_db`) e unidades de medida.

Os passos de `modo_preparo` sempre voltam ordenados e numerados a partir de 1.

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
