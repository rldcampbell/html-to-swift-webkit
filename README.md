# html-to-mac-webkit-app

Create lightweight macOS Swift + WKWebView app projects from single-file HTML apps. Generated apps use system WebKit and Swift Package Manager, not Electron.

## Requirements

- macOS with Xcode command line tools for building generated apps
- Node.js 18 or newer
- Yarn 1.x

## Install

```bash
yarn install
```

## Generate an App

```bash
yarn create-app examples/sample.html --out .tmp/sample-app --overwrite
```

The generator copies the source HTML to `Sources/<ModuleName>/Resources/index.html` and creates a SwiftPM-based macOS app project.

Common options:

```bash
yarn create-app ./path/to/my-app.html \
  --name "My App" \
  --product-name "My App" \
  --bundle-id "com.local.myapp" \
  --out ./generated/my-app \
  --build
```

Use `--dry-run` to preview the files without writing them.

## Generated App Commands

From the generated app directory:

```bash
yarn build
yarn run-app
yarn package
```

Outputs:

- `build/<Product Name>.app`
- `dist/<Product Name>-<version>.zip`

## Direct CLI

After building this creator project, you can run the binary shim directly:

```bash
yarn build
node bin/html-to-mac-webkit-app.js examples/sample.html --out .tmp/sample-app --overwrite
```

## Notes

V1 is designed for self-contained HTML files with inline CSS and JavaScript. Canvas and localStorage are good candidates. Generated file downloads, asset directory discovery, app icons, signing, notarization, and native save/open dialogs are intentionally left for later versions.
