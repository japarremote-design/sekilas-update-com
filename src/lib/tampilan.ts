/**
 * Saklar tampilan publik.
 *
 * TAMPILKAN_STATISTIK_PEMBACA mengatur tiga hal yang kasat mata bagi pembaca:
 * jumlah "Pembaca", "menit baca", dan tombol "Suka". Nilainya false berarti
 * ketiganya disembunyikan dari tampilan.
 *
 * Yang disembunyikan hanya TAMPILANNYA. Penghitung pembaca dan suka di
 * ArticleDetail tetap berjalan dan tetap menulis ke Firestore, jadi angkanya
 * tidak hilang. Ubah ke true kalau ingin menampilkannya lagi.
 */
export const TAMPILKAN_STATISTIK_PEMBACA = false;
