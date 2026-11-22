'use client';

import React, { useEffect, useRef, useState } from 'react';
import type LType from 'leaflet';

export interface LahanGisItem {
  id: number;
  petani_id: number;
  poktan_id: number;
  kode_petak: string;
  luas_hektar: number;
  status_lahan: string;
  komoditas: 'Padi' | 'Jagung' | 'Tebu';
  sistem_irigasi: string;
  estimasi_panen_ton: number;
  dusun_lokasi: string;
  blok_sawah: string;
  latitude: number;
  longitude: number;
  polygon: [number, number][];
  nama_petani: string;
  no_induk: string;
  jabatan_poktan: string;
  nama_poktan: string;
}

interface GisMapKedirenProps {
  lahanList: LahanGisItem[];
  pickMode?: boolean;
  onPickCoordinate?: (lat: number, lng: number) => void;
  selectedLahanId?: number | null;
  height?: string;
}

const COMMODITY_COLORS: Record<string, { stroke: string; fill: string; badge: string }> = {
  Padi: { stroke: '#059669', fill: '#10b981', badge: 'Hijau (Padi)' },
  Jagung: { stroke: '#d97706', fill: '#f59e0b', badge: 'Kuning Emas (Jagung)' },
  Tebu: { stroke: '#c2410c', fill: '#ea580c', badge: 'Oranye Tebu (Tebu)' },
};

// Pusat Desa Kediren, Kecamatan Lembeyan, Kabupaten Magetan
const KEDIREN_CENTER: [number, number] = [-7.7592, 111.3732];

export default function GisMapKediren({
  lahanList,
  pickMode = false,
  onPickCoordinate,
  selectedLahanId = null,
  height = '540px',
}: GisMapKedirenProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<LType.Map | null>(null);
  const layerGroupRef = useRef<LType.LayerGroup | null>(null);
  const pickedMarkerRef = useRef<LType.Marker | null>(null);
  const tileLayersRef = useRef<Record<string, LType.Layer>>({});

  const [baseMode, setBaseMode] = useState<'hybrid' | 'satellite' | 'street'>('hybrid');
  const [currentZoom, setCurrentZoom] = useState<number>(16);
  const [gpsStatus, setGpsStatus] = useState<string>('Siap (GPS Desa Kediren -7.7592°, 111.3732°)');
  const [cursorCoord, setCursorCoord] = useState<{ lat: number; lng: number }>({
    lat: KEDIREN_CENTER[0],
    lng: KEDIREN_CENTER[1],
  });

  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!mapContainerRef.current || mapInstanceRef.current) return;

      const L = (await import('leaflet')).default;

      if (!isMounted || !mapContainerRef.current) return;

      const map = L.map(mapContainerRef.current, {
        center: KEDIREN_CENTER,
        zoom: 16,
        minZoom: 12,
        maxZoom: 20, // Zoom dekat hingga level petak sawah
        zoomControl: true,
      });

      // Google Hybrid (Satellite + Roads/Village Labels) supports native zoom up to 20
      const googleHybrid = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        maxNativeZoom: 20,
        attribution: '&copy; Citra Satelit Hybrid Desa Kediren, Kec. Lembeyan, Kab. Magetan',
      });

      // Esri World Imagery + Labels Hybrid Fallback / Alternative Satellite
      const googleSatellite = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        maxNativeZoom: 20,
        attribution: '&copy; Citra Satelit Murni Desa Kediren, Lembeyan',
      });

      // OpenStreetMap Street / Topographic
      const osmStreet = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 20,
        maxNativeZoom: 19,
        attribution: '&copy; OpenStreetMap Desa Kediren, Kec. Lembeyan',
      });

      googleHybrid.addTo(map);

      tileLayersRef.current = {
        hybrid: googleHybrid,
        satellite: googleSatellite,
        street: osmStreet,
      };

      const fg = L.layerGroup().addTo(map);
      layerGroupRef.current = fg;
      mapInstanceRef.current = map;

      map.on('zoomend', () => {
        setCurrentZoom(map.getZoom());
      });

      map.on('mousemove', (e: LType.LeafletMouseEvent) => {
        setCursorCoord({
          lat: Number(e.latlng.lat.toFixed(6)),
          lng: Number(e.latlng.lng.toFixed(6)),
        });
      });

      // Boundary / Landmark Balai Desa Kediren
      const balaiIcon = L.divIcon({
        className: 'gis-balai-marker',
        html: `<div style="background:#14532d;color:#fff;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:700;border:2px solid #fbbf24;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.4);">🏛️ Sekretariat Gapoktan "KEDIREN MAJU"</div>`,
        iconSize: [230, 26],
        iconAnchor: [115, 13],
      });
      L.marker([-7.7592, 111.3732], { icon: balaiIcon })
        .addTo(map)
        .bindPopup(
          `<div style="font-family:sans-serif;line-height:1.4">
            <strong>GAPOKTAN "KEDIREN MAJU"</strong><br/>
            Desa Kediren, Kec. Lembeyan, Kab. Magetan<br/>
            Ketua: <b>SUYANTO</b> | Sekretaris: <b>SUPRIYANTO</b> | Bendahara: <b>H. RUSIMIN</b><br/>
            Koordinat GPS: <code>-7.759200, 111.373200</code>
          </div>`
        );
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Handle click in pickMode
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleMapClick = async (e: LType.LeafletMouseEvent) => {
      if (!pickMode && !onPickCoordinate) return;
      const lat = Number(e.latlng.lat.toFixed(6));
      const lng = Number(e.latlng.lng.toFixed(6));
      if (onPickCoordinate) {
        onPickCoordinate(lat, lng);
      }
      setGpsStatus(`Titik Sawah Dipilih: ${lat}, ${lng}`);

      const L = (await import('leaflet')).default;
      if (pickedMarkerRef.current) {
        pickedMarkerRef.current.setLatLng([lat, lng]);
      } else {
        const pinIcon = L.divIcon({
          className: 'gis-picked-pin',
          html: `<div style="background:#dc2626;color:#fff;padding:3px 8px;border-radius:999px;font-size:11px;font-weight:700;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.45);white-space:nowrap;">📍 Titik GPS Baru (${lat}, ${lng})</div>`,
          iconSize: [210, 26],
          iconAnchor: [105, 13],
        });
        pickedMarkerRef.current = L.marker([lat, lng], { icon: pinIcon }).addTo(map);
      }
    };

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [pickMode, onPickCoordinate]);

  // Switch Base Layer (Hybrid / Satellite / Street)
  const handleSwitchLayer = (mode: 'hybrid' | 'satellite' | 'street') => {
    const map = mapInstanceRef.current;
    if (!map) return;
    Object.values(tileLayersRef.current).forEach((layer) => {
      if (map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
    });
    const target = tileLayersRef.current[mode];
    if (target) {
      target.addTo(map);
    }
    setBaseMode(mode);
  };

  // Render polygons & plot labels
  useEffect(() => {
    async function renderPlots() {
      const map = mapInstanceRef.current;
      const fg = layerGroupRef.current;
      if (!map || !fg) return;

      const L = (await import('leaflet')).default;
      fg.clearLayers();

      lahanList.forEach((item) => {
        const colors = COMMODITY_COLORS[item.komoditas] || COMMODITY_COLORS.Padi;
        const isSelected = selectedLahanId === item.id;

        if (item.polygon && item.polygon.length >= 3) {
          const poly = L.polygon(item.polygon, {
            color: isSelected ? '#ffffff' : colors.stroke,
            weight: isSelected ? 3.5 : 2,
            fillColor: colors.fill,
            fillOpacity: isSelected ? 0.65 : 0.42,
          }).addTo(fg);

          poly.bindPopup(`
            <div style="font-family:sans-serif;min-width:230px;line-height:1.45">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                <span style="background:${colors.fill};color:#fff;padding:2px 8px;border-radius:4px;font-weight:700;font-size:11px;">
                  ${item.komoditas.toUpperCase()}
                </span>
                <span style="font-size:11px;color:#475569;font-weight:600;">${item.kode_petak}</span>
              </div>
              <div style="font-weight:700;font-size:14px;color:#0f172a;">${item.nama_petani}</div>
              <div style="font-size:12px;color:#14532d;font-weight:600;margin-bottom:6px;">
                Poktan ${item.nama_poktan} (${item.jabatan_poktan})
              </div>
              <table style="width:100%;font-size:12px;border-collapse:collapse;">
                <tr><td style="color:#64748b;padding:2px 0;">Blok / Dusun:</td><td style="font-weight:600;text-align:right;">${item.blok_sawah} (${item.dusun_lokasi})</td></tr>
                <tr><td style="color:#64748b;padding:2px 0;">Luas Petak:</td><td style="font-weight:700;text-align:right;">${item.luas_hektar} Ha (${(item.luas_hektar * 10000).toLocaleString('id-ID')} m²)</td></tr>
                <tr><td style="color:#64748b;padding:2px 0;">Estimasi Panen:</td><td style="font-weight:700;text-align:right;color:#047857;">${item.estimasi_panen_ton} Ton</td></tr>
                <tr><td style="color:#64748b;padding:2px 0;">Irigasi:</td><td style="text-align:right;">${item.sistem_irigasi}</td></tr>
                <tr><td style="color:#64748b;padding:2px 0;">GPS:</td><td style="font-family:monospace;font-size:11px;text-align:right;">${item.latitude.toFixed(5)}, ${item.longitude.toFixed(5)}</td></tr>
              </table>
            </div>
          `);
        }

        // Center tag marker for each plot
        const labelIcon = L.divIcon({
          className: 'gis-plot-label',
          html: `<div style="background:${colors.stroke};color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;border:1px solid rgba(255,255,255,0.85);white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.4);">
            ${item.nama_petani} (${item.komoditas} ${item.luas_hektar}Ha)
          </div>`,
          iconSize: [140, 20],
          iconAnchor: [70, 10],
        });

        L.marker([item.latitude, item.longitude], { icon: labelIcon }).addTo(fg);
      });

      if (selectedLahanId) {
        const target = lahanList.find((x) => x.id === selectedLahanId);
        if (target) {
          map.setView([target.latitude, target.longitude], 19, { animate: true });
        }
      }
    }

    renderPlots();
  }, [lahanList, selectedLahanId]);

  const handleLocateGps = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!navigator.geolocation) {
      setGpsStatus('GPS browser tidak tersedia — Fokus ke Pusat Sawah Desa Kediren');
      map.setView(KEDIREN_CENTER, 18, { animate: true });
      return;
    }

    setGpsStatus('Melacak sinyal satelit GPS...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setGpsStatus(`GPS Terkunci: ${lat}, ${lng} (Akurasi ±${Math.round(pos.coords.accuracy)}m)`);
        map.setView([lat, lng], 19, { animate: true });
        if (onPickCoordinate) {
          onPickCoordinate(lat, lng);
        }
      },
      () => {
        // Fallback if browser blocks geolocation or user is far away -> Zoom close to Desa Kediren Poktan Sri Mulyo plot
        setGpsStatus('Mode Simulasi GPS Lapangan Desa Kediren (-7.7574°, 111.3721°) Zoom Dekat');
        map.setView([-7.7574, 111.3721], 19, { animate: true });
        if (onPickCoordinate) {
          onPickCoordinate(-7.7574, 111.3721);
        }
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  const handleZoomToDusun = (lat: number, lng: number, zoom: number, label: string) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.setView([lat, lng], zoom, { animate: true });
    setGpsStatus(`Fokus Wilayah: ${label} (${lat}, ${lng})`);
  };

  return (
    <div className="gis-wrapper">
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossOrigin=""
      />

      {/* Top GIS Control Toolbar */}
      <div className="gis-toolbar">
        <div className="gis-toolbar-group">
          <span className="gis-toolbar-label">Mode Peta:</span>
          <button
            type="button"
            onClick={() => handleSwitchLayer('hybrid')}
            className={`gis-btn ${baseMode === 'hybrid' ? 'active' : ''}`}
          >
            🛰️ Satelit Hybrid (Jalan & Label)
          </button>
          <button
            type="button"
            onClick={() => handleSwitchLayer('satellite')}
            className={`gis-btn ${baseMode === 'satellite' ? 'active' : ''}`}
          >
            🌍 Satelit Murni
          </button>
          <button
            type="button"
            onClick={() => handleSwitchLayer('street')}
            className={`gis-btn ${baseMode === 'street' ? 'active' : ''}`}
          >
            🗺️ Peta Jalan / Topografi
          </button>
        </div>

        <div className="gis-toolbar-group">
          <span className="gis-toolbar-label">Zoom Cepat Dusun Kediren:</span>
          <button
            type="button"
            onClick={() => handleZoomToDusun(-7.7574, 111.3721, 18, 'Dusun Selungguh (Sri Mulyo & Tani Maju)')}
            className="gis-btn"
          >
            Dusun Selungguh
          </button>
          <button
            type="button"
            onClick={() => handleZoomToDusun(-7.7603, 111.3761, 18, 'Dusun Sekadalan (Sidodadi & Sri Rejeki)')}
            className="gis-btn"
          >
            Dusun Sekadalan
          </button>
          <button
            type="button"
            onClick={() => handleZoomToDusun(-7.7628, 111.3735, 18, 'Dusun Ledok (Kledokan & Puntuk Asri)')}
            className="gis-btn"
          >
            Dusun Ledok
          </button>
          <button
            type="button"
            onClick={() => handleZoomToDusun(-7.7562, 111.3692, 18, 'Dusun Sepuntuk (Cindelaras)')}
            className="gis-btn"
          >
            Dusun Sepuntuk
          </button>
          <button
            type="button"
            onClick={() => handleZoomToDusun(-7.7574, 111.3721, 19, 'Zoom Dekat Petak Sawah (Level 19)')}
            className="gis-btn gis-btn-accent"
          >
            🔍 Zoom Dekat (Lv.19)
          </button>
          <button type="button" onClick={handleLocateGps} className="gis-btn gis-btn-gps">
            📡 Ambil Titik GPS
          </button>
        </div>
      </div>

      {/* Map Canvas */}
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height,
          borderRadius: '10px',
          overflow: 'hidden',
          border: '1px solid #cbd5e1',
          zIndex: 1,
        }}
      />

      {/* Footer Legend & Real-time GPS Status Bar */}
      <div className="gis-statusbar">
        <div className="gis-legend">
          <span className="gis-legend-item">
            <span className="gis-dot" style={{ background: '#10b981' }} /> Padi
          </span>
          <span className="gis-legend-item">
            <span className="gis-dot" style={{ background: '#f59e0b' }} /> Jagung
          </span>
          <span className="gis-legend-item">
            <span className="gis-dot" style={{ background: '#ea580c' }} /> Tebu
          </span>
          <span className="gis-zoom-pill">Zoom Level: {currentZoom}/20</span>
        </div>
        <div className="gis-coord-readout">
          <span>{gpsStatus}</span>
          <span className="gis-cursor-pill">
            Kursor GPS: {cursorCoord.lat}, {cursorCoord.lng}
          </span>
        </div>
      </div>
    </div>
  );
}
