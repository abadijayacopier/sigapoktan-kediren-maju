import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { terbilangRupiah } from '@/lib/terbilang';

export async function GET() {
  try {
    const db = getDb();
    const profile = db.prepare('SELECT * FROM gapoktan_profile WHERE id = 1').get() as Record<string, unknown>;
    const rows = db.prepare(`
      SELECT p.*,
        (SELECT COUNT(*) FROM petani pt WHERE pt.poktan_id = p.id) as anggota_terdaftar_db,
        (SELECT COALESCE(SUM(l.luas_hektar), 0) FROM lahan l WHERE l.poktan_id = p.id) as total_luas_ha
      FROM poktan p
      ORDER BY p.urutan_penarikan ASC
    `).all() as Array<Record<string, unknown>>;

    let runningSaldo = Number(profile.saldo_rekening_awal || 401462970);
    const enriched = rows.map((p) => {
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

    return NextResponse.json({ poktan: enriched });
  } catch (error) {
    console.error('GET /api/poktan error:', error);
    return NextResponse.json({ error: 'Gagal memuat data Poktan' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      ketua,
      bendahara,
      sekretaris,
      seksi_saprodi,
      seksi_humas,
      seksi_pengairan,
      alamat,
      dusun,
      rt,
      rw,
      jumlah_anggota_resmi,
      pinjaman_modal,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID Poktan wajib diisi' }, { status: 400 });
    }

    const db = getDb();
    const modal = Number(pinjaman_modal);
    const jasaPerJuta = 50000;
    const totalJasa = (modal / 1000000) * jasaPerJuta;
    const danaKembali = modal + totalJasa;

    db.prepare(`
      UPDATE poktan
      SET ketua = ?,
          bendahara = ?,
          sekretaris = ?,
          seksi_saprodi = ?,
          seksi_humas = ?,
          seksi_pengairan = ?,
          alamat = ?,
          dusun = ?,
          rt = ?,
          rw = ?,
          jumlah_anggota_resmi = ?,
          pinjaman_modal = ?,
          total_jasa = ?,
          dana_kembali = ?
      WHERE id = ?
    `).run(
      String(ketua).toUpperCase(),
      String(bendahara).toUpperCase(),
      String(sekretaris).toUpperCase(),
      String(seksi_saprodi).toUpperCase(),
      String(seksi_humas).toUpperCase(),
      String(seksi_pengairan || '-').toUpperCase(),
      alamat,
      dusun,
      rt,
      rw,
      Number(jumlah_anggota_resmi),
      modal,
      totalJasa,
      danaKembali,
      Number(id)
    );

    return NextResponse.json({ message: 'Data pengurus & plafon Poktan berhasil diperbarui' });
  } catch (error) {
    console.error('PUT /api/poktan error:', error);
    return NextResponse.json({ error: 'Gagal memperbarui data Poktan' }, { status: 500 });
  }
}
