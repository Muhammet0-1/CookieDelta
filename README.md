# Cookie Delta

A small, dependency-free local comparison of **two redacted Set-Cookie headers** for developers preparing a website deployment. [Türkçe rehber](README.tr.md).

Open `index.html` directly in a browser. All four UI assets are local; no server, package install or build is needed. JavaScript must be enabled. Choose English in the language selector. On the hosted copy, only these same four assets are used; there is no tracker in the tool page.

1. Replace the cookie value **before pasting**, so it is exactly `REDACTED`. Do not paste real secrets. The tool rejects other cookie values; it does not redact them for you.
2. Enter one old header and one new header, one line each. The `Set-Cookie:` label is optional.
3. Select **Show changes**. Review normalized attribute differences, contextual notes and all repeated/unknown attributes.
4. Test the actual application flows. The checklist starts unchecked and does not execute tests.
5. Copy the report if useful. Copying is an explicit action to the system clipboard; you control where it goes next. If clipboard access is unavailable, the report is selected for manual copying.

Synthetic demo:

```text
Set-Cookie: session=REDACTED; Secure; HttpOnly; SameSite=Lax; Path=/
Set-Cookie: session=REDACTED; HttpOnly; SameSite=None; Path=/account
```

The changed fields are `path`, `samesite`, and `secure`. The new header lacks the Secure attribute required with SameSite=None. This is a documented attribute inconsistency, not evidence from a live browser or proof of a vulnerability. Domain, Path and lifetime changes do not receive safe/unsafe verdicts.

Attribute order/name casing, SameSite casing, Domain casing/leading dot, IMF-fixdate casing, and integer formatting of Max-Age normalize. Cookie names and Path case do not. Omitted SameSite is distinct from explicit Lax. Unknown values and duplicate-value order remain exact. Duplicate attributes are shown together without selecting an effective browser value.

## Deliberate limits

One ASCII header, 8192 characters and 64 attributes per input. Only an unquoted, exact REDACTED cookie value. No multi-header blocks, combined cookies, quoted attributes, backslashes or control characters. One optional final semicolon is accepted. Expires accepts only valid IMF-fixdate/GMT with a matching weekday; a valid comma in Expires is not a header separator. Unsupported historical date forms are rejected rather than guessed. Max-Age has at most 18 digits; Path must explicitly start with `/`. ASCII Domain syntax checks are not DNS/public-suffix checks.

Secure, HttpOnly, SameSite, Partitioned and the documented `__Secure-`, `__Host-`, `__Http-`, `__Host-Http-` prefixes receive contextual observations. HTTPS origin and browser support cannot be established from header text. Canonical server spelling is distinct from user-agent matching: archived [6265bis-22 Internet-Draft §4.1.3/§5.4](https://www.ietf.org/archive/id/draft-ietf-httpbis-rfc6265bis-22.html#section-5.4) describes case-insensitive UA matching for the __Secure- and __Host- families. The tool conditionally flags noncanonical variants, preserves the exact name and does not extend that draft rule to __Http-. This archived work-in-progress is not a final RFC. No live-cookie reading, fetching, server calls, storage, input logging, analytics, scoring, automatic correction, or security guarantee. State stays in this open page and clears on reload; editing input invalidates the old report. Comparison or language change resets the checklist.

Only the cookie value is forced to a placeholder. Cookie names and attributes may also be sensitive; use synthetic/anonymized metadata and review reports before sharing. Similar tools exist; no originality claim is made.

## Development and validation

Node.js is needed only to run `npm test` and `npm run build`. The latter copies four files into `dist/`; there are no dependencies. The supported Node range in package.json is a requirement, not a claim of tests on all those versions. See `QA.md` for the actual test environment and evidence. Tests use synthetic data only.

No reuse license has been selected for this new repository; it does not inherit a previous project's license.

Sources checked 7 November 2026: [MDN Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie). Existing comparator: [ToolSorcerer](https://toolsorcerer.com/http_header_inspector).
