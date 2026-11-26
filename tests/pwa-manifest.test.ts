import { test, describe } from "node:test";
import assert from "node:assert";
import * as fs from "node:fs";
import * as path from "node:path";
import manifest from "../src/app/manifest";
import { config as middlewareConfig } from "../src/middleware";

describe("PWA Manifest, Icons & Public Access Verification", () => {
  test("1. Manifest memiliki seluruh field wajib dengan nilai yang sesuai", () => {
    const m = manifest();
    assert.strictEqual(m.name, "E-Learning 1-B");
    assert.strictEqual(m.short_name, "E-Learning 1-B");
    assert.ok(m.description && m.description.length > 10, "description wajib diisi");
    assert.strictEqual(m.start_url, "/home");
    assert.strictEqual(m.scope, "/");
    assert.strictEqual(m.display, "standalone");
    assert.strictEqual(m.background_color, "#ffffff");
    assert.strictEqual(m.theme_color, "#ffffff");
    assert.strictEqual(m.lang, "id");
    assert.ok(Array.isArray(m.icons) && m.icons.length >= 3, "minimal harus ada icon 192, 512, dan maskable 512");
  });

  test("2. Seluruh icon pada manifest dan apple-touch-icon tersedia di /public dan merupakan PNG valid", () => {
    const m = manifest();
    const publicDir = path.join(process.cwd(), "public");
    const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

    for (const icon of m.icons || []) {
      const rel = icon.src.replace(/^\//, "");
      const fullPath = path.join(publicDir, rel);
      assert.ok(fs.existsSync(fullPath), `File icon tidak ditemukan di disk: ${fullPath}`);
      const buf = fs.readFileSync(fullPath);
      assert.ok(buf.length > 24, `File icon terlalu kecil: ${fullPath}`);
      assert.ok(
        buf.subarray(0, 4).equals(pngSignature),
        `File ${fullPath} harus berformat PNG asli`
      );
      const [expectedW, expectedH] = String(icon.sizes).split("x").map(Number);
      assert.strictEqual(buf.readUInt32BE(16), expectedW, `Lebar ${rel} harus ${expectedW}`);
      assert.strictEqual(buf.readUInt32BE(20), expectedH, `Tinggi ${rel} harus ${expectedH}`);
    }

    const appleIconPath = path.join(publicDir, "apple-touch-icon.png");
    assert.ok(fs.existsSync(appleIconPath), "apple-touch-icon.png harus ada di public/");
    const appleBuf = fs.readFileSync(appleIconPath);
    assert.ok(appleBuf.subarray(0, 4).equals(pngSignature), "apple-touch-icon.png harus berformat PNG asli");
    assert.strictEqual(appleBuf.readUInt32BE(16), 180, "Lebar apple-touch-icon.png harus 180");
    assert.strictEqual(appleBuf.readUInt32BE(20), 180, "Tinggi apple-touch-icon.png harus 180");

    const hasMaskable512 = (m.icons || []).some(
      (i) => i.sizes === "512x512" && i.purpose === "maskable"
    );
    assert.strictEqual(hasMaskable512, true, "Harus menyertakan icon maskable 512x512");
  });

  test("3. Middleware matcher mengecualikan manifest.webmanifest dan file .png agar dapat diakses tanpa login", () => {
    const patternStr = middlewareConfig.matcher[0];
    // Next.js matcher excludes static paths inside negative lookahead
    assert.ok(
      patternStr.includes("manifest\\.webmanifest"),
      "Middleware matcher harus mengecualikan manifest.webmanifest"
    );
    assert.ok(
      patternStr.includes("png"),
      "Middleware matcher harus mengecualikan file .png"
    );
  });
});
