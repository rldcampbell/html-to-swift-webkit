import { spawnSync } from "node:child_process";
import { PackageManager, UserFacingError } from "./types";

export type GeneratedScriptName = "build" | "run-app" | "package";

export function runPackageScript(cwd: string, packageManager: PackageManager, scriptName: GeneratedScriptName): void {
  const command = getPackageScriptCommand(packageManager, scriptName);
  const result = spawnSync(command.executable, command.args, {
    cwd,
    stdio: "inherit"
  });

  if (result.error) {
    throw new UserFacingError(`Failed to run ${command.display}: ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new UserFacingError(`Command failed (${result.status ?? "unknown"}): ${command.display}`);
  }
}

export function formatPackageScript(packageManager: PackageManager, scriptName: GeneratedScriptName): string {
  return getPackageScriptCommand(packageManager, scriptName).display;
}

function getPackageScriptCommand(packageManager: PackageManager, scriptName: GeneratedScriptName): {
  executable: string;
  args: string[];
  display: string;
} {
  switch (packageManager) {
    case "yarn":
      return {
        executable: "yarn",
        args: [scriptName],
        display: `yarn ${scriptName}`
      };
    case "npm":
      return {
        executable: "npm",
        args: ["run", scriptName],
        display: `npm run ${scriptName}`
      };
    case "pnpm":
      return {
        executable: "pnpm",
        args: [scriptName],
        display: `pnpm ${scriptName}`
      };
  }
}
