import { CliParseResult, GenerateProjectOptions, PackageManager, UserFacingError } from "./types";

const VALUE_OPTIONS = new Set([
  "--name",
  "--product-name",
  "--bundle-id",
  "--out",
  "--package-manager",
  "--width",
  "--height",
  "--min-width",
  "--min-height",
  "--icon",
  "--version",
  "--author",
  "--description"
]);

const BOOLEAN_OPTIONS = new Set([
  "--overwrite",
  "--build",
  "--run",
  "--package",
  "--dry-run"
]);

export function parseArgs(argv: string[]): CliParseResult {
  const options: Partial<GenerateProjectOptions> = {};
  const positional: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help" || arg === "-h") {
      return { help: true };
    }

    if (arg === "--") {
      positional.push(...argv.slice(index + 1));
      break;
    }

    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }

    const [flag, inlineValue] = splitOption(arg);

    if (BOOLEAN_OPTIONS.has(flag)) {
      if (inlineValue !== undefined) {
        throw new UserFacingError(`${flag} does not accept a value.`);
      }
      setBooleanOption(options, flag);
      continue;
    }

    if (!VALUE_OPTIONS.has(flag)) {
      throw new UserFacingError(`Unknown option: ${flag}`);
    }

    const value = inlineValue ?? argv[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new UserFacingError(`${flag} requires a value.`);
    }
    if (inlineValue === undefined) {
      index += 1;
    }

    setValueOption(options, flag, value);
  }

  if (positional.length === 0) {
    throw new UserFacingError("Missing required <html-file>. Run with --help for usage.");
  }

  if (positional.length > 1) {
    throw new UserFacingError(`Expected one <html-file>, received ${positional.length}.`);
  }

  return {
    help: false,
    options: {
      ...options,
      htmlFile: positional[0]
    }
  };
}

export function getHelpText(): string {
  return `Usage:
  yarn create-app <html-file> [options]
  node bin/html-to-mac-webkit-app.js <html-file> [options]

Required:
  <html-file>                  Path to a single-file HTML app.

Common:
  --name <name>                Machine/module or human-readable app name.
  --product-name <name>        macOS display name. Defaults to <title>, --name, then filename.
  --bundle-id <id>             Bundle identifier. Defaults to com.local.<slug>.
  --out <dir>                  Output directory. Defaults to ./generated/<slug>-webkit.
  --overwrite                  Replace the output directory if it already exists.
  --build                      Run the generated app build script after scaffolding.
  --run                        Build and open the generated .app.
  --package                    Build and create a distributable ZIP.
  --package-manager <name>     yarn, npm, or pnpm. Defaults to yarn.
  --dry-run                    Print the planned output without writing files.

Window:
  --width <number>             Initial window width. Default: 1200.
  --height <number>            Initial window height. Default: 900.
  --min-width <number>         Minimum window width. Default: 420.
  --min-height <number>        Minimum window height. Default: 640.

Assets:
  --icon <path>                Copy an icon into resources. V1 does not wire asset catalogs.

Metadata:
  --version <semver>           App version. Default: 1.0.0.
  --author <name>              Metadata author.
  --description <text>         README/package description.

Examples:
  yarn create-app examples/sample.html --out .tmp/sample-app --overwrite
  yarn create-app ./my-app.html --name "My App" --out ./generated/my-app --build`;
}

function splitOption(arg: string): [string, string | undefined] {
  const equalsIndex = arg.indexOf("=");
  if (equalsIndex === -1) {
    return [arg, undefined];
  }

  return [arg.slice(0, equalsIndex), arg.slice(equalsIndex + 1)];
}

function setBooleanOption(options: Partial<GenerateProjectOptions>, flag: string): void {
  switch (flag) {
    case "--overwrite":
      options.overwrite = true;
      break;
    case "--build":
      options.build = true;
      break;
    case "--run":
      options.run = true;
      break;
    case "--package":
      options.package = true;
      break;
    case "--dry-run":
      options.dryRun = true;
      break;
    default:
      throw new UserFacingError(`Unknown option: ${flag}`);
  }
}

function setValueOption(options: Partial<GenerateProjectOptions>, flag: string, value: string): void {
  switch (flag) {
    case "--name":
      options.name = value;
      break;
    case "--product-name":
      options.productName = value;
      break;
    case "--bundle-id":
      options.bundleId = value;
      break;
    case "--out":
      options.out = value;
      break;
    case "--package-manager":
      options.packageManager = parsePackageManager(value);
      break;
    case "--width":
      options.width = parsePositiveInteger(flag, value);
      break;
    case "--height":
      options.height = parsePositiveInteger(flag, value);
      break;
    case "--min-width":
      options.minWidth = parsePositiveInteger(flag, value);
      break;
    case "--min-height":
      options.minHeight = parsePositiveInteger(flag, value);
      break;
    case "--icon":
      options.icon = value;
      break;
    case "--version":
      options.version = value;
      break;
    case "--author":
      options.author = value;
      break;
    case "--description":
      options.description = value;
      break;
    default:
      throw new UserFacingError(`Unknown option: ${flag}`);
  }
}

function parsePackageManager(value: string): PackageManager {
  if (value === "yarn" || value === "npm" || value === "pnpm") {
    return value;
  }

  throw new UserFacingError(`--package-manager must be one of: yarn, npm, pnpm.`);
}

function parsePositiveInteger(flag: string, value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new UserFacingError(`${flag} must be a positive integer.`);
  }

  return parsed;
}
