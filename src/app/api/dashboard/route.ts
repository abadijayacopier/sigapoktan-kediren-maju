import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { terbilangRupiah } from '@/lib/terbilang';

export async function GET() {
  try {
    const db = getDb();
    const profile = db.prepare('SELECT * FROM gapoktan_profile WHERE id = 1').get() as Record<string, unknown>;

    const poktanList = db.prepare(`
      SELECT p.*,
        (SELECT COUNT(*) FROM petani pt WHERE pt.poktan_id = p.id) as sample_anggota_db,
        (SELECT COALESCE(SUM(l.luas_hektar), 0) FROM lahan l WHERE l.poktan_id = p.id) as luas_terpetakan_ha
      FROM poktan p
      ORDER BY p.urutan_penarikan ASC
    `).all() as Array<Record<string, unknown>>;

    // Calculate running balance exactly like Sheet RUMUS
    let runningSaldo = Number(profile.saldo_rekening_awal || 401462970);
    const poktanWithFormula = poktanList.map((p) => {
      const modal = Number(p.pinjaman_modal);
      const kembali = Number(p.dana_kembali);
      runningSaldo -= modal;
      return {
        ...p,
        terbilang_modal: terbilangRupiah(modal),
        terbilang_kembali: terbilangRupiah(kembali),
        rencana_penarikan_sisa: runningSaldo,
      };
    });

    const totalPlafonPuap = poktanList.reduce((acc, p) => acc + Number(p.pinjaman_modal), 0);
    const totalJasaMusim = poktanList.reduce((acc, p) => acc + Number(p.total_jasa), 0);
    const totalDanaKembali = poktanList.reduce((acc, p) => acc + Number(p.dana_kembali), 0);
    const totalAnggotaResmi = poktanList.reduce((acc, p) => acc + Number(p.jumlah_anggota_resmi), 0);

    const komoditasStats = db.prepare(`
      SELECT
        komoditas,
        COUNT(*) as jumlah_petak,
        ROUND(SUM(luas_hektar), 2) as total_luas_ha,
        ROUND(SUM(estimasi_panen_ton), 2) as total_estimasi_ton
      FROM lahan
      GROUP BY komoditas
      ORDER BY total_luas_ha DESC
    `).all();

    const musimStats = db.prepare(`
      SELECT
        perguliran_ke,
        periode_musim,
        tahun,
        MIN(tanggal_penarikan) as tanggal_penarikan,
        MAX(tanggal_jatuh_tempo) as tanggal_jatuh_tempo,
        SUM(jumlah_anggota) as total_pemanfaat,
        SUM(jumlah_dana) as total_pencairan,
        SUM(total_jasa) as total_jasa,
        SUM(total_kembali) as total_pengembalian,
        SUM(biaya_admin_total) as total_admin_pencairan,
        MIN(sisa_saldo_rekening) as sisa_saldo_rekening,
        status_perguliran
      FROM pencairan_musim_poktan
      GROUP BY perguliran_ke, periode_musim, tahun, status_perguliran
      ORDER BY id ASC
    `).all();

    const kasSummary = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN tipe = 'MASUK' THEN nominal ELSE 0 END), 0) as total_masuk,
        COALESCE(SUM(CASE WHEN tipe = 'KELUAR' THEN nominal ELSE 0 END), 0) as total_keluar,
        COALESCE(SUM(CASE WHEN kategori = 'PENDAPATAN_JASA' THEN nominal ELSE 0 END), 0) as total_jasa_terkumpul,
        COALESCE(SUM(CASE WHEN kategori = 'ADMIN_PENCAIRAN' THEN nominal ELSE 0 END), 0) as total_admin_pencairan,
        COALESCE(SUM(CASE WHEN kategori = 'ADMIN_ANGGOTA_BARU' THEN nominal ELSE 0 END), 0) as total_admin_anggota_baru
      FROM kas_gapoktan
    `).get() as Record<string, number>;

    const simpananSummary = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN jenis_simpanan = 'POKOK' THEN nominal ELSE 0 END), 0) as total_pokok,
        COALESCE(SUM(CASE WHEN jenis_simpanan = 'WAJIB' THEN nominal ELSE 0 END), 0) as total_wajib,
        COALESCE(SUM(CASE WHEN jenis_simpanan = 'SUKARELA' THEN nominal WHEN jenis_simpanan = 'PENARIKAN' THEN -nominal ELSE 0 END), 0) as total_sukarela
      FROM simpanan
    `).get() as Record<string, number>;

    return NextResponse.json({
      profile,
      summary: {
        saldo_rekening_awal: Number(profile.saldo_rekening_awal),
        total_plafon_puap: totalPlafonPuap,
        total_jasa_musim: totalJasaMusim,
        total_dana_kembali: totalDanaKembali,
        sisa_saldo_rekening: Number(profile.saldo_rekening_awal) - totalPlafonPuap,
        total_poktan: poktanList.length,
        total_anggota_resmi: totalAnggotaResmi,
        luas_lahan_ruk_ha: 84.0,
        kas_summary: kasSummary,
        simpanan_summary: simpananSummary,
      },
      poktan: poktanWithFormula,
      komoditasStats,
      musimStats,
    });
  } catch (error) {
    console.error('Dashboard API Error:', error);
    return NextResponse.json({ error: 'Gagal memuat data dashboard' }, { status: 500 });
  }
}
