import * as path from "node:path";
import {
  assertHtmlExtension,
  assertSourceHtml,
  chmodExecutable,
  copyFile,
  prepareOutputDirectory,
  readTextFile,
  resolveOutputDir,
  resolveSourcePath,
  validateIconPath,
  writeTextFile
} from "./filesystem";
import { deriveNames, extractTitle } from "./names";
import { renderTemplate, TemplateTokens } from "./templates";
import {
  GenerateProjectOptions,
  GenerateProjectResult,
  PackageManager,
  UserFacingError,
  WindowOptions
} from "./types";

interface TemplateSpec {
  template: string;
  destination: string;
  executable?: boolean;
}

const RESOURCE_HTML_NAME = "index.html";

export function generateProject(options: GenerateProjectOptions): GenerateProjectResult {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const sourceHtmlPath = resolveSourcePath(cwd, options.htmlFile);
  const warnings: string[] = [];

  assertSourceHtml(sourceHtmlPath);

  if (!assertHtmlExtension(sourceHtmlPath)) {
    warnings.push(`Input file does not use .html or .htm extension: ${sourceHtmlPath}`);
  }

  const html = readTextFile(sourceHtmlPath);
  const title = extractTitle(html);
  const names = deriveNames({
    htmlPath: sourceHtmlPath,
    htmlTitle: title,
    name: options.name,
    productName: options.productName,
    bundleId: options.bundleId
  });

  const packageManager = normalizePackageManager(options.packageManager);
  const version = normalizeVersion(options.version);
  const buildVersion = toBuildVersion(version);
  const window = normalizeWindowOptions(options);
  const author = options.author?.trim() ?? "";
  const description = options.description?.trim() || `Mac WebKit app wrapper for ${names.productName}.`;
  const outputDir = resolveOutputDir(cwd, options.out, names.slug);
  const moduleSourceDir = path.join(outputDir, "Sources", names.moduleName);
  const resourcesDir = path.join(moduleSourceDir, "Resources");
  const sourceHtmlOutput = path.join(resourcesDir, RESOURCE_HTML_NAME);
  const appBundle = path.join(outputDir, "build", `${names.productName}.app`);
  const zip = path.join(outputDir, "dist", `${names.productName}-${version}.zip`);
  const overwrite = options.overwrite === true;
  const dryRun = options.dryRun === true;

  const iconSourcePath = options.icon ? validateIconPath(cwd, options.icon) : undefined;
  const iconDestination = iconSourcePath ? path.join(resourcesDir, path.basename(iconSourcePath)) : undefined;
  if (iconSourcePath) {
    warnings.push("Icon will be copied into Resources, but V1 does not wire asset catalogs or Info.plist icons.");
  }

  const templates = getTemplateSpecs(outputDir, names.moduleName);
  const plannedFiles = [
    ...templates.map((template) => template.destination),
    sourceHtmlOutput,
    ...(iconDestination ? [iconDestination] : [])
  ];

  prepareOutputDirectory({
    outputDir,
    sourceHtmlPath,
    cwd,
    overwrite,
    dryRun
  });

  const tokens = createTemplateTokens({
    names,
    version,
    buildVersion,
    description,
    author,
    window,
    packageManager
  });

  for (const template of templates) {
    const rendered = renderTemplate(template.template, tokens);
    writeTextFile(template.destination, rendered, dryRun);
    if (template.executable) {
      chmodExecutable(template.destination, dryRun);
    }
  }

  copyFile(sourceHtmlPath, sourceHtmlOutput, dryRun);
  if (iconSourcePath && iconDestination) {
    copyFile(iconSourcePath, iconDestination, dryRun);
  }

  return {
    dryRun,
    sourceHtmlPath,
    names,
    paths: {
      outputDir,
      sourceHtmlOutput,
      appBundle,
      zip
    },
    version,
    buildVersion,
    packageManager,
    plannedFiles,
    warnings
  };
}

function getTemplateSpecs(outputDir: string, moduleName: string): TemplateSpec[] {
  const moduleDir = path.join(outputDir, "Sources", moduleName);

  return [
    {
      template: "Package.swift.template",
      destination: path.join(outputDir, "Package.swift")
    },
    {
      template: "package.json.template",
      destination: path.join(outputDir, "package.json")
    },
    {
      template: "README.md.template",
      destination: path.join(outputDir, "README.md")
    },
    {
      template: "gitignore.template",
      destination: path.join(outputDir, ".gitignore")
    },
    {
      template: path.join("scripts", "build.sh.template"),
      destination: path.join(outputDir, "scripts", "build.sh"),
      executable: true
    },
    {
      template: path.join("scripts", "run-app.sh.template"),
      destination: path.join(outputDir, "scripts", "run-app.sh"),
      executable: true
    },
    {
      template: path.join("scripts", "package.sh.template"),
      destination: path.join(outputDir, "scripts", "package.sh"),
      executable: true
    },
    {
      template: path.join("Sources", "App", "main.swift.template"),
      destination: path.join(moduleDir, "main.swift")
    },
    {
      template: path.join("Sources", "App", "AppDelegate.swift.template"),
      destination: path.join(moduleDir, "AppDelegate.swift")
    },
    {
      template: path.join("Sources", "App", "WebViewWindowController.swift.template"),
      destination: path.join(moduleDir, "WebViewWindowController.swift")
    },
    {
      template: path.join("Sources", "App", "Info.plist.template"),
      destination: path.join(moduleDir, "Info.plist")
    }
  ];
}

function createTemplateTokens(input: {
  names: ReturnType<typeof deriveNames>;
  version: string;
  buildVersion: string;
  description: string;
  author: string;
  window: WindowOptions;
  packageManager: PackageManager;
}): TemplateTokens {
  return {
    "__PACKAGE_NAME__": input.names.packageName,
    "__MODULE_NAME__": input.names.moduleName,
    "__PRODUCT_NAME__": input.names.productName,
    "__VERSION__": input.version,
    "__BUILD_VERSION__": input.buildVersion,
    "__DESCRIPTION__": input.description,
    "__AUTHOR__": input.author,
    "__BUNDLE_ID__": input.names.bundleId,
    "__WINDOW_WIDTH__": input.window.width,
    "__WINDOW_HEIGHT__": input.window.height,
    "__WINDOW_MIN_WIDTH__": input.window.minWidth,
    "__WINDOW_MIN_HEIGHT__": input.window.minHeight,
    "__EXECUTABLE_NAME__": input.names.executableName,
    "__RESOURCE_HTML_NAME__": RESOURCE_HTML_NAME,
    "__PACKAGE_MANAGER__": input.packageManager,
    "__BUILD_COMMAND__": formatPackageManagerCommand(input.packageManager, "build"),
    "__RUN_COMMAND__": formatPackageManagerCommand(input.packageManager, "run-app"),
    "__PACKAGE_COMMAND__": formatPackageManagerCommand(input.packageManager, "package")
  };
}

function formatPackageManagerCommand(packageManager: PackageManager, scriptName: "build" | "run-app" | "package"): string {
  switch (packageManager) {
    case "yarn":
      return `yarn ${scriptName}`;
    case "npm":
      return `npm run ${scriptName}`;
    case "pnpm":
      return `pnpm ${scriptName}`;
  }
}

function normalizePackageManager(packageManager: PackageManager | undefined): PackageManager {
  if (packageManager === undefined) {
    return "yarn";
  }

  if (packageManager === "yarn" || packageManager === "npm" || packageManager === "pnpm") {
    return packageManager;
  }

  throw new UserFacingError("--package-manager must be one of: yarn, npm, pnpm.");
}

function normalizeVersion(version: string | undefined): string {
  const normalized = version?.trim() || "1.0.0";
  if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(normalized)) {
    throw new UserFacingError("--version must be a semver-like value, e.g. 1.0.0.");
  }

  return normalized;
}

function toBuildVersion(version: string): string {
  const match = version.match(/^\d+\.\d+\.\d+/);
  return match ? match[0] : "1.0.0";
}

function normalizeWindowOptions(options: GenerateProjectOptions): WindowOptions {
  return {
    width: normalizePositiveInteger(options.width, "width", 1200),
    height: normalizePositiveInteger(options.height, "height", 900),
    minWidth: normalizePositiveInteger(options.minWidth, "min-width", 420),
    minHeight: normalizePositiveInteger(options.minHeight, "min-height", 640)
  };
}

function normalizePositiveInteger(value: number | undefined, name: string, fallback: number): number {
  if (value === undefined) {
    return fallback;
  }

  if (!Number.isInteger(value) || value <= 0) {
    throw new UserFacingError(`${name} must be a positive integer.`);
  }

  return value;
}
