import { test, describe } from "node:test";
import assert from "node:assert";
import * as fs from "node:fs";
import * as path from "node:path";

describe("Document Picture-in-Picture (PiP) Architecture & Style Integrity", () => {
  const portalFilePath = path.join(
    process.cwd(),
    "src/components/focus/PictureInPicturePortal.tsx"
  );
  const contextFilePath = path.join(
    process.cwd(),
    "src/components/focus/FocusTimerContext.tsx"
  );

  const portalContent = fs.readFileSync(portalFilePath, "utf-8");
  const contextContent = fs.readFileSync(contextFilePath, "utf-8");

  test("1. Komponen PiP tidak menggunakan posisi fixed dan tidak bergantung breakpoint", () => {
    // Memastikan tidak memakai posisi fixed (yang biasa dipakai widget floating in-app)
    assert.doesNotMatch(
      portalContent,
      /className=.*(?:fixed\s+bottom-|bottom-\d+\s+right-\d+)/,
      "PiP tidak boleh memakai posisi fixed in-app (seperti fixed bottom-4 right-4)"
    );

    // Memastikan tidak ada kelas responsif yang menyembunyikan konten penting di layar sempit dalam className
    assert.doesNotMatch(
      portalContent,
      /className=[^{>]*\b(?:hidden\s+(?:sm|md|lg):|(?:sm|md|lg):hidden)\b/,
      "PiP tidak boleh menyembunyikan konten dengan breakpoint desktop (hidden md: / hidden sm:)"
    );

    // Layout harus penuh jendela (h-full w-full flex flex-col justify-between)
    assert.match(
      portalContent,
      /h-full\s+w-full\s+flex\s+flex-col\s+justify-between/,
      "PiP harus menggunakan layout penuh jendela fleksibel"
    );
  });

  test("2. Salin gaya styleSheets dibungkus try/catch per sheet dan menyalin <style> dev mode serta atribut", () => {
    // Setiap sheet harus di-try/catch tersendiri
    assert.match(
      contextContent,
      /document\.styleSheets\s*\)\.forEach\(/,
      "Harus melakukan iterasi document.styleSheets"
    );

    assert.match(
      contextContent,
      /cssRules[\s\S]*(?:join|\.map)[\s\S]*textContent/,
      "Harus membaca cssRules dan membuat tag style bila tersedia"
    );

    assert.match(
      contextContent,
      /sheet\.href[\s\S]*createElement\(["']link["']\)/,
      "Harus fallback ke link stylesheet bila cssRules gagal dibaca dan href ada"
    );

    // Menyalin semua <style> di head (mode dev Next.js)
    assert.match(
      contextContent,
      /document\.head\.querySelectorAll\(["']style["']\)/,
      "Harus menyalin tag style di document.head untuk mode dev"
    );

    // Menyalin atribut class, style, dan data-* dari html dan body
    assert.match(
      contextContent,
      /document\.documentElement\.attributes[\s\S]*class[\s\S]*style[\s\S]*data-/,
      "Harus menyalin atribut class, style, dan data-* dari <html>"
    );
    assert.match(
      contextContent,
      /document\.body\.attributes[\s\S]*class[\s\S]*style[\s\S]*data-/,
      "Harus menyalin atribut class, style, dan data-* dari <body>"
    );
  });

  test("3. Container dipasang sebelum merender dan body diberi inline style minimal", () => {
    // Minimal inline style pada body PiP
    assert.match(
      contextContent,
      /win\.document\.body\.style\.margin\s*=\s*["']0["']/,
      "Body PiP harus disetel margin 0"
    );
    assert.match(
      contextContent,
      /win\.document\.body\.style\.backgroundColor/,
      "Body PiP harus disetel warna latar dari computed style"
    );
    assert.match(
      contextContent,
      /win\.document\.body\.style\.color/,
      "Body PiP harus disetel warna teks dari computed style"
    );

    // Container root dibuat dan dipasang ke body PiP
    assert.match(
      contextContent,
      /win\.document\.createElement\(["']div["']\)[\s\S]*pip-root[\s\S]*win\.document\.body\.appendChild/,
      "Container root #pip-root harus dibuat dan dipasang sebelum render portal"
    );
  });

  test("4. Teks cadangan 'Menghubungkan timer...' dan error boundary tersedia", () => {
    // Teks cadangan saat timer belum siap
    assert.match(
      portalContent,
      /Menghubungkan timer\.\.\./,
      "Harus menampilkan teks cadangan 'Menghubungkan timer...' bila state belum siap"
    );

    // Logging error ke console
    assert.match(
      portalContent,
      /console\.error\(["']PiP render error:["']/,
      "Harus mencatat error render ke console"
    );
  });

  test("5. Pembersihan pada event pagehide", () => {
    assert.match(
      contextContent,
      /win\.addEventListener\(["']pagehide["'],\s*handlePageHide\)/,
      "Harus membersihkan state pada event pagehide dari PiP window"
    );
    assert.match(
      contextContent,
      /window\.addEventListener\(["']pagehide["'],\s*handleMainUnload/,
      "Harus membersihkan PiP window saat window utama di-unload"
    );
  });
});
