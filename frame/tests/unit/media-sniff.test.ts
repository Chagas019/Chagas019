import { describe, expect, it } from "vitest";
import { sniffMime } from "@/server/services/media";

const pad = (b: number[]) => Buffer.concat([Buffer.from(b), Buffer.alloc(16)]);

describe("detecção de tipo por assinatura binária", () => {
  it("reconhece imagens e vídeos suportados", () => {
    expect(sniffMime(pad([0xff, 0xd8, 0xff, 0xe0]))?.mime).toBe("image/jpeg");
    expect(sniffMime(pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))?.mime).toBe("image/png");
    expect(sniffMime(Buffer.from("RIFF\0\0\0\0WEBPVP8 ...."))?.mime).toBe("image/webp");
    expect(sniffMime(Buffer.from("\0\0\0\x18ftypisom\0\0\0\0"))?.mime).toBe("video/mp4");
    expect(sniffMime(Buffer.from("\0\0\0\x14ftypqt  \0\0\0\0"))?.mime).toBe("video/quicktime");
    expect(sniffMime(pad([0x1a, 0x45, 0xdf, 0xa3]))?.mime).toBe("video/webm");
  });

  it("rejeita HTML, SVG e executáveis mesmo com extensão de imagem", () => {
    expect(sniffMime(Buffer.from("<html><script>alert(1)</script></html>"))).toBeNull();
    expect(sniffMime(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>'))).toBeNull();
    expect(sniffMime(pad([0x4d, 0x5a, 0x90, 0x00]))).toBeNull();
  });
});
