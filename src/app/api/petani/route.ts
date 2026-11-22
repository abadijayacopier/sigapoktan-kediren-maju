import { NextRequest, NextResponse } from 'next/server';
import { getDb, createPlotPolygon } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const poktanId = searchParams.get('poktan_id');
    const search = searchParams.get('q');

    let query = `
      SELECT
        pt.*,
        pk.nama_poktan,
        pk.kode_poktan,
        COALESCE((SELECT SUM(l.luas_hektar) FROM lahan l WHERE l.petani_id = pt.id), pt.luas_lahan_ha) as total_luas_ha,
        COALESCE((
          SELECT SUM(CASE WHEN s.jenis_simpanan = 'PENARIKAN' THEN -s.nominal ELSE s.nominal END)
          FROM simpanan s WHERE s.petani_id = pt.id
        ), 0) as total_simpanan,
        COALESCE((
          SELECT SUM(pj.sisa_tagihan)
          FROM pinjaman pj WHERE pj.petani_id = pt.id AND pj.status = 'AKTIF'
        ), 0) as sisa_pinjaman_aktif,
        COALESCE((
          SELECT SUM(pj.pokok_pinjaman)
          FROM pinjaman pj WHERE pj.petani_id = pt.id AND pj.periode_musim = 'November - Maret'
        ), 1000000) as pinjaman_musim_aktif
      FROM petani pt
      JOIN poktan pk ON pk.id = pt.poktan_id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (poktanId && poktanId !== 'ALL') {
      query += ' AND pt.poktan_id = ?';
      params.push(Number(poktanId));
    }

    if (search) {
      query += ' AND (pt.nama_lengkap LIKE ? OR pt.nik LIKE ? OR pt.no_induk LIKE ? OR pt.jabatan_poktan LIKE ?)';
      const like = `%${search}%`;
      params.push(like, like, like, like);
    }

    query += ' ORDER BY pt.poktan_id ASC, pt.id ASC';

    const petani = db.prepare(query).all(...params);
    return NextResponse.json({ petani });
  } catch (error) {
    console.error('GET /api/petani error:', error);
    return NextResponse.json({ error: 'Gagal memuat data anggota petani' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      poktan_id,
      nik,
      nama_lengkap,
      jenis_kelamin = 'L',
      jabatan_poktan = 'Anggota',
      rt = '06',
      rw = '01',
      dusun = 'Selungguh',
      no_hp = '08123400000',
      komoditas_utama = 'Padi',
      luas_lahan_ha = 0.4,
      is_anggota_baru = 1,
      latitude = -7.7595,
      longitude = 111.3735,
      create_puap_loan = true,
      pokok_pinjaman = 1000000,
    } = body;

    if (!poktan_id || !nama_lengkap) {
      return NextResponse.json({ error: 'Poktan dan Nama Lengkap wajib diisi' }, { status: 400 });
    }

    const db = getDb();
    const poktan = db.prepare('SELECT * FROM poktan WHERE id = ?').get(Number(poktan_id)) as Record<string, unknown> | undefined;
    if (!poktan) {
      return NextResponse.json({ error: 'Poktan tidak ditemukan' }, { status: 404 });
    }

    const countRow = db.prepare('SELECT COUNT(*) as c FROM petani').get() as { c: number };
    const nextNum = countRow.c + 1;
    const prefix = String(poktan.nama_poktan)
      .split(' ')
      .map((w) => w[0])
      .join('');
    const noInduk = `${prefix}-${String(nextNum).padStart(3, '0')}`;
    const finalNik = nik || `352003${String(Date.now()).slice(-10)}`;
    const today = new Date().toISOString().slice(0, 10);
    const biayaAnggotaBaru = Number(is_anggota_baru) === 1 ? 10000 : 0;

    const tx = db.transaction(() => {
      const res = db.prepare(`
        INSERT INTO petani (
          poktan_id, no_induk, nik, nama_lengkap, jenis_kelamin,
          jabatan_poktan, rt, rw, dusun, no_hp,
          komoditas_utama, luas_lahan_ha, is_anggota_baru, biaya_anggota_baru,
          tanggal_gabung, status_aktif
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'AKTIF')
      `).run(
        Number(poktan_id),
        noInduk,
        finalNik,
        String(nama_lengkap).toUpperCase(),
        jenis_kelamin,
        jabatan_poktan,
        rt,
        rw,
        dusun || String(poktan.dusun),
        no_hp,
        komoditas_utama,
        Number(luas_lahan_ha),
        Number(is_anggota_baru) ? 1 : 0,
        biayaAnggotaBaru,
        today
      );

      const newPetaniId = Number(res.lastInsertRowid);

      // 1. Jika Anggota Baru -> Catat Biaya Anggota Baru Rp 10.000 ke Kas Gapoktan
      if (biayaAnggotaBaru > 0) {
        db.prepare(`
          INSERT INTO kas_gapoktan (kode_jurnal, tanggal, periode_musim, kategori, tipe, nominal, deskripsi, referensi_kode)
          VALUES (?, ?, 'November - Maret', 'ADMIN_ANGGOTA_BARU', 'MASUK', ?, ?, ?)
        `).run(
          `KAS-BARU-${Date.now()}`,
          today,
          biayaAnggotaBaru,
          `Biaya Pendaftaran Anggota Baru Rp 10.000 a.n ${String(nama_lengkap).toUpperCase()} (Poktan ${poktan.nama_poktan})`,
          noInduk
        );
      }

      // 2. Buat Petak Lahan GIS otomatis di Desa Kediren
      const luas = Number(luas_lahan_ha) || 0.4;
      const lat = Number(latitude) || -7.7597;
      const lng = Number(longitude) || 111.3736;
      const yieldFactor = komoditas_utama === 'Tebu' ? 75 : komoditas_utama === 'Jagung' ? 7.4 : 6.6;
      const poly = createPlotPolygon(lat, lng, luas);

      db.prepare(`
        INSERT INTO lahan (
          petani_id, poktan_id, kode_petak, luas_hektar, status_lahan,
          komoditas, sistem_irigasi, estimasi_panen_ton,
          dusun_lokasi, blok_sawah, latitude, longitude, polygon_json
        ) VALUES (?, ?, ?, ?, 'Milik Sendiri', ?, 'Irigasi Teknis', ?, ?, ?, ?, ?, ?)
      `).run(
        newPetaniId,
        Number(poktan_id),
        `KDR-${String(nextNum + 100).padStart(3, '0')}`,
        luas,
        komoditas_utama,
        Number((luas * yieldFactor).toFixed(2)),
        dusun || String(poktan.dusun),
        `Blok ${dusun || poktan.dusun} ${noInduk}`,
        lat,
        lng,
        JSON.stringify(poly)
      );

      // 3. Jika sekaligus ajukan pinjaman PUAP (Jasa Rp 50.000 / Rp 1.000.000 + Admin Pencairan Rp 10.000)
      if (create_puap_loan) {
        const pokok = Number(pokok_pinjaman) || 1000000;
        const nominalJasa = (pokok / 1000000) * 50000;
        const totalKewajiban = pokok + nominalJasa;
        const kodePinj = `PUAP-49-${String(nextNum + 100).padStart(3, '0')}`;

        db.prepare(`
          INSERT INTO pinjaman (
            petani_id, poktan_id, kode_pinjaman, perguliran_ke, periode_musim,
            tahun_anggaran, komoditas_usaha, pokok_pinjaman, persen_jasa_bulan,
            jasa_per_juta, nominal_jasa, biaya_admin_pencairan, biaya_anggota_baru,
            total_kewajiban, sisa_tagihan, tanggal_pencairan, tanggal_jatuh_tempo, status
          ) VALUES (?, ?, ?, 'XLIX', 'November - Maret', 2026, ?, ?, 1.25, 50000, ?, 10000, ?, ?, ?, '2026-11-17', '2027-03-29', 'AKTIF')
        `).run(
          newPetaniId,
          Number(poktan_id),
          kodePinj,
          komoditas_utama,
          pokok,
          nominalJasa,
          biayaAnggotaBaru,
          totalKewajiban,
          totalKewajiban
        );
      }

      return newPetaniId;
    });

    const createdId = tx();
    return NextResponse.json({
      message: 'Anggota petani berhasil ditambahkan beserta petak lahan GIS dan pencatatan biaya anggota baru',
      id: createdId,
    });
  } catch (error) {
    console.error('POST /api/petani error:', error);
    return NextResponse.json({ error: 'Gagal menambahkan anggota petani' }, { status: 500 });
  }
}
