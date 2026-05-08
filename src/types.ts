export type PackageManager = "yarn" | "npm" | "pnpm";

export interface Logger {
  log(message?: string): void;
  warn(message: string): void;
  error(message: string): void;
}

export interface GenerateProjectOptions {
  htmlFile: string;
  name?: string;
  productName?: string;
  bundleId?: string;
  out?: string;
  overwrite?: boolean;
  build?: boolean;
  run?: boolean;
  package?: boolean;
  packageManager?: PackageManager;
  width?: number;
  height?: number;
  minWidth?: number;
  minHeight?: number;
  icon?: string;
  version?: string;
  author?: string;
  description?: string;
  dryRun?: boolean;
  cwd?: string;
}

export interface CliParseResult {
  help: boolean;
  options?: GenerateProjectOptions;
}

export interface DerivedNames {
  slug: string;
  packageName: string;
  moduleName: string;
  productName: string;
  bundleId: string;
  executableName: string;
}

export interface WindowOptions {
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
}

export interface GeneratedPaths {
  outputDir: string;
  sourceHtmlOutput: string;
  appBundle: string;
  zip: string;
}

export interface GenerateProjectResult {
  dryRun: boolean;
  sourceHtmlPath: string;
  names: DerivedNames;
  paths: GeneratedPaths;
  version: string;
  buildVersion: string;
  packageManager: PackageManager;
  plannedFiles: string[];
  warnings: string[];
}

export class UserFacingError extends Error {
  readonly exitCode: number;

  constructor(message: string, exitCode = 1) {
    super(message);
    this.name = "UserFacingError";
    this.exitCode = exitCode;
  }
}
