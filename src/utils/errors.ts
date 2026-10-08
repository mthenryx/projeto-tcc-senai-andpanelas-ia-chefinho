export type ErrorCode =
  | "INVALID_REQUEST"
  | "UNAUTHORIZED"
  | "INVALID_IMAGE_URL"
  | "INVALID_VIDEO_URL"
  | "AI_SERVICE_UNAVAILABLE"
  | "AI_TIMEOUT"
  | "AI_RESPONSE_INVALID"
  | "TOOL_ERROR"
  | "NOT_FOUND"
  | "INTERNAL_ERROR";

// Status HTTP e mensagem geral de cada código (o backend deve se basear no código)
export const ERROR_DEFAULTS: Record<ErrorCode, { status: number; message: string }> = {
  INVALID_REQUEST: { status: 400, message: "Dados inválidos." },
  UNAUTHORIZED: { status: 401, message: "Não autorizado." },
  INVALID_IMAGE_URL: { status: 422, message: "Não foi possível usar a imagem informada." },
  INVALID_VIDEO_URL: { status: 422, message: "Não foi possível usar o vídeo informado." },
  AI_SERVICE_UNAVAILABLE: {
    status: 503,
    message: "O serviço de inteligência artificial está temporariamente indisponível.",
  },
  AI_TIMEOUT: {
    status: 504,
    message: "O serviço de inteligência artificial demorou demais para responder.",
  },
  AI_RESPONSE_INVALID: {
    status: 502,
    message: "A inteligência artificial retornou uma resposta inválida.",
  },
  TOOL_ERROR: { status: 502, message: "Falha ao executar uma ferramenta do Chefinho." },
  NOT_FOUND: { status: 404, message: "Rota não encontrada." },
  INTERNAL_ERROR: { status: 500, message: "Erro interno do servidor." },
};

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    detalhe: string,
    public readonly details: unknown = null,
    public readonly statusCode: number = ERROR_DEFAULTS[code].status
  ) {
    super(detalhe);
    this.name = "AppError";
  }
}
