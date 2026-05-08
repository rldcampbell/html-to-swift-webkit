import * as path from "node:path";
import { DerivedNames, UserFacingError } from "./types";

interface DeriveNamesInput {
  htmlPath: string;
  htmlTitle?: string;
  name?: string;
  productName?: string;
  bundleId?: string;
}

const SWIFT_RESERVED_WORDS = new Set([
  "associatedtype",
  "class",
  "deinit",
  "enum",
  "extension",
  "fileprivate",
  "func",
  "import",
  "init",
  "inout",
  "internal",
  "let",
  "open",
  "operator",
  "private",
  "protocol",
  "public",
  "rethrows",
  "static",
  "struct",
  "subscript",
  "typealias",
  "var",
  "break",
  "case",
  "catch",
  "continue",
  "default",
  "defer",
  "do",
  "else",
  "fallthrough",
  "for",
  "guard",
  "if",
  "in",
  "repeat",
  "return",
  "throw",
  "switch",
  "where",
  "while",
  "as",
  "any",
  "false",
  "is",
  "nil",
  "self",
  "super",
  "true",
  "try",
  "throws"
]);

export function deriveNames(input: DeriveNamesInput): DerivedNames {
  const filenameStem = path.basename(input.htmlPath, path.extname(input.htmlPath));
  const baseName = cleanString(input.name) || filenameStem;
  const slug = slugify(baseName);
  const productName = deriveProductName(input.productName, input.htmlTitle, input.name, filenameStem);
  const moduleName = toSwiftModuleName(baseName);
  const executableName = moduleName;
  const bundleId = input.bundleId ? validateBundleId(input.bundleId) : `com.local.${slug.replace(/-/g, "")}`;

  assertSafeProductName(productName);

  return {
    slug,
    packageName: slug,
    moduleName,
    productName,
    bundleId,
    executableName
  };
}

export function extractTitle(html: string): string | undefined {
  const match = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  if (!match) {
    return undefined;
  }

  const title = decodeHtmlEntities(match[1].replace(/\s+/g, " ").trim());
  return title || undefined;
}

export function slugify(value: string): string {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return slug || "app";
}

export function toSwiftModuleName(value: string): string {
  const words = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);

  let moduleName = words.map(toPascalPart).join("") || "App";

  if (!/^[A-Za-z_]/.test(moduleName)) {
    moduleName = `App${moduleName}`;
  }

  moduleName = moduleName.replace(/[^A-Za-z0-9_]/g, "");

  if (!moduleName || SWIFT_RESERVED_WORDS.has(moduleName.toLowerCase())) {
    moduleName = `App${moduleName ? toPascalPart(moduleName) : ""}`;
  }

  return moduleName;
}

export function humanizeSlug(value: string): string {
  return slugify(value)
    .split("-")
    .filter(Boolean)
    .map(toPascalPart)
    .join(" ") || "App";
}

function deriveProductName(
  explicitProductName: string | undefined,
  htmlTitle: string | undefined,
  explicitName: string | undefined,
  filenameStem: string
): string {
  return (
    cleanString(explicitProductName) ||
    cleanString(htmlTitle) ||
    cleanString(explicitName) ||
    humanizeSlug(filenameStem)
  );
}

function cleanString(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function toPascalPart(value: string): string {
  if (!value) {
    return "";
  }

  return `${value[0].toUpperCase()}${value.slice(1).toLowerCase()}`;
}

function validateBundleId(value: string): string {
  const bundleId = value.trim();
  const valid = /^[A-Za-z0-9][A-Za-z0-9-]*(\.[A-Za-z0-9][A-Za-z0-9-]*)+$/.test(bundleId);
  if (!valid) {
    throw new UserFacingError("--bundle-id must look like a reverse-domain identifier, e.g. com.example.myapp.");
  }

  return bundleId;
}

function assertSafeProductName(productName: string): void {
  if (productName === "." || productName === ".." || /[/:\\\0]/.test(productName)) {
    throw new UserFacingError("Product name cannot be '.', '..', or contain path separators.");
  }
}

function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (entity, code: string) => {
    if (code[0] === "#") {
      const radix = code[1]?.toLowerCase() === "x" ? 16 : 10;
      const digits = radix === 16 ? code.slice(2) : code.slice(1);
      const parsed = Number.parseInt(digits, radix);
      return Number.isFinite(parsed) ? String.fromCodePoint(parsed) : entity;
    }

    switch (code) {
      case "amp":
        return "&";
      case "lt":
        return "<";
      case "gt":
        return ">";
      case "quot":
        return "\"";
      case "apos":
        return "'";
      case "nbsp":
        return " ";
      default:
        return entity;
    }
  });
}
