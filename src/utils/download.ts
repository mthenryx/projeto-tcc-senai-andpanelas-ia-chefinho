import dns from "node:dns/promises";
import net from "node:net";
import { env } from "../config/env";

// Erro de download com um motivo legível (as tools o convertem para o código de erro certo)
export class DownloadError extends Error {}

const MAX_REDIRECTS = 3;

function ipv4Privado(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // CGNAT
    (a === 169 && b === 254) || // link-local / metadata de nuvem
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224 // multicast / reservado
  );
}

function ipv6Privado(ip: string): boolean {
  const ipv4Mapeado = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (ipv4Mapeado) return ipv4Privado(ipv4Mapeado[1]);
  if (/^::ffff:/i.test(ip)) return true; // forma hexadecimal de IPv4 mapeado: bloqueia por segurança

  const primeiro = parseInt(ip.split(":")[0] || "0", 16);
  return (
    ip === "::" ||
    ip === "::1" ||
    (primeiro & 0xfe00) === 0xfc00 || // fc00::/7 (privado)
    (primeiro & 0xffc0) === 0xfe80 || // fe80::/10 (link-local)
    (primeiro & 0xff00) === 0xff00 // multicast
  );
}

export function enderecoPrivado(ip: string): boolean {
  const versao = net.isIP(ip);
  if (versao === 4) return ipv4Privado(ip);
  if (versao === 6) return ipv6Privado(ip);
  return true;
}

// Evita que uma URL aponte o servidor para a rede interna (SSRF).
// Observação: valida o DNS antes da requisição; não protege contra "DNS rebinding" avançado.
async function garantirDestinoPublico(url: URL): Promise<void> {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new DownloadError("apenas URLs http/https são aceitas");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host.toLowerCase() === "localhost" || host.toLowerCase().endsWith(".localhost")) {
    throw new DownloadError("endereço não permitido");
  }
  let enderecos: { address: string }[];
  try {
    enderecos = await dns.lookup(host, { all: true });
  } catch {
    throw new DownloadError("não foi possível resolver o endereço da URL");
  }
  if (enderecos.length === 0 || enderecos.some((e) => enderecoPrivado(e.address))) {
    throw new DownloadError("endereço não permitido");
  }
}

export interface OpcoesDownload {
  maxBytes: number;
  accept: string;
}

export async function baixarArquivo(urlTexto: string, opcoes: OpcoesDownload): Promise<Buffer> {
  let url: URL;
  try {
    url = new URL(urlTexto);
  } catch {
    throw new DownloadError("a URL é inválida");
  }

  const sinal = AbortSignal.timeout(env.mediaTimeoutMs);

  for (let tentativa = 0; tentativa <= MAX_REDIRECTS; tentativa++) {
    await garantirDestinoPublico(url);

    let res: Response;
    try {
      res = await fetch(url.href, {
        redirect: "manual",
        signal: sinal,
        headers: { accept: opcoes.accept, "user-agent": "ChefinhoBot/1.0" },
      });
    } catch (err) {
      const nome = (err as { name?: string }).name;
      throw new DownloadError(
        nome === "TimeoutError" || nome === "AbortError"
          ? "o servidor da mídia demorou demais para responder"
          : "não foi possível acessar a URL"
      );
    }

    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const destino = res.headers.get("location");
      if (!destino) throw new DownloadError("redirecionamento inválido");
      url = new URL(destino, url);
      continue;
    }
    if (!res.ok) throw new DownloadError(`o servidor da mídia respondeu com status ${res.status}`);

    const declarado = Number(res.headers.get("content-length"));
    if (declarado > opcoes.maxBytes) throw new DownloadError("arquivo maior que o limite permitido");

    const leitor = res.body?.getReader();
    if (!leitor) throw new DownloadError("resposta vazia");

    const partes: Uint8Array[] = [];
    let total = 0;
    try {
      for (;;) {
        const { done, value } = await leitor.read();
        if (done) break;
        total += value.byteLength;
        if (total > opcoes.maxBytes) {
          await leitor.cancel();
          throw new DownloadError("arquivo maior que o limite permitido");
        }
        partes.push(value);
      }
    } catch (err) {
      if (err instanceof DownloadError) throw err;
      throw new DownloadError("falha ao baixar o arquivo");
    }
    if (total === 0) throw new DownloadError("arquivo vazio");
    return Buffer.concat(partes);
  }

  throw new DownloadError("redirecionamentos demais");
}
