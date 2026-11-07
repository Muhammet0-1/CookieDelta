const {test}=require('node:test');
const assert=require('node:assert/strict');
const {parse,compare,observations}=require('../core.js');
const header='session=REDACTED';
const codes=s=>observations(parse(s)).map(([code])=>code);
const good=[
 ['minimal',header],['label','Set-Cookie: '+header],['case insensitive label','sEt-CoOkIe:\t'+header],['outer whitespace','  '+header+'  '],
 ['all flags',header+'; Secure; HttpOnly; Partitioned'],['valid expires',header+'; Expires=Wed, 09 Jun 2027 10:18:14 GMT'],
 ['leap day',header+'; Expires=Tue, 29 Feb 2028 00:00:00 GMT'],['trailing semicolon',header+'; Secure;'],
 ['unknown bare',header+'; Future'],['unknown value',header+'; Priority=High'],['duplicates',header+'; SameSite=Lax; SameSite=None'],
 ['prototype tokens','__proto__=REDACTED; constructor=x; __proto__=y'],['HTML as text',header+'; Future=<img src=x onerror=alert(1)>'],
 ['domain',header+'; Domain=.EXAMPLE.COM'],['single label',header+'; Domain=localhost'],['path casing',header+'; Path=/Account'],
 ['age zero',header+'; Max-Age=0'],['negative age',header+'; Max-Age=-1'],['age limit',header+'; Max-Age=999999999999999999']
];
for(const [name,value]of good)test('parse accepts '+name,()=>assert.equal(parse(value).value,'REDACTED'));
const bad=[
 ['empty','', 'empty'],['no equals','session','name'],['space in name','my session=REDACTED','name'],['colon in name','foo:bar=REDACTED','name'],
 ['real value','session=synthetic-secret','redacted'],['lowercase placeholder','session=redacted','redacted'],['quoted placeholder','session="REDACTED"','redacted'],
 ['empty value','session=','redacted'],['value suffix','session=REDACTED=extra','redacted'],['no name','=REDACTED','name'],
 ['CRLF',header+'\r\nSet-Cookie: other=REDACTED','single'],['LF',header+'\n','single'],['NUL',header+'\0','single'],['unicode',header+'; Path=/ş','single'],
 ['combined header',header+', next=REDACTED','redacted'],['combined path',header+'; Path=/, next=REDACTED','single'],
 ['combined expires',header+'; Expires=Wed, 09 Jun 2027 10:18:14 GMT, next=REDACTED','expires'],
 ['flag with true',header+'; Secure=true','flag'],['flag with false',header+'; HttpOnly=false','flag'],['partition value',header+'; Partitioned=1','flag'],
 ['invalid samesite',header+'; SameSite=Maybe','samesite'],['missing samesite value',header+'; SameSite','samesite'],
 ['bad date',header+'; Expires=Wed, 31 Feb 2027 10:18:14 GMT','expires'],['weekday mismatch',header+'; Expires=Thu, 09 Jun 2027 10:18:14 GMT','expires'],
 ['old year',header+'; Expires=Wed, 09 Jun 1500 10:18:14 GMT','expires'],['bad hour',header+'; Expires=Wed, 09 Jun 2027 24:18:14 GMT','expires'],
 ['non GMT',header+'; Expires=Wed, 09 Jun 2027 10:18:14 UTC','expires'],['unsupported date',header+'; Expires=Wed Jun 09 10:18:14 2027','expires'],
 ['age fraction',header+'; Max-Age=1.5','age'],['positive sign',header+'; Max-Age=+1','age'],['age too long',header+'; Max-Age=1000000000000000000','age'],
 ['domain URL',header+'; Domain=https://example.com','domain'],['domain empty label',header+'; Domain=example..com','domain'],['domain invalid label',header+'; Domain=-example.com','domain'],
 ['path relative',header+'; Path=account','path'],['empty intermediate',header+';; Secure','attribute'],['bad attribute name',header+'; @x=y','attribute'],
 ['quoted attribute',header+'; Path="/"','attribute'],['backslash',header+'; Path=/a\\b','attribute'],['too long','x'.repeat(8193),'limit'],
 ['too many attrs',header+'; A'.repeat(65),'limit'],['tab inside value','session=RED\tACTED','redacted']
];
for(const [name,value,code]of bad)test('parse rejects '+name,()=>assert.throws(()=>parse(value),e=>e.code===code));
test('attribute names, order, flag casing, SameSite casing normalize',()=>assert.deepEqual(compare(header+'; Secure; HttpOnly; SameSite=Lax',header+'; samesite=LAX; httponly; SECURE').changes,[]));
test('Domain case and leading dot normalize',()=>assert.deepEqual(compare(header+'; Domain=.EXAMPLE.COM',header+'; domain=example.com').changes,[]));
test('Max-Age integer normalizes',()=>assert.deepEqual(compare(header+'; Max-Age=00012',header+'; max-age=12').changes,[]));
test('Expires retains comma and normalizes casing',()=>assert.deepEqual(compare(header+'; Expires=wed, 09 jun 2027 10:18:14 gmt',header+'; expires=Wed, 09 Jun 2027 10:18:14 GMT').changes,[]));
test('cookie name case is preserved',()=>assert.equal(compare('ID=REDACTED','id=REDACTED').changes[0].key,'name'));
test('cookie value case never normalizes',()=>assert.throws(()=>compare('id=REDACTED','id=redacted')));
test('Path case remains significant',()=>assert.equal(compare(header+'; Path=/Account',header+'; Path=/account').changes[0].key,'path'));
test('missing SameSite differs from Lax',()=>assert.equal(compare(header,header+'; SameSite=Lax').changes[0].key,'samesite'));
test('unknown attribute value case is preserved',()=>assert.equal(compare(header+'; X=One',header+'; x=one').changes.length,1));
test('duplicate order and values are preserved',()=>{const p=parse(header+'; SameSite=Lax; samesite=None');assert.deepEqual(p.attrs.get('samesite'),['lax','none']);assert.deepEqual(p.duplicates,['samesite']);assert(codes(header+'; SameSite=Lax; SameSite=None').includes('duplicates'));});
test('swapped duplicate values remain a change',()=>assert.equal(compare(header+'; X=one; X=two',header+'; X=two; X=one').changes.length,1));
test('unknown prototype-like keys remain data',()=>assert.deepEqual(parse(header+'; __proto__=x').unknown,['__proto__']));
for(const [name,suffix,required]of [
 ['None requires Secure','; SameSite=None','noneSecure'],['Partitioned requires Secure','; Partitioned','partitionSecure'],
 ['omitted SameSite','', 'missingSameSite'],['HttpOnly contextual review','', 'httpReview'],['scope contextual review','; Path=/','scopeReview'],
 ['lifetime contextual review','; Max-Age=0','timeReview'],['age precedence','; Max-Age=1; Expires=Wed, 09 Jun 2027 10:18:14 GMT','agePrecedence'],
 ['Secure prefix','', 'prefixSecure']
])test('observation '+name,()=>assert(codes((name==='Secure prefix'?'__Secure-id=REDACTED':header)+suffix).includes(required)));
for(const prefix of ['__Secure-','__Host-','__Http-','__Host-Http-'])test('prefix HTTPS/browser context '+prefix,()=>assert(codes(prefix+'id=REDACTED; Secure; HttpOnly; Path=/').includes('prefixContext')));
for(const prefix of ['__Host-','__Host-Http-']){
 test(prefix+'forbids Domain',()=>assert(codes(prefix+'id=REDACTED; Secure; HttpOnly; Path=/; Domain=example.com').includes('prefixDomain')));
 test(prefix+'requires explicit root path',()=>assert(codes(prefix+'id=REDACTED; Secure; HttpOnly').includes('prefixPath')));
 test(prefix+'rejects non-root path by observation',()=>assert(codes(prefix+'id=REDACTED; Secure; HttpOnly; Path=/a').includes('prefixPath')));
}
for(const prefix of ['__Http-','__Host-Http-'])test(prefix+'requires HttpOnly',()=>assert(codes(prefix+'id=REDACTED; Secure; Path=/').includes('prefixHttp')));
test('noncanonical Secure spelling gets conditional context',()=>assert(codes('__SeCuRe-id=REDACTED').includes('variantContext')));
test('noncanonical Host spelling gets Domain and Path context',()=>{const n=codes('__host-id=REDACTED; Secure; Domain=example.com; Path=/a');assert(n.includes('variantContext'));assert(n.includes('variantDomain'));assert(n.includes('variantPath'));});
test('noncanonical name is never normalized',()=>assert.equal(parse('__SeCuRe-ID=REDACTED').name,'__SeCuRe-ID'));
test('draft matching is not extended to Http family',()=>assert(!codes('__http-id=REDACTED').includes('variantContext')));
test('64 attributes accepted without final delimiter',()=>assert.equal(parse(header+'; A'.repeat(64)).attrs.get('a').length,64));
test('64 attributes accepted with final delimiter',()=>assert.equal(parse(header+'; A'.repeat(64)+';').attrs.get('a').length,64));
test('65 attributes rejected without final delimiter',()=>assert.throws(()=>parse(header+'; A'.repeat(65)),e=>e.code==='limit'));
test('65 attributes rejected with final delimiter',()=>assert.throws(()=>parse(header+'; A'.repeat(65)+';'),e=>e.code==='limit'));
test('two final delimiters rejected',()=>assert.throws(()=>parse(header+';;'),e=>e.code==='attribute'));
test('exact 8192-character limit accepted',()=>assert.equal(parse(header+'; X='+'a'.repeat(8192-header.length-4)).attrs.get('x')[0].length,8192-header.length-4));
test('one literal separator and duplicate values remain different',()=>assert.deepEqual(compare(header+'; X=a | b',header+'; X=a; X=b').changes,[{key:'x',before:['a | b'],after:['a','b']}]));
test('valid flags remove rule conflicts',()=>{const n=codes('__Host-Http-id=REDACTED; Secure; HttpOnly; Path=/; SameSite=None; Partitioned');for(const c of ['noneSecure','partitionSecure','prefixSecure','prefixDomain','prefixPath','prefixHttp'])assert(!n.includes(c));});
test('duplicate SameSite is not silently resolved',()=>assert(!codes(header+'; SameSite=Lax; SameSite=None').includes('noneSecure')));
test('duplicate Path does not receive single path verdict',()=>assert(!codes('__Host-id=REDACTED; Secure; Path=/; Path=/other').includes('prefixPath')));
test('removal is represented as absence',()=>assert.deepEqual(compare(header+'; Secure',header).changes,[{key:'secure',before:[true],after:[]} ]));
test('core has no I/O, dynamic code or HTML sinks',()=>{const s=require('node:fs').readFileSync(require.resolve('../core.js'),'utf8');assert(!/fetch\s*\(|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|document\.cookie|console\.|eval\s*\(|innerHTML/.test(s));});
