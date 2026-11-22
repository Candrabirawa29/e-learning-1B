import { test, describe } from "node:test";
import assert from "node:assert";
import { evaluatePasswordRules, isPasswordFullyCompliant } from "../src/lib/auth/password-rules";
import { changePasswordSchema } from "../src/lib/validations";

describe("Password Rules & Zod Schema Evaluation", () => {
  test("Empty password: all 4 requirements must be unmet (red)", () => {
    const evalResult = evaluatePasswordRules("");
    assert.strictEqual(evalResult.metCount, 0);
    assert.strictEqual(evalResult.rules.find((r) => r.id === "min8")?.isMet, false);
    assert.strictEqual(evalResult.rules.find((r) => r.id === "hasUpper")?.isMet, false);
    assert.strictEqual(evalResult.rules.find((r) => r.id === "hasLower")?.isMet, false);
    assert.strictEqual(evalResult.rules.find((r) => r.id === "hasNumber")?.isMet, false);
    assert.strictEqual(evalResult.isAllMet, false);
  });

  test("Only length met: length >= 8 but no uppercase or numbers", () => {
    const evalResult = evaluatePasswordRules("abcdefgh");
    assert.strictEqual(evalResult.rules.find((r) => r.id === "min8")?.isMet, true);
    assert.strictEqual(evalResult.rules.find((r) => r.id === "hasLower")?.isMet, true);
    assert.strictEqual(evalResult.rules.find((r) => r.id === "hasUpper")?.isMet, false);
    assert.strictEqual(evalResult.rules.find((r) => r.id === "hasNumber")?.isMet, false);
    assert.strictEqual(evalResult.metCount, 2);
    assert.strictEqual(evalResult.isAllMet, false);
  });

  test("Only uppercase + lowercase met: no number and length < 8", () => {
    const evalResult = evaluatePasswordRules("Abc");
    assert.strictEqual(evalResult.rules.find((r) => r.id === "min8")?.isMet, false);
    assert.strictEqual(evalResult.rules.find((r) => r.id === "hasUpper")?.isMet, true);
    assert.strictEqual(evalResult.rules.find((r) => r.id === "hasLower")?.isMet, true);
    assert.strictEqual(evalResult.rules.find((r) => r.id === "hasNumber")?.isMet, false);
    assert.strictEqual(evalResult.metCount, 2);
    assert.strictEqual(evalResult.isAllMet, false);
  });

  test("All 4 requirements met: passes both helper and changePasswordSchema", () => {
    const validPw = "Password123";
    const evalResult = evaluatePasswordRules(validPw);
    assert.strictEqual(evalResult.metCount, 4);
    assert.strictEqual(evalResult.isAllMet, true);
    assert.strictEqual(isPasswordFullyCompliant(validPw), true);

    const zodResult = changePasswordSchema.safeParse({
      newPassword: validPw,
      confirmPassword: validPw,
    });
    assert.strictEqual(zodResult.success, true);
  });

  test("Confirmation password matching check", () => {
    const validPw = "Password123";
    const evalWithMismatch = evaluatePasswordRules(validPw, "Different123");
    assert.strictEqual(evalWithMismatch.isConfirmMatching, false);

    const evalWithMatch = evaluatePasswordRules(validPw, validPw);
    assert.strictEqual(evalWithMatch.isConfirmMatching, true);
  });
});
