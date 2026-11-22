import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const transaksi = db.prepare(`
      SELECT
        s.*,
        pt.nama_lengkap as nama_petani,
        pt.no_induk,
        pk.nama_poktan
      FROM simpanan s
      JOIN petani pt ON pt.id = s.petani_id
      JOIN poktan pk ON pk.id = pt.poktan_id
      ORDER BY s.id DESC
    `).all();

    const rekapAnggota = db.prepare(`
      SELECT
        pt.id as petani_id,
        pt.no_induk,
        pt.nama_lengkap,
        pt.jabatan_poktan,
        pk.nama_poktan,
        COALESCE(SUM(CASE WHEN s.jenis_simpanan = 'POKOK' THEN s.nominal ELSE 0 END), 0) as simpanan_pokok,
        COALESCE(SUM(CASE WHEN s.jenis_simpanan = 'WAJIB' THEN s.nominal ELSE 0 END), 0) as simpanan_wajib,
        COALESCE(SUM(CASE WHEN s.jenis_simpanan = 'SUKARELA' THEN s.nominal WHEN s.jenis_simpanan = 'PENARIKAN' THEN -s.nominal ELSE 0 END), 0) as simpanan_sukarela,
        COALESCE(SUM(CASE WHEN s.jenis_simpanan = 'PENARIKAN' THEN -s.nominal ELSE s.nominal END), 0) as total_saldo
      FROM petani pt
      JOIN poktan pk ON pk.id = pt.poktan_id
      LEFT JOIN simpanan s ON s.petani_id = pt.id
      GROUP BY pt.id
      ORDER BY pk.id ASC, pt.id ASC
    `).all();

    return NextResponse.json({ transaksi, rekapAnggota });
  } catch (error) {
    console.error('GET /api/simpanan error:', error);
    return NextResponse.json({ error: 'Gagal memuat data simpanan' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { petani_id, jenis_simpanan = 'WAJIB', nominal, tanggal, keterangan } = body;

    if (!petani_id || !nominal) {
      return NextResponse.json({ error: 'Petani dan nominal simpanan wajib diisi' }, { status: 400 });
    }

    const db = getDb();
    const petani = db.prepare('SELECT * FROM petani WHERE id = ?').get(Number(petani_id)) as Record<string, unknown> | undefined;
    if (!petani) {
      return NextResponse.json({ error: 'Petani tidak ditemukan' }, { status: 404 });
    }

    const countRow = db.prepare('SELECT COUNT(*) as c FROM simpanan').get() as { c: number };
    const noTransaksi = `SMP-${jenis_simpanan.slice(0, 2)}-${String(countRow.c + 1).padStart(3, '0')}`;
    const tgl = tanggal || new Date().toISOString().slice(0, 10);
    const nilai = Number(nominal);

    const tx = db.transaction(() => {
      db.prepare(`
        INSERT INTO simpanan (petani_id, no_transaksi, jenis_simpanan, nominal, tanggal, keterangan)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        Number(petani_id),
        noTransaksi,
        jenis_simpanan,
        nilai,
        tgl,
        keterangan || `Transaksi Simpanan ${jenis_simpanan} a.n ${petani.nama_lengkap}`
      );

      db.prepare(`
        INSERT INTO kas_gapoktan (kode_jurnal, tanggal, periode_musim, kategori, tipe, nominal, deskripsi, referensi_kode)
        VALUES (?, ?, 'November - Maret', 'SIMPANAN_ANGGOTA', ?, ?, ?, ?)
      `).run(
        `KAS-SMP-${Date.now()}`,
        tgl,
        jenis_simpanan === 'PENARIKAN' ? 'KELUAR' : 'MASUK',
        nilai,
        `${jenis_simpanan === 'PENARIKAN' ? 'Penarikan' : 'Setoran'} Simpanan ${jenis_simpanan} a.n ${petani.nama_lengkap}`,
        noTransaksi
      );
    });

    tx();
    return NextResponse.json({ message: 'Transaksi simpanan berhasil dicatat', no_transaksi: noTransaksi });
  } catch (error) {
    console.error('POST /api/simpanan error:', error);
    return NextResponse.json({ error: 'Gagal mencatat transaksi simpanan' }, { status: 500 });
  }
}
