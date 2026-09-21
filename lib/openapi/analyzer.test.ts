import { describe, expect, it } from "vitest";
import { analyzeOpenApi } from "./analyzer";

describe("analyzeOpenApi", () => {
  it("scores a documented secured API", () => {
    const result = analyzeOpenApi({ openapi: "3.1.0", info: { title: "Device API" }, security: [{ oauth: [] }], paths: { "/devices": { get: { summary: "List devices", responses: { "200": { description: "OK" } } } } }, components: { securitySchemes: { oauth: { type: "oauth2" } }, schemas: {} } }, new Date("2026-01-01"));
    expect(result.score).toBe(100);
    expect(result.stats.operations).toBe(1);
  });

  it("flags missing safeguards and external refs without fetching them", () => {
    const result = analyzeOpenApi({ openapi: "3.0.3", info: { title: "Unsafe API" }, paths: { "/data": { get: { security: [], responses: {}, requestBody: { $ref: "https://internal.example/spec.yaml" } } } } });
    expect(result.score).toBeLessThan(50);
    expect(result.findings.find((item) => item.id === "external-refs")?.severity).toBe("warning");
  });
});
