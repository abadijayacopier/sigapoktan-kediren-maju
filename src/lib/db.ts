import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'gapoktan_kediren_maju.db');

let dbInstance: Database.Database | null = null;

export function createPlotPolygon(lat: number, lng: number, luasHa: number): [number, number][] {
  // 1 Hektar ~ 100m x 100m (~0.0009 deg). Scale rectangle proportionally to sqrt(luasHa)
  const factor = Math.max(0.35, Math.sqrt(Math.max(0.1, luasHa)));
  const dLat = 0.00042 * factor;
  const dLng = 0.00056 * factor;
  return [
    [Number((lat + dLat).toFixed(6)), Number((lng - dLng).toFixed(6))],
    [Number((lat + dLat).toFixed(6)), Number((lng + dLng).toFixed(6))],
    [Number((lat - dLat).toFixed(6)), Number((lng + dLng).toFixed(6))],
    [Number((lat - dLat).toFixed(6)), Number((lng - dLng).toFixed(6))],
  ];
}

export function getDb(): Database.Database {
  if (dbInstance) return dbInstance;

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  initSchema(db);
  seedIfEmpty(db);

  dbInstance = db;
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS gapoktan_profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      nama_gapoktan TEXT NOT NULL,
      desa TEXT NOT NULL,
      kecamatan TEXT NOT NULL,
      kabupaten TEXT NOT NULL,
      provinsi TEXT NOT NULL,
      tanggal_berdiri TEXT NOT NULL,
      ketua TEXT NOT NULL,
      sekretaris TEXT NOT NULL,
      bendahara TEXT NOT NULL,
      no_rekening_bri TEXT NOT NULL,
      nama_bank TEXT NOT NULL,
      alamat_bank TEXT NOT NULL,
      saldo_rekening_awal REAL NOT NULL,
      penyuluh_nama TEXT NOT NULL,
      penyuluh_nip TEXT NOT NULL,
      pejabat_dinas_nama TEXT NOT NULL,
      pejabat_dinas_nip TEXT NOT NULL,
      pejabat_dinas_jabatan TEXT NOT NULL,
      perguliran_aktif TEXT NOT NULL,
      jasa_per_juta REAL NOT NULL DEFAULT 50000,
      persen_jasa_per_bulan REAL NOT NULL DEFAULT 1.25,
      biaya_anggota_baru REAL NOT NULL DEFAULT 10000,
      biaya_admin_pencairan REAL NOT NULL DEFAULT 10000
    );

    CREATE TABLE IF NOT EXISTS poktan (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kode_poktan TEXT UNIQUE NOT NULL,
      nama_poktan TEXT UNIQUE NOT NULL,
      ketua TEXT NOT NULL,
      bendahara TEXT NOT NULL,
      sekretaris TEXT NOT NULL,
      seksi_saprodi TEXT NOT NULL,
      seksi_humas TEXT NOT NULL,
      seksi_pengairan TEXT NOT NULL,
      alamat TEXT NOT NULL,
      dusun TEXT NOT NULL,
      rt TEXT NOT NULL,
      rw TEXT NOT NULL,
      jumlah_anggota_resmi INTEGER NOT NULL,
      pinjaman_modal REAL NOT NULL,
      jasa_per_juta REAL NOT NULL DEFAULT 50000,
      total_jasa REAL NOT NULL,
      dana_kembali REAL NOT NULL,
      urutan_penarikan INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS petani (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      poktan_id INTEGER NOT NULL,
      no_induk TEXT UNIQUE NOT NULL,
      nik TEXT UNIQUE NOT NULL,
      nama_lengkap TEXT NOT NULL,
      jenis_kelamin TEXT NOT NULL DEFAULT 'L',
      jabatan_poktan TEXT NOT NULL DEFAULT 'Anggota',
      rt TEXT NOT NULL,
      rw TEXT NOT NULL,
      dusun TEXT NOT NULL,
      no_hp TEXT NOT NULL,
      komoditas_utama TEXT NOT NULL DEFAULT 'Padi',
      luas_lahan_ha REAL NOT NULL DEFAULT 0.35,
      is_anggota_baru INTEGER NOT NULL DEFAULT 0,
      biaya_anggota_baru REAL NOT NULL DEFAULT 0,
      tanggal_gabung TEXT NOT NULL,
      status_aktif TEXT NOT NULL DEFAULT 'AKTIF',
      FOREIGN KEY (poktan_id) REFERENCES poktan(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS lahan (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      petani_id INTEGER NOT NULL,
      poktan_id INTEGER NOT NULL,
      kode_petak TEXT UNIQUE NOT NULL,
      luas_hektar REAL NOT NULL,
      status_lahan TEXT NOT NULL DEFAULT 'Milik Sendiri',
      komoditas TEXT NOT NULL CHECK (komoditas IN ('Padi', 'Jagung', 'Tebu')),
      sistem_irigasi TEXT NOT NULL DEFAULT 'Irigasi Teknis',
      estimasi_panen_ton REAL NOT NULL,
      dusun_lokasi TEXT NOT NULL,
      blok_sawah TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      polygon_json TEXT NOT NULL,
      FOREIGN KEY (petani_id) REFERENCES petani(id) ON DELETE CASCADE,
      FOREIGN KEY (poktan_id) REFERENCES poktan(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS simpanan (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      petani_id INTEGER NOT NULL,
      no_transaksi TEXT UNIQUE NOT NULL,
      jenis_simpanan TEXT NOT NULL CHECK (jenis_simpanan IN ('POKOK', 'WAJIB', 'SUKARELA', 'PENARIKAN')),
      nominal REAL NOT NULL,
      tanggal TEXT NOT NULL,
      keterangan TEXT NOT NULL,
      FOREIGN KEY (petani_id) REFERENCES petani(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS pinjaman (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      petani_id INTEGER NOT NULL,
      poktan_id INTEGER NOT NULL,
      kode_pinjaman TEXT UNIQUE NOT NULL,
      perguliran_ke TEXT NOT NULL DEFAULT 'XLIX',
      periode_musim TEXT NOT NULL CHECK (periode_musim IN ('Maret - Juli', 'Juli - November', 'November - Maret')),
      tahun_anggaran INTEGER NOT NULL DEFAULT 2026,
      komoditas_usaha TEXT NOT NULL CHECK (komoditas_usaha IN ('Padi', 'Jagung', 'Tebu')),
      pokok_pinjaman REAL NOT NULL,
      persen_jasa_bulan REAL NOT NULL DEFAULT 1.25,
      jasa_per_juta REAL NOT NULL DEFAULT 50000,
      nominal_jasa REAL NOT NULL,
      biaya_admin_pencairan REAL NOT NULL DEFAULT 10000,
      biaya_anggota_baru REAL NOT NULL DEFAULT 0,
      total_kewajiban REAL NOT NULL,
      sisa_tagihan REAL NOT NULL,
      tanggal_pencairan TEXT NOT NULL,
      tanggal_jatuh_tempo TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('AKTIF', 'LUNAS', 'TUNGGAKAN')) DEFAULT 'AKTIF',
      FOREIGN KEY (petani_id) REFERENCES petani(id) ON DELETE CASCADE,
      FOREIGN KEY (poktan_id) REFERENCES poktan(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS angsuran (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pinjaman_id INTEGER NOT NULL,
      no_kwitansi TEXT UNIQUE NOT NULL,
      termin_musim TEXT NOT NULL,
      bayar_pokok REAL NOT NULL,
      bayar_jasa REAL NOT NULL,
      total_bayar REAL NOT NULL,
      tanggal_bayar TEXT NOT NULL,
      keterangan TEXT NOT NULL,
      FOREIGN KEY (pinjaman_id) REFERENCES pinjaman(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS pencairan_musim_poktan (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      poktan_id INTEGER NOT NULL,
      perguliran_ke TEXT NOT NULL,
      periode_musim TEXT NOT NULL CHECK (periode_musim IN ('Maret - Juli', 'Juli - November', 'November - Maret')),
      tahun INTEGER NOT NULL,
      tanggal_penarikan TEXT NOT NULL,
      tanggal_penyaluran TEXT NOT NULL,
      tanggal_jatuh_tempo TEXT NOT NULL,
      jumlah_anggota INTEGER NOT NULL,
      jumlah_dana REAL NOT NULL,
      total_jasa REAL NOT NULL,
      total_kembali REAL NOT NULL,
      biaya_admin_total REAL NOT NULL,
      sisa_saldo_rekening REAL NOT NULL,
      status_perguliran TEXT NOT NULL CHECK (status_perguliran IN ('LUNAS', 'BERJALAN')),
      FOREIGN KEY (poktan_id) REFERENCES poktan(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS kas_gapoktan (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kode_jurnal TEXT UNIQUE NOT NULL,
      tanggal TEXT NOT NULL,
      periode_musim TEXT NOT NULL,
      kategori TEXT NOT NULL,
      tipe TEXT NOT NULL CHECK (tipe IN ('MASUK', 'KELUAR')),
      nominal REAL NOT NULL,
      deskripsi TEXT NOT NULL,
      referensi_kode TEXT NOT NULL
    );
  `);
}

function seedIfEmpty(db: Database.Database) {
  const count = db.prepare('SELECT COUNT(*) as c FROM poktan').get() as { c: number };
  if (count.c > 0) return;

  const insertTransaction = db.transaction(() => {
    // 1. Seed Gapoktan Profile ("KEDIREN MAJU")
    db.prepare(`
      INSERT INTO gapoktan_profile (
        id, nama_gapoktan, desa, kecamatan, kabupaten, provinsi, tanggal_berdiri,
        ketua, sekretaris, bendahara, no_rekening_bri, nama_bank, alamat_bank,
        saldo_rekening_awal, penyuluh_nama, penyuluh_nip,
        pejabat_dinas_nama, pejabat_dinas_nip, pejabat_dinas_jabatan,
        perguliran_aktif, jasa_per_juta, persen_jasa_per_bulan,
        biaya_anggota_baru, biaya_admin_pencairan
      ) VALUES (
        1, 'KEDIREN MAJU', 'Desa Kediren', 'Lembeyan', 'Magetan', 'Jawa Timur', '14 Februari 2008',
        'SUYANTO', 'SUPRIYANTO', 'H. RUSIMIN', '3877-01-025711-53-9', 'BRI UNIT LEMBEYAN', 'Jln. Raya Lembeyan – Parang, Magetan',
        401462970, 'IIS SUGIARTI, SP', '19810425 201001 2 020',
        'DIKA TRIHARTA KUSUMA, S.Pt., M.Ling.', '19880501 201503 1 004', 'Sekretaris / Ketua Tim Teknis PUAP Kabupaten Magetan',
        'XLIX', 50000, 1.25, 10000, 10000
      )
    `).run();

    // 2. Seed 7 Poktan exact from Sheet RUMUS & RENCANA PENARIKAN BLM PUAP
    const poktanSeed = [
      {
        kode: 'PKT-01',
        nama: 'SRI MULYO',
        ketua: 'SAMSI',
        bendahara: 'SUTIKNO',
        sekretaris: 'AGUS SUTOPO',
        saprodi: 'KADIRUN',
        humas: 'SAMSURI',
        pengairan: 'SEMAN',
        alamat: 'RT 06 RW 01 Dusun Selungguh, Desa Kediren, Kec. Lembeyan',
        dusun: 'Selungguh',
        rt: '06',
        rw: '01',
        anggota: 55,
        modal: 55000000,
        jasa: 2750000,
        kembali: 57750000,
        urutan: 1,
      },
      {
        kode: 'PKT-02',
        nama: 'TANI MAJU',
        ketua: 'SUKAMTO',
        bendahara: 'HADI WIYONO',
        sekretaris: 'SAMIRAN',
        saprodi: 'WARas',
        humas: 'KARTOYO',
        pengairan: 'PARNO',
        alamat: 'RT 03 RW 01 Dusun Selungguh, Desa Kediren, Kec. Lembeyan',
        dusun: 'Selungguh',
        rt: '03',
        rw: '01',
        anggota: 61,
        modal: 61000000,
        jasa: 3050000,
        kembali: 64050000,
        urutan: 2,
      },
      {
        kode: 'PKT-03',
        nama: 'SIDODADI',
        ketua: 'SUDARNO',
        bendahara: 'SUPANGAT',
        sekretaris: 'ARIS ANSORI',
        saprodi: 'MISDI',
        humas: 'KASNO',
        pengairan: 'DARMO',
        alamat: 'RT 11 RW 02 Dusun Sekadalan, Desa Kediren, Kec. Lembeyan',
        dusun: 'Sekadalan',
        rt: '11',
        rw: '02',
        anggota: 50,
        modal: 50000000,
        jasa: 2500000,
        kembali: 52500000,
        urutan: 3,
      },
      {
        kode: 'PKT-04',
        nama: 'SRI REJEKI',
        ketua: 'RUSIMIN',
        bendahara: 'WAGIMIN',
        sekretaris: 'SUPARLAN',
        saprodi: 'SUWITO',
        humas: 'MULYONO',
        pengairan: 'GIMAN',
        alamat: 'RT 12 RW 02 Dusun Sekadalan, Desa Kediren, Kec. Lembeyan',
        dusun: 'Sekadalan',
        rt: '12',
        rw: '02',
        anggota: 45,
        modal: 45000000,
        jasa: 2250000,
        kembali: 47250000,
        urutan: 4,
      },
      {
        kode: 'PKT-05',
        nama: 'KLEDOKAN',
        ketua: 'SUPRIYADI',
        bendahara: 'REKSI SAMIRAN',
        sekretaris: 'SUYATNO',
        saprodi: 'PAIMIN',
        humas: 'KATIMUN',
        pengairan: 'JOKO',
        alamat: 'RT 16 RW 02 Dusun Ledok, Desa Kediren, Kec. Lembeyan',
        dusun: 'Ledok',
        rt: '16',
        rw: '02',
        anggota: 73,
        modal: 73000000,
        jasa: 3650000,
        kembali: 76650000,
        urutan: 5,
      },
      {
        kode: 'PKT-06',
        nama: 'PUNTUK ASRI',
        ketua: 'SUYITNO',
        bendahara: 'NGADIYIN',
        sekretaris: 'SUYADI',
        saprodi: 'PARMAN',
        humas: 'SUNARTO',
        pengairan: 'SLAMET',
        alamat: 'RT 16 RW 02 Dusun Ledok, Desa Kediren, Kec. Lembeyan',
        dusun: 'Ledok',
        rt: '16',
        rw: '02',
        anggota: 46,
        modal: 46000000,
        jasa: 2300000,
        kembali: 48300000,
        urutan: 6,
      },
      {
        kode: 'PKT-07',
        nama: 'CINDELARAS',
        ketua: 'EDI PRAYITNO',
        bendahara: 'SUSANTO',
        sekretaris: 'HAMBALI',
        saprodi: 'BASUKI',
        humas: 'PURWANTO',
        pengairan: 'TARMIZI',
        alamat: 'RT 20 RW 03 Dusun Sepuntuk, Desa Kediren, Kec. Lembeyan',
        dusun: 'Sepuntuk',
        rt: '20',
        rw: '03',
        anggota: 10,
        modal: 10000000,
        jasa: 500000,
        kembali: 10500000,
        urutan: 7,
      },
    ];

    const insertPoktanStmt = db.prepare(`
      INSERT INTO poktan (
        kode_poktan, nama_poktan, ketua, bendahara, sekretaris,
        seksi_saprodi, seksi_humas, seksi_pengairan,
        alamat, dusun, rt, rw, jumlah_anggota_resmi,
        pinjaman_modal, jasa_per_juta, total_jasa, dana_kembali, urutan_penarikan
      ) VALUES (
        @kode, @nama, @ketua, @bendahara, @sekretaris,
        @saprodi, @humas, @pengairan,
        @alamat, @dusun, @rt, @rw, @anggota,
        @modal, 50000, @jasa, @kembali, @urutan
      )
    `);

    for (const p of poktanSeed) {
      insertPoktanStmt.run({
        ...p,
        saprodi: p.saprodi.toUpperCase(),
      });
    }

    // 3. Seed Pencairan Musim Poktan (3x Setahun: Maret-Juli, Juli-November, November-Maret)
    const insertPencairanPoktan = db.prepare(`
      INSERT INTO pencairan_musim_poktan (
        poktan_id, perguliran_ke, periode_musim, tahun,
        tanggal_penarikan, tanggal_penyaluran, tanggal_jatuh_tempo,
        jumlah_anggota, jumlah_dana, total_jasa, total_kembali,
        biaya_admin_total, sisa_saldo_rekening, status_perguliran
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const musimHistories = [
      {
        perguliran: 'XLVII',
        periode: 'Maret - Juli',
        tahun: 2026,
        tglTarik: '2026-03-15',
        tglSalur: '2026-03-15',
        tglTempo: '2026-07-15',
        status: 'LUNAS',
      },
      {
        perguliran: 'XLVIII',
        periode: 'Juli - November',
        tahun: 2026,
        tglTarik: '2026-07-16',
        tglSalur: '2026-07-16',
        tglTempo: '2026-11-16',
        status: 'LUNAS',
      },
      {
        perguliran: 'XLIX',
        periode: 'November - Maret',
        tahun: 2026,
        tglTarik: '2026-11-17',
        tglSalur: '2026-11-17',
        tglTempo: '2027-03-29',
        status: 'BERJALAN',
      },
    ];

    for (const m of musimHistories) {
      let runningSaldo = 401462970;
      poktanSeed.forEach((p, idx) => {
        runningSaldo -= p.modal;
        insertPencairanPoktan.run(
          idx + 1,
          m.perguliran,
          m.periode,
          m.tahun,
          m.tglTarik,
          m.tglSalur,
          m.tglTempo,
          p.anggota,
          p.modal,
          p.jasa,
          p.kembali,
          p.anggota * 10000,
          runningSaldo,
          m.status
        );
      });
    }

    // 4. Seed Anggota Petani (Focused on Poktan Sri Mulyo members specified by user + key members of all 7 Poktan)
    // User specified for Poktan Sri Mulyo: Supriyanto, Sutikno, Samsi, Samsuri, Kadirun, Seman, Doni, Amat Kasiran, Sarimin + Agus Sutopo
    const petaniSeed = [
      // POKTAN 1: SRI MULYO (poktan_id = 1, Dusun Selungguh)
      { poktan_id: 1, no_induk: 'SM-001', nik: '3520031402750001', nama: 'SAMSI', jk: 'L', jabatan: 'Ketua', rt: '06', rw: '01', dusun: 'Selungguh', hp: '08123401001', komoditas: 'Padi', luas: 0.65, baru: 0, lat: -7.7574, lng: 111.3712, blok: 'Blok Selungguh Wetan A1' },
      { poktan_id: 1, no_induk: 'SM-002', nik: '3520031905780002', nama: 'SUTIKNO', jk: 'L', jabatan: 'Bendahara', rt: '06', rw: '01', dusun: 'Selungguh', hp: '08123401002', komoditas: 'Padi', luas: 0.55, baru: 0, lat: -7.7579, lng: 111.3721, blok: 'Blok Selungguh Wetan A2' },
      { poktan_id: 1, no_induk: 'SM-003', nik: '3520032208800003', nama: 'AGUS SUTOPO', jk: 'L', jabatan: 'Sekretaris', rt: '06', rw: '01', dusun: 'Selungguh', hp: '08123401003', komoditas: 'Jagung', luas: 0.45, baru: 0, lat: -7.7584, lng: 111.3714, blok: 'Blok Selungguh Tengah B1' },
      { poktan_id: 1, no_induk: 'SM-004', nik: '3520031001820004', nama: 'SUPRIYANTO', jk: 'L', jabatan: 'Sekretaris Gapoktan / Anggota', rt: '06', rw: '01', dusun: 'Selungguh', hp: '08123401004', komoditas: 'Padi', luas: 0.80, baru: 0, lat: -7.7569, lng: 111.3728, blok: 'Blok Selungguh Utama A3' },
      { poktan_id: 1, no_induk: 'SM-005', nik: '3520030504760005', nama: 'SAMSURI', jk: 'L', jabatan: 'Seksi Humas', rt: '06', rw: '01', dusun: 'Selungguh', hp: '08123401005', komoditas: 'Tebu', luas: 0.70, baru: 0, lat: -7.7588, lng: 111.3726, blok: 'Blok Selungguh Kidul C1' },
      { poktan_id: 1, no_induk: 'SM-006', nik: '3520031209740006', nama: 'KADIRUN', jk: 'L', jabatan: 'Seksi Saprodi', rt: '06', rw: '01', dusun: 'Selungguh', hp: '08123401006', komoditas: 'Padi', luas: 0.50, baru: 0, lat: -7.7573, lng: 111.3736, blok: 'Blok Selungguh Irigasi B2' },
      { poktan_id: 1, no_induk: 'SM-007', nik: '3520032811720007', nama: 'SEMAN', jk: 'L', jabatan: 'Seksi Pengairan', rt: '05', rw: '01', dusun: 'Selungguh', hp: '08123401007', komoditas: 'Jagung', luas: 0.40, baru: 0, lat: -7.7565, lng: 111.3718, blok: 'Blok Selungguh Lor B3' },
      { poktan_id: 1, no_induk: 'SM-008', nik: '3520031503880008', nama: 'DONI', jk: 'L', jabatan: 'Anggota', rt: '06', rw: '01', dusun: 'Selungguh', hp: '08123401008', komoditas: 'Padi', luas: 0.35, baru: 1, lat: -7.7581, lng: 111.3735, blok: 'Blok Selungguh Timur A4' },
      { poktan_id: 1, no_induk: 'SM-009', nik: '3520030307700009', nama: 'AMAT KASIRAN', jk: 'L', jabatan: 'Anggota', rt: '05', rw: '01', dusun: 'Selungguh', hp: '08123401009', komoditas: 'Tebu', luas: 0.60, baru: 0, lat: -7.7592, lng: 111.3717, blok: 'Blok Selungguh Kidul C2' },
      { poktan_id: 1, no_induk: 'SM-010', nik: '3520032106730010', nama: 'SARIMIN', jk: 'L', jabatan: 'Anggota', rt: '06', rw: '01', dusun: 'Selungguh', hp: '08123401010', komoditas: 'Padi', luas: 0.48, baru: 1, lat: -7.7577, lng: 111.3704, blok: 'Blok Selungguh Kulon A5' },

      // POKTAN 2: TANI MAJU (poktan_id = 2, Dusun Selungguh)
      { poktan_id: 2, no_induk: 'TM-001', nik: '3520031102750011', nama: 'SUKAMTO', jk: 'L', jabatan: 'Ketua', rt: '03', rw: '01', dusun: 'Selungguh', hp: '08123402001', komoditas: 'Padi', luas: 0.75, baru: 0, lat: -7.7558, lng: 111.3742, blok: 'Blok Selungguh Lor D1' },
      { poktan_id: 2, no_induk: 'TM-002', nik: '3520031804770012', nama: 'HADI WIYONO', jk: 'L', jabatan: 'Bendahara', rt: '03', rw: '01', dusun: 'Selungguh', hp: '08123402002', komoditas: 'Jagung', luas: 0.52, baru: 0, lat: -7.7563, lng: 111.3751, blok: 'Blok Selungguh Lor D2' },
      { poktan_id: 2, no_induk: 'TM-003', nik: '3520032509790013', nama: 'SAMIRAN', jk: 'L', jabatan: 'Sekretaris', rt: '03', rw: '01', dusun: 'Selungguh', hp: '08123402003', komoditas: 'Padi', luas: 0.60, baru: 0, lat: -7.7554, lng: 111.3731, blok: 'Blok Selungguh Lor D3' },

      // POKTAN 3: SIDODADI (poktan_id = 3, Dusun Sekadalan)
      { poktan_id: 3, no_induk: 'SD-001', nik: '3520030801740014', nama: 'SUDARNO', jk: 'L', jabatan: 'Ketua', rt: '11', rw: '02', dusun: 'Sekadalan', hp: '08123403001', komoditas: 'Padi', luas: 0.68, baru: 0, lat: -7.7601, lng: 111.3748, blok: 'Blok Sekadalan Tengah E1' },
      { poktan_id: 3, no_induk: 'SD-002', nik: '3520031406760015', nama: 'SUPANGAT', jk: 'L', jabatan: 'Bendahara', rt: '11', rw: '02', dusun: 'Sekadalan', hp: '08123403002', komoditas: 'Tebu', luas: 0.85, baru: 0, lat: -7.7608, lng: 111.3757, blok: 'Blok Sekadalan Wetan E2' },
      { poktan_id: 3, no_induk: 'SD-003', nik: '3520032910810016', nama: 'ARIS ANSORI', jk: 'L', jabatan: 'Sekretaris', rt: '11', rw: '02', dusun: 'Sekadalan', hp: '08123403003', komoditas: 'Jagung', luas: 0.45, baru: 1, lat: -7.7614, lng: 111.3744, blok: 'Blok Sekadalan Kidul E3' },

      // POKTAN 4: SRI REJEKI (poktan_id = 4, Dusun Sekadalan)
      { poktan_id: 4, no_induk: 'SR-001', nik: '3520030203710017', nama: 'RUSIMIN', jk: 'L', jabatan: 'Ketua', rt: '12', rw: '02', dusun: 'Sekadalan', hp: '08123404001', komoditas: 'Padi', luas: 0.90, baru: 0, lat: -7.7596, lng: 111.3765, blok: 'Blok Sekadalan Irigasi F1' },
      { poktan_id: 4, no_induk: 'SR-002', nik: '3520031708750018', nama: 'WAGIMIN', jk: 'L', jabatan: 'Bendahara', rt: '12', rw: '02', dusun: 'Sekadalan', hp: '08123404002', komoditas: 'Padi', luas: 0.55, baru: 0, lat: -7.7603, lng: 111.3774, blok: 'Blok Sekadalan Irigasi F2' },
      { poktan_id: 4, no_induk: 'SR-003', nik: '3520032312780019', nama: 'SUPARLAN', jk: 'L', jabatan: 'Sekretaris', rt: '12', rw: '02', dusun: 'Sekadalan', hp: '08123404003', komoditas: 'Tebu', luas: 0.72, baru: 0, lat: -7.7611, lng: 111.3768, blok: 'Blok Sekadalan Tebu F3' },

      // POKTAN 5: KLEDOKAN (poktan_id = 5, Dusun Ledok)
      { poktan_id: 5, no_induk: 'KL-001', nik: '3520030605730020', nama: 'SUPRIYADI', jk: 'L', jabatan: 'Ketua', rt: '16', rw: '02', dusun: 'Ledok', hp: '08123405001', komoditas: 'Padi', luas: 0.95, baru: 0, lat: -7.7622, lng: 111.3719, blok: 'Blok Ledok Lembah G1' },
      { poktan_id: 5, no_induk: 'KL-002', nik: '3520031909740021', nama: 'REKSI SAMIRAN', jk: 'L', jabatan: 'Bendahara', rt: '16', rw: '02', dusun: 'Ledok', hp: '08123405002', komoditas: 'Padi', luas: 0.62, baru: 0, lat: -7.7629, lng: 111.3728, blok: 'Blok Ledok Lembah G2' },
      { poktan_id: 5, no_induk: 'KL-003', nik: '3520032702770022', nama: 'SUYATNO', jk: 'L', jabatan: 'Sekretaris', rt: '16', rw: '02', dusun: 'Ledok', hp: '08123405003', komoditas: 'Jagung', luas: 0.50, baru: 0, lat: -7.7618, lng: 111.3708, blok: 'Blok Ledok Barat G3' },

      // POKTAN 6: PUNTUK ASRI (poktan_id = 6, Dusun Ledok)
      { poktan_id: 6, no_induk: 'PA-001', nik: '3520030404720023', nama: 'SUYITNO', jk: 'L', jabatan: 'Ketua', rt: '16', rw: '02', dusun: 'Ledok', hp: '08123406001', komoditas: 'Jagung', luas: 0.58, baru: 0, lat: -7.7631, lng: 111.3746, blok: 'Blok Ledok Asri H1' },
      { poktan_id: 6, no_induk: 'PA-002', nik: '3520031307760024', nama: 'NGADIYIN', jk: 'L', jabatan: 'Bendahara', rt: '16', rw: '02', dusun: 'Ledok', hp: '08123406002', komoditas: 'Padi', luas: 0.64, baru: 0, lat: -7.7636, lng: 111.3737, blok: 'Blok Ledok Asri H2' },
      { poktan_id: 6, no_induk: 'PA-003', nik: '3520032111790025', nama: 'SUYADI', jk: 'L', jabatan: 'Sekretaris', rt: '16', rw: '02', dusun: 'Ledok', hp: '08123406003', komoditas: 'Tebu', luas: 0.78, baru: 0, lat: -7.7625, lng: 111.3755, blok: 'Blok Ledok Tebu H3' },

      // POKTAN 7: CINDELARAS (poktan_id = 7, Dusun Sepuntuk)
      { poktan_id: 7, no_induk: 'CD-001', nik: '3520030908800026', nama: 'EDI PRAYITNO', jk: 'L', jabatan: 'Ketua', rt: '20', rw: '03', dusun: 'Sepuntuk', hp: '08123407001', komoditas: 'Jagung', luas: 0.55, baru: 0, lat: -7.7561, lng: 111.3692, blok: 'Blok Sepuntuk Atas I1' },
      { poktan_id: 7, no_induk: 'CD-002', nik: '3520031601830027', nama: 'SUSANTO', jk: 'L', jabatan: 'Bendahara', rt: '20', rw: '03', dusun: 'Sepuntuk', hp: '08123407002', komoditas: 'Tebu', luas: 0.65, baru: 0, lat: -7.7568, lng: 111.3685, blok: 'Blok Sepuntuk Atas I2' },
      { poktan_id: 7, no_induk: 'CD-003', nik: '3520032405850028', nama: 'HAMBALI', jk: 'L', jabatan: 'Sekretaris', rt: '20', rw: '03', dusun: 'Sepuntuk', hp: '08123407003', komoditas: 'Padi', luas: 0.42, baru: 1, lat: -7.7555, lng: 111.3701, blok: 'Blok Sepuntuk Lereng I3' },
    ];

    const insertPetaniStmt = db.prepare(`
      INSERT INTO petani (
        poktan_id, no_induk, nik, nama_lengkap, jenis_kelamin,
        jabatan_poktan, rt, rw, dusun, no_hp,
        komoditas_utama, luas_lahan_ha, is_anggota_baru, biaya_anggota_baru,
        tanggal_gabung, status_aktif
      ) VALUES (
        @poktan_id, @no_induk, @nik, @nama, @jk,
        @jabatan, @rt, @rw, @dusun, @hp,
        @komoditas, @luas, @baru, @biaya_baru,
        @tgl_gabung, 'AKTIF'
      )
    `);

    const insertLahanStmt = db.prepare(`
      INSERT INTO lahan (
        petani_id, poktan_id, kode_petak, luas_hektar, status_lahan,
        komoditas, sistem_irigasi, estimasi_panen_ton,
        dusun_lokasi, blok_sawah, latitude, longitude, polygon_json
      ) VALUES (
        @petani_id, @poktan_id, @kode_petak, @luas, @status_lahan,
        @komoditas, @irigasi, @estimasi,
        @dusun, @blok, @lat, @lng, @polygon
      )
    `);

    const insertSimpananStmt = db.prepare(`
      INSERT INTO simpanan (petani_id, no_transaksi, jenis_simpanan, nominal, tanggal, keterangan)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertPinjamanStmt = db.prepare(`
      INSERT INTO pinjaman (
        petani_id, poktan_id, kode_pinjaman, perguliran_ke, periode_musim,
        tahun_anggaran, komoditas_usaha, pokok_pinjaman, persen_jasa_bulan,
        jasa_per_juta, nominal_jasa, biaya_admin_pencairan, biaya_anggota_baru,
        total_kewajiban, sisa_tagihan, tanggal_pencairan, tanggal_jatuh_tempo, status
      ) VALUES (
        @petani_id, @poktan_id, @kode_pinjaman, @perguliran_ke, @periode_musim,
        @tahun, @komoditas, @pokok, 1.25,
        50000, @nominal_jasa, 10000, @biaya_baru,
        @total_kewajiban, @sisa_tagihan, @tgl_cair, @tgl_tempo, @status
      )
    `);

    const insertAngsuranStmt = db.prepare(`
      INSERT INTO angsuran (
        pinjaman_id, no_kwitansi, termin_musim, bayar_pokok, bayar_jasa,
        total_bayar, tanggal_bayar, keterangan
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    petaniSeed.forEach((pt, index) => {
      const biayaBaru = pt.baru === 1 ? 10000 : 0;
      const tglGabung = pt.baru === 1 ? '2026-11-10' : '2020-03-14';

      const info = insertPetaniStmt.run({
        ...pt,
        biaya_baru: biayaBaru,
        tgl_gabung: tglGabung,
      });
      const petaniId = Number(info.lastInsertRowid);

      // Productivity per hectare based on commodity: Padi ~ 6.8 ton/Ha, Jagung ~ 7.5 ton/Ha, Tebu ~ 78 ton/Ha
      const yieldFactor = pt.komoditas === 'Tebu' ? 75 : pt.komoditas === 'Jagung' ? 7.4 : 6.6;
      const estimasiTon = Number((pt.luas * yieldFactor).toFixed(2));
      const irigasi = pt.komoditas === 'Padi' ? 'Irigasi Teknis' : pt.komoditas === 'Jagung' ? 'Sumur Pompa / Subsurface' : 'Setengah Teknis';
      const poly = createPlotPolygon(pt.lat, pt.lng, pt.luas);

      insertLahanStmt.run({
        petani_id: petaniId,
        poktan_id: pt.poktan_id,
        kode_petak: `KDR-${String(index + 1).padStart(3, '0')}`,
        luas: pt.luas,
        status_lahan: index % 5 === 0 ? 'Sewa' : 'Milik Sendiri',
        komoditas: pt.komoditas,
        irigasi,
        estimasi: estimasiTon,
        dusun: pt.dusun,
        blok: pt.blok,
        lat: pt.lat,
        lng: pt.lng,
        polygon: JSON.stringify(poly),
      });

      // Seed Simpanan Pokok & Wajib
      insertSimpananStmt.run(
        petaniId,
        `SMP-PK-${String(index + 1).padStart(3, '0')}`,
        'POKOK',
        100000,
        tglGabung,
        `Simpanan Pokok Anggota ${pt.nama}`
      );
      insertSimpananStmt.run(
        petaniId,
        `SMP-WJ-${String(index + 1).padStart(3, '0')}`,
        'WAJIB',
        150000,
        '2026-11-01',
        `Simpanan Wajib Musim Tanam 2026 ${pt.nama}`
      );

      // Seed Pinjaman PUAP:
      // Exact rule from sheet: Rp 1.000.000 (or Rp 2.000.000) -> Jasa = Rp 50.000 per Rp 1.000.000 + Admin Pencairan Rp 10.000
      const pokok = 1000000;
      const jasa = (pokok / 1000000) * 50000; // 50,000
      const totalKewajiban = pokok + jasa; // 1,050,000

      // 1) Pinjaman Musim II (Juli - November 2026) -> Sudah LUNAS
      const pinjLunasInfo = insertPinjamanStmt.run({
        petani_id: petaniId,
        poktan_id: pt.poktan_id,
        kode_pinjaman: `PUAP-48-${String(index + 1).padStart(3, '0')}`,
        perguliran_ke: 'XLVIII',
        periode_musim: 'Juli - November',
        tahun: 2026,
        komoditas: pt.komoditas,
        pokok,
        nominal_jasa: jasa,
        biaya_baru: 0,
        total_kewajiban: totalKewajiban,
        sisa_tagihan: 0,
        tgl_cair: '2026-07-16',
        tgl_tempo: '2026-11-16',
        status: 'LUNAS',
      });

      insertAngsuranStmt.run(
        Number(pinjLunasInfo.lastInsertRowid),
        `KWT-48-${String(index + 1).padStart(3, '0')}`,
        'Juli - November',
        pokok,
        jasa,
        totalKewajiban,
        '2026-11-12',
        `Pelunasan PUAP Perguliran XLVIII (Juli-Nov) a.n ${pt.nama}`
      );

      // 2) Pinjaman Musim III (November 2026 - Maret 2027, Perguliran XLIX) -> AKTIF sesuai spreadsheet
      insertPinjamanStmt.run({
        petani_id: petaniId,
        poktan_id: pt.poktan_id,
        kode_pinjaman: `PUAP-49-${String(index + 1).padStart(3, '0')}`,
        perguliran_ke: 'XLIX',
        periode_musim: 'November - Maret',
        tahun: 2026,
        komoditas: pt.komoditas,
        pokok,
        nominal_jasa: jasa,
        biaya_baru: biayaBaru,
        total_kewajiban: totalKewajiban,
        sisa_tagihan: totalKewajiban,
        tgl_cair: '2026-11-17',
        tgl_tempo: '2027-03-29',
        status: 'AKTIF',
      });
    });

    // 5. Seed Buku Kas Gapoktan "KEDIREN MAJU"
    const insertKas = db.prepare(`
      INSERT INTO kas_gapoktan (kode_jurnal, tanggal, periode_musim, kategori, tipe, nominal, deskripsi, referensi_kode)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertKas.run(
      'KAS-2026-001',
      '2026-03-01',
      'Maret - Juli',
      'MODAL_PUAP_BRI',
      'MASUK',
      401462970,
      'Saldo Dana BLM-PUAP Rekening BRI Unit Lembeyan (3877-01-025711-53-9)',
      'BRI-3877-01'
    );
    insertKas.run(
      'KAS-2026-002',
      '2026-03-15',
      'Maret - Juli',
      'PENCAIRAN_PUAP',
      'KELUAR',
      340000000,
      'Penyaluran Dana BLM-PUAP Perguliran ke-XLVII (Maret - Juli) ke 7 Poktan (340 Anggota)',
      'PUAP-XLVII'
    );
    insertKas.run(
      'KAS-2026-003',
      '2026-03-15',
      'Maret - Juli',
      'ADMIN_PENCAIRAN',
      'MASUK',
      3400000,
      'Pendapatan Administrasi Pencairan PUAP Musim I (340 Anggota x Rp 10.000)',
      'ADM-XLVII'
    );
    insertKas.run(
      'KAS-2026-004',
      '2026-07-14',
      'Maret - Juli',
      'PENGEMBALIAN_POKOK',
      'MASUK',
      340000000,
      'Pengembalian Pokok Pinjaman PUAP Perguliran ke-XLVII dari 7 Poktan',
      'ANGS-XLVII-PK'
    );
    insertKas.run(
      'KAS-2026-005',
      '2026-07-14',
      'Maret - Juli',
      'PENDAPATAN_JASA',
      'MASUK',
      17000000,
      'Pendapatan Jasa PUAP Perguliran ke-XLVII (Rp 50.000 x 340 Juta)',
      'ANGS-XLVII-JS'
    );
    insertKas.run(
      'KAS-2026-006',
      '2026-07-16',
      'Juli - November',
      'PENCAIRAN_PUAP',
      'KELUAR',
      340000000,
      'Penyaluran Dana BLM-PUAP Perguliran ke-XLVIII (Juli - November) ke 7 Poktan',
      'PUAP-XLVIII'
    );
    insertKas.run(
      'KAS-2026-007',
      '2026-07-16',
      'Juli - November',
      'ADMIN_PENCAIRAN',
      'MASUK',
      3400000,
      'Pendapatan Administrasi Pencairan PUAP Musim II (340 Anggota x Rp 10.000)',
      'ADM-XLVIII'
    );
    insertKas.run(
      'KAS-2026-008',
      '2026-11-15',
      'Juli - November',
      'PENGEMBALIAN_POKOK',
      'MASUK',
      340000000,
      'Pengembalian Pokok Pinjaman PUAP Perguliran ke-XLVIII dari 7 Poktan',
      'ANGS-XLVIII-PK'
    );
    insertKas.run(
      'KAS-2026-009',
      '2026-11-15',
      'Juli - November',
      'PENDAPATAN_JASA',
      'MASUK',
      17000000,
      'Pendapatan Jasa PUAP Perguliran ke-XLVIII (Rp 50.000 x 340 Juta)',
      'ANGS-XLVIII-JS'
    );
    insertKas.run(
      'KAS-2026-010',
      '2026-11-17',
      'November - Maret',
      'PENCAIRAN_PUAP',
      'KELUAR',
      340000000,
      'Penyaluran Dana BLM-PUAP Perguliran ke-XLIX (17 Nov 2026 - 29 Mar 2027) ke 7 Poktan',
      'PUAP-XLIX'
    );
    insertKas.run(
      'KAS-2026-011',
      '2026-11-17',
      'November - Maret',
      'ADMIN_PENCAIRAN',
      'MASUK',
      3400000,
      'Pendapatan Administrasi Pencairan PUAP Perguliran ke-XLIX (340 Anggota x Rp 10.000)',
      'ADM-XLIX'
    );
    insertKas.run(
      'KAS-2026-012',
      '2026-11-17',
      'November - Maret',
      'ADMIN_ANGGOTA_BARU',
      'MASUK',
      40000,
      'Biaya Pendaftaran Anggota Baru (4 Anggota Baru x Rp 10.000)',
      'ADM-BARU-2026'
    );
  });

  insertTransaction();
}
