'use client';

import React, { useState } from 'react';
import { formatRupiah, terbilangRupiah } from '@/lib/terbilang';

export interface PoktanDocData {
  id: number;
  kode_poktan: string;
  nama_poktan: string;
  ketua: string;
  bendahara: string;
  sekretaris: string;
  seksi_saprodi: string;
  seksi_humas: string;
  seksi_pengairan: string;
  alamat: string;
  dusun: string;
  rt: string;
  rw: string;
  jumlah_anggota_resmi: number;
  pinjaman_modal: number;
  jasa_per_juta: number;
  total_jasa: number;
  dana_kembali: number;
  terbilang_modal: string;
  terbilang_kembali: string;
  rencana_penarikan_sisa: number;
}

export interface PetaniDocData {
  id: number;
  poktan_id: number;
  no_induk: string;
  nik: string;
  nama_lengkap: string;
  jenis_kelamin: string;
  jabatan_poktan: string;
  rt: string;
  rw: string;
  dusun: string;
  komoditas_utama: string;
  luas_lahan_ha: number;
  nama_poktan: string;
}

interface OfficialDocumentsCenterProps {
  profile: Record<string, unknown>;
  poktanList: PoktanDocData[];
  petaniList: PetaniDocData[];
}

type DocType =
  | 'RENCANA_PENARIKAN'
  | 'REKOM_DINAS_TPHP'
  | 'RUK_GAPOKTAN_POKTAN'
  | 'REKAP_ANGGOTA_PUAP'
  | 'PERJANJIAN_KERJASAMA'
  | 'BAST_DAN_PAKTA'
  | 'KWITANSI_PUAP';

const MUSIM_OPTIONS = [
  {
    label: 'Musim III: November 2026 – Maret 2027 (Perguliran ke-XLIX / 49)',
    perguliran: 'XLIX',
    periode: 'NOVEMBER 2026 – MARET 2027',
    tglTarik: '17 – 11 – 2026',
    tglSurat: '17 November 2026',
    hariText: 'SELASA',
    tglText: 'TUJUH BELAS',
    bulanText: 'NOVEMBER',
    tahunText: 'DUA RIBU DUA PULUH ENAM',
    jatuhTempo: '29 MARET 2027',
  },
  {
    label: 'Musim I: Maret 2026 – Juli 2026 (Perguliran ke-XLVII / 47)',
    perguliran: 'XLVII',
    periode: 'MARET 2026 – JULI 2026',
    tglTarik: '15 – 03 – 2026',
    tglSurat: '15 Maret 2026',
    hariText: 'MINGGU',
    tglText: 'LIMA BELAS',
    bulanText: 'MARET',
    tahunText: 'DUA RIBU DUA PULUH ENAM',
    jatuhTempo: '15 JULI 2026',
  },
  {
    label: 'Musim II: Juli 2026 – November 2026 (Perguliran ke-XLVIII / 48)',
    perguliran: 'XLVIII',
    periode: 'JULI 2026 – NOVEMBER 2026',
    tglTarik: '16 – 07 – 2026',
    tglSurat: '16 Juli 2026',
    hariText: 'KAMIS',
    tglText: 'ENAM BELAS',
    bulanText: 'JULI',
    tahunText: 'DUA RIBU DUA PULUH ENAM',
    jatuhTempo: '16 NOVEMBER 2026',
  },
];

export default function OfficialDocumentsCenter({
  profile,
  poktanList,
  petaniList,
}: OfficialDocumentsCenterProps) {
  const [activeDoc, setActiveDoc] = useState<DocType>('RENCANA_PENARIKAN');
  const [selectedPoktanId, setSelectedPoktanId] = useState<number>(poktanList[0]?.id || 1);
  const [musimIdx, setMusimIdx] = useState<number>(0);

  const selectedPoktan =
    poktanList.find((p) => p.id === selectedPoktanId) || poktanList[0];
  const activeMusim = MUSIM_OPTIONS[musimIdx] || MUSIM_OPTIONS[0];

  const saldoAwalBri = Number(profile?.saldo_rekening_awal || 401462970);
  const totalPenarikan7Poktan = poktanList.reduce((acc, p) => acc + Number(p.pinjaman_modal), 0);
  const sisaSaldoBri = saldoAwalBri - totalPenarikan7Poktan;

  const anggotaPoktan = petaniList.filter((pt) => pt.poktan_id === selectedPoktan?.id);

  // Build full list up to selectedPoktan.jumlah_anggota_resmi for official sheet look
  const displayRowsRekap = Array.from(
    { length: Math.min(selectedPoktan?.jumlah_anggota_resmi || 15, 25) },
    (_, i) => {
      const realMember = anggotaPoktan[i];
      const pokok = 1000000;
      const jasa = 50000;
      return {
        no: i + 1,
        no_induk: realMember?.no_induk || `${selectedPoktan?.kode_poktan}-${String(i + 1).padStart(3, '0')}`,
        nama: realMember?.nama_lengkap || `ANGGOTA ${selectedPoktan?.nama_poktan} ${i + 1}`,
        jk: realMember?.jenis_kelamin || 'L',
        jabatan: realMember?.jabatan_poktan || 'Anggota',
        rt: realMember?.rt || selectedPoktan?.rt || '06',
        rw: realMember?.rw || selectedPoktan?.rw || '01',
        dusun: realMember?.dusun || selectedPoktan?.dusun || 'Selungguh',
        komoditas: realMember?.komoditas_utama || 'Padi',
        pokok,
        persen_jasa: '1,25%',
        jasa,
        total: pokok + jasa,
      };
    }
  );

  const handlePrint = () => {
    window.print();
  };

  if (!selectedPoktan) return null;

  return (
    <div className="docs-center">
      {/* Control Header (Hidden during print) */}
      <div className="docs-controls no-print">
        <div className="docs-control-row">
          <div className="docs-select-group">
            <label>Pilih Siklus Pencairan (3x Setahun):</label>
            <select
              value={musimIdx}
              onChange={(e) => setMusimIdx(Number(e.target.value))}
              className="form-select"
            >
              {MUSIM_OPTIONS.map((m, idx) => (
                <option key={m.perguliran} value={idx}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="docs-select-group">
            <label>Pilih Kelompok Tani (Mail Merge Poktan):</label>
            <select
              value={selectedPoktanId}
              onChange={(e) => setSelectedPoktanId(Number(e.target.value))}
              className="form-select"
            >
              {poktanList.map((p) => (
                <option key={p.id} value={p.id}>
                  POKTAN {p.nama_poktan} — Ketua: {p.ketua} ({p.jumlah_anggota_resmi} Anggota | {formatRupiah(p.pinjaman_modal)})
                </option>
              ))}
            </select>
          </div>

          <button type="button" onClick={handlePrint} className="btn-primary btn-print">
            🖨️ Cetak / Simpan PDF Dokumen Ini
          </button>
        </div>

        {/* Document Tabs */}
        <div className="docs-tab-bar">
          <button
            type="button"
            className={`docs-tab ${activeDoc === 'RENCANA_PENARIKAN' ? 'active' : ''}`}
            onClick={() => setActiveDoc('RENCANA_PENARIKAN')}
          >
            1. Rencana Penarikan BLM PUAP (7 Poktan)
          </button>
          <button
            type="button"
            className={`docs-tab ${activeDoc === 'REKOM_DINAS_TPHP' ? 'active' : ''}`}
            onClick={() => setActiveDoc('REKOM_DINAS_TPHP')}
          >
            2. Surat Rekomendasi Dinas TPHP Magetan ke BRI
          </button>
          <button
            type="button"
            className={`docs-tab ${activeDoc === 'RUK_GAPOKTAN_POKTAN' ? 'active' : ''}`}
            onClick={() => setActiveDoc('RUK_GAPOKTAN_POKTAN')}
          >
            3. RUK Gapoktan & RUK Poktan ({selectedPoktan.nama_poktan})
          </button>
          <button
            type="button"
            className={`docs-tab ${activeDoc === 'REKAP_ANGGOTA_PUAP' ? 'active' : ''}`}
            onClick={() => setActiveDoc('REKAP_ANGGOTA_PUAP')}
          >
            4. Rekapitulasi Anggota Penerima ({selectedPoktan.nama_poktan})
          </button>
          <button
            type="button"
            className={`docs-tab ${activeDoc === 'PERJANJIAN_KERJASAMA' ? 'active' : ''}`}
            onClick={() => setActiveDoc('PERJANJIAN_KERJASAMA')}
          >
            5. Perjanjian Kerjasama Pembiayaan
          </button>
          <button
            type="button"
            className={`docs-tab ${activeDoc === 'BAST_DAN_PAKTA' ? 'active' : ''}`}
            onClick={() => setActiveDoc('BAST_DAN_PAKTA')}
          >
            6. BAST Uang & Pakta Integritas
          </button>
          <button
            type="button"
            className={`docs-tab ${activeDoc === 'KWITANSI_PUAP' ? 'active' : ''}`}
            onClick={() => setActiveDoc('KWITANSI_PUAP')}
          >
            7. Kwitansi Pencairan PUAP
          </button>
        </div>
      </div>

      {/* Printable Official Paper Sheet */}
      <div className="official-paper">
        {activeDoc === 'RENCANA_PENARIKAN' && (
          <div>
            <div className="doc-header-center">
              <h2>RENCANA PENARIKAN BLM PUAP 2026</h2>
              <h3>PROGRAM PENGEMBANGAN USAHA AGRIBISNIS PERDESAAN</h3>
              <h3>PERGULIRAN KE-{activeMusim.perguliran} ({activeMusim.periode})</h3>
              <h3>KABUPATEN MAGETAN TA 2026</h3>
            </div>

            <table className="doc-meta-table">
              <tbody>
                <tr>
                  <td width="180">Nama Gapoktan</td>
                  <td width="15">:</td>
                  <td><strong>KEDIREN MAJU</strong></td>
                  <td width="160">Nama Ketua</td>
                  <td width="15">:</td>
                  <td><strong>SUYANTO</strong></td>
                </tr>
                <tr>
                  <td>Alamat Gapoktan</td>
                  <td>:</td>
                  <td>DESA KEDIREN</td>
                  <td>Sekretaris</td>
                  <td>:</td>
                  <td><strong>SUPRIYANTO</strong></td>
                </tr>
                <tr>
                  <td>Kecamatan / Kabupaten</td>
                  <td>:</td>
                  <td>LEMBEYAN / MAGETAN</td>
                  <td>Bendahara</td>
                  <td>:</td>
                  <td><strong>H. RUSIMIN</strong></td>
                </tr>
                <tr>
                  <td>No. Rekening BRI</td>
                  <td>:</td>
                  <td colSpan={4}><strong>3877-01-025711-53-9 (BRI UNIT LEMBEYAN)</strong></td>
                </tr>
              </tbody>
            </table>

            <table className="doc-grid-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Tanggal Penarikan</th>
                  <th>Tanggal Penyaluran</th>
                  <th>Nama Kelompok Tani</th>
                  <th>Ketua Poktan</th>
                  <th>Jml Anggota</th>
                  <th>Jumlah Dana (Rp.)</th>
                  <th>Dana Kembali + Jasa (Rp.)</th>
                  <th>Sisa Saldo Rekening (Rp.)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="doc-highlight-row">
                  <td colSpan={8} style={{ textAlign: 'right', fontWeight: 700 }}>
                    DANA / SALDO REKENING BRI AWAL
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>
                    {formatRupiah(saldoAwalBri)}
                  </td>
                </tr>
                {poktanList.map((p, index) => (
                  <tr key={p.id}>
                    <td style={{ textAlign: 'center' }}>{index + 1}</td>
                    <td style={{ textAlign: 'center' }}>{activeMusim.tglTarik}</td>
                    <td style={{ textAlign: 'center' }}>{activeMusim.tglTarik}</td>
                    <td><strong>{p.nama_poktan}</strong></td>
                    <td>{p.ketua}</td>
                    <td style={{ textAlign: 'center' }}>{p.jumlah_anggota_resmi} Orang</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatRupiah(p.pinjaman_modal)}</td>
                    <td style={{ textAlign: 'right' }}>{formatRupiah(p.dana_kembali)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {formatRupiah(p.rencana_penarikan_sisa)}
                    </td>
                  </tr>
                ))}
                <tr className="doc-total-row">
                  <td colSpan={5} style={{ textAlign: 'center', fontWeight: 700 }}>TOTAL PENARIKAN 7 POKTAN</td>
                  <td style={{ textAlign: 'center', fontWeight: 700 }}>
                    {poktanList.reduce((a, b) => a + Number(b.jumlah_anggota_resmi), 0)} Orang
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>
                    {formatRupiah(totalPenarikan7Poktan)}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>
                    {formatRupiah(poktanList.reduce((a, b) => a + Number(b.dana_kembali), 0))}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>
                    SISA SALDO: {formatRupiah(sisaSaldoBri)}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="doc-signatures-3">
              <div>
                <p>Penyuluh Pendamping</p>
                <div className="sig-space" />
                <p><strong><u>IIS SUGIARTI, SP</u></strong></p>
                <p>NIP. 19810425 201001 2 020</p>
              </div>
              <div>
                <p>Mengetahui,</p>
                <p>a.n Kepala Dinas TPHP Magetan</p>
                <p>Selaku Ketua Tim Teknis PUAP Kab. Magetan</p>
                <p>Sekretaris</p>
                <div className="sig-space" />
                <p><strong><u>DIKA TRIHARTA KUSUMA, S.Pt., M.Ling.</u></strong></p>
                <p>NIP. 19880501 201503 1 004</p>
              </div>
              <div>
                <p>Magetan, {activeMusim.tglSurat}</p>
                <p>Ketua Gapoktan &ldquo;KEDIREN MAJU&rdquo;</p>
                <div className="sig-space" />
                <p><strong><u>SUYANTO</u></strong></p>
              </div>
            </div>
          </div>
        )}

        {activeDoc === 'REKOM_DINAS_TPHP' && (
          <div>
            <div className="doc-kop-dinas">
              <h3>PEMERINTAH KABUPATEN MAGETAN</h3>
              <h2>DINAS TANAMAN PANGAN HORTIKULTURA DAN PERKEBUNAN</h2>
              <p>Jl. Raya Gorang Gareng, Ds. Mojopurno Kec. Ngariboyo Kab. Magetan Telp. (0351) 895360 Fax. (0351) 893567</p>
              <p>Website: http://tphpkp.magetan.go.id | E-mail: dispertan.magetan@gmail.com</p>
              <hr className="kop-line" />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
              <div style={{ width: '280px' }}>
                <p>Magetan, {activeMusim.tglSurat}</p>
                <p style={{ marginTop: '8px' }}>Kepada</p>
                <p><strong>Yth. Kepala Cabang BRI Magetan</strong></p>
                <p>Cq. Kepala BRI Unit Lembeyan</p>
                <p>di -</p>
                <p style={{ letterSpacing: '4px', fontWeight: 700, paddingLeft: '20px' }}>M A G E T A N</p>
              </div>
            </div>

            <div className="doc-header-center" style={{ margin: '20px 0' }}>
              <h3 style={{ textDecoration: 'underline' }}>SURAT PENGANTAR / REKOMENDASI PENCAIRAN PUAP</h3>
              <p><strong>NOMOR : 500.6 / {activeMusim.perguliran}.03 / 403.119 / 2026</strong></p>
            </div>

            <table className="doc-grid-table">
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>No</th>
                  <th>Naskah Dinas Yang Dikirimkan</th>
                  <th style={{ width: '130px' }}>Banyaknya</th>
                  <th style={{ width: '220px' }}>Keterangan</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ textAlign: 'center', verticalAlign: 'top' }}>1</td>
                  <td style={{ lineHeight: 1.6 }}>
                    <strong>Rencana Penarikan BLM PUAP Tahun 2026</strong><br />
                    Program Pengembangan Usaha Agribisnis Perdesaan (PUAP)<br />
                    <strong>Perguliran ke-{activeMusim.perguliran} ({activeMusim.periode})</strong><br />
                    Gapoktan <strong>&ldquo;KEDIREN MAJU&rdquo;</strong> Desa Kediren, Kecamatan Lembeyan, Kabupaten Magetan<br />
                    Nomor Rekening BRI Unit Lembeyan: <strong>3877-01-025711-53-9</strong><br />
                    Total Penarikan 7 Kelompok Tani (340 Anggota): <strong>{formatRupiah(totalPenarikan7Poktan)}</strong><br />
                    <em>({terbilangRupiah(totalPenarikan7Poktan)})</em>
                  </td>
                  <td style={{ textAlign: 'center', verticalAlign: 'top' }}>1 (satu) Berkas</td>
                  <td style={{ verticalAlign: 'top' }}>
                    Disampaikan untuk dapat diproses pencairan dana perguliran PUAP sebagaimana mestinya.
                  </td>
                </tr>
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '36px' }}>
              <div style={{ textAlign: 'center', width: '340px' }}>
                <p>An. KEPALA DINAS TANAMAN PANGAN</p>
                <p>HORTIKULTURA DAN PERKEBUNAN KABUPATEN MAGETAN</p>
                <p>Selaku Ketua Tim Teknis PUAP Kab. Magetan</p>
                <p>Sekretaris</p>
                <div className="sig-space" />
                <p><strong><u>DIKA TRIHARTA KUSUMA, S.Pt., M.Ling.</u></strong></p>
                <p>NIP. 19880501 201503 1 004</p>
              </div>
            </div>
          </div>
        )}

        {activeDoc === 'RUK_GAPOKTAN_POKTAN' && (
          <div>
            <div className="doc-header-center">
              <h2>RENCANA USAHA KELOMPOK TANI (RUK)</h2>
              <h3>PEMANFAAT DANA BLM PUAP — PERGULIRAN KE-{activeMusim.perguliran}</h3>
              <h3>GAPOKTAN &ldquo;KEDIREN MAJU&rdquo; DESA KEDIREN KEC. LEMBEYAN KAB. MAGETAN</h3>
            </div>

            <table className="doc-meta-table">
              <tbody>
                <tr>
                  <td width="240">Nama Kelompok Tani</td>
                  <td width="15">:</td>
                  <td><strong>{selectedPoktan.nama_poktan}</strong></td>
                </tr>
                <tr>
                  <td>Alamat Sekretariat Poktan</td>
                  <td>:</td>
                  <td>{selectedPoktan.alamat}</td>
                </tr>
                <tr>
                  <td>Pengurus Kelompok Tani</td>
                  <td>:</td>
                  <td>
                    Ketua: <strong>{selectedPoktan.ketua}</strong> | Sekretaris: <strong>{selectedPoktan.sekretaris}</strong> | Bendahara: <strong>{selectedPoktan.bendahara}</strong> | Saprodi: <strong>{selectedPoktan.seksi_saprodi}</strong> | Humas: <strong>{selectedPoktan.seksi_humas}</strong>
                  </td>
                </tr>
                <tr>
                  <td>Usaha yang Dibiayai</td>
                  <td>:</td>
                  <td><strong>BUDIDAYA TANAMAN PANGAN & PERKEBUNAN (PADI, JAGUNG, TEBU)</strong></td>
                </tr>
                <tr>
                  <td>Jumlah Anggota Pemanfaat</td>
                  <td>:</td>
                  <td><strong>{selectedPoktan.jumlah_anggota_resmi} Orang Petani</strong></td>
                </tr>
                <tr>
                  <td>Jumlah Pinjaman yang Diajukan</td>
                  <td>:</td>
                  <td>
                    <strong>{formatRupiah(selectedPoktan.pinjaman_modal)}</strong> <em>({selectedPoktan.terbilang_modal})</em>
                  </td>
                </tr>
                <tr>
                  <td>Jangka Waktu Pemanfaatan</td>
                  <td>:</td>
                  <td><strong>4 BULAN ({activeMusim.periode})</strong> — Siklus 1 Tahun 3x Perguliran</td>
                </tr>
                <tr>
                  <td>Margin / Jasa Pinjaman</td>
                  <td>:</td>
                  <td>
                    <strong>Rp 50.000 per Rp 1.000.000</strong> (1,25% / Bulan = 5% / Musim) &rarr; Total Pengembalian: <strong>{formatRupiah(selectedPoktan.dana_kembali)}</strong>
                  </td>
                </tr>
                <tr>
                  <td>Biaya Administrasi</td>
                  <td>:</td>
                  <td>
                    <strong>Rp 10.000 / Pencairan</strong> &amp; Biaya Pendaftaran Anggota Baru <strong>Rp 10.000</strong>
                  </td>
                </tr>
              </tbody>
            </table>

            <table className="doc-grid-table">
              <thead>
                <tr>
                  <th style={{ width: '45px' }}>No</th>
                  <th style={{ width: '110px' }}>No. Induk</th>
                  <th>Nama Peminjam</th>
                  <th>Jabatan dalam Kelompok</th>
                  <th>Komoditas</th>
                  <th>Pinjaman Modal (Rp)</th>
                  <th>Jasa (Rp)</th>
                  <th>Total Kembali (Rp)</th>
                </tr>
              </thead>
              <tbody>
                {displayRowsRekap.slice(0, 12).map((r) => (
                  <tr key={r.no}>
                    <td style={{ textAlign: 'center' }}>{r.no}</td>
                    <td style={{ textAlign: 'center' }}>{r.no_induk}</td>
                    <td><strong>{r.nama}</strong></td>
                    <td>{r.jabatan}</td>
                    <td style={{ textAlign: 'center' }}>{r.komoditas}</td>
                    <td style={{ textAlign: 'right' }}>{formatRupiah(r.pokok)}</td>
                    <td style={{ textAlign: 'right' }}>{formatRupiah(r.jasa)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatRupiah(r.total)}</td>
                  </tr>
                ))}
                <tr className="doc-total-row">
                  <td colSpan={5} style={{ textAlign: 'center', fontWeight: 700 }}>
                    TOTAL RUK POKTAN {selectedPoktan.nama_poktan} ({selectedPoktan.jumlah_anggota_resmi} ANGGOTA)
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatRupiah(selectedPoktan.pinjaman_modal)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatRupiah(selectedPoktan.total_jasa)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatRupiah(selectedPoktan.dana_kembali)}</td>
                </tr>
              </tbody>
            </table>

            <div className="doc-signatures-3">
              <div>
                <p>Mengetahui,</p>
                <p>Penyuluh Pendamping</p>
                <div className="sig-space" />
                <p><strong><u>IIS SUGIARTI, SP</u></strong></p>
                <p>NIP. 19810425 201001 2 020</p>
              </div>
              <div>
                <p>Disetujui,</p>
                <p>Ketua Gapoktan &ldquo;KEDIREN MAJU&rdquo;</p>
                <div className="sig-space" />
                <p><strong><u>SUYANTO</u></strong></p>
              </div>
              <div>
                <p>Magetan, {activeMusim.tglSurat}</p>
                <p>Ketua Poktan &ldquo;{selectedPoktan.nama_poktan}&rdquo;</p>
                <div className="sig-space" />
                <p><strong><u>{selectedPoktan.ketua}</u></strong></p>
              </div>
            </div>
          </div>
        )}

        {activeDoc === 'REKAP_ANGGOTA_PUAP' && (
          <div>
            <div className="doc-header-center">
              <h2>REKAPITULASI ANGGOTA PENERIMA BANTUAN PERMODALAN PUAP GAPOKTAN KEDIREN MAJU</h2>
              <h3>DESA KEDIREN KECAMATAN LEMBEYAN KABUPATEN MAGETAN PROVINSI JAWA TIMUR TA 2026</h3>
            </div>

            <table className="doc-meta-table">
              <tbody>
                <tr>
                  <td width="160">Kelompok Tani</td>
                  <td width="15">:</td>
                  <td><strong>{selectedPoktan.nama_poktan}</strong></td>
                  <td width="160">Periode Perguliran</td>
                  <td width="15">:</td>
                  <td><strong>Ke-{activeMusim.perguliran} ({activeMusim.periode})</strong></td>
                </tr>
                <tr>
                  <td>Alamat</td>
                  <td>:</td>
                  <td>{selectedPoktan.alamat}</td>
                  <td>Jatuh Tempo</td>
                  <td>:</td>
                  <td><strong>{activeMusim.jatuhTempo}</strong></td>
                </tr>
              </tbody>
            </table>

            <table className="doc-grid-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Nama Anggota</th>
                  <th>L/P</th>
                  <th>RT/RW</th>
                  <th>Dusun</th>
                  <th>Usaha Produktif</th>
                  <th>Nilai Pinjaman (Rp)</th>
                  <th>Tgl. Pencairan</th>
                  <th>Jatuh Tempo</th>
                  <th>% Jasa / Bln</th>
                  <th>Nominal Jasa (Rp)</th>
                  <th>Total Pengembalian (Rp)</th>
                </tr>
              </thead>
              <tbody>
                {displayRowsRekap.map((r) => (
                  <tr key={r.no}>
                    <td style={{ textAlign: 'center' }}>{r.no}</td>
                    <td><strong>{r.nama}</strong></td>
                    <td style={{ textAlign: 'center' }}>{r.jk}</td>
                    <td style={{ textAlign: 'center' }}>{r.rt}/{r.rw}</td>
                    <td style={{ textAlign: 'center' }}>{r.dusun}</td>
                    <td style={{ textAlign: 'center' }}>{r.komoditas}</td>
                    <td style={{ textAlign: 'right' }}>{formatRupiah(r.pokok)}</td>
                    <td style={{ textAlign: 'center' }}>{activeMusim.tglTarik}</td>
                    <td style={{ textAlign: 'center' }}>{activeMusim.jatuhTempo}</td>
                    <td style={{ textAlign: 'center' }}>1,25%</td>
                    <td style={{ textAlign: 'right' }}>{formatRupiah(r.jasa)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatRupiah(r.total)}</td>
                  </tr>
                ))}
                <tr className="doc-total-row">
                  <td colSpan={6} style={{ textAlign: 'center', fontWeight: 700 }}>
                    TOTAL REKAPITULASI POKTAN {selectedPoktan.nama_poktan} ({selectedPoktan.jumlah_anggota_resmi} ANGGOTA)
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatRupiah(selectedPoktan.pinjaman_modal)}</td>
                  <td colSpan={3} />
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatRupiah(selectedPoktan.total_jasa)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatRupiah(selectedPoktan.dana_kembali)}</td>
                </tr>
              </tbody>
            </table>

            <div className="doc-signatures-5">
              <div>
                <p>Mengetahui,</p>
                <p>Penyuluh Pendamping</p>
                <div className="sig-space" />
                <p><strong><u>IIS SUGIARTI, SP</u></strong></p>
                <p>NIP. 19810425 201001 2 020</p>
              </div>
              <div>
                <p>Ketua Gapoktan</p>
                <p>KEDIREN MAJU</p>
                <div className="sig-space" />
                <p><strong><u>SUYANTO</u></strong></p>
              </div>
              <div>
                <p>Ketua Poktan</p>
                <p>{selectedPoktan.nama_poktan}</p>
                <div className="sig-space" />
                <p><strong><u>{selectedPoktan.ketua}</u></strong></p>
              </div>
              <div>
                <p>Bendahara Poktan</p>
                <p>{selectedPoktan.nama_poktan}</p>
                <div className="sig-space" />
                <p><strong><u>{selectedPoktan.bendahara}</u></strong></p>
              </div>
              <div>
                <p>Sekretaris Poktan</p>
                <p>{selectedPoktan.nama_poktan}</p>
                <div className="sig-space" />
                <p><strong><u>{selectedPoktan.sekretaris}</u></strong></p>
              </div>
            </div>
          </div>
        )}

        {activeDoc === 'PERJANJIAN_KERJASAMA' && (
          <div className="doc-legal-text">
            <div className="doc-header-center">
              <h2>SURAT PERJANJIAN KERJASAMA PEMBIAYAAN DANA BERGULIR BLM-PUAP</h2>
              <h3>GAPOKTAN &ldquo;KEDIREN MAJU&rdquo; DESA KEDIREN KECAMATAN LEMBEYAN KABUPATEN MAGETAN</h3>
              <p><strong>Nomor : 0{selectedPoktan.id} / GKM-PUAP / {activeMusim.perguliran} / 2026</strong></p>
            </div>

            <p>
              Pada hari ini <strong>{activeMusim.hariText}</strong> tanggal <strong>{activeMusim.tglText}</strong> bulan <strong>{activeMusim.bulanText}</strong> tahun <strong>{activeMusim.tahunText}</strong> ({activeMusim.tglSurat}), kami yang bertanda tangan di bawah ini:
            </p>

            <div className="doc-party-box">
              <p>
                1. Nama: <strong>SUYANTO</strong>, Jabatan: <strong>Ketua Gabungan Kelompok Tani &ldquo;KEDIREN MAJU&rdquo;</strong> berkedudukan di Desa Kediren, Kecamatan Lembeyan, Kabupaten Magetan, Provinsi Jawa Timur, selanjutnya disebut sebagai <strong>PIHAK PERTAMA</strong>.
              </p>
              <p>
                2. Nama: <strong>{selectedPoktan.ketua}</strong>, Jabatan: <strong>Ketua Kelompok Tani &ldquo;{selectedPoktan.nama_poktan}&rdquo;</strong> berkedudukan di {selectedPoktan.alamat}, Kabupaten Magetan, Provinsi Jawa Timur, selanjutnya disebut sebagai <strong>PIHAK KEDUA</strong>.
              </p>
            </div>

            <p>
              PIHAK PERTAMA menentukan besaran jasa yang telah disepakati antar kedua belah pihak serta segala biaya administrasi yang timbul yang harus ditanggung oleh PIHAK KEDUA. Perjanjian antara PIHAK PERTAMA dan PIHAK KEDUA berakhir dalam jangka waktu <strong>satu kali musim tanaman pangan (4 bulan: {activeMusim.periode})</strong> dengan syarat-syarat sebagai berikut:
            </p>

            <h4>PASAL 1 — JUMLAH PEMBIAYAAN &amp; JASA</h4>
            <p>
              PIHAK PERTAMA menyetujui memberikan pinjaman permodalan kepada PIHAK KEDUA sebesar <strong>{formatRupiah(selectedPoktan.pinjaman_modal)}</strong> (<em>{selectedPoktan.terbilang_modal}</em>) untuk disalurkan kepada <strong>{selectedPoktan.jumlah_anggota_resmi} orang anggota</strong> Kelompok Tani &ldquo;{selectedPoktan.nama_poktan}&rdquo;.
            </p>
            <p>
              Dengan ketentuan jasa sebesar <strong>Rp 50.000,- per Rp 1.000.000,-</strong> pinjaman (1,25% per bulan selama 4 bulan) serta biaya administrasi pencairan <strong>Rp 10.000,-</strong> dan biaya anggota baru <strong>Rp 10.000,-</strong>, maka PIHAK PERTAMA akan menerima keseluruhan pengembalian (pokok dan margin/jasa) sebesar <strong>{formatRupiah(selectedPoktan.dana_kembali)}</strong> (<em>{selectedPoktan.terbilang_kembali}</em>) yang akan dibayarkan lunas paling lambat pada tanggal <strong>{activeMusim.jatuhTempo}</strong>.
            </p>

            <h4>PASAL 2 — CARA PENARIKAN PEMBIAYAAN</h4>
            <p>
              PIHAK PERTAMA wajib merealisasikan pinjaman permodalan kepada PIHAK KEDUA apabila PIHAK KEDUA telah menyerahkan Rencana Usaha Kelompok (RUK), daftar rekapitulasi anggota peminjam, dan menandatangani perjanjian ini beserta Pakta Integritas.
            </p>

            <h4>PASAL 3 — CIDERA JANJI &amp; PENYELESAIAN</h4>
            <p>
              Apabila terjadi keterlambatan atau kendala pengembalian, kedua belah pihak sepakat menyelesaikannya secara musyawarah mufakat dalam forum Gapoktan &ldquo;KEDIREN MAJU&rdquo; dengan memberikan waktu pemulihan selama 30 (tiga puluh) hari.
            </p>

            <div className="doc-signatures-3" style={{ marginTop: '30px' }}>
              <div>
                <p>PIHAK KEDUA</p>
                <p>Ketua Poktan &ldquo;{selectedPoktan.nama_poktan}&rdquo;</p>
                <div className="sig-space" />
                <p><strong><u>{selectedPoktan.ketua}</u></strong></p>
              </div>
              <div>
                <p>SAKSI - SAKSI</p>
                <div style={{ marginTop: '24px', textAlign: 'left', paddingLeft: '30px' }}>
                  <p>1. <strong>SUPRIYANTO</strong> (Sekretaris Gapoktan)</p>
                  <p style={{ marginTop: '18px' }}>2. <strong>{selectedPoktan.bendahara}</strong> (Bendahara Poktan)</p>
                </div>
              </div>
              <div>
                <p>PIHAK PERTAMA</p>
                <p>Ketua Gapoktan &ldquo;KEDIREN MAJU&rdquo;</p>
                <div className="sig-space" />
                <p><strong><u>SUYANTO</u></strong></p>
              </div>
            </div>
          </div>
        )}

        {activeDoc === 'BAST_DAN_PAKTA' && (
          <div className="doc-legal-text">
            <div className="doc-header-center">
              <h2>BERITA ACARA SERAH TERIMA UANG BLM-PUAP</h2>
              <h3>GAPOKTAN &ldquo;KEDIREN MAJU&rdquo; DESA KEDIREN KEC. LEMBEYAN KAB. MAGETAN</h3>
              <p><strong>Nomor : 07{selectedPoktan.id} / GKM / {activeMusim.perguliran} / 2026</strong></p>
            </div>

            <p>
              Pada hari ini <strong>{activeMusim.hariText}</strong> tanggal <strong>{activeMusim.tglText}</strong> bulan <strong>{activeMusim.bulanText}</strong> tahun <strong>{activeMusim.tahunText}</strong>, kami yang bertanda tangan di bawah ini:
            </p>
            <p>
              1. <strong>SUYANTO</strong> — Ketua Gabungan Kelompok Tani &ldquo;KEDIREN MAJU&rdquo; Desa Kediren, Kec. Lembeyan, Kab. Magetan (<strong>PIHAK PERTAMA</strong>).<br />
              2. <strong>{selectedPoktan.ketua}</strong> — Ketua Kelompok Tani &ldquo;{selectedPoktan.nama_poktan}&rdquo; Desa Kediren, Kec. Lembeyan, Kab. Magetan (<strong>PIHAK KEDUA</strong>).
            </p>
            <p>
              Dengan ini PIHAK PERTAMA telah menyerahkan uang tunai dana bergulir BLM-PUAP Perguliran ke-{activeMusim.perguliran} sejumlah <strong>{formatRupiah(selectedPoktan.pinjaman_modal)}</strong> (<em>{selectedPoktan.terbilang_modal}</em>) kepada PIHAK KEDUA untuk disalurkan kepada {selectedPoktan.jumlah_anggota_resmi} orang anggota sesuai RUK dan wajib dikembalikan beserta jasa pada tanggal <strong>{activeMusim.jatuhTempo}</strong> sebesar <strong>{formatRupiah(selectedPoktan.dana_kembali)}</strong>.
            </p>

            <div className="doc-signatures-3" style={{ marginTop: '20px', marginBottom: '28px' }}>
              <div>
                <p>PIHAK KEDUA (Yang Menerima)</p>
                <p>Ketua Poktan &ldquo;{selectedPoktan.nama_poktan}&rdquo;</p>
                <div className="sig-space" />
                <p><strong><u>{selectedPoktan.ketua}</u></strong></p>
              </div>
              <div>
                <p>Mengetahui,</p>
                <p>Penyuluh Pendamping</p>
                <div className="sig-space" />
                <p><strong><u>IIS SUGIARTI, SP</u></strong></p>
                <p>NIP. 19810425 201001 2 020</p>
              </div>
              <div>
                <p>PIHAK PERTAMA (Yang Menyerahkan)</p>
                <p>Ketua Gapoktan &ldquo;KEDIREN MAJU&rdquo;</p>
                <div className="sig-space" />
                <p><strong><u>SUYANTO</u></strong></p>
              </div>
            </div>

            <hr style={{ borderTop: '2px dashed #64748b', margin: '24px 0' }} />

            <div className="doc-header-center">
              <h3>PAKTA INTEGRITAS KELOMPOK TANI &ldquo;{selectedPoktan.nama_poktan}&rdquo;</h3>
            </div>
            <p>
              Saya yang bertanda tangan di bawah ini, <strong>{selectedPoktan.ketua}</strong> selaku Ketua Kelompok Tani <strong>&ldquo;{selectedPoktan.nama_poktan}&rdquo;</strong> Desa Kediren, Kecamatan Lembeyan, Kabupaten Magetan, dalam rangka penyaluran bantuan permodalan BLM-PUAP menyatakan bahwa:
            </p>
            <ol style={{ paddingLeft: '22px', lineHeight: 1.6 }}>
              <li>Tidak akan melakukan praktek KKN dan akan melaporkan apabila terdapat indikasi penyimpangan;</li>
              <li>Menyalurkan dana BLM-PUAP sebesar <strong>{formatRupiah(selectedPoktan.pinjaman_modal)}</strong> secara bersih, transparan, dan profesional kepada seluruh anggota sesuai RUK yang disepakati;</li>
              <li>Bertanggung jawab mengkoordinir pengembalian pokok beserta jasa tepat waktu sesuai jadwal angsuran 3 musim tanam.</li>
            </ol>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <div style={{ textAlign: 'center', width: '260px' }}>
                <p>Magetan, {activeMusim.tglSurat}</p>
                <p>Ketua Kelompok Tani &ldquo;{selectedPoktan.nama_poktan}&rdquo;</p>
                <div className="sig-space" />
                <p><strong><u>{selectedPoktan.ketua}</u></strong></p>
              </div>
            </div>
          </div>
        )}

        {activeDoc === 'KWITANSI_PUAP' && (
          <div className="kwitansi-box">
            <div className="doc-header-center">
              <h2>KWITANSI / BUKTI PEMBAYARAN PENCAIRAN BLM-PUAP</h2>
              <h3>GAPOKTAN &ldquo;KEDIREN MAJU&rdquo; DESA KEDIREN KEC. LEMBEYAN KAB. MAGETAN</h3>
            </div>

            <table className="doc-meta-table" style={{ marginTop: '20px', fontSize: '15px' }}>
              <tbody>
                <tr>
                  <td width="200">Nomor Kwitansi</td>
                  <td width="15">:</td>
                  <td><strong>KWT-PUAP / {activeMusim.perguliran} / 0{selectedPoktan.id} / 2026</strong></td>
                </tr>
                <tr>
                  <td>Sudah Terima Dari</td>
                  <td>:</td>
                  <td>
                    <strong>Gabungan Kelompok Tani &ldquo;KEDIREN MAJU&rdquo; Desa Kediren, Kecamatan Lembeyan, Kabupaten Magetan, Provinsi Jawa Timur</strong>
                  </td>
                </tr>
                <tr>
                  <td>Jumlah Uang</td>
                  <td>:</td>
                  <td>
                    <span className="kwitansi-amount">{formatRupiah(selectedPoktan.pinjaman_modal)}</span>
                  </td>
                </tr>
                <tr>
                  <td>Terbilang</td>
                  <td>:</td>
                  <td>
                    <em style={{ fontWeight: 700, background: '#fef3c7', padding: '4px 10px', borderRadius: '4px' }}>
                      # {selectedPoktan.terbilang_modal} #
                    </em>
                  </td>
                </tr>
                <tr>
                  <td>Untuk Pembayaran</td>
                  <td>:</td>
                  <td>
                    Penyaluran Pinjaman Modal Usaha Kelompok Tani <strong>&ldquo;{selectedPoktan.nama_poktan}&rdquo;</strong> ({selectedPoktan.jumlah_anggota_resmi} Anggota) Desa Kediren, Kecamatan Lembeyan, Kabupaten Magetan sesuai Rencana Usaha Kelompok (RUK) Perguliran ke-{activeMusim.perguliran} ({activeMusim.periode}) yang telah disahkan oleh Gapoktan &ldquo;KEDIREN MAJU&rdquo;.
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="doc-signatures-3" style={{ marginTop: '36px' }}>
              <div>
                <p>Mengetahui,</p>
                <p>Pemberi Kuasa a.n Gapoktan</p>
                <p>&ldquo;KEDIREN MAJU&rdquo;</p>
                <div className="sig-space" />
                <p><strong><u>SUYANTO</u></strong></p>
                <p>Ketua Gapoktan</p>
              </div>
              <div>
                <p>Bendahara Gapoktan</p>
                <p>&ldquo;KEDIREN MAJU&rdquo;</p>
                <div className="sig-space" />
                <p><strong><u>H. RUSIMIN</u></strong></p>
                <p>Bendahara</p>
              </div>
              <div>
                <p>Magetan, {activeMusim.tglSurat}</p>
                <p>Yang Menerima, Kelompok Tani</p>
                <p>&ldquo;{selectedPoktan.nama_poktan}&rdquo;</p>
                <div className="sig-space" />
                <p><strong><u>{selectedPoktan.ketua}</u></strong></p>
                <p>Ketua Kelompok Tani</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
