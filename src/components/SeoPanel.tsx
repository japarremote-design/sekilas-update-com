import React, { useMemo, useState } from 'react';
import { ChevronDown, Gauge, BookOpen, Newspaper, Search, ClipboardCopy, Check } from 'lucide-react';
import {
  analisisSeo, WARNA_TINGKAT,
  type HasilAnalisis, type KelompokSeo, type MasukanAnalisis, type Pemeriksaan, type TingkatSeo,
} from '../lib/seo';

/**
 * Panel "Skor SEO" di dalam form Edit Berita.
 *
 * Menampilkan lampu merah/oranye/kuning/hijau seperti plugin SEO WordPress,
 * tapi kriterianya disusun untuk berita berbahasa Indonesia — lihat
 * src/lib/seo.ts untuk alasannya.
 *
 * Pemeriksaan diurutkan dari yang paling buruk ke paling baik, bukan menurut
 * urutan pembuatannya. Penulis yang buru-buru mengejar tenggat hanya sempat
 * melihat baris teratas, jadi baris teratas harus berisi hal yang paling perlu
 * diperbaiki.
 */

const IKON_KELOMPOK: Record<KelompokSeo, React.ReactNode> = {
  seo: <Search className="w-3.5 h-3.5" />,
  keterbacaan: <BookOpen className="w-3.5 h-3.5" />,
  jurnalistik: <Newspaper className="w-3.5 h-3.5" />,
};

const NAMA_KELOMPOK: Record<KelompokSeo, string> = {
  seo: 'SEO',
  keterbacaan: 'Keterbacaan',
  jurnalistik: 'Jurnalistik',
};

/** Urutan tampil: yang paling merah lebih dulu. */
const URUTAN: Record<TingkatSeo, number> = { buruk: 0, kurang: 1, cukup: 2, baik: 3 };

const LABEL_SALIN: Record<TingkatSeo, string> = {
  buruk: 'MERAH', kurang: 'ORANYE', cukup: 'KUNING', baik: 'HIJAU',
};

/**
 * Susun seluruh isi form + hasil analisis jadi satu teks polos, siap
 * ditempel ke chat AI (Claude, ChatGPT, dll.) untuk dimintai optimasi.
 * Urutan kolomnya sama dengan urutan di form supaya gampang dicocokkan
 * waktu hasilnya disalin balik.
 */
function susunTeksSalin(masukan: MasukanAnalisis & { kategori?: string }, hasil: HasilAnalisis): string {
  const terurut = [...hasil.pemeriksaan].sort(
    (a, b) => URUTAN[a.tingkat] - URUTAN[b.tingkat] || b.bobot - a.bobot
  );
  const st = hasil.statistik;
  const baris = [
    'Tolong optimasi berita ini supaya skor SEO-nya naik. Jangan ubah kutipan langsung narasumber dan jangan menambah fakta yang tidak ada di naskah. Kembalikan hasilnya per kolom dengan urutan yang sama.',
    '',
    'Judul Berita:',
    masukan.judul.trim() || '(kosong)',
    '',
    'Kata Kunci:',
    masukan.kataKunci.trim() || '(kosong)',
    '',
    ...(masukan.kategori !== undefined ? ['Kategori:', masukan.kategori || '(kosong)', ''] : []),
    'Ringkasan / Excerpt:',
    masukan.ringkasan.trim() || '(kosong)',
    '',
    'Isi Berita Lengkap:',
    masukan.isi.trim() || '(kosong)',
    '',
    'Tag:',
    masukan.tag.join(', ') || '(kosong)',
    '',
    `Gambar utama: ${masukan.urlGambar.trim() ? 'sudah terpasang' : 'belum ada'}`,
    '',
    '=== KONDISI SEO ===',
    `Skor ${hasil.skor} (${WARNA_TINGKAT[hasil.tingkat].label}) — ` +
      (Object.keys(NAMA_KELOMPOK) as KelompokSeo[])
        .map(k => `${NAMA_KELOMPOK[k]} ${hasil.kelompok[k].skor}`).join(' · '),
    ...(hasil.catatanTingkat ? [hasil.catatanTingkat] : []),
    '',
    ...terurut.map(p => `[${LABEL_SALIN[p.tingkat]}] ${p.judul} (${NAMA_KELOMPOK[p.kelompok]}): ${p.pesan}`),
    '',
    `${st.jumlahKata} kata · ${st.jumlahKalimat} kalimat · ${st.jumlahParagraf} paragraf · ` +
      `${st.kataPerKalimat} kata/kalimat · kepadatan ${st.kepadatanKunci}% · pasif ${st.persenPasif}% · ` +
      `kalimat panjang ${st.persenKalimatPanjang}% · transisi ${st.persenTransisi}%`,
  ];
  return baris.join('\n');
}

/** Salin ke clipboard, dengan cadangan untuk browser lama / non-HTTPS. */
async function salinKeClipboard(teks: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(teks);
      return true;
    }
  } catch {
    /* lanjut ke cara lama */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = teks;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export const SeoPanel: React.FC<MasukanAnalisis & { kategori?: string }> = (masukan) => {
  const [terbuka, setTerbuka] = useState(true);
  const [statusSalin, setStatusSalin] = useState<'diam' | 'tersalin' | 'gagal'>('diam');

  // Analisis berjalan tiap ketikan, jadi hasilnya di-cache selama masukannya
  // belum berubah — tanpa ini, mengetik di naskah panjang terasa tersendat.
  const hasil = useMemo(() => analisisSeo(masukan), [
    masukan.judul, masukan.kataKunci, masukan.ringkasan,
    masukan.isi, masukan.urlGambar, masukan.kota, masukan.tag.join('|'),
  ]);

  const warna = WARNA_TINGKAT[hasil.tingkat];
  const terurut = [...hasil.pemeriksaan].sort(
    (a, b) => URUTAN[a.tingkat] - URUTAN[b.tingkat] || b.bobot - a.bobot
  );
  const perluDibenahi = hasil.pemeriksaan.filter(p => p.tingkat === 'buruk' || p.tingkat === 'kurang').length;

  const salin = async () => {
    const ok = await salinKeClipboard(susunTeksSalin(masukan, hasil));
    setStatusSalin(ok ? 'tersalin' : 'gagal');
    window.setTimeout(() => setStatusSalin('diam'), 2500);
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* Kepala panel: skor besar + tiga skor kelompok */}
      <button
        type="button"
        onClick={() => setTerbuka(!terbuka)}
        className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${warna.latar} hover:brightness-95 cursor-pointer`}
      >
        <div className={`w-11 h-11 rounded-full ${warna.bulat} text-white flex flex-col items-center justify-center flex-none shadow-sm`}>
          <span className="text-sm font-black leading-none">{hasil.skor}</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-gray-500" />
            <span className="font-bold text-sm text-gray-800">Skor SEO</span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${warna.bulat} text-white`}>
              {warna.label}
            </span>
          </div>
          <p className="text-[11px] text-gray-500 mt-0.5 truncate">
            {hasil.catatanTingkat
              ?? (perluDibenahi === 0
                ? 'Semua pemeriksaan aman.'
                : `${perluDibenahi} hal masih bisa diperbaiki.`)}
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-3 flex-none">
          {(Object.keys(NAMA_KELOMPOK) as KelompokSeo[]).map(k => (
            <div key={k} className="text-center">
              <div className={`text-xs font-black ${WARNA_TINGKAT[hasil.kelompok[k].tingkat].teks}`}>
                {hasil.kelompok[k].skor}
              </div>
              <div className="text-[9px] text-gray-500 uppercase tracking-wide">{NAMA_KELOMPOK[k]}</div>
            </div>
          ))}
        </div>

        <ChevronDown className={`w-4 h-4 text-gray-500 flex-none transition-transform ${terbuka ? 'rotate-180' : ''}`} />
      </button>

      {/* Salin semua isian + kondisi SEO sekali klik, untuk ditempel ke chat AI. */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-gray-100 bg-white">
        <span className="text-[10px] text-gray-500 leading-snug">
          Salin judul, kata kunci, ringkasan, isi, tag, dan kondisi SEO untuk ditempel ke chat AI.
        </span>
        <button
          type="button"
          onClick={salin}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold flex-none border transition-colors cursor-pointer ${
            statusSalin === 'tersalin'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
              : statusSalin === 'gagal'
                ? 'bg-red-50 border-red-300 text-red-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          {statusSalin === 'tersalin'
            ? <><Check className="w-3.5 h-3.5" /> Tersalin</>
            : statusSalin === 'gagal'
              ? <>Gagal menyalin</>
              : <><ClipboardCopy className="w-3.5 h-3.5" /> Salin untuk Optimasi</>}
        </button>
      </div>

      {terbuka && (
        <div className="border-t border-gray-100">
          <ul className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
            {terurut.map(p => <BarisPemeriksaan key={p.id} pemeriksaan={p} />)}
          </ul>

          {/* Angka mentah — berguna buat editor yang ingin menilai sendiri. */}
          <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-mono text-gray-500">
            <span>{hasil.statistik.jumlahKata} kata</span>
            <span>{hasil.statistik.jumlahKalimat} kalimat</span>
            <span>{hasil.statistik.jumlahParagraf} paragraf</span>
            <span>{hasil.statistik.kataPerKalimat} kata/kalimat</span>
            <span>kepadatan {hasil.statistik.kepadatanKunci}%</span>
            <span>pasif {hasil.statistik.persenPasif}%</span>
          </div>

          <p className="px-3 py-2 text-[10px] text-gray-400 leading-relaxed border-t border-gray-100">
            Skor hijau berarti naskah rapi menurut daftar periksa ini — bukan
            jaminan peringkat di Google. Isi berita yang bermutu tetap yang
            paling menentukan.
          </p>
        </div>
      )}
    </div>
  );
};

const BarisPemeriksaan: React.FC<{ pemeriksaan: Pemeriksaan }> = ({ pemeriksaan }) => {
  const w = WARNA_TINGKAT[pemeriksaan.tingkat];
  return (
    <li className="flex gap-2.5 px-3 py-2 hover:bg-gray-50/70">
      <span className={`w-2.5 h-2.5 rounded-full ${w.bulat} flex-none mt-1.5 ring-2 ring-white shadow-sm`} />
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-gray-800">{pemeriksaan.judul}</span>
          <span className="text-[9px] uppercase tracking-wide text-gray-400 flex items-center gap-1">
            {IKON_KELOMPOK[pemeriksaan.kelompok]}
            {NAMA_KELOMPOK[pemeriksaan.kelompok]}
          </span>
        </div>
        <p className="text-[11px] text-gray-600 leading-snug mt-0.5">{pemeriksaan.pesan}</p>
      </div>
    </li>
  );
};
