import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const pinjamanId = searchParams.get('pinjaman_id');

    let query = `
      SELECT
        a.*,
        pj.kode_pinjaman,
        pj.periode_musim,
        pj.perguliran_ke,
        pt.nama_lengkap as nama_petani,
        pk.nama_poktan
      FROM angsuran a
      JOIN pinjaman pj ON pj.id = a.pinjaman_id
      JOIN petani pt ON pt.id = pj.petani_id
      JOIN poktan pk ON pk.id = pj.poktan_id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (pinjamanId) {
      query += ' AND a.pinjaman_id = ?';
      params.push(Number(pinjamanId));
    }

    query += ' ORDER BY a.id DESC';
    const angsuran = db.prepare(query).all(...params);
    return NextResponse.json({ angsuran });
  } catch (error) {
    console.error('GET /api/angsuran error:', error);
    return NextResponse.json({ error: 'Gagal memuat riwayat angsuran' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pinjaman_id, bayar_pokok, bayar_jasa, tanggal_bayar, keterangan } = body;

    if (!pinjaman_id) {
      return NextResponse.json({ error: 'ID Pinjaman wajib diisi' }, { status: 400 });
    }

    const db = getDb();
    const pinj = db.prepare(`
      SELECT pj.*, pt.nama_lengkap
      FROM pinjaman pj
      JOIN petani pt ON pt.id = pj.petani_id
      WHERE pj.id = ?
    `).get(Number(pinjaman_id)) as Record<string, unknown> | undefined;

    if (!pinj) {
      return NextResponse.json({ error: 'Data pinjaman tidak ditemukan' }, { status: 404 });
    }

    const pokok = Number(bayar_pokok ?? pinj.pokok_pinjaman);
    const jasa = Number(bayar_jasa ?? pinj.nominal_jasa);
    const totalBayar = pokok + jasa;
    const tgl = tanggal_bayar || new Date().toISOString().slice(0, 10);
    const countRow = db.prepare('SELECT COUNT(*) as c FROM angsuran').get() as { c: number };
    const noKwitansi = `KWT-${pinj.perguliran_ke}-${String(countRow.c + 1).padStart(3, '0')}`;

    const tx = db.transaction(() => {
      db.prepare(`
        INSERT INTO angsuran (
          pinjaman_id, no_kwitansi, termin_musim, bayar_pokok, bayar_jasa,
          total_bayar, tanggal_bayar, keterangan
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        Number(pinjaman_id),
        noKwitansi,
        String(pinj.periode_musim),
        pokok,
        jasa,
        totalBayar,
        tgl,
        keterangan || `Pembayaran Angsuran PUAP Musim ${pinj.periode_musim} a.n ${pinj.nama_lengkap}`
      );

      const sisaBaru = Math.max(0, Number(pinj.sisa_tagihan) - totalBayar);
      const statusBaru = sisaBaru <= 0 ? 'LUNAS' : 'AKTIF';

      db.prepare(`
        UPDATE pinjaman
        SET sisa_tagihan = ?, status = ?
        WHERE id = ?
      `).run(sisaBaru, statusBaru, Number(pinjaman_id));

      // Catat Kas Masuk Pokok & Jasa
      if (pokok > 0) {
        db.prepare(`
          INSERT INTO kas_gapoktan (kode_jurnal, tanggal, periode_musim, kategori, tipe, nominal, deskripsi, referensi_kode)
          VALUES (?, ?, ?, 'PENGEMBALIAN_POKOK', 'MASUK', ?, ?, ?)
        `).run(
          `KAS-PK-${Date.now()}`,
          tgl,
          String(pinj.periode_musim),
          pokok,
          `Pengembalian Pokok Pinjaman PUAP (${pinj.periode_musim}) a.n ${pinj.nama_lengkap}`,
          noKwitansi
        );
      }

      if (jasa > 0) {
        db.prepare(`
          INSERT INTO kas_gapoktan (kode_jurnal, tanggal, periode_musim, kategori, tipe, nominal, deskripsi, referensi_kode)
          VALUES (?, ?, ?, 'PENDAPATAN_JASA', 'MASUK', ?, ?, ?)
        `).run(
          `KAS-JS-${Date.now() + 1}`,
          tgl,
          String(pinj.periode_musim),
          jasa,
          `Pendapatan Jasa PUAP Rp 50.000/Jt (${pinj.periode_musim}) a.n ${pinj.nama_lengkap}`,
          noKwitansi
        );
      }
    });

    tx();
    return NextResponse.json({
      message: 'Pembayaran angsuran berhasil dicatat dan saldo kas telah diperbarui',
      no_kwitansi: noKwitansi,
    });
  } catch (error) {
    console.error('POST /api/angsuran error:', error);
    return NextResponse.json({ error: 'Gagal mencatat pembayaran angsuran' }, { status: 500 });
  }
}
