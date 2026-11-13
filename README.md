# Hold On

Hold On redirects the first web request for unexpected pages opened in a newly created Firefox tab to a local interception page. The destination remains in that page's URL. The first display adds `loaded=true`; any recreation or reload of that marked page immediately navigates to the current target, including when another extension opens it in a different container. The interception page exposes the scheme, credentials, hostname, port, path elements, query parameters, and fragment for editing before navigation.

Firefox does not provide a universal external-application source flag. Hold On first requires Firefox to have been unfocused (`windows.onFocusChanged` reports no focused Firefox window) when a new window or tab is created. It then correlates `webNavigation.onCreatedNavigationTarget` with `tabs.onCreated`: tabs created for a browser navigation (including normal link/bookmark new-tab actions) are ignored; new tabs with no matching navigation target are treated as external launches. Exclusions are JavaScript regular expressions matched against the complete URL; the default list is empty.

## Development

```bash
npm install
npm test
npm run typecheck
npm run build:firefox
```

The extension uses the same small TypeScript/esbuild/Vitest layout as ContainMarks. All settings remain in Firefox local storage and no data leaves the browser. `build:firefox` leaves the TypeScript sources out of the package.

## Product-page captures

`npm run capture:readme` (inside `nix develop`) regenerates the PNG stills in `product-page/` from a real Firefox with Hold On loaded, on a private Xvfb display. It uses [firefox-addon-live](https://github.com/mikenrafter/firefox-addon-live), a flake input that `nix develop` links into the repo as `.firefox-addon-live`. Pass scene names to capture only those (`npm run capture:readme -- options`).

## Diagnostics

Event logging is off by default, because it records full URLs (including any credentials in them). Errors are always logged. To trace a problem, call `setDebugLogging(true)` in `src/logging.ts` (or flip its default), rebuild, then open `about:debugging`, inspect the extension, and use the background page console. Events carry the `[Hold On]` prefix and show focus, tab, navigation and request state, including the destination URL observed by `webRequest` and the URL exposed through `tabs.onUpdated`/`tabs.get`.

## License

MIT; see `LICENSE`.
