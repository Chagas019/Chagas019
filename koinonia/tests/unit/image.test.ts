import { describe, expect, it } from "vitest";
import { detectImageType } from "@/lib/image";

const blob = (bytes: number[]) => new Blob([new Uint8Array(bytes)]);

describe("detectImageType (magic bytes)", () => {
  it("reconhece PNG, JPEG e WebP", async () => {
    expect(await detectImageType(blob([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]))).toBe("png");
    expect(await detectImageType(blob([0xff, 0xd8, 0xff, 0xe0]))).toBe("jpg");
    expect(await detectImageType(blob([...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WEBP")]))).toBe("webp");
  });
  it("rejeita SVG/HTML disfarçados de imagem", async () => {
    expect(await detectImageType(blob([...Buffer.from("<svg onload=alert(1)>")]))).toBeNull();
    expect(await detectImageType(blob([...Buffer.from("<!doctype html>")]))).toBeNull();
  });
});
