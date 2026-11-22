'use client';

import React, { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { formatRupiah, terbilangRupiah } from '@/lib/terbilang';
import OfficialDocumentsCenter, {
  PoktanDocData,
  PetaniDocData,
} from '@/components/OfficialDocumentsCenter';
import type { LahanGisItem } from '@/components/GisMapKediren';

const GisMapKediren = dynamic(() => import('@/components/GisMapKediren'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: '520px',
        background: '#0f172a',
        color: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '10px',
        fontWeight: 700,
      }}
    >
      🛰️ Memuat Citra Satelit Hybrid &amp; Koordinat GPS Desa Kediren, Kec. Lembeyan...
    </div>
  ),
});

type MenuKey =
  | 'DASHBOARD'
  | 'POKTAN_ANGGOTA'
  | 'WEBGIS_KEDIREN'
  | 'PUAP_ANGSURAN'
  | 'DOKUMEN_DINAS'
  | 'RAT_KAS_SIMPANAN'
  | 'BLUEPRINT';

export default function SigapoktanKedirenMajuApp() {
  const [activeMenu, setActiveMenu] = useState<MenuKey>('DASHBOARD');
  const [loading, setLoading] = useState<boolean>(true);
  const [toast, setToast] = useState<string | null>(null);

  // Core Data States
  const [profile, setProfile] = useState<Record<string, unknown>>({});
  const [summary, setSummary] = useState<Record<string, unknown>>({});
  const [poktanList, setPoktanList] = useState<PoktanDocData[]>([]);
  const [komoditasStats, setKomoditasStats] = useState<Array<Record<string, unknown>>>([]);
  const [musimStats, setMusimStats] = useState<Array<Record<string, unknown>>>([]);
  const [petaniList, setPetaniList] = useState<Array<PetaniDocData & Record<string, unknown>>>([]);
  const [lahanList, setLahanList] = useState<LahanGisItem[]>([]);
  const [pinjamanList, setPinjamanList] = useState<Array<Record<string, unknown>>>([]);
  const [simpananData, setSimpananData] = useState<{
    transaksi: Array<Record<string, unknown>>;
    rekapAnggota: Array<Record<string, unknown>>;
  }>({ transaksi: [], rekapAnggota: [] });
  const [keuanganData, setKeuanganData] = useState<{
    kas: Array<Record<string, unknown>>;
    siklusTahunan: Array<Record<string, unknown>>;
    ratSummary: Record<string, unknown>;
  }>({ kas: [], siklusTahunan: [], ratSummary: {} });

  // Filters
  const [filterPoktanId, setFilterPoktanId] = useState<string>('1'); // Default Poktan Sri Mulyo so user immediately sees Supriyanto, Sutikno, Samsi, etc.
  const [searchPetani, setSearchPetani] = useState<string>('');
  const [gisPoktanFilter, setGisPoktanFilter] = useState<string>('ALL');
  const [gisKomoditasFilter, setGisKomoditasFilter] = useState<string>('ALL');
  const [selectedLahanId, setSelectedLahanId] = useState<number | null>(null);
  const [puapPoktanFilter, setPuapPoktanFilter] = useState<string>('ALL');
  const [puapMusimFilter, setPuapMusimFilter] = useState<string>('November - Maret');

  // Modals & Forms
  const [editPoktanModal, setEditPoktanModal] = useState<PoktanDocData | null>(null);
  const [showAddPetaniModal, setShowAddPetaniModal] = useState<boolean>(false);
  const [newPetaniForm, setNewPetaniForm] = useState({
    poktan_id: 1,
    nik: '',
    nama_lengkap: '',
    jenis_kelamin: 'L',
    jabatan_poktan: 'Anggota',
    rt: '06',
    rw: '01',
    dusun: 'Selungguh',
    no_hp: '08123456789',
    komoditas_utama: 'Padi',
    luas_lahan_ha: 0.5,
    is_anggota_baru: 1,
    latitude: -7.7576,
    longitude: 111.3724,
    create_puap_loan: true,
    pokok_pinjaman: 1000000,
  });

  const [newLahanForm, setNewLahanForm] = useState({
    petani_id: 1,
    luas_hektar: 0.5,
    status_lahan: 'Milik Sendiri',
    komoditas: 'Padi',
    sistem_irigasi: 'Irigasi Teknis',
    dusun_lokasi: 'Selungguh',
    blok_sawah: 'Blok Selungguh Baru',
    latitude: -7.7582,
    longitude: 111.3729,
  });

  const [newPinjamanForm, setNewPinjamanForm] = useState({
    petani_id: 1,
    perguliran_ke: 'XLIX',
    periode_musim: 'November - Maret',
    komoditas_usaha: 'Padi',
    pokok_pinjaman: 1000000,
    is_anggota_baru: false,
    tanggal_pencairan: '2026-11-17',
    tanggal_jatuh_tempo: '2027-03-29',
  });

  const [newSimpananForm, setNewSimpananForm] = useState({
    petani_id: 1,
    jenis_simpanan: 'WAJIB',
    nominal: 100000,
    keterangan: 'Setoran Simpanan Musim Tanam',
  });

  const showNotification = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const fetchAllData = useCallback(async () => {
    try {
      const [dashRes, petaniRes, lahanRes, pinjRes, simpRes, keuRes] = await Promise.all([
        fetch('/api/dashboard'),
        fetch('/api/petani'),
        fetch('/api/lahan'),
        fetch('/api/pinjaman'),
        fetch('/api/simpanan'),
        fetch('/api/keuangan'),
      ]);

      const dashJson = await dashRes.json();
      const petaniJson = await petaniRes.json();
      const lahanJson = await lahanRes.json();
      const pinjJson = await pinjRes.json();
      const simpJson = await simpRes.json();
      const keuJson = await keuRes.json();

      setProfile(dashJson.profile || {});
      setSummary(dashJson.summary || {});
      setPoktanList(dashJson.poktan || []);
      setKomoditasStats(dashJson.komoditasStats || []);
      setMusimStats(dashJson.musimStats || []);
      setPetaniList(petaniJson.petani || []);
      setLahanList(lahanJson.lahan || []);
      setPinjamanList(pinjJson.pinjaman || []);
      setSimpananData({
        transaksi: simpJson.transaksi || [],
        rekapAnggota: simpJson.rekapAnggota || [],
      });
      setKeuanganData({
        kas: keuJson.kas || [],
        siklusTahunan: keuJson.siklusTahunan || [],
        ratSummary: keuJson.ratSummary || {},
      });
    } catch (err) {
      console.error('Error loading SIGAPOKTAN data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Handlers
  const handleSavePoktan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPoktanModal) return;
    const res = await fetch('/api/poktan', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editPoktanModal),
    });
    if (res.ok) {
      showNotification(`Struktur Pengurus & Plafon Poktan ${editPoktanModal.nama_poktan} berhasil disimpan!`);
      setEditPoktanModal(null);
      fetchAllData();
    }
  };

  const handleAddPetani = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/petani', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPetaniForm),
    });
    if (res.ok) {
      showNotification(
        `Anggota ${newPetaniForm.nama_lengkap.toUpperCase()} berhasil didaftarkan! ${
          newPetaniForm.is_anggota_baru ? '(Biaya Anggota Baru Rp 10.000 tercatat ke Kas)' : ''
        }`
      );
      setShowAddPetaniModal(false);
      setNewPetaniForm({
        ...newPetaniForm,
        nik: '',
        nama_lengkap: '',
      });
      fetchAllData();
    }
  };

  const handleAddLahanGis = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/lahan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLahanForm),
    });
    if (res.ok) {
      showNotification('Petak Lahan Pertanian baru berhasil dipetakan ke WebGIS Desa Kediren!');
      fetchAllData();
    }
  };

  const handleCreatePinjaman = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/pinjaman', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPinjamanForm),
    });
    if (res.ok) {
      const jasa = (Number(newPinjamanForm.pokok_pinjaman) / 1000000) * 50000;
      showNotification(
        `Pencairan PUAP berhasil! Jasa: ${formatRupiah(jasa)} + Biaya Admin Pencairan Rp 10.000 otomatis tercatat.`
      );
      fetchAllData();
    }
  };

  const handleBayarAngsuran = async (pinj: Record<string, unknown>) => {
    const res = await fetch('/api/angsuran', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pinjaman_id: pinj.id,
        bayar_pokok: pinj.pokok_pinjaman,
        bayar_jasa: pinj.nominal_jasa,
      }),
    });
    if (res.ok) {
      showNotification(
        `Angsuran Musim (${pinj.periode_musim}) a.n ${pinj.nama_petani} sebesar ${formatRupiah(
          Number(pinj.total_kewajiban)
        )} telah LUNAS!`
      );
      fetchAllData();
    }
  };

  const handleCreateSimpanan = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/simpanan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSimpananForm),
    });
    if (res.ok) {
      showNotification('Transaksi Simpanan Anggota berhasil dicatat ke Buku Kas Gapoktan!');
      fetchAllData();
    }
  };

  // Filtered Views
  const filteredPetani = petaniList.filter((pt) => {
    const matchPoktan = filterPoktanId === 'ALL' || String(pt.poktan_id) === filterPoktanId;
    const q = searchPetani.toLowerCase();
    const matchSearch =
      !q ||
      pt.nama_lengkap.toLowerCase().includes(q) ||
      pt.no_induk.toLowerCase().includes(q) ||
      pt.jabatan_poktan.toLowerCase().includes(q) ||
      pt.dusun.toLowerCase().includes(q);
    return matchPoktan && matchSearch;
  });

  const filteredLahanGis = lahanList.filter((l) => {
    const matchPoktan = gisPoktanFilter === 'ALL' || String(l.poktan_id) === gisPoktanFilter;
    const matchKomoditas = gisKomoditasFilter === 'ALL' || l.komoditas === gisKomoditasFilter;
    return matchPoktan && matchKomoditas;
  });

  const filteredPinjaman = pinjamanList.filter((pj) => {
    const matchPoktan = puapPoktanFilter === 'ALL' || String(pj.poktan_id) === puapPoktanFilter;
    const matchMusim = puapMusimFilter === 'ALL' || pj.periode_musim === puapMusimFilter;
    return matchPoktan && matchMusim;
  });

  // Live PUAP Calculator Preview
  const previewPokok = Number(newPinjamanForm.pokok_pinjaman) || 0;
  const previewJasa = (previewPokok / 1000000) * 50000;
  const previewAdminCair = 10000;
  const previewAdminBaru = newPinjamanForm.is_anggota_baru ? 10000 : 0;
  const previewTotalKembali = previewPokok + previewJasa;

  const rat = keuanganData.ratSummary || {};
  const alokasiShuList = (rat.alokasi_shu as Array<Record<string, unknown>>) || [];
  const shuPerPoktanList = (rat.shu_per_poktan as Array<Record<string, unknown>>) || [];

  return (
    <div className="app-layout">
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '22px',
            right: '24px',
            background: '#0d2b1d',
            color: '#fff',
            padding: '12px 18px',
            borderRadius: '10px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            zIndex: 10000,
            borderLeft: '4px solid #fbbf24',
            fontWeight: 700,
            fontSize: '13.5px',
          }}
        >
          ✅ {toast}
        </div>
      )}

      {/* Left Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-badge">KABUPATEN MAGETAN</span>
          <h1>SIGAPOKTAN &ldquo;KEDIREN MAJU&rdquo;</h1>
          <p>Desa Kediren, Kec. Lembeyan</p>
        </div>

        <div className="sidebar-meta-box">
          <div>
            <span className="lbl">Ketua Gapoktan:</span>
            <span className="val">SUYANTO</span>
          </div>
          <div>
            <span className="lbl">Sekretaris:</span>
            <span className="val">SUPRIYANTO</span>
          </div>
          <div>
            <span className="lbl">Bendahara:</span>
            <span className="val">H. RUSIMIN</span>
          </div>
          <div>
            <span className="lbl">Rek. BRI Lembeyan:</span>
            <span className="val">3877-01-025711-53-9</span>
          </div>
          <div>
            <span className="lbl">Penyuluh:</span>
            <span className="val">IIS SUGIARTI, SP</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-title">Menu Utama Operasional</div>
          <button
            type="button"
            id="nav-dashboard"
            className={`nav-btn ${activeMenu === 'DASHBOARD' ? 'active' : ''}`}
            onClick={() => setActiveMenu('DASHBOARD')}
          >
            📊 Dashboard &amp; Rumus 7 Poktan
          </button>
          <button
            type="button"
            id="nav-poktan"
            className={`nav-btn ${activeMenu === 'POKTAN_ANGGOTA' ? 'active' : ''}`}
            onClick={() => setActiveMenu('POKTAN_ANGGOTA')}
          >
            👥 7 Poktan &amp; Anggota Petani
          </button>
          <button
            type="button"
            id="nav-webgis"
            className={`nav-btn ${activeMenu === 'WEBGIS_KEDIREN' ? 'active' : ''}`}
            onClick={() => setActiveMenu('WEBGIS_KEDIREN')}
          >
            🛰️ WebGIS Hybrid &amp; GPS Kediren
          </button>

          <div className="nav-section-title">Keuangan Mikro BLM-PUAP</div>
          <button
            type="button"
            id="nav-puap"
            className={`nav-btn ${activeMenu === 'PUAP_ANGSURAN' ? 'active' : ''}`}
            onClick={() => setActiveMenu('PUAP_ANGSURAN')}
          >
            💰 Pinjaman &amp; Angsuran 3 Musim
          </button>
          <button
            type="button"
            id="nav-dokumen"
            className={`nav-btn ${activeMenu === 'DOKUMEN_DINAS' ? 'active' : ''}`}
            onClick={() => setActiveMenu('DOKUMEN_DINAS')}
          >
            🖨️ Berkas Pencairan &amp; Rekom Dinas
          </button>
          <button
            type="button"
            id="nav-rat"
            className={`nav-btn ${activeMenu === 'RAT_KAS_SIMPANAN' ? 'active' : ''}`}
            onClick={() => setActiveMenu('RAT_KAS_SIMPANAN')}
          >
            📑 Laporan RAT, SHU &amp; Buku Kas
          </button>

          <div className="nav-section-title">Dokumentasi Sistem</div>
          <button
            type="button"
            id="nav-blueprint"
            className={`nav-btn ${activeMenu === 'BLUEPRINT' ? 'active' : ''}`}
            onClick={() => setActiveMenu('BLUEPRINT')}
          >
            📐 Blueprint &amp; Perancangan Sistem
          </button>
        </nav>

        <div className="sidebar-footer">
          <div>Berdiri: 14 Februari 2008</div>
          <div>Perguliran Aktif: Ke-XLIX (Nov 2026 – Mar 2027)</div>
          <div style={{ marginTop: '4px', color: '#86efac', fontWeight: 600 }}>
            Developer By Supriyanto — Sekretaris Gapoktan Kediren Maju
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        <header className="topbar">
          <div className="topbar-title">
            <h2>
              {activeMenu === 'DASHBOARD' && 'Dashboard Eksekutif & Tabel Rumus PUAP Gapoktan "KEDIREN MAJU"'}
              {activeMenu === 'POKTAN_ANGGOTA' && 'Manajemen Kelembagaan 7 Poktan & Anggota Petani Desa Kediren'}
              {activeMenu === 'WEBGIS_KEDIREN' && 'WebGIS Peta Pertanian Hybrid & GPS Desa Kediren, Kec. Lembeyan'}
              {activeMenu === 'PUAP_ANGSURAN' && 'Unit Usaha Simpan Pinjam BLM-PUAP & Angsuran 3 Musim Tanam'}
              {activeMenu === 'DOKUMEN_DINAS' && 'Pusat Cetak Berkas Pencairan PUAP & Rekomendasi Dinas TPHP Magetan'}
              {activeMenu === 'RAT_KAS_SIMPANAN' && 'Laporan RAT Tahunan, Pembagian SHU, Simpanan & Buku Kas Gapoktan'}
              {activeMenu === 'BLUEPRINT' && 'Dokumen Perancangan Sistem Informasi Gapoktan (ERD, Arsitektur & Rumus)'}
            </h2>
            <p>
              Desa Kediren, Kecamatan Lembeyan, Kabupaten Magetan — Komoditas Unggulan: Padi, Jagung &amp; Tebu
            </p>
          </div>

          <div className="topbar-badges">
            <span className="pill-badge pill-green">
              🏦 Saldo BRI: {formatRupiah(Number(summary.saldo_rekening_awal || 401462970))}
            </span>
            <span className="pill-badge pill-gold">
              🌾 Siklus Angsuran: 3x/Tahun (Mar-Jul | Jul-Nov | Nov-Mar)
            </span>
            <span className="pill-badge pill-blue">
              📌 Jasa: Rp 50.000/Jt | Admin Baru &amp; Cair: Rp 10.000
            </span>
          </div>
        </header>

        <main className="page-container">
          {loading ? (
            <div className="section-card">Memuat data Gapoktan Kediren Maju...</div>
          ) : (
            <>
              {/* ==================== 1. DASHBOARD ==================== */}
              {activeMenu === 'DASHBOARD' && (
                <div>
                  <div className="kpi-grid">
                    <div className="kpi-card highlight">
                      <span className="kpi-label">Saldo Rekening BRI Unit Lembeyan</span>
                      <div className="kpi-value">{formatRupiah(Number(summary.saldo_rekening_awal || 401462970))}</div>
                      <span className="kpi-sub">No. Rek: 3877-01-025711-53-9</span>
                    </div>

                    <div className="kpi-card">
                      <span className="kpi-label">Total Penarikan BLM-PUAP (7 Poktan)</span>
                      <div className="kpi-value" style={{ color: '#14532d' }}>
                        {formatRupiah(Number(summary.total_plafon_puap || 340000000))}
                      </div>
                      <span className="kpi-sub">
                        340 Anggota Petani &bull; Sisa Saldo BRI: {formatRupiah(Number(summary.sisa_saldo_rekening || 61462970))}
                      </span>
                    </div>

                    <div className="kpi-card">
                      <span className="kpi-label">Total Dana Kembali (Pokok + Jasa)</span>
                      <div className="kpi-value" style={{ color: '#0369a1' }}>
                        {formatRupiah(Number(summary.total_dana_kembali || 357000000))}
                      </div>
                      <span className="kpi-sub">
                        Jasa Musim (Rp 50rb/Jt): +{formatRupiah(Number(summary.total_jasa_musim || 17000000))} / Musim
                      </span>
                    </div>

                    <div className="kpi-card">
                      <span className="kpi-label">Cakupan Lahan &amp; 3 Komoditas</span>
                      <div className="kpi-value" style={{ color: '#b45309' }}>84,0 Ha</div>
                      <span className="kpi-sub">7 Poktan Desa Kediren (Padi, Jagung &amp; Tebu)</span>
                    </div>
                  </div>

                  {/* Tabel Master RUMUS 7 Poktan Sesuai Google Spreadsheet */}
                  <div className="section-card">
                    <div className="section-header">
                      <div>
                        <h3>Tabel Master Rumus &amp; Rencana Penarikan BLM-PUAP 7 Poktan Desa Kediren</h3>
                        <p>
                          Terintegrasi langsung dengan Spreadsheet <code>REKAPITULASI ANGGOTA PUAP DAN RUMUS.xlsx</code> (Perguliran ke-XLIX: 17 Nov 2026 – 29 Mar 2027)
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => setActiveMenu('DOKUMEN_DINAS')}
                        >
                          🖨️ Buka Surat Rekom Dinas TPHP &amp; RUK
                        </button>
                      </div>
                    </div>

                    <div className="table-responsive">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>No</th>
                            <th>Kelompok Tani (Poktan)</th>
                            <th>Ketua</th>
                            <th>Bendahara</th>
                            <th>Sekretaris</th>
                            <th>Saprodi &amp; Humas</th>
                            <th>Dusun / Alamat</th>
                            <th className="num">Anggota</th>
                            <th className="num">Pinjaman Modal</th>
                            <th className="num">Jasa / 1 Jt</th>
                            <th className="num">Dana Kembali</th>
                            <th className="num">Sisa Saldo BRI</th>
                          </tr>
                        </thead>
                        <tbody>
                          {poktanList.map((p, idx) => (
                            <tr key={p.id}>
                              <td>{idx + 1}</td>
                              <td>
                                <strong style={{ color: '#14532d' }}>{p.nama_poktan}</strong>
                              </td>
                              <td><strong>{p.ketua}</strong></td>
                              <td>{p.bendahara}</td>
                              <td>{p.sekretaris}</td>
                              <td>
                                <span style={{ fontSize: '11.5px', color: '#475569' }}>
                                  Saprodi: <b>{p.seksi_saprodi}</b> | Humas: <b>{p.seksi_humas}</b>
                                </span>
                              </td>
                              <td>
                                <span className="badge badge-info">{p.dusun}</span>{' '}
                                <span style={{ fontSize: '12px', color: '#64748b' }}>RT {p.rt}/RW {p.rw}</span>
                              </td>
                              <td className="num"><strong>{p.jumlah_anggota_resmi}</strong></td>
                              <td className="num">
                                <strong>{formatRupiah(p.pinjaman_modal)}</strong>
                                <div style={{ fontSize: '10.5px', color: '#64748b' }}>{p.terbilang_modal}</div>
                              </td>
                              <td className="num">{formatRupiah(p.jasa_per_juta)}</td>
                              <td className="num">
                                <strong style={{ color: '#0369a1' }}>{formatRupiah(p.dana_kembali)}</strong>
                                <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                                  Jasa: +{formatRupiah(p.total_jasa)}
                                </div>
                              </td>
                              <td className="num" style={{ fontWeight: 700 }}>
                                {formatRupiah(p.rencana_penarikan_sisa)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colSpan={7}>TOTAL KESELURUHAN 7 POKTAN GAPOKTAN &ldquo;KEDIREN MAJU&rdquo;</td>
                            <td className="num">340 Orang</td>
                            <td className="num">{formatRupiah(340000000)}</td>
                            <td className="num">Rp 50.000</td>
                            <td className="num">{formatRupiah(357000000)}</td>
                            <td className="num">Sisa: {formatRupiah(61462970)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* Grid 2 Kolom: Siklus 3x Setahun & Komoditas */}
                  <div className="grid-2">
                    <div className="section-card">
                      <div className="section-header">
                        <div>
                          <h3>Siklus Perguliran &amp; Angsuran PUAP (1 Tahun 3x Musim Tanam)</h3>
                          <p>Jadwal pencairan &amp; pengembalian dana bergulir selama 1 tahun penuh</p>
                        </div>
                      </div>
                      <div className="table-responsive">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Perguliran</th>
                              <th>Periode Musim (4 Bln)</th>
                              <th className="num">Pinjaman Pokok</th>
                              <th className="num">Jasa (Rp 50rb/Jt)</th>
                              <th className="num">Admin Cair (Rp 10rb)</th>
                              <th className="num">Total Kembali</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {musimStats.map((m, i) => (
                              <tr key={i}>
                                <td><strong>Ke-{String(m.perguliran_ke)}</strong></td>
                                <td><strong>{String(m.periode_musim)}</strong></td>
                                <td className="num">{formatRupiah(Number(m.total_pencairan))}</td>
                                <td className="num" style={{ color: '#15803d', fontWeight: 700 }}>
                                  +{formatRupiah(Number(m.total_jasa))}
                                </td>
                                <td className="num">+{formatRupiah(Number(m.total_admin_pencairan))}</td>
                                <td className="num"><strong>{formatRupiah(Number(m.total_pengembalian))}</strong></td>
                                <td>
                                  <span
                                    className={`badge ${
                                      m.status_perguliran === 'LUNAS' ? 'badge-success' : 'badge-warning'
                                    }`}
                                  >
                                    {String(m.status_perguliran)}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="section-card">
                      <div className="section-header">
                        <div>
                          <h3>Distribusi 3 Komoditas Unggulan Desa Kediren</h3>
                          <p>Pemetaan komoditas Padi, Jagung, dan Tebu beserta estimasi panen</p>
                        </div>
                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          onClick={() => setActiveMenu('WEBGIS_KEDIREN')}
                        >
                          🛰️ Lihat Peta Hybrid
                        </button>
                      </div>
                      <div className="table-responsive">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Komoditas</th>
                              <th className="num">Petak Terpetakan</th>
                              <th className="num">Luas Sampel GIS</th>
                              <th className="num">Estimasi Panen</th>
                            </tr>
                          </thead>
                          <tbody>
                            {komoditasStats.map((k, idx) => (
                              <tr key={idx}>
                                <td>
                                  <span
                                    className={`badge ${
                                      k.komoditas === 'Padi'
                                        ? 'badge-success'
                                        : k.komoditas === 'Jagung'
                                        ? 'badge-warning'
                                        : 'badge-orange'
                                    }`}
                                  >
                                    {String(k.komoditas)}
                                  </span>
                                </td>
                                <td className="num">{String(k.jumlah_petak)} Petak</td>
                                <td className="num"><strong>{String(k.total_luas_ha)} Ha</strong></td>
                                <td className="num"><strong>{String(k.total_estimasi_ton)} Ton</strong></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ==================== 2. 7 POKTAN & ANGGOTA PETANI ==================== */}
              {activeMenu === 'POKTAN_ANGGOTA' && (
                <div>
                  <div className="section-header" style={{ marginBottom: '14px' }}>
                    <div>
                      <h3>Struktur Kepengurusan Lengkap 7 Kelompok Tani (Poktan) Desa Kediren</h3>
                      <p>
                        Setiap Poktan dilengkapi Ketua, Sekretaris, Bendahara, Seksi Saprodi, Seksi Humas, dan Seksi Pengairan
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => setShowAddPetaniModal(true)}
                    >
                      ➕ Tambah Anggota Petani Baru (+Biaya Rp 10.000)
                    </button>
                  </div>

                  {/* 7 Poktan Organization Cards */}
                  <div className="poktan-cards-grid">
                    {poktanList.map((p) => (
                      <div key={p.id} className="poktan-card">
                        <div className="poktan-card-head">
                          <div>
                            <h4>POKTAN {p.nama_poktan}</h4>
                            <span>{p.alamat}</span>
                          </div>
                          <button
                            type="button"
                            className="btn-secondary btn-sm"
                            onClick={() => setEditPoktanModal({ ...p })}
                          >
                            ✏️ Edit Pengurus
                          </button>
                        </div>

                        <div className="org-grid">
                          <div className="org-item">
                            <span className="org-role">Ketua Poktan</span>
                            <span className="org-name">{p.ketua}</span>
                          </div>
                          <div className="org-item">
                            <span className="org-role">Bendahara</span>
                            <span className="org-name">{p.bendahara}</span>
                          </div>
                          <div className="org-item">
                            <span className="org-role">Sekretaris</span>
                            <span className="org-name">{p.sekretaris}</span>
                          </div>
                          <div className="org-item">
                            <span className="org-role">Seksi Saprodi</span>
                            <span className="org-name">{p.seksi_saprodi}</span>
                          </div>
                          <div className="org-item">
                            <span className="org-role">Seksi Humas</span>
                            <span className="org-name">{p.seksi_humas}</span>
                          </div>
                          <div className="org-item">
                            <span className="org-role">Seksi Pengairan</span>
                            <span className="org-name">{p.seksi_pengairan}</span>
                          </div>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '12.5px',
                            paddingTop: '4px',
                          }}
                        >
                          <span>
                            Anggota Resmi: <strong>{p.jumlah_anggota_resmi} Petani</strong>
                          </span>
                          <span>
                            Plafon PUAP: <strong style={{ color: '#14532d' }}>{formatRupiah(p.pinjaman_modal)}</strong>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Tabel Direktori Anggota Petani */}
                  <div className="section-card">
                    <div className="section-header">
                      <div>
                        <h3>Direktori Anggota Petani &amp; Pengurus Poktan</h3>
                        <p>
                          Filter per Poktan (Contoh: <strong>Poktan Sri Mulyo</strong> menampilkan Samsi, Sutikno, Agus Sutopo, Supriyanto, Samsuri, Kadirun, Seman, Doni, Amat Kasiran, Sarimin)
                        </p>
                      </div>
                      <div className="filter-bar">
                        <select
                          value={filterPoktanId}
                          onChange={(e) => setFilterPoktanId(e.target.value)}
                          className="form-select"
                        >
                          <option value="ALL">Semua 7 Poktan Desa Kediren</option>
                          {poktanList.map((p) => (
                            <option key={p.id} value={String(p.id)}>
                              Poktan {p.nama_poktan} (Dusun {p.dusun})
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          placeholder="Cari nama petani / jabatan..."
                          value={searchPetani}
                          onChange={(e) => setSearchPetani(e.target.value)}
                          className="form-input"
                        />
                      </div>
                    </div>

                    <div className="table-responsive">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>No. Induk</th>
                            <th>Nama Lengkap Petani</th>
                            <th>Kelompok Tani</th>
                            <th>Jabatan di Poktan</th>
                            <th>Dusun (RT/RW)</th>
                            <th>Komoditas</th>
                            <th className="num">Luas Lahan</th>
                            <th>Status Anggota</th>
                            <th className="num">Pinjaman Musim Aktif</th>
                            <th className="num">Total Simpanan</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPetani.map((pt) => (
                            <tr key={pt.id}>
                              <td><strong>{pt.no_induk}</strong></td>
                              <td>
                                <strong>{pt.nama_lengkap}</strong>
                                <div style={{ fontSize: '11px', color: '#64748b' }}>NIK: {pt.nik}</div>
                              </td>
                              <td>
                                <span className="badge badge-success">{pt.nama_poktan}</span>
                              </td>
                              <td><strong>{pt.jabatan_poktan}</strong></td>
                              <td>
                                Dusun {pt.dusun} (RT {pt.rt}/RW {pt.rw})
                              </td>
                              <td>
                                <span
                                  className={`badge ${
                                    pt.komoditas_utama === 'Padi'
                                      ? 'badge-success'
                                      : pt.komoditas_utama === 'Jagung'
                                      ? 'badge-warning'
                                      : 'badge-orange'
                                  }`}
                                >
                                  {pt.komoditas_utama}
                                </span>
                              </td>
                              <td className="num"><strong>{Number(pt.total_luas_ha).toFixed(2)} Ha</strong></td>
                              <td>
                                {Number(pt.is_anggota_baru) === 1 ? (
                                  <span className="badge badge-warning">
                                    Anggota Baru (Admin Rp 10.000)
                                  </span>
                                ) : (
                                  <span className="badge badge-info">Anggota Lama</span>
                                )}
                              </td>
                              <td className="num">
                                <strong>{formatRupiah(Number(pt.pinjaman_musim_aktif || 1000000))}</strong>
                              </td>
                              <td className="num">{formatRupiah(Number(pt.total_simpanan || 0))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ==================== 3. WEBGIS KEDIREN ==================== */}
              {activeMenu === 'WEBGIS_KEDIREN' && (
                <div>
                  <div className="section-card">
                    <div className="section-header">
                      <div>
                        <h3>
                          Peta WebGIS Pertanian Hybrid Desa Kediren, Kecamatan Lembeyan, Kabupaten Magetan
                        </h3>
                        <p>
                          Terintegrasi dengan Citra Satelit Hybrid, Zoom Dekat (Level 19–20), Pelacakan GPS Lapangan, dan Poligon Petak Sawah (Padi, Jagung, Tebu)
                        </p>
                      </div>

                      <div className="filter-bar">
                        <select
                          value={gisPoktanFilter}
                          onChange={(e) => setGisPoktanFilter(e.target.value)}
                          className="form-select"
                        >
                          <option value="ALL">Semua 7 Poktan</option>
                          {poktanList.map((p) => (
                            <option key={p.id} value={String(p.id)}>
                              Poktan {p.nama_poktan}
                            </option>
                          ))}
                        </select>

                        <select
                          value={gisKomoditasFilter}
                          onChange={(e) => setGisKomoditasFilter(e.target.value)}
                          className="form-select"
                        >
                          <option value="ALL">Semua Komoditas (Padi, Jagung, Tebu)</option>
                          <option value="Padi">🌾 Padi (Hijau Zamrud)</option>
                          <option value="Jagung">🌽 Jagung (Kuning Emas)</option>
                          <option value="Tebu">🎋 Tebu (Oranye Tebu)</option>
                        </select>
                      </div>
                    </div>

                    <GisMapKediren
                      lahanList={filteredLahanGis}
                      pickMode={true}
                      selectedLahanId={selectedLahanId}
                      onPickCoordinate={(lat, lng) => {
                        setNewLahanForm((prev) => ({
                          ...prev,
                          latitude: lat,
                          longitude: lng,
                        }));
                      }}
                    />
                  </div>

                  {/* Form Tambah Petak Lahan Berbasis Klik GPS Peta & Tabel Petak */}
                  <div className="grid-2">
                    <div className="section-card">
                      <div className="section-header">
                        <div>
                          <h3>Daftar Petak Lahan Pertanian Terpetakan ({filteredLahanGis.length} Petak)</h3>
                          <p>Klik tombol &ldquo;Zoom Dekat&rdquo; pada baris petak untuk memperbesar langsung ke lokasi sawah</p>
                        </div>
                      </div>
                      <div className="table-responsive">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Kode</th>
                              <th>Petani &amp; Poktan</th>
                              <th>Komoditas</th>
                              <th className="num">Luas (Ha)</th>
                              <th className="num">Est. Panen</th>
                              <th>Koordinat GPS</th>
                              <th>Aksi Peta</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredLahanGis.map((l) => (
                              <tr key={l.id}>
                                <td><strong>{l.kode_petak}</strong></td>
                                <td>
                                  <strong>{l.nama_petani}</strong>
                                  <div style={{ fontSize: '11px', color: '#14532d', fontWeight: 600 }}>
                                    Poktan {l.nama_poktan} &bull; Dusun {l.dusun_lokasi}
                                  </div>
                                </td>
                                <td>
                                  <span
                                    className={`badge ${
                                      l.komoditas === 'Padi'
                                        ? 'badge-success'
                                        : l.komoditas === 'Jagung'
                                        ? 'badge-warning'
                                        : 'badge-orange'
                                    }`}
                                  >
                                    {l.komoditas}
                                  </span>
                                </td>
                                <td className="num"><strong>{l.luas_hektar} Ha</strong></td>
                                <td className="num">{l.estimasi_panen_ton} Ton</td>
                                <td style={{ fontFamily: 'monospace', fontSize: '11.5px' }}>
                                  {l.latitude.toFixed(5)}, {l.longitude.toFixed(5)}
                                </td>
                                <td>
                                  <button
                                    type="button"
                                    className="btn-secondary btn-sm"
                                    onClick={() => setSelectedLahanId(l.id)}
                                  >
                                    🔍 Zoom Dekat
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="section-card">
                      <div className="section-header">
                        <div>
                          <h3>Registrasi Petak Lahan Baru (Integrasi Klik Peta / GPS)</h3>
                          <p>Klik titik sawah pada peta di atas untuk mengisi koordinat GPS secara otomatis</p>
                        </div>
                      </div>

                      <form onSubmit={handleAddLahanGis}>
                        <div className="form-group" style={{ marginBottom: '12px' }}>
                          <label>Pilih Anggota Petani Pemilik / Penggarap:</label>
                          <select
                            className="form-select"
                            value={newLahanForm.petani_id}
                            onChange={(e) =>
                              setNewLahanForm({ ...newLahanForm, petani_id: Number(e.target.value) })
                            }
                          >
                            {petaniList.map((pt) => (
                              <option key={pt.id} value={pt.id}>
                                {pt.nama_lengkap} — Poktan {pt.nama_poktan} (Dusun {pt.dusun})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="form-grid">
                          <div className="form-group">
                            <label>Komoditas Pertanian:</label>
                            <select
                              className="form-select"
                              value={newLahanForm.komoditas}
                              onChange={(e) =>
                                setNewLahanForm({ ...newLahanForm, komoditas: e.target.value })
                              }
                            >
                              <option value="Padi">Padi</option>
                              <option value="Jagung">Jagung</option>
                              <option value="Tebu">Tebu</option>
                            </select>
                          </div>

                          <div className="form-group">
                            <label>Luas Petak (Hektar):</label>
                            <input
                              type="number"
                              step="0.05"
                              min="0.05"
                              className="form-input"
                              value={newLahanForm.luas_hektar}
                              onChange={(e) =>
                                setNewLahanForm({
                                  ...newLahanForm,
                                  luas_hektar: Number(e.target.value),
                                })
                              }
                            />
                          </div>
                        </div>

                        <div className="form-grid">
                          <div className="form-group">
                            <label>Dusun di Desa Kediren:</label>
                            <select
                              className="form-select"
                              value={newLahanForm.dusun_lokasi}
                              onChange={(e) =>
                                setNewLahanForm({ ...newLahanForm, dusun_lokasi: e.target.value })
                              }
                            >
                              <option value="Selungguh">Dusun Selungguh</option>
                              <option value="Sekadalan">Dusun Sekadalan</option>
                              <option value="Ledok">Dusun Ledok</option>
                              <option value="Sepuntuk">Dusun Sepuntuk</option>
                              <option value="Manding">Dusun Manding</option>
                            </select>
                          </div>

                          <div className="form-group">
                            <label>Nama Blok Sawah:</label>
                            <input
                              type="text"
                              className="form-input"
                              value={newLahanForm.blok_sawah}
                              onChange={(e) =>
                                setNewLahanForm({ ...newLahanForm, blok_sawah: e.target.value })
                              }
                            />
                          </div>
                        </div>

                        <div className="form-grid">
                          <div className="form-group">
                            <label>Latitude GPS (Klik Peta):</label>
                            <input
                              type="number"
                              step="0.000001"
                              className="form-input"
                              value={newLahanForm.latitude}
                              onChange={(e) =>
                                setNewLahanForm({
                                  ...newLahanForm,
                                  latitude: Number(e.target.value),
                                })
                              }
                            />
                          </div>

                          <div className="form-group">
                            <label>Longitude GPS (Klik Peta):</label>
                            <input
                              type="number"
                              step="0.000001"
                              className="form-input"
                              value={newLahanForm.longitude}
                              onChange={(e) =>
                                setNewLahanForm({
                                  ...newLahanForm,
                                  longitude: Number(e.target.value),
                                })
                              }
                            />
                          </div>
                        </div>

                        <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                          🛰️ Simpan Petak Lahan &amp; Gambar Poligon di Peta Kediren
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {/* ==================== 4. PINJAMAN PUAP & ANGSURAN 3 MUSIM ==================== */}
              {activeMenu === 'PUAP_ANGSURAN' && (
                <div>
                  <div className="grid-2">
                    {/* Form Pencairan Pinjaman PUAP */}
                    <div className="section-card">
                      <div className="section-header">
                        <div>
                          <h3>Form Pencairan Pinjaman Modal PUAP (3 Musim Tanam / Tahun)</h3>
                          <p>
                            Rumus Otomatis: Jasa <strong>Rp 50.000 / Rp 1.000.000</strong> (1,25%/Bln &times; 4 Bln) + Biaya Admin Pencairan <strong>Rp 10.000</strong> + Anggota Baru <strong>Rp 10.000</strong>
                          </p>
                        </div>
                      </div>

                      <form onSubmit={handleCreatePinjaman}>
                        <div className="form-grid">
                          <div className="form-group">
                            <label>Pilih Anggota Petani Peminjam:</label>
                            <select
                              className="form-select"
                              value={newPinjamanForm.petani_id}
                              onChange={(e) =>
                                setNewPinjamanForm({
                                  ...newPinjamanForm,
                                  petani_id: Number(e.target.value),
                                })
                              }
                            >
                              {petaniList.map((pt) => (
                                <option key={pt.id} value={pt.id}>
                                  {pt.nama_lengkap} — Poktan {pt.nama_poktan} ({pt.jabatan_poktan})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="form-group">
                            <label>Siklus Musim Angsuran (3x Setahun):</label>
                            <select
                              className="form-select"
                              value={newPinjamanForm.periode_musim}
                              onChange={(e) => {
                                const val = e.target.value;
                                const perguliran =
                                  val === 'Maret - Juli'
                                    ? 'XLVII'
                                    : val === 'Juli - November'
                                    ? 'XLVIII'
                                    : 'XLIX';
                                setNewPinjamanForm({
                                  ...newPinjamanForm,
                                  periode_musim: val,
                                  perguliran_ke: perguliran,
                                });
                              }}
                            >
                              <option value="Maret - Juli">Musim I: Maret – Juli (4 Bulan)</option>
                              <option value="Juli - November">Musim II: Juli – November (4 Bulan)</option>
                              <option value="November - Maret">Musim III: November – Maret (4 Bulan)</option>
                            </select>
                          </div>
                        </div>

                        <div className="form-grid">
                          <div className="form-group">
                            <label>Pokok Pinjaman (Rp):</label>
                            <input
                              type="number"
                              step="500000"
                              min="500000"
                              className="form-input"
                              value={newPinjamanForm.pokok_pinjaman}
                              onChange={(e) =>
                                setNewPinjamanForm({
                                  ...newPinjamanForm,
                                  pokok_pinjaman: Number(e.target.value),
                                })
                              }
                            />
                          </div>

                          <div className="form-group">
                            <label>Komoditas Usaha Tani:</label>
                            <select
                              className="form-select"
                              value={newPinjamanForm.komoditas_usaha}
                              onChange={(e) =>
                                setNewPinjamanForm({
                                  ...newPinjamanForm,
                                  komoditas_usaha: e.target.value,
                                })
                              }
                            >
                              <option value="Padi">Padi</option>
                              <option value="Jagung">Jagung</option>
                              <option value="Tebu">Tebu</option>
                            </select>
                          </div>
                        </div>

                        <div style={{ margin: '10px 0 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="checkbox"
                            id="chk-anggota-baru"
                            checked={newPinjamanForm.is_anggota_baru}
                            onChange={(e) =>
                              setNewPinjamanForm({
                                ...newPinjamanForm,
                                is_anggota_baru: e.target.checked,
                              })
                            }
                          />
                          <label htmlFor="chk-anggota-baru" style={{ fontSize: '13px', fontWeight: 600 }}>
                            Peminjam adalah Anggota Baru (Tambah Biaya Pendaftaran Anggota Baru Rp 10.000)
                          </label>
                        </div>

                        <button type="submit" className="btn-primary">
                          💰 Proses Pencairan Pinjaman PUAP &amp; Catat Jurnal Kas
                        </button>
                      </form>
                    </div>

                    {/* Kartu Simulasi Rumus PUAP */}
                    <div className="section-card" style={{ background: '#f0fdf4', borderColor: '#86efac' }}>
                      <div className="section-header">
                        <div>
                          <h3 style={{ color: '#14532d' }}>Rincian Rumus Perhitungan PUAP</h3>
                          <p>Sesuai Ketentuan Gapoktan &ldquo;KEDIREN MAJU&rdquo; Desa Kediren</p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13.5px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Pokok Pinjaman Modal:</span>
                          <strong>{formatRupiah(previewPokok)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Tarif Jasa per Rp 1.000.000 (1,25%/Bln &times; 4 Bln):</span>
                          <strong>Rp 50.000 / Juta</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803d' }}>
                          <span>Nominal Margin / Jasa Pinjaman:</span>
                          <strong>+{formatRupiah(previewJasa)}</strong>
                        </div>
                        <hr style={{ border: 'none', borderTop: '1px dashed #86efac' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Biaya Administrasi Saat Pencairan PUAP:</span>
                          <strong>{formatRupiah(previewAdminCair)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Biaya Pendaftaran Anggota Baru:</span>
                          <strong>{formatRupiah(previewAdminBaru)}</strong>
                        </div>
                        <hr style={{ border: 'none', borderTop: '2px solid #14532d' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px' }}>
                          <strong>Total Kewajiban Pengembalian (Pokok + Jasa):</strong>
                          <strong style={{ color: '#14532d' }}>{formatRupiah(previewTotalKembali)}</strong>
                        </div>
                        <div style={{ fontSize: '12px', color: '#475569', fontStyle: 'italic' }}>
                          Terbilang: {terbilangRupiah(previewTotalKembali)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Daftar Pinjaman Anggota & Pembayaran Angsuran */}
                  <div className="section-card">
                    <div className="section-header">
                      <div>
                        <h3>Daftar Pinjaman Anggota &amp; Pembayaran Angsuran per Musim</h3>
                        <p>
                          Klik tombol <strong>&ldquo;Bayar Lunas Musim Ini&rdquo;</strong> untuk mencatat pengembalian pokok + jasa ke Buku Kas Gapoktan
                        </p>
                      </div>
                      <div className="filter-bar">
                        <select
                          value={puapMusimFilter}
                          onChange={(e) => setPuapMusimFilter(e.target.value)}
                          className="form-select"
                        >
                          <option value="ALL">Semua 3 Periode Musim</option>
                          <option value="Maret - Juli">Musim I: Maret – Juli</option>
                          <option value="Juli - November">Musim II: Juli – November</option>
                          <option value="November - Maret">Musim III: November – Maret (XLIX)</option>
                        </select>

                        <select
                          value={puapPoktanFilter}
                          onChange={(e) => setPuapPoktanFilter(e.target.value)}
                          className="form-select"
                        >
                          <option value="ALL">Semua 7 Poktan</option>
                          {poktanList.map((p) => (
                            <option key={p.id} value={String(p.id)}>
                              Poktan {p.nama_poktan}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="table-responsive">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Kode</th>
                            <th>Nama Anggota &amp; Poktan</th>
                            <th>Periode Musim (3x/Thn)</th>
                            <th>Komoditas</th>
                            <th className="num">Nilai Pinjaman</th>
                            <th className="num">Jasa (Rp 50rb/Jt)</th>
                            <th className="num">Admin Cair</th>
                            <th className="num">Total Kembali</th>
                            <th className="num">Sisa Tagihan</th>
                            <th>Status</th>
                            <th>Aksi Angsuran</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPinjaman.map((pj) => (
                            <tr key={String(pj.id)}>
                              <td><strong>{String(pj.kode_pinjaman)}</strong></td>
                              <td>
                                <strong>{String(pj.nama_petani)}</strong>
                                <div style={{ fontSize: '11px', color: '#14532d', fontWeight: 600 }}>
                                  Poktan {String(pj.nama_poktan)} ({String(pj.jabatan_poktan)})
                                </div>
                              </td>
                              <td>
                                <strong>{String(pj.periode_musim)}</strong>
                                <div style={{ fontSize: '11px', color: '#64748b' }}>
                                  Perguliran ke-{String(pj.perguliran_ke)}
                                </div>
                              </td>
                              <td>{String(pj.komoditas_usaha)}</td>
                              <td className="num">{formatRupiah(Number(pj.pokok_pinjaman))}</td>
                              <td className="num" style={{ color: '#15803d', fontWeight: 700 }}>
                                +{formatRupiah(Number(pj.nominal_jasa))}
                              </td>
                              <td className="num">{formatRupiah(Number(pj.biaya_admin_pencairan))}</td>
                              <td className="num"><strong>{formatRupiah(Number(pj.total_kewajiban))}</strong></td>
                              <td className="num" style={{ fontWeight: 700, color: Number(pj.sisa_tagihan) > 0 ? '#b45309' : '#15803d' }}>
                                {formatRupiah(Number(pj.sisa_tagihan))}
                              </td>
                              <td>
                                <span
                                  className={`badge ${
                                    pj.status === 'LUNAS' ? 'badge-success' : 'badge-warning'
                                  }`}
                                >
                                  {String(pj.status)}
                                </span>
                              </td>
                              <td>
                                {pj.status === 'AKTIF' ? (
                                  <button
                                    type="button"
                                    className="btn-primary btn-sm"
                                    onClick={() => handleBayarAngsuran(pj)}
                                  >
                                    ✅ Bayar Lunas
                                  </button>
                                ) : (
                                  <span style={{ fontSize: '12px', color: '#166534', fontWeight: 700 }}>
                                    ✔ Terbayar
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ==================== 5. BERKAS PENCAIRAN & REKOM DINAS TPHP ==================== */}
              {activeMenu === 'DOKUMEN_DINAS' && (
                <OfficialDocumentsCenter
                  profile={profile}
                  poktanList={poktanList}
                  petaniList={petaniList}
                />
              )}

              {/* ==================== 6. LAPORAN RAT TAHUNAN, SHU & BUKU KAS ==================== */}
              {activeMenu === 'RAT_KAS_SIMPANAN' && (
                <div>
                  <div className="kpi-grid">
                    <div className="kpi-card highlight">
                      <span className="kpi-label">Total Omzet Perguliran (3x Pencairan/Thn)</span>
                      <div className="kpi-value">
                        {formatRupiah(Number(rat.total_omzet_perguliran_3_musim || 1020000000))}
                      </div>
                      <span className="kpi-sub">3 Musim &times; Rp 340.000.000 (7 Poktan)</span>
                    </div>

                    <div className="kpi-card">
                      <span className="kpi-label">Pendapatan Jasa 1 Tahun (3 Musim)</span>
                      <div className="kpi-value" style={{ color: '#15803d' }}>
                        {formatRupiah(Number(rat.total_jasa_3_musim || 51000000))}
                      </div>
                      <span className="kpi-sub">3 Musim &times; Rp 17.000.000 (Rp 50.000 / Juta)</span>
                    </div>

                    <div className="kpi-card">
                      <span className="kpi-label">Pendapatan Admin Pencairan &amp; Anggota Baru</span>
                      <div className="kpi-value" style={{ color: '#0369a1' }}>
                        {formatRupiah(
                          Number(rat.total_admin_pencairan_3_musim || 10200000) +
                            Number(rat.total_biaya_anggota_baru || 40000)
                        )}
                      </div>
                      <span className="kpi-sub">
                        Admin Cair (Rp 10rb): {formatRupiah(Number(rat.total_admin_pencairan_3_musim || 10200000))} | Anggota Baru: {formatRupiah(Number(rat.total_biaya_anggota_baru || 40000))}
                      </span>
                    </div>

                    <div className="kpi-card">
                      <span className="kpi-label">SHU Bersih Tahunan (Siap Dibagikan di RAT)</span>
                      <div className="kpi-value" style={{ color: '#b45309' }}>
                        {formatRupiah(Number(rat.shu_bersih_tahunan || 57000000))}
                      </div>
                      <span className="kpi-sub">Setelah dikurangi biaya operasional RAT &amp; ATK</span>
                    </div>
                  </div>

                  {/* Laporan Pencairan 1 Tahun 3x & Alokasi SHU RAT */}
                  <div className="section-card">
                    <div className="section-header">
                      <div>
                        <h3>
                          Laporan Pertanggungjawaban Rapat Anggota Tahunan (RAT) — Rekap Pencairan 1 Tahun 3x
                        </h3>
                        <p>
                          Rekapitulasi Perguliran Musim I (Maret–Juli), Musim II (Juli–November), dan Musim III (November–Maret)
                        </p>
                      </div>
                      <button type="button" className="btn-primary" onClick={() => window.print()}>
                        🖨️ Cetak Laporan RAT Tahunan
                      </button>
                    </div>

                    <div className="table-responsive">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Termin</th>
                            <th>Perguliran Ke</th>
                            <th>Periode Musim Tanam</th>
                            <th>Tgl Pencairan</th>
                            <th>Jatuh Tempo</th>
                            <th className="num">Jml Anggota</th>
                            <th className="num">Dana Disalurkan</th>
                            <th className="num">Pendapatan Jasa (5%)</th>
                            <th className="num">Admin Pencairan (Rp 10rb)</th>
                            <th className="num">Total Kembali</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {keuanganData.siklusTahunan.map((s, idx) => (
                            <tr key={idx}>
                              <td><strong>Termin {String(s.termin)}</strong></td>
                              <td><strong>{String(s.perguliran_ke)}</strong></td>
                              <td><strong>{String(s.periode_musim)}</strong></td>
                              <td>{String(s.tanggal_pencairan)}</td>
                              <td>{String(s.tanggal_jatuh_tempo)}</td>
                              <td className="num">{String(s.jumlah_anggota)} Orang</td>
                              <td className="num">{formatRupiah(Number(s.dana_disalurkan))}</td>
                              <td className="num" style={{ color: '#15803d', fontWeight: 700 }}>
                                +{formatRupiah(Number(s.pendapatan_jasa))}
                              </td>
                              <td className="num">+{formatRupiah(Number(s.pendapatan_admin_pencairan))}</td>
                              <td className="num"><strong>{formatRupiah(Number(s.total_dana_kembali))}</strong></td>
                              <td>
                                <span className="badge badge-success">{String(s.status)}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colSpan={6}>TOTAL AKUMULASI 1 TAHUN (3X PENCAIRAN)</td>
                            <td className="num">{formatRupiah(1020000000)}</td>
                            <td className="num">{formatRupiah(51000000)}</td>
                            <td className="num">{formatRupiah(10200000)}</td>
                            <td className="num">{formatRupiah(1071000000)}</td>
                            <td>RAT 2026</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* Distribusi SHU per Poktan & Alokasi SHU */}
                  <div className="grid-2">
                    <div className="section-card">
                      <div className="section-header">
                        <div>
                          <h3>Pembagian SHU Tahunan per Kelompok Tani (7 Poktan)</h3>
                          <p>Perhitungan proporsional berdasarkan kontribusi jasa dan keanggotaan</p>
                        </div>
                      </div>
                      <div className="table-responsive">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Kelompok Tani</th>
                              <th>Ketua</th>
                              <th className="num">Anggota</th>
                              <th className="num">Setoran Jasa (3 Musim)</th>
                              <th className="num">Admin Cair (3 Musim)</th>
                              <th className="num">Alokasi SHU Poktan</th>
                            </tr>
                          </thead>
                          <tbody>
                            {shuPerPoktanList.map((sp, i) => (
                              <tr key={i}>
                                <td><strong>{String(sp.nama_poktan)}</strong></td>
                                <td>{String(sp.ketua)}</td>
                                <td className="num">{String(sp.jumlah_anggota)}</td>
                                <td className="num">{formatRupiah(Number(sp.jasa_disetor_3_musim))}</td>
                                <td className="num">{formatRupiah(Number(sp.admin_pencairan_3_musim))}</td>
                                <td className="num" style={{ color: '#14532d', fontWeight: 800 }}>
                                  {formatRupiah(Number(sp.alokasi_shu_poktan))}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="section-card">
                      <div className="section-header">
                        <div>
                          <h3>Alokasi Sisa Hasil Usaha (SHU) Gapoktan &ldquo;KEDIREN MAJU&rdquo;</h3>
                          <p>Distribusi laba bersih tahun buku 2026</p>
                        </div>
                      </div>
                      <div className="table-responsive">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Pos Alokasi SHU RAT</th>
                              <th className="num">Porsi (%)</th>
                              <th className="num">Nominal (Rp)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {alokasiShuList.map((a, i) => (
                              <tr key={i}>
                                <td><strong>{String(a.nama)}</strong></td>
                                <td className="num">{String(a.persen)}%</td>
                                <td className="num"><strong>{formatRupiah(Number(a.nominal))}</strong></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Buku Kas & Simpanan Anggota */}
                  <div className="grid-2">
                    <div className="section-card">
                      <div className="section-header">
                        <div>
                          <h3>Jurnal Buku Kas Umum Gapoktan &ldquo;KEDIREN MAJU&rdquo;</h3>
                          <p>Catatan keluar-masuk dana BLM-PUAP, Jasa Rp 50rb/Jt, Admin Cair Rp 10rb &amp; Anggota Baru Rp 10rb</p>
                        </div>
                      </div>
                      <div className="table-responsive">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Tanggal</th>
                              <th>Musim</th>
                              <th>Kategori</th>
                              <th>Uraian Transaksi</th>
                              <th>Tipe</th>
                              <th className="num">Nominal (Rp)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {keuanganData.kas.map((k) => (
                              <tr key={String(k.id)}>
                                <td>{String(k.tanggal)}</td>
                                <td><span className="badge badge-info">{String(k.periode_musim)}</span></td>
                                <td><strong>{String(k.kategori)}</strong></td>
                                <td>{String(k.deskripsi)}</td>
                                <td>
                                  <span
                                    className={`badge ${
                                      k.tipe === 'MASUK' ? 'badge-success' : 'badge-orange'
                                    }`}
                                  >
                                    {String(k.tipe)}
                                  </span>
                                </td>
                                <td className="num">
                                  <strong>{formatRupiah(Number(k.nominal))}</strong>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="section-card">
                      <div className="section-header">
                        <div>
                          <h3>Input Simpanan Anggota (Pokok, Wajib, Sukarela)</h3>
                          <p>Setoran tabungan anggota otomatis menambah kas simpanan Gapoktan</p>
                        </div>
                      </div>
                      <form onSubmit={handleCreateSimpanan}>
                        <div className="form-group" style={{ marginBottom: '12px' }}>
                          <label>Pilih Anggota Petani:</label>
                          <select
                            className="form-select"
                            value={newSimpananForm.petani_id}
                            onChange={(e) =>
                              setNewSimpananForm({
                                ...newSimpananForm,
                                petani_id: Number(e.target.value),
                              })
                            }
                          >
                            {petaniList.map((pt) => (
                              <option key={pt.id} value={pt.id}>
                                {pt.nama_lengkap} — Poktan {pt.nama_poktan}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="form-grid">
                          <div className="form-group">
                            <label>Jenis Simpanan:</label>
                            <select
                              className="form-select"
                              value={newSimpananForm.jenis_simpanan}
                              onChange={(e) =>
                                setNewSimpananForm({
                                  ...newSimpananForm,
                                  jenis_simpanan: e.target.value,
                                })
                              }
                            >
                              <option value="POKOK">Simpanan Pokok</option>
                              <option value="WAJIB">Simpanan Wajib</option>
                              <option value="SUKARELA">Simpanan Sukarela</option>
                              <option value="PENARIKAN">Penarikan Simpanan</option>
                            </select>
                          </div>

                          <div className="form-group">
                            <label>Nominal (Rp):</label>
                            <input
                              type="number"
                              step="10000"
                              className="form-input"
                              value={newSimpananForm.nominal}
                              onChange={(e) =>
                                setNewSimpananForm({
                                  ...newSimpananForm,
                                  nominal: Number(e.target.value),
                                })
                              }
                            />
                          </div>
                        </div>

                        <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                          💾 Catat Transaksi Simpanan Anggota
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {/* ==================== 7. BLUEPRINT PERANCANGAN SISTEM ==================== */}
              {activeMenu === 'BLUEPRINT' && (
                <div>
                  <div className="section-card">
                    <div className="section-header">
                      <div>
                        <h3>Dokumen Spesifikasi Perancangan Sistem Informasi Gapoktan &ldquo;KEDIREN MAJU&rdquo;</h3>
                        <p>
                          Ringkasan Arsitektur Sistem, Skema Basis Data Relasional, Rumus Bisnis BLM-PUAP, dan Spesifikasi WebGIS Desa Kediren
                        </p>
                      </div>
                    </div>

                    <div className="grid-equal-2">
                      <div style={{ background: '#f8fafc', padding: '18px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                        <h4 style={{ color: '#14532d', marginBottom: '10px' }}>
                          1. Rumus &amp; Aturan Bisnis Unit Usaha PUAP
                        </h4>
                        <ul style={{ paddingLeft: '18px', fontSize: '13.5px', lineHeight: 1.7 }}>
                          <li>
                            <strong>Saldo Rekening BRI Unit Lembeyan (`3877-01-025711-53-9`)</strong>: Rp 401.462.970,-
                          </li>
                          <li>
                            <strong>Alokasi Penarikan 7 Poktan (340 Anggota)</strong>: Rp 340.000.000,- (Sisa Saldo Rekening: Rp 61.462.970,-)
                          </li>
                          <li>
                            <strong>Jasa Pinjaman PUAP</strong>: <code>Rp 50.000</code> per <code>Rp 1.000.000</code> pinjaman per musim tanam 4 bulan (setara <code>1,25% / bulan</code> atau <code>5% / musim</code>).
                          </li>
                          <li>
                            <strong>Biaya Pendaftaran Anggota Baru</strong>: <code>Rp 10.000</code> per anggota baru.
                          </li>
                          <li>
                            <strong>Biaya Administrasi Pencairan PUAP</strong>: <code>Rp 10.000</code> setiap kali pencairan pinjaman.
                          </li>
                          <li>
                            <strong>Siklus Angsuran 1 Tahun 3x Musim Tanam</strong>:
                            <br />
                            &bull; Musim I: <strong>Maret – Juli</strong> (4 Bulan)
                            <br />
                            &bull; Musim II: <strong>Juli – November</strong> (4 Bulan)
                            <br />
                            &bull; Musim III: <strong>November – Maret</strong> (4 Bulan)
                          </li>
                        </ul>
                      </div>

                      <div style={{ background: '#f8fafc', padding: '18px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                        <h4 style={{ color: '#14532d', marginBottom: '10px' }}>
                          2. Spesifikasi WebGIS Hybrid &amp; Struktur 7 Poktan
                        </h4>
                        <ul style={{ paddingLeft: '18px', fontSize: '13.5px', lineHeight: 1.7 }}>
                          <li>
                            <strong>Lokasi Geografis</strong>: Desa Kediren, Kecamatan Lembeyan, Kabupaten Magetan (`-7.7592° S, 111.3732° E`), meliputi Dusun Selungguh, Sekadalan, Ledok, Sepuntuk, dan Manding.
                          </li>
                          <li>
                            <strong>Peta Hybrid &amp; Zoom Dekat</strong>: Menggabungkan Citra Satelit resolusi tinggi dengan label jalan/dusun hingga <strong>Zoom Level 20</strong> disertai pelacakan GPS real-time.
                          </li>
                          <li>
                            <strong>3 Komoditas Utama</strong>: <strong>Padi</strong> (Hijau Zamrud), <strong>Jagung</strong> (Kuning Emas), dan <strong>Tebu</strong> (Oranye Tebu).
                          </li>
                          <li>
                            <strong>Struktur Kepengurusan Internal 7 Poktan</strong>: Ketua, Sekretaris, Bendahara, Seksi Saprodi, Seksi Humas, Seksi Pengairan, dan Anggota pada Poktan <em>Sri Mulyo, Tani Maju, Sidodadi, Sri Rejeki, Kledokan, Puntuk Asri,</em> dan <em>Cindelaras</em>.
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Modal Edit Pengurus Poktan */}
      {editPoktanModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Edit Struktur Pengurus &amp; Plafon — POKTAN {editPoktanModal.nama_poktan}</h3>
            <form onSubmit={handleSavePoktan}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Ketua Poktan:</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editPoktanModal.ketua}
                    onChange={(e) =>
                      setEditPoktanModal({ ...editPoktanModal, ketua: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Bendahara Poktan:</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editPoktanModal.bendahara}
                    onChange={(e) =>
                      setEditPoktanModal({ ...editPoktanModal, bendahara: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Sekretaris Poktan:</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editPoktanModal.sekretaris}
                    onChange={(e) =>
                      setEditPoktanModal({ ...editPoktanModal, sekretaris: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Seksi Saprodi:</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editPoktanModal.seksi_saprodi}
                    onChange={(e) =>
                      setEditPoktanModal({ ...editPoktanModal, seksi_saprodi: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Seksi Humas:</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editPoktanModal.seksi_humas}
                    onChange={(e) =>
                      setEditPoktanModal({ ...editPoktanModal, seksi_humas: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Seksi Pengairan / Irigasi:</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editPoktanModal.seksi_pengairan}
                    onChange={(e) =>
                      setEditPoktanModal({ ...editPoktanModal, seksi_pengairan: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Jumlah Anggota Resmi:</label>
                  <input
                    type="number"
                    className="form-input"
                    value={editPoktanModal.jumlah_anggota_resmi}
                    onChange={(e) =>
                      setEditPoktanModal({
                        ...editPoktanModal,
                        jumlah_anggota_resmi: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Pinjaman Modal PUAP (Rp):</label>
                  <input
                    type="number"
                    step="1000000"
                    className="form-input"
                    value={editPoktanModal.pinjaman_modal}
                    onChange={(e) =>
                      setEditPoktanModal({
                        ...editPoktanModal,
                        pinjaman_modal: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setEditPoktanModal(null)}
                >
                  Batal
                </button>
                <button type="submit" className="btn-primary">
                  💾 Simpan Perubahan Poktan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah Anggota Petani Baru */}
      {showAddPetaniModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Registrasi Anggota Petani &amp; Pengurus Poktan Baru</h3>
            <form onSubmit={handleAddPetani}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Kelompok Tani (Poktan):</label>
                  <select
                    className="form-select"
                    value={newPetaniForm.poktan_id}
                    onChange={(e) =>
                      setNewPetaniForm({ ...newPetaniForm, poktan_id: Number(e.target.value) })
                    }
                  >
                    {poktanList.map((p) => (
                      <option key={p.id} value={p.id}>
                        Poktan {p.nama_poktan} (Dusun {p.dusun})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Nama Lengkap Petani:</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: SUPRIYANTO"
                    className="form-input"
                    value={newPetaniForm.nama_lengkap}
                    onChange={(e) =>
                      setNewPetaniForm({ ...newPetaniForm, nama_lengkap: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Jabatan di Poktan:</label>
                  <select
                    className="form-select"
                    value={newPetaniForm.jabatan_poktan}
                    onChange={(e) =>
                      setNewPetaniForm({ ...newPetaniForm, jabatan_poktan: e.target.value })
                    }
                  >
                    <option value="Anggota">Anggota</option>
                    <option value="Ketua">Ketua</option>
                    <option value="Sekretaris">Sekretaris</option>
                    <option value="Bendahara">Bendahara</option>
                    <option value="Seksi Saprodi">Seksi Saprodi</option>
                    <option value="Seksi Humas">Seksi Humas</option>
                    <option value="Seksi Pengairan">Seksi Pengairan</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Komoditas Utama:</label>
                  <select
                    className="form-select"
                    value={newPetaniForm.komoditas_utama}
                    onChange={(e) =>
                      setNewPetaniForm({ ...newPetaniForm, komoditas_utama: e.target.value })
                    }
                  >
                    <option value="Padi">Padi</option>
                    <option value="Jagung">Jagung</option>
                    <option value="Tebu">Tebu</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Luas Lahan (Ha):</label>
                  <input
                    type="number"
                    step="0.05"
                    className="form-input"
                    value={newPetaniForm.luas_lahan_ha}
                    onChange={(e) =>
                      setNewPetaniForm({
                        ...newPetaniForm,
                        luas_lahan_ha: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Status Keanggotaan:</label>
                  <select
                    className="form-select"
                    value={newPetaniForm.is_anggota_baru}
                    onChange={(e) =>
                      setNewPetaniForm({
                        ...newPetaniForm,
                        is_anggota_baru: Number(e.target.value),
                      })
                    }
                  >
                    <option value={1}>Anggota Baru (Bayar Rp 10.000)</option>
                    <option value={0}>Anggota Lama</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowAddPetaniModal(false)}
                >
                  Batal
                </button>
                <button type="submit" className="btn-primary">
                  ✅ Daftarkan Anggota &amp; Petakan Lahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
