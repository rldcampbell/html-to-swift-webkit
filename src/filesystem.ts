import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { UserFacingError } from "./types";

export function resolveSourcePath(cwd: string, htmlFile: string): string {
  return path.resolve(cwd, htmlFile);
}

export function resolveOutputDir(cwd: string, out: string | undefined, slug: string): string {
  if (out !== undefined) {
    const normalizedInput = path.normalize(out.trim());
    if (normalizedInput === "." || normalizedInput === ".." || normalizedInput === "~") {
      throw new UserFacingError(`Refusing dangerous output directory: ${out}`);
    }
  }

  return path.resolve(cwd, out ?? path.join("generated", `${slug}-webkit`));
}

export function assertSourceHtml(sourcePath: string): void {
  if (!fs.existsSync(sourcePath)) {
    throw new UserFacingError(`Input HTML file does not exist: ${sourcePath}`);
  }

  const stat = fs.statSync(sourcePath);
  if (!stat.isFile()) {
    throw new UserFacingError(`Input path is not a file: ${sourcePath}`);
  }
}

export function readTextFile(filePath: string): string {
  return fs.readFileSync(filePath, "utf8");
}

export function validateIconPath(cwd: string, iconPath: string): string {
  const resolved = path.resolve(cwd, iconPath);
  if (!fs.existsSync(resolved)) {
    throw new UserFacingError(`Icon file does not exist: ${resolved}`);
  }

  if (!fs.statSync(resolved).isFile()) {
    throw new UserFacingError(`Icon path is not a file: ${resolved}`);
  }

  return resolved;
}

export function prepareOutputDirectory(options: {
  outputDir: string;
  sourceHtmlPath: string;
  cwd: string;
  overwrite: boolean;
  dryRun: boolean;
}): void {
  assertSafeOutputDirectory(options.outputDir, options.sourceHtmlPath, options.cwd);

  if (!fs.existsSync(options.outputDir)) {
    if (!options.dryRun) {
      fs.mkdirSync(options.outputDir, { recursive: true });
    }
    return;
  }

  const stat = fs.statSync(options.outputDir);
  if (!stat.isDirectory()) {
    throw new UserFacingError(`Output path already exists and is not a directory: ${options.outputDir}`);
  }

  if (!options.overwrite) {
    throw new UserFacingError(`Output directory already exists: ${options.outputDir}\nPass --overwrite to replace it.`);
  }

  if (isPathInside(options.sourceHtmlPath, options.outputDir)) {
    throw new UserFacingError("Refusing to overwrite an output directory that contains the source HTML file.");
  }

  if (!options.dryRun) {
    fs.rmSync(options.outputDir, { recursive: true, force: true });
    fs.mkdirSync(options.outputDir, { recursive: true });
  }
}

export function writeTextFile(filePath: string, content: string, dryRun: boolean): void {
  if (dryRun) {
    return;
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

export function copyFile(sourcePath: string, destinationPath: string, dryRun: boolean): void {
  if (dryRun) {
    return;
  }

  fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
  fs.copyFileSync(sourcePath, destinationPath);
}

export function chmodExecutable(filePath: string, dryRun: boolean): void {
  if (!dryRun) {
    fs.chmodSync(filePath, 0o755);
  }
}

export function assertHtmlExtension(sourcePath: string): boolean {
  const ext = path.extname(sourcePath).toLowerCase();
  return ext === ".html" || ext === ".htm";
}

function assertSafeOutputDirectory(outputDir: string, sourceHtmlPath: string, cwd: string): void {
  const resolvedOutput = path.resolve(outputDir);
  const root = path.parse(resolvedOutput).root;
  const home = path.resolve(os.homedir());
  const usersRoot = path.resolve(home, "..");
  const forbidden = new Set([
    root,
    home,
    usersRoot,
    path.resolve(cwd),
    path.resolve("/Applications"),
    path.resolve("/System"),
    path.resolve("/Library"),
    path.resolve("/Users")
  ]);

  if (forbidden.has(resolvedOutput)) {
    throw new UserFacingError(`Refusing dangerous output directory: ${resolvedOutput}`);
  }

  if (resolvedOutput === path.resolve(sourceHtmlPath)) {
    throw new UserFacingError("Output directory cannot be the source HTML file.");
  }
}

function isPathInside(childPath: string, parentPath: string): boolean {
  const relative = path.relative(path.resolve(parentPath), path.resolve(childPath));
  return relative === "" || (relative.length > 0 && !relative.startsWith("..") && !path.isAbsolute(relative));
}
