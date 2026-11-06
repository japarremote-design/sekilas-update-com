import { SITE_URL, articleUrl, fetchArticleById } from './_firestore.js';

/**
 * IndexNow — memberi tahu mesin pencari (Bing, Yandex, Naver, Seznam, Yep) saat
 * sebuah berita terbit atau berubah, tanpa menunggu mereka datang sendiri.
 * GOOGLE TIDAK IKUT protokol ini; untuk Google, sitemap + Search Console.
 *
 * Dipanggil dari Ruang Redaksi sesudah berita tersimpan dan berstatus Published.
 * Kegagalan di sini TIDAK PERNAH boleh mengganggu penerbitan — pemanggilnya
 * mengabaikan hasilnya.
 *
 * Titik ini terbuka (tanpa login), jadi dijaga berlapis supaya tidak bisa
 * dipakai menyepam IndexNow atas nama situs:
 *   1. Hanya menerima id berita; alamat yang diping SELALU dibuat sendiri dari
 *      data Firestore, tidak pernah dari kiriman pemanggil.
 *   2. Berita harus nyata, berstatus Published, dan aktif.
 *   3. Berita harus BARU diubah (JENDELA_UBAH_MS), menurut jam Firestore.
 *   4. Satu alamat paling sering diping sekali per JEDA_MS.
 *
 * Kunci IndexNow memang tidak rahasia: ia harus bisa dibaca publik di
 * /{KUNCI}.txt (lihat public/) supaya mesin pencari bisa memastikan kepemilikan.
 */

const KUNCI = '2fcc7853ebcaca431fc0f7c53fce2020';
const ENDPOINT = 'https://api.indexnow.org/indexnow';

const JENDELA_UBAH_MS = 15 * 60 * 1000;
const JEDA_MS = 10 * 60 * 1000;

// Per instance fungsi; cukup sebagai rem tambahan, bukan satu-satunya pengaman.
const terakhirPing = new Map();

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('allow', 'POST');
    return res.status(405).json({ ok: false, alasan: 'metode' });
  }

  try {
    const id = typeof req.body?.id === 'string' ? req.body.id.trim() : '';
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(id)) {
      return res.status(400).json({ ok: false, alasan: 'id-tidak-valid' });
    }

    const artikel = await fetchArticleById(id);
    if (!artikel || !artikel.title || artikel.status !== 'Published' || !artikel.isActive) {
      return res.status(200).json({ ok: false, alasan: 'tidak-terbit' });
    }

    const umur = Date.now() - new Date(artikel.updateTime).getTime();
    if (!Number.isFinite(umur) || umur > JENDELA_UBAH_MS) {
      return res.status(200).json({ ok: false, alasan: 'tidak-baru-diubah' });
    }

    const url = articleUrl(artikel);

    const sebelumnya = terakhirPing.get(url);
    if (sebelumnya && Date.now() - sebelumnya < JEDA_MS) {
      return res.status(200).json({ ok: true, dilewati: 'baru-saja-diping' });
    }
    if (terakhirPing.size > 200) terakhirPing.clear();

    const balasan = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: new URL(SITE_URL).host,
        key: KUNCI,
        keyLocation: `${SITE_URL}/${KUNCI}.txt`,
        urlList: [url],
      }),
      signal: AbortSignal.timeout(5000),
    });

    // 200 = diterima, 202 = diterima tapi kuncinya masih diverifikasi.
    const diterima = balasan.status === 200 || balasan.status === 202;
    if (diterima) terakhirPing.set(url, Date.now());

    return res.status(200).json({ ok: diterima, status: balasan.status });
  } catch (err) {
    console.warn('indexnow gagal:', err);
    return res.status(200).json({ ok: false, alasan: 'galat' });
  }
}
