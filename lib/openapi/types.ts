export type FindingSeverity = "pass" | "warning" | "critical";

export interface Finding {
  id: string;
  title: string;
  severity: FindingSeverity;
  detail: string;
  recommendation?: string;
}

export interface AnalysisResult {
  documentTitle: string;
  openapiVersion: string;
  score: number;
  generatedAt: string;
  stats: { paths: number; operations: number; schemas: number };
  findings: Finding[];
  disclaimer: string;
}
