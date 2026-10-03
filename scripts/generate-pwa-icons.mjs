import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

// Conserva el logotipo SVG existente; no genera una identidad visual nueva.
const source = await readFile(new URL("../src/app/icon.svg", import.meta.url));
const directory = new URL("../public/icons/", import.meta.url);
await mkdir(directory, { recursive: true });
for (const [name, size, padding] of [
  ["icon-192.png", 192, 0],
  ["icon-512.png", 512, 0],
  ["maskable-512.png", 512, 64],
  ["apple-touch-icon.png", 180, 0],
]) {
  const content = await sharp(source).resize(size - padding * 2).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: "#ffffff" } })
    .composite([{ input: content, gravity: "centre" }])
    .png()
    .toFile(fileURLToPath(new URL(name, directory)));
}
console.log("Iconos PWA generados a partir del SVG de Econolab.");
