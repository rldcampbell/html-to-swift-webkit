import * as path from "node:path";
import { getHelpText, parseArgs } from "./args";
import { formatPackageScript, runPackageScript } from "./commands";
import { generateProject } from "./generator";
import { GenerateProjectOptions, GenerateProjectResult, UserFacingError } from "./types";

export async function main(argv: string[] = process.argv.slice(2)): Promise<number> {
  try {
    const parsed = parseArgs(argv);
    if (parsed.help) {
      console.log(getHelpText());
      return 0;
    }

    const options = parsed.options as GenerateProjectOptions;
    const result = generateProject(options);

    printWarnings(result);

    if (result.dryRun) {
      printDryRunSummary(result);
      return 0;
    }

    if (options.build) {
      runPackageScript(result.paths.outputDir, result.packageManager, "build");
    }

    if (options.run) {
      runPackageScript(result.paths.outputDir, result.packageManager, "run-app");
    }

    if (options.package) {
      runPackageScript(result.paths.outputDir, result.packageManager, "package");
    }

    printSuccessSummary(result, {
      ranBuild: options.build === true || options.run === true || options.package === true,
      ranPackage: options.package === true
    });

    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    return error instanceof UserFacingError ? error.exitCode : 1;
  }
}

if (require.main === module) {
  main().then((exitCode) => {
    process.exitCode = exitCode;
  });
}

function printWarnings(result: GenerateProjectResult): void {
  for (const warning of result.warnings) {
    console.warn(`Warning: ${warning}`);
  }
}

function printDryRunSummary(result: GenerateProjectResult): void {
  console.log("");
  console.log("Dry run: would create macOS Swift WebKit app:");
  console.log("");
  console.log(`  ${result.paths.outputDir}`);
  console.log("");
  console.log("Source HTML would be copied to:");
  console.log("");
  console.log(`  ${result.paths.sourceHtmlOutput}`);
  console.log("");
  console.log("Files that would be generated:");
  console.log("");

  for (const filePath of result.plannedFiles) {
    console.log(`  ${path.relative(result.paths.outputDir, filePath)}`);
  }

  console.log("");
  console.log("No files were written.");
  printPlatformNote();
}

function printSuccessSummary(
  result: GenerateProjectResult,
  actions: { ranBuild: boolean; ranPackage: boolean }
): void {
  console.log("");
  console.log("Created macOS Swift WebKit app:");
  console.log("");
  console.log(`  ${result.paths.outputDir}`);
  console.log("");
  console.log("Source HTML copied to:");
  console.log("");
  console.log(`  ${result.paths.sourceHtmlOutput}`);

  if (actions.ranBuild) {
    console.log("");
    console.log("App bundle output:");
    console.log("");
    console.log(`  ${result.paths.appBundle}`);
  }

  if (actions.ranPackage) {
    console.log("");
    console.log("Distributable ZIP:");
    console.log("");
    console.log(`  ${result.paths.zip}`);
  }

  console.log("");
  console.log("Next steps:");
  console.log("");
  console.log(`  cd ${shellDisplayPath(result.paths.outputDir)}`);
  console.log(`  ${formatPackageScript(result.packageManager, "build")}`);
  console.log(`  ${formatPackageScript(result.packageManager, "run-app")}`);
  console.log(`  ${formatPackageScript(result.packageManager, "package")}`);

  printPlatformNote();
}

function printPlatformNote(): void {
  if (process.platform !== "darwin") {
    console.log("");
    console.log("Note: Swift WebKit macOS apps must be built on macOS with Xcode command line tools installed.");
  }
}

function shellDisplayPath(filePath: string): string {
  if (/^[A-Za-z0-9_./-]+$/.test(filePath)) {
    return filePath;
  }

  return `"${filePath.replace(/(["\\$`])/g, "\\$1")}"`;
}
