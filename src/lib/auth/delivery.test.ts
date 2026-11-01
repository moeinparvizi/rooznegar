import { describe, expect, it } from "vitest";
import { deliveryFor, linkNotice, mapAuthEvent } from "./delivery";
import type { AuthIntent } from "./types";

const intents: AuthIntent[] = ["signin", "signup", "recovery"];

describe("deliveryFor", () => {
  it("sends email links once Supabase is connected", () => {
    expect(deliveryFor("supabase")).toBe("link");
  });

  it("keeps six-digit codes for the local demo", () => {
    expect(deliveryFor("demo")).toBe("code");
    expect(deliveryFor("unavailable")).toBe("code");
  });
});

describe("linkNotice", () => {
  it("points at the inbox for every intent", () => {
    for (const intent of intents) {
      expect(linkNotice(intent)).toContain("ایمیل");
    }
  });

  it("names the next action for recovery", () => {
    expect(linkNotice("recovery")).toContain("رمز");
  });
});

describe("mapAuthEvent", () => {
  it("flags the password-recovery handoff", () => {
    expect(mapAuthEvent("PASSWORD_RECOVERY")).toBe("passwordRecovery");
    expect(mapAuthEvent("SIGNED_IN")).toBe("signedIn");
    expect(mapAuthEvent("SIGNED_OUT")).toBe("signedOut");
    expect(mapAuthEvent("INITIAL_SESSION")).toBe("initial");
    expect(mapAuthEvent("TOKEN_REFRESHED")).toBe("other");
  });
});
