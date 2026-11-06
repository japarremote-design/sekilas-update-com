import React from 'react';
import { ExternalLink } from 'lucide-react';
import { Article, CategoryType } from '../types';

interface CategoryGridProps {
  articles: Article[];
  categories: CategoryType[];
  selectedCategory: CategoryType | 'Semua';
  onSelectArticle: (article: Article) => void;
  onSelectCategory: (category: CategoryType) => void;
}

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

/**
 * Tanggal terbit berformat "Bulan Tanggal, Tahun" (zona WIB),
 * mis. "November 5, 2026". Dipakai di baris meta kartu berita.
 */
const formatTanggalRedaksi = (waktu: string | number | Date): string => {
  const tanggal = new Date(waktu);
  if (isNaN(tanggal.getTime())) return '';
  const bagian = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  }).formatToParts(tanggal);
  const ambil = (jenis: string) => Number(bagian.find(b => b.type === jenis)?.value);
  return `${NAMA_BULAN[ambil('month') - 1]} ${ambil('day')}, ${ambil('year')}`;
};

/**
 * Baris meta kartu: "Redaksi • Bulan Tanggal, Tahun" dalam SATU baris.
 * whitespace-nowrap mencegahnya patah jadi dua baris di kolom sempit,
 * jadi baris ini harus diletakkan selebar kartu, bukan di kolom teks sempit.
 */
const MetaRedaksi: React.FC<{ waktu: string | number | Date }> = ({ waktu }) => (
  <p className="text-xs text-gray-500 font-mono whitespace-nowrap">
    <span className="font-semibold text-[#141B34]">Redaksi</span>
    {' • '}
    {formatTanggalRedaksi(waktu)}
  </p>
);

export const CategoryGrid: React.FC<CategoryGridProps> = ({
  articles,
  categories,
  selectedCategory,
  onSelectArticle,
  onSelectCategory
}) => {
  // Filter out hero article if viewing 'Semua' so it doesn't duplicate
  const heroArticle = articles.find(a => a.isHero) || articles[0];
  const mainArticles = selectedCategory === 'Semua'
    ? articles.filter(a => a.id !== heroArticle?.id)
    : articles.filter(a => a.category === selectedCategory);

  const categoriesToRender: CategoryType[] = selectedCategory === 'Semua'
    ? categories
    : [selectedCategory];

  return (
    <div className="space-y-10">
      {categoriesToRender.map((category) => {
        const catArticles = mainArticles.filter(a => a.category === category);
        if (catArticles.length === 0 && selectedCategory === 'Semua') return null;

        return (
          <section key={category} className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
            {/* Category Section Header */}
            <div className="flex items-center justify-between border-b-2 border-[#141B34] pb-2.5 mb-5">
              <h2 className="text-xl md:text-2xl font-bold text-[#141B34] font-display flex items-center gap-2">
                <span className="w-2.5 h-6 bg-[#E30F2A] rounded-full inline-block"></span>
                {category}
              </h2>
              {selectedCategory === 'Semua' && (
                <button
                  onClick={() => onSelectCategory(category)}
                  className="text-xs font-bold text-[#E30F2A] hover:text-[#141B34] transition-colors flex items-center gap-1 cursor-pointer"
                >
                  Lihat Semua
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Articles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {catArticles.length === 0 ? (
                <p className="text-gray-500 text-sm italic col-span-2 py-4">Belum ada berita untuk kategori ini.</p>
              ) : (
                catArticles.map((article, idx) => {
                  // Alternative card styling for Hukum & Kriminal category or featured layout
                  if (category === 'Hukum' && idx % 2 === 0) {
                    return (
                      <article
                        key={article.id}
                        onClick={() => onSelectArticle(article)}
                        className="group cursor-pointer border p-3 rounded-lg bg-slate-50/80 hover:bg-slate-100/80 border-slate-200 transition-all hover:shadow-sm"
                      >
                        <div className="flex gap-4">
                          <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-[#141B34]/10">
                            <img
            loading="lazy"
            decoding="async"
                              src={article.imageUrl}
                              alt={article.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <h3 className="flex-grow min-w-0 self-start font-bold text-base text-gray-900 group-hover:text-[#141B34] transition-colors line-clamp-3 leading-snug">
                            {article.title}
                          </h3>
                        </div>
                        <div className="mt-2.5">
                          <MetaRedaksi waktu={article.createdAt} />
                        </div>
                      </article>
                    );
                  }

                  if (category === 'Politik' || category === 'Opini') {
                    return (
                      <article
                        key={article.id}
                        onClick={() => onSelectArticle(article)}
                        className="group cursor-pointer border border-slate-100 rounded-lg overflow-hidden hover:shadow-md transition-all p-2.5 bg-slate-50/50"
                      >
                        <div className="relative h-44 w-full mb-3 overflow-hidden rounded-md bg-slate-200">
                          <img
            loading="lazy"
            decoding="async"
                            src={article.imageUrl}
                            alt={article.title}
                            className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                          />
                          {category === 'Opini' && (
                            <div className="absolute top-2 left-2 bg-[#141B34] text-white px-2 py-0.5 text-[10px] font-bold rounded shadow-sm">
                              OPINI
                            </div>
                          )}
                        </div>
                        <h3 className="font-bold text-base text-gray-900 group-hover:text-[#141B34] transition-colors line-clamp-3 mb-2.5 leading-snug">
                          {article.title}
                        </h3>
                        <div className="pt-2 border-t border-slate-100">
                          <MetaRedaksi waktu={article.createdAt} />
                        </div>
                      </article>
                    );
                  }

                  // Standard Article Card
                  return (
                    <article
                      key={article.id}
                      onClick={() => onSelectArticle(article)}
                      className="group cursor-pointer p-2 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex gap-3.5">
                        <img
            loading="lazy"
            decoding="async"
                          src={article.imageUrl}
                          alt={article.title}
                          className="w-24 h-24 object-cover rounded-lg flex-shrink-0 bg-slate-200 shadow-sm group-hover:scale-105 transition-transform"
                        />
                        <h3 className="flex-grow min-w-0 self-start font-bold text-sm sm:text-base text-gray-900 group-hover:text-[#141B34] transition-colors line-clamp-4 leading-snug">
                          {article.title}
                        </h3>
                      </div>
                      <div className="mt-2">
                        <MetaRedaksi waktu={article.createdAt} />
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
};
