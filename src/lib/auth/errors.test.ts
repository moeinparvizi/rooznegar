import { describe, expect, it } from "vitest";
import { mapAuthError } from "./errors";

describe("mapAuthError", () => {
  it("maps bad credentials", () => {
    expect(mapAuthError({ code: "invalid_credentials" })).toMatchObject({
      code: "invalid_credentials",
      ok: false,
    });
  });

  it("maps unconfirmed email", () => {
    expect(mapAuthError({ message: "Email not confirmed" }).code).toBe(
      "email_unconfirmed",
    );
  });

  it("maps network failures", () => {
    expect(mapAuthError(new TypeError("Failed to fetch")).code).toBe("network");
  });

  it("maps expired and invalid OTP", () => {
    expect(mapAuthError({ code: "otp_expired" }).code).toBe("expired_code");
    expect(mapAuthError({ message: "Invalid token" }).code).toBe("invalid_code");
  });

  it("maps rate limits", () => {
    expect(mapAuthError({ status: 429 }).code).toBe("rate_limited");
  });

  it("falls back to a calm unknown message", () => {
    const result = mapAuthError(new Error("???"));
    expect(result.code).toBe("unknown");
    expect(result.message).toContain("دوباره");
  });
});
