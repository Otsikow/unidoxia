import { describe, it, expect, vi } from "vitest";
import { fetchPublicRows } from "./public-catalogue.mjs";
const config = {
  endpoint: "https://fixture.invalid",
  key: "synthetic-public-key",
};
describe("public build catalogue read recovery", () => {
  it("retries a transient connection error and keeps the actual rows", async () => {
    const request = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Connection timed out"))
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ id: "fixture" }]), { status: 200 }),
      );
    expect(
      await fetchPublicRows("programs?select=id", config, request),
    ).toEqual([{ id: "fixture" }]);
    expect(request).toHaveBeenCalledTimes(2);
  });
  it("does not retry an authorisation failure", async () => {
    const request = vi
      .fn()
      .mockResolvedValue(new Response("{}", { status: 401 }));
    await expect(
      fetchPublicRows("programs?select=id", config, request),
    ).rejects.toThrow("HTTP 401");
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("stops after three transient failures instead of emitting an empty catalogue", async () => {
    const request = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(new Response("{}", { status: 503 })),
      );
    await expect(
      fetchPublicRows("programs?select=id", config, request),
    ).rejects.toThrow("HTTP 503");
    expect(request).toHaveBeenCalledTimes(3);
  });
  it("rejects a malformed successful response", async () => {
    const request = vi
      .fn()
      .mockResolvedValue(new Response("{}", { status: 200 }));
    await expect(
      fetchPublicRows("programs?select=id", config, request),
    ).rejects.toThrow("Invalid public SEO response");
  });
});
