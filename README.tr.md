# Cookie Delta · kullanım rehberi

Site güncelleyen geliştiriciler için, önceki ve yeni **tek bir Set-Cookie başlığını** karşılaştıran küçük yerel araç. [English](README.md).

Klasörü açıp `index.html` dosyasını tarayıcıda aç. Sunucu, paket kurulumu veya build gerekmez; JavaScript açık olmalı. Dört arayüz dosyası yereldir. Site üzerinde sunulan araç sayfası da bu dosyaları kullanır; araçta izleyici yoktur.

Önce çerez değerini kendi ortamında tam `REDACTED` yap. Gerçek çerez değeri yapıştırma. Araç senin yerine maskeleme yapmaz; farklı değerleri reddeder. Her kutuya tek satırda tek başlık gir; `Set-Cookie:` etiketi isteğe bağlıdır. **Farkları göster** ile öznitelik değişikliklerini ve bağlama göre inceleme notlarını oku. Çerez adı ve öznitelikler de hassas olabilir; sentetik/anonim metadata kullan ve raporu paylaşmadan önce incele.

Sentetik örnekte önceki başlık:

```text
Set-Cookie: session=REDACTED; Secure; HttpOnly; SameSite=Lax; Path=/
```

Yeni başlık:

```text
Set-Cookie: session=REDACTED; HttpOnly; SameSite=None; Path=/account
```

`path`, `samesite` ve `secure` değişir. Yeni başlıkta SameSite=None için gereken Secure yoktur. Bu, belgelenmiş öznitelik kuralına dair bir gözlemdir; canlı tarayıcı testi veya zafiyet kanıtı değildir. Domain, Path ve süre farklarına kesin güvenlik hükmü verilmez.

Öznitelik sırası/ad harfleri, SameSite ve Domain harfleri, Domain başındaki nokta, IMF-fixdate harfleri ve Max-Age tam sayı yazımı normalleştirilir. Çerez adı ve Path harfleri korunur. Eksik SameSite açık Lax sayılmaz. Bilinmeyen değerler ve tekrar değerlerinin sırası korunur. Tekrarlarda etkin tarayıcı değeri seçilmez.

Test listesi başlangıçta işaretli değildir ve test çalıştırmaz. Kendi uygulamanda giriş/çıkış, oturum yenileme, gerekiyorsa cross-site giriş/ödeme, kapsam, süre/silme ve hedef tarayıcı davranışını dene. Raporu kopyalamak yalnız açık kullanıcı eylemiyle sistem panosuna yazar. Pano erişimi yoksa metin elle kopyalamak için seçilir. Girdi değişince eski rapor geçersiz olur; yeni karşılaştırma veya dil değişimi listeyi sıfırlar. Yenilemede durum korunmaz.

## Dar ayrıştırma kapsamı

Tek ASCII başlık, 8192 karakter, 64 öznitelik; tam ve tırnaksız REDACTED değeri. Çoklu/birleştirilmiş başlıklar, alıntılı öznitelikler, ters eğik çizgi ve kontrol karakterleri reddedilir. Sonda tek noktalı virgül kabul edilir. Expires yalnız geçerli ve gün adı uyumlu IMF-fixdate/GMT biçimindedir; tarihteki virgül başlık ayırıcısı sayılmaz. Diğer tarih biçimleri tahmin edilmez. Max-Age en fazla 18 basamak; açık Path `/` ile başlamalıdır. Domain için ASCII DNS yazımı kontrol edilir; DNS veya public suffix denetimi yapılmaz.

Secure, HttpOnly, SameSite, Partitioned ve belgelenmiş dört önek için inceleme notları vardır. Sunucunun canonical önek yazımı ile user-agent eşlemesi ayrıdır. Arşivdeki [6265bis-22 Internet-Draft §4.1.3/§5.4](https://www.ietf.org/archive/id/draft-ietf-httpbis-rfc6265bis-22.html#section-5.4), __Secure- ve __Host- aileleri için user-agent eşlemesini harf duyarsız tanımlar. Araç farklı harfli bu varyantlara koşullu bağlam uyarısı verir, ismi değiştirmez ve bu draft kuralını __Http- ailesine genişletmez. Bu arşiv çalışma taslağı nihai RFC değildir. HTTPS kökeni ve tarayıcı desteği başlık metninden kanıtlanamaz. Araç çerez okumaz, ağ/sunucu çağrısı, depolama, girdi günlüğü, analitik, puanlama veya otomatik düzeltme yapmaz. Güvenlik garantisi vermez. Benzer araçlar vardır; özgünlük iddiası yoktur.

Geliştirmede `npm test` sentetik testleri çalıştırır; `npm run build` dört arayüz dosyasını dist klasörüne kopyalar. Çalıştırılan ortam ve sonuçlar `QA.md` içindedir. Bu yeni depo için lisans seçilmedi; önceki bir projenin lisansı devralınmadı.

Kaynak kontrolü: 7 Kasım 2026. [MDN Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie) · [Benzer karşılaştırıcı](https://toolsorcerer.com/http_header_inspector).
