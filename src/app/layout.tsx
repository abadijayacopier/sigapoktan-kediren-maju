import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SIGAPOKTAN "KEDIREN MAJU" — Sistem Informasi Gapoktan Desa Kediren, Kec. Lembeyan, Kab. Magetan',
  description:
    'Sistem Informasi Gabungan Kelompok Tani (SIGAPOKTAN) KEDIREN MAJU Desa Kediren Kecamatan Lembeyan Kabupaten Magetan: Manajemen 7 Poktan, WebGIS Peta Hybrid & GPS Pertanian (Padi, Jagung, Tebu), Unit Usaha Simpan Pinjam PUAP 3 Musim, Rekomendasi Dinas TPHP Magetan, & Laporan RAT Tahunan.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
