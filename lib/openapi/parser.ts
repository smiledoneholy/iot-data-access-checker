import yaml from "js-yaml";

export const MAX_SPEC_BYTES = 2 * 1024 * 1024;

export function parseOpenApiText(text: string): unknown {
  if (!text.trim()) throw new Error("The document is empty.");
  if (new Blob([text]).size > MAX_SPEC_BYTES) throw new Error("The document exceeds the 2 MB limit.");
  const parsed = yaml.load(text, { json: true });
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Expected an OpenAPI JSON or YAML object.");
  return parsed;
}
