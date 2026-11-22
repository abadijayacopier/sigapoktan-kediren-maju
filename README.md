# Sistem Informasi Gapoktan "KEDIREN MAJU" (SIGAPOKTAN)

Aplikasi Web Full-Stack **Sistem Informasi Gabungan Kelompok Tani (SIGAPOKTAN)** untuk **GAPOKTAN "KEDIREN MAJU"** (Berdiri: 14 Februari 2008, Rekening BRI Unit Lembeyan: `3877-01-025711-53-9`), **Desa Kediren, Kecamatan Lembeyan, Kabupaten Magetan, Provinsi Jawa Timur**.

## Fitur Utama

1. **Dashboard Eksekutif & Tabel Master Rumus 7 Poktan**
   - Saldo Awal Rekening BRI Unit Lembeyan: **Rp 401.462.970,-**
   - Total Penarikan BLM-PUAP 7 Poktan (340 Anggota): **Rp 340.000.000,-**
   - Total Dana Kembali (Pokok + Jasa): **Rp 357.000.000,-**
   - Sisa Saldo Rekening BRI: **Rp 61.462.970,-**

2. **Kelembagaan 7 Poktan & Anggota Petani Desa Kediren**
   - Struktur kepengurusan lengkap pada setiap Poktan: **Ketua, Sekretaris, Bendahara, Seksi Saprodi, Seksi Humas, dan Seksi Pengairan**.
   - **7 Kelompok Tani**:
     - **Poktan Sri Mulyo** (Dusun Selungguh RT 06/01 — Ketua: *Samsi*, Bendahara: *Sutikno*, Sekretaris: *Agus Sutopo*, beserta *Supriyanto, Samsuri, Kadirun, Seman, Doni, Amat Kasiran, Sarimin*, dll.)
     - **Poktan Tani Maju** (Dusun Selungguh RT 03/01 — Ketua: *Sukamto*, Bendahara: *Hadi Wiyono*, Sekretaris: *Samiran*)
     - **Poktan Sidodadi** (Dusun Sekadalan RT 11/02 — Ketua: *Sudarno*, Bendahara: *Supangat*, Sekretaris: *Aris Ansori*)
     - **Poktan Sri Rejeki** (Dusun Sekadalan RT 12/02 — Ketua: *Rusimin*, Bendahara: *Wagimin*, Sekretaris: *Suparlan*)
     - **Poktan Kledokan** (Dusun Ledok RT 16/02 — Ketua: *Supriyadi*, Bendahara: *Reksi Samiran*, Sekretaris: *Suyatno*)
     - **Poktan Puntuk Asri** (Dusun Ledok RT 16/02 — Ketua: *Suyitno*, Bendahara: *Ngadiyin*, Sekretaris: *Suyadi*)
     - **Poktan Cindelaras** (Dusun Sepuntuk RT 20/03 — Ketua: *Edi Prayitno*, Bendahara: *Susanto*, Sekretaris: *Hambali*)

3. **WebGIS Peta Pertanian Hybrid & GPS Desa Kediren, Kec. Lembeyan**
   - Berpusat di Desa Kediren (`-7.7592° S, 111.3732° E`) dengan layer **Citra Satelit Hybrid** (Satelit + Label Jalan/Dusun) dan kemampuan **Zoom Dekat (Level 19–20)**.
   - Pemetaan poligon petak sawah untuk 3 komoditas utama: **Padi**, **Jagung**, dan **Tebu**.
   - Terintegrasi dengan tombol **Ambil Titik GPS** dan fitur **Klik Peta untuk Tambah Petak Lahan**.

4. **Unit Usaha Simpan Pinjam BLM-PUAP & Siklus Angsuran 3x Setahun**
   - **Jasa Pinjaman**: **Rp 50.000 per Rp 1.000.000** pokok pinjaman per musim tanam 4 bulan (`1,25%` per bulan).
   - **Biaya Pendaftaran Anggota Baru**: **Rp 10.000**.
   - **Biaya Administrasi Pencairan PUAP**: **Rp 10.000**.
   - **Siklus Perguliran 1 Tahun 3x Musim Tanam**:
     - Musim I: **Maret – Juli**
     - Musim II: **Juli – November**
     - Musim III: **November – Maret**

5. **Pusat Cetak Berkas Pencairan & Rekomendasi Dinas TPHP Kabupaten Magetan**
   - Rencana Penarikan BLM PUAP 7 Poktan
   - Surat Pengantar / Rekomendasi Dinas TPHP Kabupaten Magetan ke Kepala Cabang BRI Magetan (`Nomor: 500.6/.../403.119/2026`)
   - Rencana Usaha Kelompok (RUK) & Rekapitulasi Anggota Penerima PUAP
   - Surat Perjanjian Kerjasama Pembiayaan, Berita Acara Serah Terima Uang (BAST), Pakta Integritas, dan Kwitansi PUAP
   - Laporan Rapat Anggota Tahunan (RAT) & Pembagian SHU

## Cara Menjalankan Secara Lokal

```bash
npm install
npm run dev
```

Buka `http://localhost:3000` di browser. Database SQLite (`gapoktan_kediren_maju.db`) akan otomatis dibuat dan diisi dengan data awal saat aplikasi pertama kali dijalankan.
