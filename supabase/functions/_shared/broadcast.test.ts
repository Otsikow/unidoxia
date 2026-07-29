import { describe, expect, it } from "vitest";
import { escapeHtml, renderTemplateVariables, safeHttpsUrl } from "./broadcast";

describe("broadcast dispatch helpers", () => {
  it("renders known variables without leaking unknown placeholders", () => {
    expect(renderTemplateVariables("Hello {{ first_name }} — {{missing}}", { first_name: "Eric" }))
      .toBe("Hello Eric — ");
  });

  it("escapes administrator-entered HTML before email rendering", () => {
    expect(escapeHtml(`<img src=x onerror="alert('x')">`))
      .toBe("&lt;img src=x onerror=&quot;alert(&#039;x&#039;)&quot;&gt;");
  });

  it("allows HTTPS CTAs and rejects unsafe or malformed links", () => {
    expect(safeHttpsUrl("https://unidoxia.com/apply")).toBe("https://unidoxia.com/apply");
    expect(safeHttpsUrl("javascript:alert(1)")).toBeNull();
    expect(safeHttpsUrl("not a URL")).toBeNull();
  });
});
