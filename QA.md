# Cookie Delta 1.0.0 · verification record

Checked on 7 November 2026 with synthetic inputs only. These checks validate this tool's implementation; they do not test a real website or guarantee cookie security.

| Check | Observed result |
| --- | --- |
| Source parser/normalization/rules | 109 named checks passed; 0 failed, Node.js 26.12.1 on Linux |
| Production build | Four local UI files copied by npm run build; bytes match source |
| Local production browser | 38 assertions passed; 0 failed, Chromium 153.0.8010.12, Linux, headless |
| Viewports | 1280×900 and 360×800 CSS pixels; TR/EN inspected |
| Keyboard | Tab, Enter and Space exercised for skip link, input order, comparison and checklist |
| Input handling | Non-REDACTED rejected; valid Expires comma accepted; combined header rejected; unknown/duplicate attributes visible; HTML rendered as text |
| No input I/O | Zero requests after initial assets during tested input flows; instrumented fetch/XHR/beacon/WebSocket/EventSource/storage/IndexedDB/cookie access counters stayed zero; local/session storage stayed empty |
| Runtime | No page or console errors in the tested flows; explicit clipboard action produced an honest success/fallback state |

Initial review ran 99 checks successfully but independently identified three missing cases: noncanonical prefix context, the 64-attribute limit with a final semicolon, and ambiguous display of one separator-containing value versus two repeated values. All three were fixed; regression coverage increased the named core checks to 109. The original name stays exact; __Secure-/__Host- variants receive conditional draft-based context, not a measured browser verdict. Values now use JSON array boundaries (true is a flag, null is a bare attribute). A draft matching rule is not generalized to the __Http- family.

Two review passes were completed: prompt/scope/functionality and tests, followed by rendered output/content/accessibility/claim review and affected reruns. A copy-status test initially read an asynchronous clipboard result too early; it was corrected to wait for the visible outcome. Browser launch first failed inside the restricted executor; the authorized local run completed successfully. Neither attempt was counted as a passing browser result.

Not run: Firefox, WebKit/Safari, Windows, macOS, real mobile hardware, screen readers, actual cookie installation or live application/authentication flows. A 360px viewport is not a physical-device test. Node version requirements are not a claim that every eligible version was tested. This tool deliberately rejects some browser-accepted header forms; it is not a full browser parser.

Sources: [MDN Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie), and the archived [6265bis-22 Internet-Draft §4.1.3/§5.4](https://www.ietf.org/archive/id/draft-ietf-httpbis-rfc6265bis-22.html#section-5.4). The archived draft is work in progress, not a final RFC. No browser prefix enforcement was measured.
