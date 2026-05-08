import * as fs from "node:fs";
import * as path from "node:path";

export type TemplateTokens = Record<string, string | number>;

export function renderTemplate(relativePath: string, tokens: TemplateTokens): string {
  const templatePath = path.join(getTemplateRoot(), relativePath);
  const content = fs.readFileSync(templatePath, "utf8");
  const formattedTokens = formatTokensForTemplate(relativePath, tokens);

  return Object.entries(formattedTokens).reduce(
    (rendered, [token, value]) => rendered.split(token).join(value),
    content
  );
}

function getTemplateRoot(): string {
  return process.env.HTML_TO_MAC_WEBKIT_APP_TEMPLATE_DIR ??
    path.resolve(__dirname, "..", "templates", "swift-webkit-app");
}

function formatTokensForTemplate(relativePath: string, tokens: TemplateTokens): Record<string, string> {
  const kind = getTemplateKind(relativePath);
  const formatted: Record<string, string> = {};

  for (const [token, rawValue] of Object.entries(tokens)) {
    const value = String(rawValue);
    formatted[token] = formatTokenValue(kind, value);
  }

  return formatted;
}

function getTemplateKind(relativePath: string): "swift" | "xml" | "json" | "shell" | "raw" {
  if (relativePath.endsWith(".swift.template") || relativePath === "Package.swift.template") {
    return "swift";
  }

  if (relativePath.endsWith(".plist.template")) {
    return "xml";
  }

  if (relativePath.endsWith(".json.template")) {
    return "json";
  }

  if (relativePath.endsWith(".sh.template")) {
    return "shell";
  }

  return "raw";
}

function formatTokenValue(kind: "swift" | "xml" | "json" | "shell" | "raw", value: string): string {
  switch (kind) {
    case "swift":
      return escapeSwiftStringInner(value);
    case "xml":
      return escapeXml(value);
    case "json":
      return JSON.stringify(value).slice(1, -1);
    case "shell":
      return shellSingleQuote(value);
    case "raw":
      return value;
  }
}

function escapeSwiftStringInner(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, "\\\"")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t")
    .replace(/\0/g, "\\0");
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function shellSingleQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}
