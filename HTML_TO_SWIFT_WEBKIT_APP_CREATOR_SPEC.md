# Spec: Single-HTML To macOS Swift WebKit App Creator

## Goal

Create a lightweight path from a single self-contained `.html` app to a standalone macOS desktop app using native Swift and WebKit instead of Electron.

Version 1 should be a TypeScript command-line generator that takes one HTML file, scaffolds a complete macOS Swift app project around it, and can build/package it as a native `.app`.

Primary v1 success command:

```bash
yarn create-app ./path/to/my-app.html --name "My App" --out ./generated/my-app --build
```

Then from the generated app:

```bash
yarn build
yarn run-app
yarn package
```

Expected macOS outputs:

- A runnable `.app` bundle.
- A distributable `.zip`.
- A much smaller app than Electron because the app uses system WebKit instead of bundling Chromium.

## Product Direction

Build this as a separate repository from the Electron generator.

### V1: CLI Generator

The first deliverable is a CLI generator.

It should:

- Accept a single `.html` file.
- Generate a Swift-based macOS app project.
- Copy the HTML to the app's bundled resources as `index.html`.
- Load it in a native macOS window using `WKWebView`.
- Support `yarn build`, `yarn run-app`, and `yarn package`.
- Prefer unsigned local macOS builds by default.
- Keep generated app source simple and inspectable.

### V2: Enhanced WebKit App Features

After V1 works, add native helpers for browser behaviors that Electron handles more automatically.

Possible V2 additions:

- Download handling for generated files and blob URLs.
- File open/save dialogs.
- App menu customization.
- Asset directory copying.
- App icons.
- Code signing and notarization.
- A GUI creator app.

Do not build these before V1 is reliable.

## Why Swift And WebKit

Swift + WebKit is appropriate for this goal because:

- `WKWebView` can render local HTML using the system WebKit engine already included with macOS.
- A generated app can be dramatically smaller than Electron because it does not bundle Chromium or Node.
- The generated app feels native at the window/process level.
- Local HTML apps with inline CSS/JS, Canvas, and `localStorage` are good candidates.

Tradeoffs:

- Some browser behaviors need explicit native handling.
- WebKit may differ from Chromium for edge-case APIs.
- Building requires macOS and Xcode command line tools.
- Signing/notarization are Apple-specific and more involved than local packaging.

For this project, the goal is a lightweight native wrapper for self-contained HTML tools, not a full browser runtime replacement.

## Project Name

Suggested repository name:

```text
html-to-mac-webkit-app
```

Suggested package name:

```text
html-to-mac-webkit-app
```

Suggested CLI binary:

```text
html-to-mac-webkit-app
```

## Build Target

Create a TypeScript CLI project that can scaffold macOS-focused Swift WebKit apps from single HTML files.

The creator project should contain:

```text
html-to-mac-webkit-app/
  package.json
  yarn.lock
  tsconfig.json
  README.md
  bin/
    html-to-mac-webkit-app.js
  src/
    cli.ts
    generator.ts
    args.ts
    names.ts
    filesystem.ts
    commands.ts
    templates.ts
    types.ts
  templates/
    swift-webkit-app/
      Package.swift.template
      README.md.template
      gitignore.template
      scripts/
        build.sh.template
        run-app.sh.template
        package.sh.template
      Sources/
        App/
          main.swift.template
          AppDelegate.swift.template
          WebViewWindowController.swift.template
          Info.plist.template
          Resources/
            .gitkeep
  examples/
    sample.html
```

The generated app should look like:

```text
generated/my-app/
  Package.swift
  README.md
  .gitignore
  scripts/
    build.sh
    run-app.sh
    package.sh
  Sources/
    MyApp/
      main.swift
      AppDelegate.swift
      WebViewWindowController.swift
      Info.plist
      Resources/
        index.html
```

Expected build output:

```text
generated/my-app/
  build/
    My App.app
  dist/
    My App.zip
```

## CLI Command

The primary command should be:

```bash
yarn create-app <html-file> [options]
```

Also expose the executable directly after build:

```bash
node bin/html-to-mac-webkit-app.js <html-file> [options]
```

Example:

```bash
yarn create-app ../connections-creator/index.html \
  --name "Connections Creator" \
  --product-name "Connections Creator" \
  --bundle-id "com.local.connectionscreator" \
  --out ./generated/connections-creator \
  --build
```

## CLI Options

Implement these options:

```text
Required:
  <html-file>
    Path to the source single-page HTML file.

Common:
  --name <name>
    Machine/module name or human-readable app name.
    If omitted, derive from the HTML filename.

  --product-name <name>
    Display name for the macOS app.
    If omitted, derive from <title> in the HTML file, then --name, then filename.

  --bundle-id <id>
    macOS bundle identifier, e.g. com.example.myapp.
    If omitted, use com.local.<slug-without-hyphens>.

  --out <dir>
    Output directory for the generated Swift project.
    Default: ./generated/<slug>-webkit.

  --overwrite
    Delete/replace the output directory if it already exists.
    Without this flag, fail safely if output exists.

  --build
    Run the generated app build script after scaffolding.

  --run
    Build and open the generated .app.

  --package
    Build and create a ZIP distribution.

  --package-manager <yarn|npm|pnpm>
    Package manager to use for generator scripts.
    Default: yarn.

Window:
  --width <number>
    Initial window width.
    Default: 1200.

  --height <number>
    Initial window height.
    Default: 900.

  --min-width <number>
    Minimum window width.
    Default: 420.

  --min-height <number>
    Minimum window height.
    Default: 640.

Assets:
  --icon <path>
    Optional app icon.
    V1 may copy the icon but does not need to fully wire asset catalogs.

Metadata:
  --version <semver>
    App version.
    Default: 1.0.0.

  --author <name>
    Metadata author.
    Default: empty string.

  --description <text>
    README description.
    Default: "Mac WebKit app wrapper for <product-name>."

Output helpers:
  --help
    Print usage.

  --dry-run
    Print what would be generated without writing files.
```

## Behavior

The CLI should:

1. Validate that the input path exists.
2. Validate that the input is a file.
3. Warn, but do not fail, if the input extension is not `.html` or `.htm`.
4. Read the HTML file.
5. Extract the `<title>` value if present.
6. Derive safe names:
   - `slug`: lowercase, hyphenated.
   - `moduleName`: Swift module-safe PascalCase.
   - `productName`: human-readable.
   - `bundleId`: reverse-domain-style identifier.
   - `executableName`: app executable-safe.
7. Resolve the output directory.
8. If output exists:
   - Fail unless `--overwrite` is provided.
   - If `--overwrite` is provided, remove only the output directory, never the source file.
9. Create the Swift project directory.
10. Copy the source HTML to:

```text
Sources/<ModuleName>/Resources/index.html
```

11. Generate:
    - `Package.swift`
    - `main.swift`
    - `AppDelegate.swift`
    - `WebViewWindowController.swift`
    - `Info.plist`
    - `README.md`
    - `.gitignore`
    - `scripts/build.sh`
    - `scripts/run-app.sh`
    - `scripts/package.sh`
12. Optionally copy icon assets.
13. Optionally run build.
14. Optionally run app.
15. Optionally run package.
16. Print clear next steps and artifact locations.

## Safety Requirements

The tool must not modify the source HTML file.

The tool must not delete any directory unless:

- It is the resolved output directory.
- `--overwrite` was explicitly provided.

The tool must refuse dangerous output directories such as:

```text
/
~
.
..
/Users
/Users/<name>
/Applications
/System
/Library
```

The exact list can be conservative. If unsure, fail with a clear message.

## Generated Swift App Architecture

The generated app should be a minimal AppKit application.

Recommended structure:

```text
main.swift
  Starts NSApplication and installs AppDelegate.

AppDelegate.swift
  Creates and owns the main window controller.
  Handles normal app lifecycle.

WebViewWindowController.swift
  Creates NSWindow.
  Creates WKWebView.
  Loads bundled Resources/index.html.
  Applies window sizing.
```

The generated app should use:

- `AppKit`
- `WebKit`
- `WKWebView`
- `WKWebViewConfiguration`
- `WKUIDelegate`
- `WKNavigationDelegate`

The generated app should not expose arbitrary native APIs to JavaScript in V1.

## Generated WebView Behavior

The generated `WebViewWindowController.swift` should:

- Create a single native macOS window.
- Load the bundled `index.html`.
- Use `loadFileURL(_:allowingReadAccessTo:)`.
- Set a reasonable background color.
- Use configured initial and minimum window sizes.
- Center the window.
- Show the window when loaded.
- Open external HTTP/HTTPS navigation in the default browser or block it.
- Keep local file access limited to the bundled resources directory.

Suggested loading pattern:

```swift
let resourcesURL = Bundle.module.resourceURL!
let htmlURL = resourcesURL.appendingPathComponent("index.html")
webView.loadFileURL(htmlURL, allowingReadAccessTo: resourcesURL)
```

Important:

- Swift Package resource access should use `Bundle.module`.
- If the app bundle is assembled manually from SwiftPM output, the resource bundle must be copied correctly into the `.app`.

## Generated Package.swift

Generate a Swift Package manifest similar to:

```swift
// swift-tools-version: 5.9

import PackageDescription

let package = Package(
    name: "__MODULE_NAME__",
    platforms: [
        .macOS(.v13)
    ],
    products: [
        .executable(
            name: "__EXECUTABLE_NAME__",
            targets: ["__MODULE_NAME__"]
        )
    ],
    targets: [
        .executableTarget(
            name: "__MODULE_NAME__",
            resources: [
                .copy("Resources")
            ],
            linkerSettings: [
                .linkedFramework("AppKit"),
                .linkedFramework("WebKit")
            ]
        )
    ]
)
```

The minimum macOS version can be adjusted later. V1 should choose a recent but not bleeding-edge baseline.

## Generated Info.plist

Generate an `Info.plist` containing at least:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>en</string>
  <key>CFBundleDisplayName</key>
  <string>__PRODUCT_NAME__</string>
  <key>CFBundleExecutable</key>
  <string>__EXECUTABLE_NAME__</string>
  <key>CFBundleIdentifier</key>
  <string>__BUNDLE_ID__</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>__PRODUCT_NAME__</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>__VERSION__</string>
  <key>CFBundleVersion</key>
  <string>__BUILD_VERSION__</string>
  <key>LSMinimumSystemVersion</key>
  <string>13.0</string>
  <key>NSHighResolutionCapable</key>
  <true/>
</dict>
</plist>
```

V1 can generate an unsigned, unsandboxed app for local use.

## Build Strategy

Use Swift Package Manager for compilation, then assemble a `.app` bundle with a script.

Rationale:

- SwiftPM project generation is simpler than creating `.xcodeproj` files manually.
- `swift build` is available from Xcode command line tools.
- A script can assemble the minimal macOS `.app` structure.

Generated `scripts/build.sh` should:

1. Run `swift build -c release`.
2. Remove and recreate `build/<Product Name>.app`.
3. Create:

```text
build/<Product Name>.app/
  Contents/
    Info.plist
    MacOS/
      <executable>
    Resources/
      <resource bundle copied from .build>
```

4. Copy the release executable into `Contents/MacOS/`.
5. Copy `Info.plist` into `Contents/`.
6. Copy SwiftPM resource bundles into `Contents/Resources/`.
7. Optionally copy icon assets if wired.
8. Print the app path.

The script should be conservative and fail on errors:

```bash
set -euo pipefail
```

Generated `scripts/run-app.sh` should:

1. Run `scripts/build.sh`.
2. Open the `.app` using:

```bash
open "build/<Product Name>.app"
```

Generated `scripts/package.sh` should:

1. Run `scripts/build.sh`.
2. Create `dist/`.
3. Create a ZIP:

```bash
ditto -c -k --keepParent "build/<Product Name>.app" "dist/<Product Name>-<version>.zip"
```

## Generated package.json

Even though the generated app is Swift, include a small package file for familiar commands:

```json
{
  "name": "__PACKAGE_NAME__",
  "productName": "__PRODUCT_NAME__",
  "version": "__VERSION__",
  "description": "__DESCRIPTION__",
  "private": true,
  "scripts": {
    "build": "bash scripts/build.sh",
    "run-app": "bash scripts/run-app.sh",
    "package": "bash scripts/package.sh"
  }
}
```

This lets users run:

```bash
yarn build
yarn run-app
yarn package
```

No Node dependencies should be required in the generated app.

## Generated README.md

The generated app README should include:

```text
# <Product Name>

This macOS app wraps Sources/<ModuleName>/Resources/index.html using Swift and WKWebView.

## Development

yarn build
yarn run-app

## Package a macOS .app

yarn build

The app bundle appears under build/.

## Make Distributable ZIP

yarn package

The ZIP appears under dist/.

## Signing and notarization

Unsigned local builds are useful for personal use and testing.

For distribution to other Macs, configure Apple Developer code signing and notarization.
```

## Generated .gitignore

Use:

```text
.build/
build/
dist/
.DS_Store
*.log
```

## Creator package.json

The creator project itself should have:

```json
{
  "name": "html-to-mac-webkit-app",
  "version": "1.0.0",
  "private": true,
  "description": "Create lightweight macOS Swift WebKit app scaffolds from single-file HTML apps.",
  "type": "commonjs",
  "packageManager": "yarn@1.22.22",
  "main": "dist/generator.js",
  "bin": {
    "html-to-mac-webkit-app": "./bin/html-to-mac-webkit-app.js"
  },
  "scripts": {
    "build": "tsc",
    "create-app": "yarn build && node bin/html-to-mac-webkit-app.js",
    "test": "yarn build && node bin/html-to-mac-webkit-app.js examples/sample.html --out .tmp/sample-app --overwrite --dry-run"
  },
  "engines": {
    "node": ">=18"
  },
  "devDependencies": {
    "@types/node": "^25.0.0",
    "typescript": "^6.0.0"
  }
}
```

The creator should use only Node built-ins at runtime unless there is a strong reason for a dependency.

Use:

- `node:fs`
- `node:path`
- `node:child_process`
- `node:os`

Avoid adding argument parsing dependencies unless necessary.

## Internal Architecture

Separate CLI parsing from generation logic.

Suggested modules:

```text
bin/html-to-mac-webkit-app.js
  Thin executable shim that loads dist/cli.js.

src/cli.ts
  CLI main function and output summary.

src/args.ts
  Parse argv and print help.

src/generator.ts
  Main generateProject(config) implementation.

src/names.ts
  Name, slug, Swift module, package, bundle ID, and executable helpers.

src/filesystem.ts
  Safe output checks, mkdir, write file, copy file.

src/commands.ts
  Build/run/package child process helpers.

src/templates.ts
  Template loading and token replacement helpers.

src/types.ts
  Shared config, result, command, logger, and name types.
```

This should make a future GUI app straightforward:

```js
const { generateProject } = require("./dist/generator");
```

After `yarn build`, the future GUI can call `generateProject(config)` directly instead of shelling out to the CLI.

## Template Replacement

Use simple token replacement.

Tokens:

```text
__PACKAGE_NAME__
__MODULE_NAME__
__PRODUCT_NAME__
__VERSION__
__BUILD_VERSION__
__DESCRIPTION__
__AUTHOR__
__BUNDLE_ID__
__WINDOW_WIDTH__
__WINDOW_HEIGHT__
__WINDOW_MIN_WIDTH__
__WINDOW_MIN_HEIGHT__
__EXECUTABLE_NAME__
__RESOURCE_HTML_NAME__
```

For Swift files, generate Swift string literals safely. Do not insert unescaped values directly into quoted Swift strings.

## Name Derivation Rules

Given input:

```text
connections-creator.html
```

Defaults:

```text
slug: connections-creator
packageName: connections-creator
moduleName: ConnectionsCreator
productName: Connections Creator
bundleId: com.local.connectionscreator
executableName: ConnectionsCreator
```

If the HTML contains:

```html
<title>Puzzle Set Creator</title>
```

Then default productName should be:

```text
Puzzle Set Creator
```

Module and executable names should remain Swift-safe.

## Swift Naming Rules

Swift module names should:

- Use PascalCase.
- Start with a letter or underscore.
- Contain only letters, numbers, and underscores.
- Avoid Swift reserved words where practical.

If a derived module name is invalid, prefix with `App`.

Examples:

```text
connections-creator -> ConnectionsCreator
123 tool -> App123Tool
class -> AppClass
```

## HTML Support Assumptions

The input HTML is expected to be self-contained or use relative assets.

Minimum support:

- Single `.html` file with inline CSS/JS.
- Canvas APIs.
- `localStorage`, subject to WebKit persistence behavior.

Optional future support:

- `--assets <dir>` to copy an asset directory.
- Automatic detection/copying of relative assets.
- Download handlers.
- Native save dialogs.

Document clearly that V1 is designed for self-contained HTML first.

## localStorage

Expected:

- `localStorage` should work in `WKWebView`.
- Data should persist for the app's WebKit data store.

V1 should manually test persistence across app restarts.

If persistence is inconsistent, configure a non-ephemeral `WKWebsiteDataStore.default()` explicitly.

## Downloads

Downloads are a known edge in WebKit wrappers.

V1 expectation:

- Normal page interactions should work.
- Generated file downloads may not work automatically.

Do not add a broad JavaScript bridge in V1.

Future improvement:

- Add a narrow native download handler.
- Add a user-script bridge for known generated blob download patterns only if needed.
- Add tests using the sample HTML app.

## Security Requirements

The generated app should treat the HTML as local app code, but still keep boundaries tight.

Required:

- Load only the bundled local `index.html` by default.
- Use `loadFileURL(_:allowingReadAccessTo:)` scoped to the resources directory.
- Do not expose arbitrary native APIs to JavaScript in V1.
- Do not enable broad file-system access.
- Block or externally open unexpected HTTP/HTTPS navigation.
- Do not inject scripts into the HTML file.

## Build, Run, And Package Behavior

If `--build` is passed:

```bash
yarn build
```

inside the generated app should run:

```bash
bash scripts/build.sh
```

If `--run` is passed:

```bash
yarn run-app
```

inside the generated app should run:

```bash
bash scripts/run-app.sh
```

If `--package` is passed:

```bash
yarn package
```

inside the generated app should run:

```bash
bash scripts/package.sh
```

The creator should stream child process output to the terminal.

If a command fails, exit non-zero and print the failed command.

## Output Summary

After successful scaffold, print:

```text
Created macOS Swift WebKit app:

  <output path>

Source HTML copied to:

  <output path>/Sources/<ModuleName>/Resources/index.html

Next steps:

  cd <output path>
  yarn build
  yarn run-app
  yarn package
```

If `--build` was run, also print:

```text
App bundle output:

  <output path>/build/<Product Name>.app
```

If `--package` was run, also print:

```text
Distributable ZIP:

  <output path>/dist/<Product Name>-<version>.zip
```

If current platform is not macOS, print:

```text
Note: Swift WebKit macOS apps must be built on macOS with Xcode command line tools installed.
```

## Acceptance Criteria

The project is complete when:

- `yarn build` compiles the TypeScript creator to `dist/`.
- `yarn create-app examples/sample.html --out .tmp/sample-app --overwrite` creates a valid Swift project.
- The generated project contains `Sources/<ModuleName>/Resources/index.html` copied from the source HTML.
- The generated Swift app loads `index.html` using `WKWebView`.
- The generated Swift app uses `loadFileURL(_:allowingReadAccessTo:)`.
- The generated `Package.swift` builds with `swift build -c release`.
- `yarn build` in the generated project creates a `.app` under `build/`.
- `yarn run-app` opens the generated `.app`.
- `yarn package` creates a ZIP under `dist/`.
- `--overwrite` is required before replacing an existing output directory.
- `--dry-run` prints planned output without writing files.
- The generated README explains how to build, run, and package the app on macOS.
- The CLI exits non-zero with clear errors for missing input, unsafe output, unknown options, missing Swift toolchain, or failed child commands.
- The generator core can be imported independently of the CLI from `dist/generator`.
- The generated app is significantly smaller than an equivalent Electron app for the same self-contained HTML.

## Manual Test Plan

From the creator project root:

```bash
yarn create-app examples/sample.html --out .tmp/sample-app --overwrite
```

Then:

```bash
cd .tmp/sample-app
yarn build
yarn run-app
```

Expected:

- Native macOS window opens.
- The sample HTML displays.
- The app can be quit normally.

Then:

```bash
yarn package
```

Expected:

- ZIP appears under `dist/`.
- `.app` remains under `build/`.

With the Connections Creator sample:

```bash
yarn create-app examples/connections-creator.html --out .tmp/connections-creator --overwrite
cd .tmp/connections-creator
yarn build
yarn run-app
```

Expected:

- The Connections Creator UI displays.
- Form interactions work.
- `localStorage` persists after quit/reopen.

## Example sample.html

Create `examples/sample.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Sample HTML App</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      font-family: Arial, sans-serif;
      background: #ffffff;
      color: #111111;
    }
    main {
      text-align: center;
    }
    button {
      min-height: 40px;
      padding: 0 16px;
      border-radius: 8px;
      border: 1px solid #111111;
      background: #111111;
      color: #ffffff;
      font-weight: 700;
    }
  </style>
</head>
<body>
  <main>
    <h1>Sample HTML App</h1>
    <p id="count">Clicked 0 times</p>
    <button id="button" type="button">Click</button>
  </main>
  <script>
    let clicks = Number(localStorage.getItem("sample.clicks") || "0");
    const count = document.getElementById("count");
    const button = document.getElementById("button");

    function render() {
      count.textContent = `Clicked ${clicks} ${clicks === 1 ? "time" : "times"}`;
    }

    button.addEventListener("click", () => {
      clicks += 1;
      localStorage.setItem("sample.clicks", String(clicks));
      render();
    });

    render();
  </script>
</body>
</html>
```

## V2 GUI Creator App

After the CLI generator works, create a separate GUI wrapper around the same generator core.

Suggested V2 project shape:

```text
html-to-mac-webkit-app/
  bin/
    html-to-mac-webkit-app.js
  src/
    generator.ts
    ...
  creator-app/
    Package.swift
    Sources/
      CreatorApp/
        main.swift
        AppDelegate.swift
        CreatorWindowController.swift
```

The GUI should:

- Let the user choose the source HTML file.
- Let the user choose an output folder.
- Let the user set product name, bundle ID, window dimensions, icon, and package options.
- Show validation inline.
- Show a progress log.
- Call the shared `generateProject(config)` function or a native equivalent.
- Optionally run build/package from the interface.
- Show output paths when done.

## Stretch Goals

Do not implement these until V1 works:

- GUI creator app.
- `--assets <dir>` to copy an asset directory alongside the HTML.
- Automatic detection/copying of relative assets.
- App icon asset catalog generation.
- Native download handling.
- Native file open/save dialogs.
- Custom app menu template.
- App sandbox entitlements.
- Code signing configuration.
- Notarization configuration.
- File associations.
- Auto-update support.
- Optional generated Xcode project.

## Final Deliverable

A working `html-to-mac-webkit-app` repository that lets the user run one command against a single HTML file and receive a lightweight native macOS Swift WebKit project.

Primary success command:

```bash
yarn create-app ./path/to/single-page-app.html --name "My App" --out ./generated/my-app --build
```

Primary generated app commands:

```bash
yarn build
yarn run-app
yarn package
```
