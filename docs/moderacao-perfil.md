# POST /v1/chefinho/moderacao/perfil

Analisa uma **denúncia de perfil de usuário** e devolve uma decisão de moderação. O Chefinho **não apaga nada**: apenas indica se o perfil deve ser apagado. Quem executa a exclusão é o backend do Entre Panelas.

* **Método:** `POST`
* **URL:** `/v1/chefinho/moderacao/perfil`
* **Headers:** `Content-Type: application/json` e `x-api-key`, caso a autenticação esteja habilitada.

## Segurança e privacidade

* **Nunca envie a senha.** Se `dados_usuario` contiver `senha` ou `password`, a requisição será recusada com `400 INVALID_REQUEST`. O valor recebido não será repetido na resposta nem gravado em log.
* Apenas o nome, o username, a foto de perfil e o banner são encaminhados ao Gemini como dados do perfil.
* Os campos `email` e `data_nascimento` são aceitos, mas **não são enviados ao Gemini**, pois não são necessários para a análise do conteúdo público do perfil.
* Campos adicionais que não fazem parte do schema são ignorados pelo processo de validação, exceto `senha` e `password`, que são explicitamente recusados.

## Body

| Campo                           | Tipo                            | Obrigatório | Descrição                                                                                             |
| ------------------------------- | ------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------- |
| `motivo`                        | string                          | Sim         | Motivo escolhido na denúncia. De 1 a 300 caracteres, conforme o schema de moderação.                  |
| `detalhe`                       | string ou `null`                | Não         | Detalhes fornecidos pelo denunciante. Pode estar vazio ou ser `null`, conforme o schema de moderação. |
| `dados_usuario`                 | objeto                          | Sim         | Dados do perfil denunciado.                                                                           |
| `dados_usuario.nome`            | string                          | Sim         | Nome do usuário. De 1 a 300 caracteres.                                                               |
| `dados_usuario.username`        | string                          | Sim         | Nome de usuário. De 1 a 100 caracteres.                                                               |
| `dados_usuario.foto_perfil`     | string (URL), `null` ou ausente | Não         | URL HTTP/HTTPS da foto de perfil. Quando disponível, será obtida e enviada para análise visual.       |
| `dados_usuario.banner_url`      | string (URL), `null` ou ausente | Não         | URL HTTP/HTTPS do banner do perfil. Quando disponível, será obtida e enviada para análise visual.     |
| `dados_usuario.email`           | string                          | Não         | Aceito pelo schema, mas não enviado ao Gemini.                                                        |
| `dados_usuario.data_nascimento` | string                          | Não         | Aceita pelo schema, mas não enviada ao Gemini.                                                        |

## Análise das imagens

O Chefinho utiliza a ferramenta de imagens para processar a foto de perfil e o banner.

O fluxo é:

```text
foto_perfil ──┐
              ├── Image Tool ── Gemini
banner_url ───┘
```

As duas imagens são processadas independentemente. Quando ambas estão disponíveis, o Gemini recebe as duas para análise.

Se uma imagem estiver ausente, inacessível ou não puder ser processada, ela será ignorada e a análise poderá continuar com a outra imagem e os dados textuais disponíveis.

Se nenhuma imagem estiver disponível, o Chefinho poderá realizar a análise com os dados textuais, desde que sejam suficientes para uma decisão responsável. Ele não deve inventar informações visuais sobre imagens que não conseguiu analisar.

Para conhecer as regras gerais de mídia, consulte [README.md — Mídia: imagens e vídeos](README.md#mídia-imagens-e-vídeos).

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
    "foto_perfil": "https://exemplo.com/foto.jpg",
    "banner_url": "https://exemplo.com/banner.jpg"
  }
}
```

**Observação:** `email` e `data_nascimento` são opcionais e não são enviados ao Gemini. Não inclua senhas no request.

## Resposta de sucesso (200)

```json
{
  "status_code": 200,
  "success": true,
  "agent": {
    "name": "Chefinho",
    "version": "1.0.0"
  },
  "message": "Denúncia analisada com sucesso.",
  "response_ia": {
    "apagar": false
  },
  "error": null
}
```

| Campo                | Tipo    | Descrição                                                              |
| -------------------- | ------- | ---------------------------------------------------------------------- |
| `status_code`        | number  | Código HTTP da resposta.                                               |
| `success`            | boolean | Indica se a operação foi concluída com sucesso.                        |
| `agent.name`         | string  | Nome do agente: `Chefinho`.                                            |
| `agent.version`      | string  | Versão atual do agente.                                                |
| `message`            | string  | Mensagem descritiva do resultado.                                      |
| `response_ia.apagar` | boolean | `true`: o perfil deve ser apagado. `false`: o perfil deve ser mantido. |
| `error`              | `null`  | Não existe erro na resposta de sucesso.                                |

O Chefinho adota uma abordagem conservadora: em caso de dúvida real ou evidências insuficientes, deve retornar `apagar: false`.

## Exemplo de erro: senha enviada por engano

```json
{
  "status_code": 400,
  "success": false,
  "agent": {
    "name": "Chefinho",
    "version": "1.0.0"
  },
  "message": "Dados inválidos.",
  "response_ia": null,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "O campo 'senha' não deve ser enviado ao Chefinho. Remova-o da requisição.",
    "details": [
      {
        "campo": "dados_usuario.senha",
        "mensagem": "campo não permitido"
      }
    ]
  }
}
```

O mesmo bloqueio é aplicado ao campo `password`.

## Códigos HTTP e de erro possíveis

| HTTP | `error.code`             | Quando ocorre                                                                                                                                                                                                |
| ---- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 200  | —                        | Denúncia analisada com sucesso.                                                                                                                                                                              |
| 400  | `INVALID_REQUEST`        | Request inválido, campos obrigatórios ausentes, URLs malformadas ou envio de senha.                                                                                                                          |
| 401  | `UNAUTHORIZED`           | Falha de autenticação, quando habilitada.                                                                                                                                                                    |
| 422  | `INVALID_IMAGE_URL`      | Falha de imagem, caso seja propagada pelo tratamento de erros utilizado. No fluxo atual de moderação de perfil, falhas individuais de imagem são ignoradas para permitir a análise com os dados disponíveis. |
| 502  | `AI_RESPONSE_INVALID`    | Resposta inválida ou incompatível com o formato esperado da IA.                                                                                                                                              |
| 503  | `AI_SERVICE_UNAVAILABLE` | O serviço de IA está indisponível ou todos os modelos tentados falharam.                                                                                                                                     |
| 504  | `AI_TIMEOUT`             | A operação excedeu o tempo limite configurado, caso o erro seja classificado dessa forma pelo tratamento global.                                                                                             |
| 500  | `INTERNAL_ERROR`         | Erro interno inesperado.                                                                                                                                                                                     |

Os códigos efetivamente retornados dependem do tratamento global de erros implementado na API.

## Responsabilidades

* **Backend Entre Panelas:** envia a denúncia, recebe a decisão e executa eventual exclusão.
* **Chefinho API:** valida os dados, prepara as imagens, solicita a análise ao Gemini e devolve a decisão.
* **Gemini:** analisa as informações e as imagens disponíveis de acordo com o prompt de moderação.

O Chefinho não acessa diretamente o banco do Entre Panelas e não executa a exclusão do perfil.
