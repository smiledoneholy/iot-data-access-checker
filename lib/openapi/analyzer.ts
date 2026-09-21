import { z } from "zod";
import type { AnalysisResult, Finding } from "./types";

const operationMethods = ["get", "post", "put", "patch", "delete", "options", "head", "trace"] as const;
const documentSchema = z.object({
  openapi: z.string().regex(/^3\./, "Only OpenAPI 3.x documents are supported"),
  info: z.object({ title: z.string().min(1).max(200) }).passthrough(),
  paths: z.record(z.string(), z.unknown()).default({}),
  components: z.object({
    securitySchemes: z.record(z.string(), z.unknown()).optional(),
    schemas: z.record(z.string(), z.unknown()).optional(),
  }).passthrough().optional(),
  security: z.array(z.record(z.string(), z.unknown())).optional(),
}).passthrough();

function hasExternalReference(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasExternalReference);
  if (!value || typeof value !== "object") return false;
  return Object.entries(value).some(([key, child]) =>
    key === "$ref" && typeof child === "string" && !child.startsWith("#/")
      ? true
      : hasExternalReference(child),
  );
}

export function analyzeOpenApi(input: unknown, now = new Date()): AnalysisResult {
  const document = documentSchema.parse(input);
  const pathEntries = Object.entries(document.paths);
  const operations = pathEntries.flatMap(([path, item]) => {
    if (!item || typeof item !== "object") return [];
    return operationMethods.flatMap((method) => {
      const operation = (item as Record<string, unknown>)[method];
      return operation && typeof operation === "object" ? [{ path, method, operation: operation as Record<string, unknown> }] : [];
    });
  });
  const findings: Finding[] = [];
  const securitySchemes = Object.keys(document.components?.securitySchemes ?? {});
  findings.push(securitySchemes.length
    ? { id: "security-schemes", title: "Authentication is documented", severity: "pass", detail: `${securitySchemes.length} security scheme(s) declared.` }
    : { id: "security-schemes", title: "No authentication scheme", severity: "critical", detail: "The document does not declare an OpenAPI security scheme.", recommendation: "Document OAuth 2.0, API keys, or another appropriate access mechanism." });

  const unsecured = operations.filter(({ operation }) => Array.isArray(operation.security) && operation.security.length === 0);
  findings.push(unsecured.length
    ? { id: "unsecured-operations", title: "Explicitly unsecured operations", severity: "warning", detail: `${unsecured.length} operation(s) explicitly override security with an empty requirement.`, recommendation: "Verify that public access is intentional and document the rationale." }
    : { id: "unsecured-operations", title: "No explicit security override", severity: "pass", detail: "No operation explicitly disables inherited security." });

  const undocumentedResponses = operations.filter(({ operation }) => {
    const responses = operation.responses;
    return !responses || typeof responses !== "object" || Object.keys(responses).length === 0;
  });
  findings.push(undocumentedResponses.length
    ? { id: "responses", title: "Missing response documentation", severity: "critical", detail: `${undocumentedResponses.length} operation(s) have no documented response.`, recommendation: "Describe success and relevant error responses, including schemas." }
    : { id: "responses", title: "Responses are documented", severity: "pass", detail: "Every operation declares at least one response." });

  const missingDescriptions = operations.filter(({ operation }) => !operation.summary && !operation.description);
  findings.push(missingDescriptions.length
    ? { id: "descriptions", title: "Operation purpose is unclear", severity: "warning", detail: `${missingDescriptions.length} operation(s) have neither a summary nor a description.`, recommendation: "Explain the data exposed and the operation's intended use." }
    : { id: "descriptions", title: "Operations are described", severity: "pass", detail: "Every operation includes a summary or description." });

  if (hasExternalReference(document)) {
    findings.push({ id: "external-refs", title: "External references blocked", severity: "warning", detail: "The document contains non-local $ref values. They were not fetched or resolved.", recommendation: "Bundle referenced schemas locally before analysis." });
  } else {
    findings.push({ id: "external-refs", title: "References remain local", severity: "pass", detail: "No external $ref was found." });
  }

  const penalty = findings.reduce((sum, finding) => sum + (finding.severity === "critical" ? 25 : finding.severity === "warning" ? 10 : 0), 0);
  return {
    documentTitle: document.info.title,
    openapiVersion: document.openapi,
    score: Math.max(0, 100 - penalty),
    generatedAt: now.toISOString(),
    stats: { paths: pathEntries.length, operations: operations.length, schemas: Object.keys(document.components?.schemas ?? {}).length },
    findings,
    disclaimer: "Technical documentation analysis only. This report is not legal advice, a certification, or proof of compliance with the EU Data Act or any other law.",
  };
}
