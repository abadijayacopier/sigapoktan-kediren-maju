import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const poktanId = searchParams.get('poktan_id');
    const periodeMusim = searchParams.get('periode_musim');
    const status = searchParams.get('status');

    let query = `
      SELECT
        pj.*,
        pt.nama_lengkap as nama_petani,
        pt.no_induk,
        pt.jabatan_poktan,
        pt.jenis_kelamin,
        pt.rt,
        pt.rw,
        pt.dusun,
        pt.is_anggota_baru,
        pk.nama_poktan,
        pk.ketua as ketua_poktan,
        pk.bendahara as bendahara_poktan,
        pk.sekretaris as sekretaris_poktan,
        COALESCE((SELECT SUM(a.total_bayar) FROM angsuran a WHERE a.pinjaman_id = pj.id), 0) as total_terbayar
      FROM pinjaman pj
      JOIN petani pt ON pt.id = pj.petani_id
      JOIN poktan pk ON pk.id = pj.poktan_id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (poktanId && poktanId !== 'ALL') {
      query += ' AND pj.poktan_id = ?';
      params.push(Number(poktanId));
    }

    if (periodeMusim && periodeMusim !== 'ALL') {
      query += ' AND pj.periode_musim = ?';
      params.push(periodeMusim);
    }

    if (status && status !== 'ALL') {
      query += ' AND pj.status = ?';
      params.push(status);
    }

    query += ' ORDER BY pj.id DESC';

    const pinjaman = db.prepare(query).all(...params);
    const pencairanPoktan = db.prepare(`
      SELECT pm.*, pk.nama_poktan, pk.ketua, pk.bendahara, pk.sekretaris, pk.dusun, pk.alamat
      FROM pencairan_musim_poktan pm
      JOIN poktan pk ON pk.id = pm.poktan_id
      ORDER BY pm.id ASC
    `).all();

    return NextResponse.json({ pinjaman, pencairanPoktan });
  } catch (error) {
    console.error('GET /api/pinjaman error:', error);
    return NextResponse.json({ error: 'Gagal memuat data pinjaman PUAP' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      petani_id,
      perguliran_ke = 'XLIX',
      periode_musim = 'November - Maret',
      tahun_anggaran = 2026,
      komoditas_usaha = 'Padi',
      pokok_pinjaman = 1000000,
      is_anggota_baru = false,
      tanggal_pencairan = '2026-11-17',
      tanggal_jatuh_tempo = '2027-03-29',
    } = body;

    if (!petani_id || !pokok_pinjaman) {
      return NextResponse.json({ error: 'Petani dan nominal pokok pinjaman wajib diisi' }, { status: 400 });
    }

    const db = getDb();
    const petani = db.prepare('SELECT * FROM petani WHERE id = ?').get(Number(petani_id)) as Record<string, unknown> | undefined;
    if (!petani) {
      return NextResponse.json({ error: 'Petani tidak ditemukan' }, { status: 404 });
    }

    // Rumus PUAP Gapoktan Kediren Maju:
    // Jasa = Rp 50.000 per Rp 1.000.000 (1,25% per bulan x 4 bulan = 5%)
    // Biaya Admin Pencairan = Rp 10.000
    // Biaya Anggota Baru (bila anggota baru) = Rp 10.000
    const pokok = Number(pokok_pinjaman);
    const jasaPerJuta = 50000;
    const nominalJasa = (pokok / 1000000) * jasaPerJuta;
    const biayaAdminPencairan = 10000;
    const biayaAnggotaBaru = is_anggota_baru ? 10000 : 0;
    const totalKewajiban = pokok + nominalJasa;

    const countRow = db.prepare('SELECT COUNT(*) as c FROM pinjaman').get() as { c: number };
    const kodePinjaman = `PUAP-${perguliran_ke}-${String(countRow.c + 1).padStart(3, '0')}`;

    const tx = db.transaction(() => {
      const res = db.prepare(`
        INSERT INTO pinjaman (
          petani_id, poktan_id, kode_pinjaman, perguliran_ke, periode_musim,
          tahun_anggaran, komoditas_usaha, pokok_pinjaman, persen_jasa_bulan,
          jasa_per_juta, nominal_jasa, biaya_admin_pencairan, biaya_anggota_baru,
          total_kewajiban, sisa_tagihan, tanggal_pencairan, tanggal_jatuh_tempo, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1.25, 50000, ?, ?, ?, ?, ?, ?, ?, 'AKTIF')
      `).run(
        Number(petani_id),
        Number(petani.poktan_id),
        kodePinjaman,
        perguliran_ke,
        periode_musim,
        Number(tahun_anggaran),
        komoditas_usaha,
        pokok,
        nominalJasa,
        biayaAdminPencairan,
        biayaAnggotaBaru,
        totalKewajiban,
        totalKewajiban,
        tanggal_pencairan,
        tanggal_jatuh_tempo
      );

      // Catat ke Kas Gapoktan:
      // 1) Kas Keluar Pencairan Pokok
      db.prepare(`
        INSERT INTO kas_gapoktan (kode_jurnal, tanggal, periode_musim, kategori, tipe, nominal, deskripsi, referensi_kode)
        VALUES (?, ?, ?, 'PENCAIRAN_PUAP', 'KELUAR', ?, ?, ?)
      `).run(
        `KAS-CR-${Date.now()}`,
        tanggal_pencairan,
        periode_musim,
        pokok,
        `Pencairan Pinjaman PUAP ${periode_musim} a.n ${petani.nama_lengkap}`,
        kodePinjaman
      );

      // 2) Kas Masuk Biaya Admin Pencairan Rp 10.000
      db.prepare(`
        INSERT INTO kas_gapoktan (kode_jurnal, tanggal, periode_musim, kategori, tipe, nominal, deskripsi, referensi_kode)
        VALUES (?, ?, ?, 'ADMIN_PENCAIRAN', 'MASUK', ?, ?, ?)
      `).run(
        `KAS-ADM-${Date.now() + 1}`,
        tanggal_pencairan,
        periode_musim,
        biayaAdminPencairan,
        `Biaya Admin Pencairan PUAP (Rp 10.000) a.n ${petani.nama_lengkap}`,
        kodePinjaman
      );

      // 3) Kas Masuk Biaya Anggota Baru Rp 10.000 (jika dicentang)
      if (biayaAnggotaBaru > 0) {
        db.prepare(`
          INSERT INTO kas_gapoktan (kode_jurnal, tanggal, periode_musim, kategori, tipe, nominal, deskripsi, referensi_kode)
          VALUES (?, ?, ?, 'ADMIN_ANGGOTA_BARU', 'MASUK', ?, ?, ?)
        `).run(
          `KAS-BR-${Date.now() + 2}`,
          tanggal_pencairan,
          periode_musim,
          biayaAnggotaBaru,
          `Biaya Pendaftaran Anggota Baru (Rp 10.000) a.n ${petani.nama_lengkap}`,
          kodePinjaman
        );
      }

      return Number(res.lastInsertRowid);
    });

    const newId = tx();
    return NextResponse.json({
      message: 'Pencairan Pinjaman PUAP berhasil dicatat beserta Biaya Admin Rp 10.000',
      id: newId,
      kode_pinjaman: kodePinjaman,
    });
  } catch (error) {
    console.error('POST /api/pinjaman error:', error);
    return NextResponse.json({ error: 'Gagal mencatat pencairan pinjaman PUAP' }, { status: 500 });
  }
}
