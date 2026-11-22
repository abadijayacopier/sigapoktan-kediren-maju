import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { terbilangRupiah } from '@/lib/terbilang';

export async function GET() {
  try {
    const db = getDb();
    const profile = db.prepare('SELECT * FROM gapoktan_profile WHERE id = 1').get() as Record<string, unknown>;
    const kas = db.prepare('SELECT * FROM kas_gapoktan ORDER BY id DESC').all() as Array<Record<string, unknown>>;

    const poktanList = db.prepare(`
      SELECT * FROM poktan ORDER BY urutan_penarikan ASC
    `).all() as Array<Record<string, unknown>>;

    let runningSaldo = Number(profile.saldo_rekening_awal || 401462970);
    const poktanRumus: Array<Record<string, unknown>> = poktanList.map((p) => {
      const modal = Number(p.pinjaman_modal);
      const kembali = Number(p.dana_kembali);
      runningSaldo -= modal;
      return {
        ...p,
        terbilang_modal: terbilangRupiah(modal),
        terbilang_kembali: terbilangRupiah(kembali),
        rencana_penarikan_sisa: runningSaldo,
        biaya_admin_pencairan_poktan: Number(p.jumlah_anggota_resmi) * 10000,
      };
    });

    // Rekap 3x Pencairan dalam 1 Tahun (Maret-Juli, Juli-November, November-Maret) untuk RAT & Dinas TPHP Magetan
    const siklusTahunan = [
      {
        termin: 1,
        perguliran_ke: 'XLVII (47)',
        periode_musim: 'Maret - Juli',
        tanggal_pencairan: '15 Maret 2026',
        tanggal_jatuh_tempo: '15 Juli 2026',
        jumlah_poktan: 7,
        jumlah_anggota: 340,
        dana_disalurkan: 340000000,
        pendapatan_jasa: 17000000, // 340 Jt * 50.000 / Jt
        pendapatan_admin_pencairan: 3400000, // 340 * 10.000
        total_dana_kembali: 357000000,
        status: 'LUNAS 100%',
      },
      {
        termin: 2,
        perguliran_ke: 'XLVIII (48)',
        periode_musim: 'Juli - November',
        tanggal_pencairan: '16 Juli 2026',
        tanggal_jatuh_tempo: '16 November 2026',
        jumlah_poktan: 7,
        jumlah_anggota: 340,
        dana_disalurkan: 340000000,
        pendapatan_jasa: 17000000,
        pendapatan_admin_pencairan: 3400000,
        total_dana_kembali: 357000000,
        status: 'LUNAS 100%',
      },
      {
        termin: 3,
        perguliran_ke: 'XLIX (49)',
        periode_musim: 'November - Maret',
        tanggal_pencairan: '17 November 2026',
        tanggal_jatuh_tempo: '29 Maret 2027',
        jumlah_poktan: 7,
        jumlah_anggota: 340,
        dana_disalurkan: 340000000,
        pendapatan_jasa: 17000000,
        pendapatan_admin_pencairan: 3400000,
        total_dana_kembali: 357000000,
        status: 'SEDANG BERGULIR',
      },
    ];

    // Perhitungan RAT Tahunan & SHU (Sisa Hasil Usaha)
    // Total Jasa 3 Musim = 3 x Rp 17.000.000 = Rp 51.000.000
    // Total Admin Pencairan 3 Musim = 3 x Rp 3.400.000 = Rp 10.200.000
    // Biaya Pendaftaran Anggota Baru = Rp 40.000 (atau sesuai kas)
    const totalJasa3Musim = 51000000;
    const totalAdminPencairan3Musim = 10200000;
    const anggotaBaruRow = db.prepare(`
      SELECT COUNT(*) as jml, COALESCE(SUM(biaya_anggota_baru), 0) as total
      FROM petani WHERE is_anggota_baru = 1
    `).get() as { jml: number; total: number };

    const biayaOperasionalRat = 4240000; // ATK, Rapat Koordinasi, Materai, Transport Dinas & Bank BRI
    const pendapatanKotorTahunan = totalJasa3Musim + totalAdminPencairan3Musim + Number(anggotaBaruRow.total);
    const shuBersihTahunan = pendapatanKotorTahunan - biayaOperasionalRat;

    const alokasiShu = [
      { kode: 'CADANGAN_MODAL', nama: 'Penambahan Modal Bergulir PUAP Gapoktan', persen: 30, nominal: Math.round(shuBersihTahunan * 0.3) },
      { kode: 'JASA_ANGGOTA', nama: 'SHU Jasa Transaksi & Simpanan Anggota (7 Poktan)', persen: 35, nominal: Math.round(shuBersihTahunan * 0.35) },
      { kode: 'DANA_PENGURUS', nama: 'Insentif Pengurus Gapoktan & Pengurus Poktan', persen: 15, nominal: Math.round(shuBersihTahunan * 0.15) },
      { kode: 'DANA_RAT_PENDIDIKAN', nama: 'Cadangan Biaya Penyelenggaraan RAT & Pembinaan', persen: 10, nominal: Math.round(shuBersihTahunan * 0.1) },
      { kode: 'DANA_SOSIAL', nama: 'Dana Sosial Pertanian Desa Kediren', persen: 10, nominal: Math.round(shuBersihTahunan * 0.1) },
    ];

    // Distribusi SHU per Poktan proporsional dengan kontribusi jasa
    const totalBagianAnggota = Math.round(shuBersihTahunan * 0.35);
    const shuPerPoktan = poktanRumus.map((p) => {
      const porsi = Number(p.pinjaman_modal) / 340000000;
      const shuPoktan = Math.round(totalBagianAnggota * porsi);
      const shuPerOrang = Math.round(shuPoktan / Number(p.jumlah_anggota_resmi));
      return {
        poktan_id: p.id,
        nama_poktan: p.nama_poktan,
        ketua: p.ketua,
        jumlah_anggota: p.jumlah_anggota_resmi,
        pinjaman_modal_per_musim: p.pinjaman_modal,
        jasa_disetor_3_musim: Number(p.total_jasa) * 3,
        admin_pencairan_3_musim: Number(p.jumlah_anggota_resmi) * 10000 * 3,
        alokasi_shu_poktan: shuPoktan,
        estimasi_shu_per_anggota: shuPerOrang,
      };
    });

    return NextResponse.json({
      profile,
      kas,
      poktanRumus,
      siklusTahunan,
      ratSummary: {
        tahun_buku: 2026,
        saldo_awal_bri: Number(profile.saldo_rekening_awal),
        dana_bergulir_per_musim: 340000000,
        sisa_saldo_bri: Number(profile.saldo_rekening_awal) - 340000000,
        total_omzet_perguliran_3_musim: 340000000 * 3,
        total_jasa_3_musim: totalJasa3Musim,
        total_admin_pencairan_3_musim: totalAdminPencairan3Musim,
        jumlah_anggota_baru: anggotaBaruRow.jml,
        total_biaya_anggota_baru: anggotaBaruRow.total,
        pendapatan_kotor_tahunan: pendapatanKotorTahunan,
        biaya_operasional_tahunan: biayaOperasionalRat,
        shu_bersih_tahunan: shuBersihTahunan,
        alokasi_shu: alokasiShu,
        shu_per_poktan: shuPerPoktan,
      },
    });
  } catch (error) {
    console.error('GET /api/keuangan error:', error);
    return NextResponse.json({ error: 'Gagal memuat data keuangan & RAT' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      tanggal,
      periode_musim = 'November - Maret',
      kategori = 'OPERASIONAL',
      tipe = 'KELUAR',
      nominal,
      deskripsi,
      referensi_kode,
    } = body;

    if (!nominal || !deskripsi) {
      return NextResponse.json({ error: 'Nominal dan deskripsi transaksi kas wajib diisi' }, { status: 400 });
    }

    const db = getDb();
    const kodeJurnal = `KAS-MAN-${Date.now()}`;
    const tgl = tanggal || new Date().toISOString().slice(0, 10);

    db.prepare(`
      INSERT INTO kas_gapoktan (kode_jurnal, tanggal, periode_musim, kategori, tipe, nominal, deskripsi, referensi_kode)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      kodeJurnal,
      tgl,
      periode_musim,
      kategori,
      tipe,
      Number(nominal),
      deskripsi,
      referensi_kode || kodeJurnal
    );

    return NextResponse.json({ message: 'Jurnal kas berhasil ditambahkan', kode_jurnal: kodeJurnal });
  } catch (error) {
    console.error('POST /api/keuangan error:', error);
    return NextResponse.json({ error: 'Gagal mencatat transaksi kas' }, { status: 500 });
  }
}
