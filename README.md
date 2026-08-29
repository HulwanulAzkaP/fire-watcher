# Fire Watcher Indonesia — Karhutla & Titik Panas Nusantara

Platform pantauan **kebakaran hutan dan lahan (Karhutla)** Indonesia real-time. Menggabungkan data satelit NASA FIRMS (VIIRS 375m / MODIS), kualitas udara ISPU (BMKG/KLHK), laporan warga, dan posko Damkar dalam satu peta interaktif.

> Live: `Vite + React 19 + TypeScript + MapLibre GL` — deploy ready di Vercel.

![Fire Watcher](public/geojson/indonesia-provinces.json)

## Fitur Utama

- **Peta Interaktif 4 Mode** — Gelap / Satelit Esri / Topo / Outdoor (100% free, tanpa API key)
- **Hotspot NASA FIRMS Live** — fetch `VIIRS_NOAA20_NRT` 24 jam terakhir bbox Indonesia `95,-11,141,6`, parsing CSV `latitude, longitude, bright_ti4, frp, confidence, acq_date/time, satellite`
- **Heatmap Kerawanan 5 Gradasi (Gowa-style)** — heatmap GPU `cyan → green → yellow → red → dark-red` (`Sangat Rendah → Sangat Tinggi`) dengan `heatmap-weight FRP+confidence`, radius & intensity interpolasi zoom
- **Segmentasi Luasan Terbakar** — polygon irregular FRP-accurate (`Ha = FRP*0.05-0.12`, radius `sqrt(Ha/pi)`, clamp VIIRS 375m) + kontur tipis profesional
- **Bubble Klaster Modern** — halo blur + kaca highlight, 4 tier warna/oranye-merah, toggle `Bubble Klaster + Angka` di filter
- **Sidebar 4 Tab** — Api (group Provinsi → Kabupaten → Titik 13.5 zoom SUB), ISPU, Lapor, Posko — semua ikut filter wilayah & akurasi
- **Widget Banner** — `Titik` / `Hektar` / `ISPU` / `Posko` sinkron ke wilayah terpilih + akurasi (default 50%), lokasi label tidak lagi `__all__`
- **Filter Akurasi** — slider `0-90 step 10` + tombol `Terapkan Filter` (default **50%**), memengaruhi heatmap, choropleth provinsi, widget, dan cluster. Tidak trigger fetch ulang — murni client-side
- **Choropleth Provinsi** — `GeoJSON` natural coastline, warna `Kritis/Waspada/Siaga/Aman` dengan `fill-opacity` interpolasi zoom (memudar saat zoom dekat agar heatmap menonjol)
- **Popup Mirip Sidebar** — cluster `Top 8` titik terpanass + heatmap card, titik individu `koordinat, FRP, suhu, Ha, satelit, lahan, akurasi`
- **Fly-to Detail** — klik Provinsi `6.5`, Kabupaten `8.5`, Titik `13.5` + pulse highlight oranye 8 detik + sinkron dropdown filter
- **Posko & ISPU Terdekat** — jika wilayah tidak punya stasiun/posko, widget ambil terdekat via haversine, tab menampilkan pesan kosong yang informatif
- **Tombol Kembali** — di bawah `Peta: Gelap` + pill tengah atas saat filter aktif → `flyTo Indonesia [118,-2.5] zoom 4.2`
- **Infografis Instagram 1080×1350** — header, 4 KPI, bingkai peta `cover` aspect tanpa stretch, legenda 5 gradasi, hotline `113/117`, fallback taint-safe, handler mobile `Web Share API` + `Buka Tab` + long-press simpan

## Stack

```
React 19 + Vite 8 + TypeScript 6 + Tailwind 3.4
MapLibre GL 6.6 + Esri/OSM raster tiles
lucide-react + canvas-confetti + clsx/tailwind-merge
Oxlint + Vercel
```

## Struktur Proyek

```
src/
  App.tsx                 — orchestrator, flyTo, selectedRegency, headerHotspotsCount
  components/
    Header.tsx            — NASA FIRMS LIVE, refresh, NASA Key, Lapor, Infografis
    StatsBanner.tsx       — 4 widget (filter lokasi+akurasi)
    Map/FireMap.tsx       — 1200+ baris: choropleth, heatmap 5-stop, burn segments, clustering modern, popups, style switch preserve
    Sidebar/              — SidebarContainer, HotspotListTab, AirQualityTab, PoskoTab, FieldReportsTab
    Modals/               — ReportFireModal, InfographicModal, ApiKeyModal
  services/
    firmsApi.ts           — fetchActiveHotspots() + localStorage NASA key
    airQualityApi.ts      — Open-Meteo PM2.5 → ISPU KLHK P.14/2020
    reportsStore.ts       — localStorage field reports + upvote
  data/                   — mockPosko, mockHotspots, mockAirQuality, mockReports
  types/fire.ts           — Hotspot, AirQualityStation, ProvinceSummary, ActiveFilters
  utils/infographicGenerator.ts — canvas 1080×1350, drawImageCover (anti-stretch), taint fallback
public/geojson/indonesia-provinces.json
```

## Cara Jalan

```bash
# 1. Install
npm install

# 2. Dev
npm run dev          # http://localhost:5173

# 3. Build
npm run build        # tsc -b && vite build → dist/
npm run preview

# 4. Lint
npm run lint         # oxlint
```

Tidak perlu `.env`. Data live:
- **NASA FIRMS**: Masukkan `MAP_KEY` gratis di tombol `NASA Key` (header) — dapat di https://firms.modaps.eosdis.nasa.gov/api/map_key/ — disimpan `localStorage firewatcher_firms_key`. Tanpa key, tampil simulasi + banner amber.
- **Air Quality**: `https://air-quality-api.open-meteo.com/v1/air-quality` (tanpa key).

## Penggunaan

1. **Peta** — pilih `Peta: Gelap/Satelit/Topo/Outdoor` kiri atas; `+ -` kanan atas.
2. **Filter** — dropdown `Seluruh Indonesia` → pilih provinsi; buka slider → atur `Minimal Akurasi 50%` → klik `Terapkan Filter` → peta, banner, heatmap update.
3. **Eksplor** — klik baris Provinsi/Kabupaten → fly `6.5/8.5`; klik kartu titik `→ SUB` → fly `13.5` + pulse oranye; klik bubble merah → popup Top 8; klik heatmap/polygon → detail FRP/Ha.
4. **Toggle Bubble** — di filter, matikan `Bubble Klaster + Angka` untuk lihat heatmap bersih tanpa lingkaran merah.
5. **Kembali** — tombol `Kembali ke Deteksi Indonesia` di bawah selector peta atau pill tengah atas.
6. **Infografis** — `Unduh Infografis` → preview `object-contain` 1080/1350 → `Bagikan / Simpan` (mobile: Share API + Buka Tab + long-press) / `Unduh PNG` (desktop).

## Catatan Teknis

- `vite.config.ts` exclude `maplibre-gl` dari `optimizeDeps`.
- `canvasContextAttributes: { preserveDrawingBuffer: true }` untuk screenshot infografis.
- `Vercel` `vercel.json` rewrite `/(.*) → /index.html` SPA.
- Heatmap `heatmap-opacity` & `provinces-risk-fill` interpolasi zoom agar provinsi memudar saat masuk detail.
- `showClusterCount` mengontrol `hotspots-clusters/halo/inner/count` bersamaan; `showHotspots` mengontrol titik individu + heatmap.

## Lisensi & Sumber Data

- Data hotspot: NASA FIRMS (CC BY)
- Basemap: Esri, OpenStreetMap, Maxar
- ISPU: KLHK SiPongi+ / OpenAQ via Open-Meteo
- Dibuat untuk edukasi & siaga Karhutla gotong royong.

---

**Fire Watcher Indonesia** — `Gerakan Gotong Royong Tanggap Bencana Api` · `@firewatcher.id` · `firewatcher.id`
