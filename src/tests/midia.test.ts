import { instalarMocks, JPEG, MP4, PNG } from "./helpers";
import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { enderecoPrivado } from "../utils/download";
import { prepararImagem } from "../tools/image.tool";
import { prepararVideo } from "../tools/video.tool";

// IPs públicos (documentação/exemplo) para não depender de DNS
const PUBLICO = "http://93.184.216.34";

describe("download seguro de mídia", () => {
  const { estado, restaurar } = instalarMocks();
  after(restaurar);

  it("bloqueia endereços internos e privados", () => {
    for (const ip of ["127.0.0.1", "10.0.0.5", "172.16.0.1", "192.168.1.10", "169.254.169.254", "0.0.0.0", "::1", "fc00::1", "fe80::1", "::ffff:127.0.0.1"]) {
      assert.equal(enderecoPrivado(ip), true, ip);
    }
    for (const ip of ["93.184.216.34", "8.8.8.8", "2606:2800:220:1:248:1893:25c8:1946"]) {
      assert.equal(enderecoPrivado(ip), false, ip);
    }
  });

  it("recusa URLs para localhost, rede interna e protocolos que não são http(s)", async () => {
    for (const url of ["http://localhost/a.png", "http://127.0.0.1/a.png", "http://169.254.169.254/latest/meta-data", "ftp://93.184.216.34/a.png", "file:///etc/passwd", "isso-nao-e-url"]) {
      await assert.rejects(prepararImagem(url), (e: any) => e.code === "INVALID_IMAGE_URL", url);
    }
  });

  it("aceita JPEG e PNG identificando o tipo pelos bytes", async () => {
    estado.midias[`${PUBLICO}/a`] = { body: PNG };
    estado.midias[`${PUBLICO}/b`] = { body: JPEG };
    assert.equal((await prepararImagem(`${PUBLICO}/a`)).mimeType, "image/png");
    assert.equal((await prepararImagem(`${PUBLICO}/b`)).mimeType, "image/jpeg");
  });

  it("recusa arquivo que não é imagem, mesmo com extensão .jpg", async () => {
    estado.midias[`${PUBLICO}/falsa.jpg`] = { body: Buffer.from("<html>não sou imagem</html>") };
    await assert.rejects(prepararImagem(`${PUBLICO}/falsa.jpg`), (e: any) => e.code === "INVALID_IMAGE_URL");
  });

  it("recusa imagem acima de 5 MB e resposta com erro HTTP", async () => {
    estado.midias[`${PUBLICO}/grande`] = { body: Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024)]) };
    estado.midias[`${PUBLICO}/404`] = { status: 404, body: Buffer.from("x") };
    await assert.rejects(prepararImagem(`${PUBLICO}/grande`), (e: any) => e.code === "INVALID_IMAGE_URL");
    await assert.rejects(prepararImagem(`${PUBLICO}/404`), (e: any) => e.code === "INVALID_IMAGE_URL");
  });

  it("aceita MP4 e recusa imagem enviada como vídeo", async () => {
    estado.midias[`${PUBLICO}/v.mp4`] = { body: MP4 };
    estado.midias[`${PUBLICO}/nao-video`] = { body: PNG };
    assert.equal((await prepararVideo(`${PUBLICO}/v.mp4`)).mimeType, "video/mp4");
    await assert.rejects(prepararVideo(`${PUBLICO}/nao-video`), (e: any) => e.code === "INVALID_VIDEO_URL");
  });
});
