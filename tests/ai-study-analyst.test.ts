import { test, describe } from "node:test";
import assert from "node:assert";
import * as fs from "node:fs";
import * as path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  buildAiSystemInstruction,
  normalizePartnerConfig,
  hasUnlimitedAiQuota,
  DEFAULT_AI_PARTNER_CONFIG,
} from "../src/lib/analytics/ai-persona";
import { SafeMarkdown, normalizeLatexDelimiters } from "../src/components/glossary/SafeMarkdown";

describe("AI Study Analyst: Markdown/LaTeX, Mode Coach & Pacar, Unlimited Admin, Chat Persistence", () => {
  test("1. normalizeLatexDelimiters mengubah \\[...\\] & \\(...) menjadi $$...$$ & $...$ tanpa menyentuh code block", () => {
    const sample = [
      "Tren berada dalam rentang $\\pm$15%.",
      "Rumus rata-rata: \\( \\bar{x} = \\frac{1}{n} \\sum x_i \\).",
      "\\[ E = mc^2 \\]",
      "```latex",
      "\\[ jangan_diubah \\]",
      "```",
      "Inline code `\\(jangan\\)` tetap aman.",
    ].join("\n");

    const normalized = normalizeLatexDelimiters(sample);
    assert.ok(normalized.includes("$\\pm$15%"));
    assert.ok(normalized.includes("$\\bar{x} = \\frac{1}{n} \\sum x_i$"));
    assert.ok(normalized.includes("$$\nE = mc^2\n$$"));
    assert.ok(normalized.includes("\\[ jangan_diubah \\]"));
    assert.ok(normalized.includes("`\\(jangan\\)`"));
  });

  test("2. SafeMarkdown merender heading Markdown, bold, dan ekspresi LaTeX dengan KaTeX tanpa teks mentah", () => {
    const md = "### 1. Konsistensi & Streak\n* **Streak Saat Ini:** **26 hari** (rentang $\\pm$15%).";
    const html = renderToStaticMarkup(React.createElement(SafeMarkdown, { content: md }));

    assert.ok(html.includes("<h3"), "Heading Markdown harus dirender menjadi <h3>");
    assert.ok(html.includes("<strong>Streak Saat Ini:</strong>"), "Bold Markdown harus dirender menjadi <strong>");
    assert.ok(html.includes("class=\"katex\""), "Ekspresi LaTeX harus dirender oleh KaTeX");
    assert.ok(!html.includes("### 1."), "Sintaks mentah ### tidak boleh tersisa");
  });

  test("3. buildAiSystemInstruction mendukung mode COACH & PARTNER dengan konfigurasi kustom serta aturan keamanan", () => {
    const coachPrompt = buildAiSystemInstruction("COACH");
    assert.ok(coachPrompt.includes("AI Study Analyst / Coach"));
    assert.ok(coachPrompt.includes("BERDASARKAN DATA"));
    assert.ok(coachPrompt.includes("ISOLASI KEAMANAN"));

    const partnerPrompt = buildAiSystemInstruction("PARTNER", {
      partnerName: "Nana",
      gender: "CEWEK",
      userCall: "Kak Damar",
      personality: "TSUNDERE",
      languageStyle: "AKU_KAMU",
      affectionLevel: "HANGAT",
      emojiLevel: "SEDANG",
      customInstructions: "Ingatkan minum air saat belajar larut malam.",
    });

    assert.ok(partnerPrompt.includes("Nana"));
    assert.ok(partnerPrompt.includes("Kak Damar"));
    assert.ok(partnerPrompt.includes("tsundere"));
    assert.ok(partnerPrompt.includes("Ingatkan minum air saat belajar larut malam."));
    assert.ok(partnerPrompt.includes("BERDASARKAN DATA"), "Mode Pacar tetap wajib berbasis data asli");
    assert.ok(partnerPrompt.includes("ISOLASI KEAMANAN"), "Mode Pacar tetap wajib isolasi keamanan");
  });

  test("4. normalizePartnerConfig mengembalikan default aman jika input kosong/tidak valid", () => {
    assert.deepStrictEqual(normalizePartnerConfig(null), DEFAULT_AI_PARTNER_CONFIG);
    assert.deepStrictEqual(normalizePartnerConfig({ gender: "INVALID" }), DEFAULT_AI_PARTNER_CONFIG);
  });

  test("5. hasUnlimitedAiQuota hanya true untuk ADMIN aktif (dan false untuk MEMBER/PJ/View-As)", () => {
    assert.strictEqual(hasUnlimitedAiQuota({ realRole: "ADMIN", effectiveRole: "ADMIN" }), true);
    assert.strictEqual(hasUnlimitedAiQuota({ realRole: "ADMIN", effectiveRole: "MEMBER" }), false);
    assert.strictEqual(hasUnlimitedAiQuota({ realRole: "PJ", effectiveRole: "PJ" }), false);
    assert.strictEqual(hasUnlimitedAiQuota({ realRole: "MEMBER", effectiveRole: "MEMBER" }), false);
    assert.strictEqual(hasUnlimitedAiQuota(null), false);
  });

  test("6. StudyCoachChat tidak lagi memiliki tombol Pengaturan redundan dan memakai SafeMarkdown + endpoint persistensi DB", () => {
    const chatSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/analytics/StudyCoachChat.tsx"),
      "utf-8"
    );
    assert.ok(!chatSource.includes("openPreferenceDialog"), "Tombol Pengaturan duplikat harus dihapus");
    assert.ok(chatSource.includes("<SafeMarkdown"), "StudyCoachChat harus merender balasan dengan SafeMarkdown");
    assert.ok(chatSource.includes("DELETE"), "Reset harus menghapus riwayat tersimpan melalui DELETE /api/study-coach");
    assert.ok(chatSource.includes("PartnerConfigDialog"), "StudyCoachChat harus mendukung konfigurasi Mode Pacar");
  });
});
