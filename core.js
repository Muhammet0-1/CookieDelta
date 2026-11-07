/* Cookie Delta: strict, deliberately bounded Set-Cookie comparison. No I/O. */
(function (root) {
  'use strict';
  const TOKEN = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
  const FLAGS = new Set(['secure', 'httponly', 'partitioned']);
  const KNOWN = new Set([...FLAGS, 'samesite', 'domain', 'path', 'max-age', 'expires']);
  const fail = code => { const e = new Error(code); e.code = code; throw e; };
  function expiry(value) {
    const m = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), (\d{2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4}) (\d{2}):(\d{2}):(\d{2}) GMT$/i.exec(value);
    if (!m) fail('expires');
    const months = 'jan feb mar apr may jun jul aug sep oct nov dec'.split(' ');
    const y = +m[4], mo = months.indexOf(m[3].toLowerCase()), d = +m[2], h = +m[5], mi = +m[6], s = +m[7];
    const date = new Date(Date.UTC(y, mo, d, h, mi, s));
    if (y < 1601 || d < 1 || h > 23 || mi > 59 || s > 59 || date.getUTCMonth() !== mo || date.getUTCDate() !== d) fail('expires');
    if ('sun mon tue wed thu fri sat'.split(' ')[date.getUTCDay()] !== m[1].toLowerCase()) fail('expires');
    return date.toUTCString();
  }
  function parse(input) {
    if (typeof input !== 'string' || !input.trim()) fail('empty');
    if (input.length > 8192) fail('limit');
    if (/[^\x20-\x7e\t]/.test(input) || /[\r\n]/.test(input)) fail('single');
    const line = input.trim().replace(/^set-cookie:[ \t]*/i, '');
    const parts = line.split(';');
    const pair = parts.shift().trim();
    // One optional final semicolon is a delimiter, not an attribute.
    if (parts.length && !parts[parts.length - 1].trim()) parts.pop();
    if (parts.length > 64) fail('limit');
    const eq = pair.indexOf('=');
    if (eq < 1 || !TOKEN.test(pair.slice(0, eq))) fail('name');
    const name = pair.slice(0, eq), value = pair.slice(eq + 1);
    if (value !== 'REDACTED') fail('redacted');
    const attrs = new Map(), unknown = [], duplicates = [];
    for (let i = 0; i < parts.length; i++) {
      const raw = parts[i].trim();
      if (!raw) fail('attribute');
      const at = raw.indexOf('='), key = (at < 0 ? raw : raw.slice(0, at)).trim().toLowerCase();
      if (!TOKEN.test(key)) fail('attribute');
      let val = at < 0 ? null : raw.slice(at + 1).trim();
      if (key !== 'expires' && val !== null && val.includes(',')) fail('single');
      if (val !== null && (val.includes('"') || val.includes('\\'))) fail('attribute');
      if (FLAGS.has(key)) { if (at >= 0) fail('flag'); val = true; }
      else if (key === 'samesite') { if (!val || !/^(lax|strict|none)$/i.test(val)) fail('samesite'); val = val.toLowerCase(); }
      else if (key === 'expires') { val = expiry(val || ''); }
      else if (key === 'max-age') { if (!val || !/^-?\d{1,18}$/.test(val)) fail('age'); val = BigInt(val).toString(); }
      else if (key === 'domain') {
        if (!val || !/^\.?[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i.test(val)) fail('domain');
        val = val.replace(/^\./, '').toLowerCase();
        if (val.length > 253 || val.split('.').some(label => label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label))) fail('domain');
      } else if (key === 'path') { if (!val || !val.startsWith('/')) fail('path'); }
      if (!KNOWN.has(key) && !unknown.includes(key)) unknown.push(key);
      if (attrs.has(key)) { if (!duplicates.includes(key)) duplicates.push(key); attrs.get(key).push(val); }
      else attrs.set(key, [val]);
    }
    return { name, value, attrs, unknown: unknown.sort(), duplicates: duplicates.sort() };
  }
  function compare(before, after) {
    const a = parse(before), b = parse(after), changes = [];
    if (a.name !== b.name) changes.push({key:'name', before:[a.name], after:[b.name]});
    for (const key of [...new Set([...a.attrs.keys(), ...b.attrs.keys()])].sort()) {
      const av = a.attrs.get(key) || [], bv = b.attrs.get(key) || [];
      if (JSON.stringify(av) !== JSON.stringify(bv)) changes.push({key, before:av, after:bv});
    }
    return {before:a, after:b, changes};
  }
  function observations(cookie) {
    const notes = [], one = k => cookie.attrs.get(k)?.length === 1 ? cookie.attrs.get(k)[0] : undefined;
    const has = k => cookie.attrs.has(k), unambiguous = keys => keys.every(k => !cookie.duplicates.includes(k));
    if (cookie.duplicates.length) notes.push(['duplicates', cookie.duplicates.join(', ')]);
    if (cookie.unknown.length) notes.push(['unknown', cookie.unknown.join(', ')]);
    if (!has('samesite')) notes.push(['missingSameSite', '']);
    if (one('samesite') === 'none' && !has('secure')) notes.push(['noneSecure', '']);
    if (has('partitioned') && !has('secure')) notes.push(['partitionSecure', '']);
    if (!has('secure')) notes.push(['secureReview', '']);
    if (!has('httponly')) notes.push(['httpReview', '']);
    if (has('domain') || has('path')) notes.push(['scopeReview', '']);
    if (has('max-age') || has('expires')) notes.push(['timeReview', '']);
    if (has('max-age') && has('expires')) notes.push(['agePrecedence', '']);
    if (cookie.name.startsWith('__Secure-') || cookie.name.startsWith('__Host-') || cookie.name.startsWith('__Http-')) {
      notes.push(['prefixContext', '']);
      if (!has('secure')) notes.push(['prefixSecure', '']);
      if (cookie.name.startsWith('__Host-')) {
        if (has('domain')) notes.push(['prefixDomain', '']);
        if (unambiguous(['path']) && one('path') !== '/') notes.push(['prefixPath', '']);
      }
      if ((cookie.name.startsWith('__Http-') || cookie.name.startsWith('__Host-Http-')) && !has('httponly')) notes.push(['prefixHttp', '']);
    }
    // Keep the original name. The archived 6265bis-22 draft distinguishes
    // canonical server spelling from case-insensitive UA matching for these
    // two families. Do not extend that draft's rule to the __Http- family.
    const variantSecure = /^__secure-/i.test(cookie.name) && !cookie.name.startsWith('__Secure-');
    const variantHost = /^__host-/i.test(cookie.name) && !cookie.name.startsWith('__Host-');
    if (variantSecure || variantHost) {
      notes.push(['variantContext', '']);
      if (!has('secure')) notes.push(['variantSecure', '']);
      if (variantHost && has('domain')) notes.push(['variantDomain', '']);
      if (variantHost && unambiguous(['path']) && one('path') !== '/') notes.push(['variantPath', '']);
    }
    return notes;
  }
  const api = {parse, compare, observations};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CookieDelta = Object.freeze(api);
})(typeof globalThis !== 'undefined' ? globalThis : this);
