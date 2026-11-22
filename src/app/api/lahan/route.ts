import { NextRequest, NextResponse } from 'next/server';
import { getDb, createPlotPolygon } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const poktanId = searchParams.get('poktan_id');
    const komoditas = searchParams.get('komoditas');

    let query = `
      SELECT
        l.*,
        pt.nama_lengkap as nama_petani,
        pt.no_induk,
        pt.jabatan_poktan,
        pk.nama_poktan,
        pk.kode_poktan
      FROM lahan l
      JOIN petani pt ON pt.id = l.petani_id
      JOIN poktan pk ON pk.id = l.poktan_id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (poktanId && poktanId !== 'ALL') {
      query += ' AND l.poktan_id = ?';
      params.push(Number(poktanId));
    }

    if (komoditas && komoditas !== 'ALL') {
      query += ' AND l.komoditas = ?';
      params.push(komoditas);
    }

    query += ' ORDER BY l.poktan_id ASC, l.id ASC';

    const rows = db.prepare(query).all(...params) as Array<Record<string, unknown>>;
    const lahan = rows.map((r) => {
      let polygon: [number, number][] = [];
      try {
        polygon = JSON.parse(String(r.polygon_json || '[]'));
      } catch {
        polygon = createPlotPolygon(Number(r.latitude), Number(r.longitude), Number(r.luas_hektar));
      }
      return {
        ...r,
        polygon,
      };
    });

    return NextResponse.json({ lahan });
  } catch (error) {
    console.error('GET /api/lahan error:', error);
    return NextResponse.json({ error: 'Gagal memuat data lahan GIS' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      petani_id,
      luas_hektar,
      status_lahan = 'Milik Sendiri',
      komoditas = 'Padi',
      sistem_irigasi = 'Irigasi Teknis',
      dusun_lokasi,
      blok_sawah,
      latitude,
      longitude,
    } = body;

    if (!petani_id || !luas_hektar || !latitude || !longitude) {
      return NextResponse.json(
        { error: 'Petani, luas lahan, dan koordinat GPS (Latitude & Longitude) wajib diisi' },
        { status: 400 }
      );
    }

    const db = getDb();
    const petani = db.prepare('SELECT * FROM petani WHERE id = ?').get(Number(petani_id)) as Record<string, unknown> | undefined;
    if (!petani) {
      return NextResponse.json({ error: 'Data petani tidak ditemukan' }, { status: 404 });
    }

    const countRow = db.prepare('SELECT COUNT(*) as c FROM lahan').get() as { c: number };
    const kodePetak = `KDR-${String(countRow.c + 1).padStart(3, '0')}`;
    const luas = Number(luas_hektar);
    const lat = Number(latitude);
    const lng = Number(longitude);
    const yieldFactor = komoditas === 'Tebu' ? 75 : komoditas === 'Jagung' ? 7.4 : 6.6;
    const estimasiTon = Number((luas * yieldFactor).toFixed(2));
    const poly = createPlotPolygon(lat, lng, luas);

    const res = db.prepare(`
      INSERT INTO lahan (
        petani_id, poktan_id, kode_petak, luas_hektar, status_lahan,
        komoditas, sistem_irigasi, estimasi_panen_ton,
        dusun_lokasi, blok_sawah, latitude, longitude, polygon_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      Number(petani_id),
      Number(petani.poktan_id),
      kodePetak,
      luas,
      status_lahan,
      komoditas,
      sistem_irigasi,
      estimasiTon,
      dusun_lokasi || String(petani.dusun),
      blok_sawah || `Blok ${petani.dusun} ${kodePetak}`,
      lat,
      lng,
      JSON.stringify(poly)
    );

    return NextResponse.json({
      message: 'Petak lahan pertanian GIS Desa Kediren berhasil ditambahkan',
      id: Number(res.lastInsertRowid),
    });
  } catch (error) {
    console.error('POST /api/lahan error:', error);
    return NextResponse.json({ error: 'Gagal menambahkan petak lahan GIS' }, { status: 500 });
  }
}
