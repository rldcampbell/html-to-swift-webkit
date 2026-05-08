#!/usr/bin/env node

let cli;

try {
  cli = require("../dist/cli");
} catch (error) {
  console.error("html-to-mac-webkit-app has not been built yet.");
  console.error("Run `yarn build` from the project root, then try again.");
  process.exit(1);
}

Promise.resolve(cli.main(process.argv.slice(2))).then((exitCode) => {
  process.exitCode = exitCode;
}).catch((error) => {
  console.error(error && error.message ? error.message : String(error));
  process.exitCode = 1;
});
