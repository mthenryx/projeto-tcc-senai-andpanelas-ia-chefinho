# GET /v1/chefinho/status

Verifica se a API está no ar. **Não** usa o Gemini e **não** exige `x-api-key`.

- **Método:** `GET`
- **URL:** `/v1/chefinho/status`
- **Body:** nenhum

## Resposta de sucesso (200)

```json
{
  "status_code": 200,
  "success": true,
  "agent": { "name": "Chefinho", "version": "1.0.0" },
  "message": "Operação realizada com sucesso.",
  "response_ia": { "message": "Chefinho está funcionando!" },
  "error": null
}
```
