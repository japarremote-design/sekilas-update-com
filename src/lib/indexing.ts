import { articlePath } from './slug';

/**
 * Alamat situs yang sebenarnya. Dipakai untuk link yang disalin ke Search
 * Console — sengaja BUKAN window.location.origin, supaya link yang tersalin
 * selalu alamat resmi walau Ruang Redaksi dibuka dari domain lain.
 */
const ALAMAT_SITUS = 'https://sekilasupdate.com';
const URL_SEARCH_CONSOLE = 'https://search.google.com/search-console';

/**
 * Beri tahu Bing, Yandex, dkk lewat IndexNow bahwa berita ini baru terbit atau
 * berubah. Dijalankan di belakang layar: tidak ditunggu, dan kegagalannya tidak
 * boleh sampai mengganggu penyimpanan berita. `keepalive` supaya permintaan
 * tetap selesai walau jendela editor langsung ditutup.
 */
export function kirimIndexNow(articleId: string): void {
  try {
    void fetch('/api/indexnow', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: articleId }),
      keepalive: true,
    }).catch(() => { /* diam: bukan urusan pembaca maupun penyimpanan */ });
  } catch {
    /* diam */
  }
}

/** Salin teks; true kalau berhasil. Cadangan execCommand untuk peramban lama. */
function salinTeks(teks: string): Promise<boolean> {
  const cadangan = (): boolean => {
    try {
      const ta = document.createElement('textarea');
      ta.value = teks;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  };

  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(teks).then(() => true, () => cadangan());
  }
  return Promise.resolve(cadangan());
}

/**
 * Tombol "Percepat di Google": salin link berita lalu buka Search Console, tinggal
 * tempel di kolom "Inspect any URL" dan klik Request indexing.
 *
 * Google sengaja tidak menyediakan jalur otomatis untuk berita, jadi langkah
 * terakhir tetap manual. Penyalinan DIMULAI lebih dulu sebelum tab baru dibuka,
 * karena begitu tab baru mengambil fokus, penyalinan bisa ditolak peramban.
 * Mengembalikan alamat berita dan apakah penyalinannya berhasil, supaya pemanggil
 * bisa menampilkan alamat itu untuk disalin manual kalau peramban menolak.
 */
export async function salinLinkDanBukaSearchConsole(
  article: { id: string; title: string }
): Promise<{ alamat: string; tersalin: boolean }> {
  const alamat = `${ALAMAT_SITUS}${articlePath(article)}`;
  const salin = salinTeks(alamat);
  window.open(URL_SEARCH_CONSOLE, '_blank', 'noopener,noreferrer');
  return { alamat, tersalin: await salin };
}
