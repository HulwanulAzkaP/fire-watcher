import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { StatsBanner } from './components/StatsBanner';
import { FireMap } from './components/Map/FireMap';
import { SidebarContainer } from './components/Sidebar/SidebarContainer';
import { ReportFireModal } from './components/Modals/ReportFireModal';
import { InfographicModal } from './components/Modals/InfographicModal';
import { ApiKeyModal } from './components/Modals/ApiKeyModal';
import type {
  Hotspot,
  FieldReport,
  PoskoUnit,
  ProvinceSummary,
  AirQualityStation,
  ActiveFilters,
} from './types/fire';
import { fetchActiveHotspots, getSavedFirmsKey } from './services/firmsApi';
import { fetchLiveAirQuality } from './services/airQualityApi';
import { getFieldReports, addFieldReport, upvoteFieldReport } from './services/reportsStore';
import { INITIAL_POSKO } from './data/mockPosko';
import { ListFilter, PlusCircle, Download, AlertCircle } from 'lucide-react';

const BASE_PROVINCES: Omit<ProvinceSummary, 'activeHotspots' | 'burntAreaHa' | 'riskLevel' | 'damkarUnits' | 'relawanCount'>[] = [
  { id: 'p-riau', name: 'Riau', code: 'RI', island: 'Sumatra', center: [101.44, 0.53] },
  { id: 'p-kalteng', name: 'Kalimantan Tengah', code: 'KT', island: 'Kalimantan', center: [113.92, -1.68] },
  { id: 'p-kalbar', name: 'Kalimantan Barat', code: 'KB', island: 'Kalimantan', center: [110.34, 0.00] },
  { id: 'p-sumsel', name: 'Sumatera Selatan', code: 'SS', island: 'Sumatra', center: [104.75, -3.31] },
  { id: 'p-jambi', name: 'Jambi', code: 'JA', island: 'Sumatra', center: [103.61, -1.61] },
  { id: 'p-kalsel', name: 'Kalimantan Selatan', code: 'KS', island: 'Kalimantan', center: [115.30, -3.09] },
  { id: 'p-ntt', name: 'Nusa Tenggara Timur (Flores, Sumba, Timor)', code: 'NT', island: 'Nusa Tenggara', center: [121.07, -8.65] },
  { id: 'p-jatim', name: 'Jawa Timur (Bromo/Arjuno)', code: 'JI', island: 'Jawa', center: [112.75, -7.53] },
  { id: 'p-jabar', name: 'Jawa Barat & Banten', code: 'JB', island: 'Jawa', center: [107.60, -6.92] },
  { id: 'p-jateng', name: 'Jawa Tengah & DIY', code: 'JT', island: 'Jawa', center: [110.42, -7.15] },
  { id: 'p-papua-selatan', name: 'Papua Selatan (Merauke)', code: 'PS', island: 'Papua', center: [139.50, -7.00] },
  { id: 'p-sulsel', name: 'Sulawesi Selatan', code: 'SN', island: 'Sulawesi', center: [119.97, -3.66] },
];

export const App: React.FC = () => {
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [isLiveFeed, setIsLiveFeed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldReports, setFieldReports] = useState<FieldReport[]>([]);
  const [poskoUnits] = useState<PoskoUnit[]>(INITIAL_POSKO);
  const [provinces, setProvinces] = useState<ProvinceSummary[]>([]);
  const [airQualityList, setAirQualityList] = useState<AirQualityStation[]>([]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Modals state
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isInfographicModalOpen, setIsInfographicModalOpen] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const mapCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Fly-to target for map interaction from sidebar
  const [flyToTarget, setFlyToTarget] = useState<{ center: [number, number]; zoom: number } | null>(null);
  const [selectedRegency, setSelectedRegency] = useState<string | null>(null);

  const handleFlyTo = useCallback((coords: [number, number], zoom?: number) => {
    const z = zoom ?? 11.5;
    setFlyToTarget({ center: coords, zoom: z });
    setIsMobileDrawerOpen(false);
  }, []);

  const handleSelectArea = useCallback((province: string | null, regency: string | null, center: [number, number], zoom: number) => {
    if (province !== null) {
      setFilters((prev) => ({ ...prev, selectedProvince: province }));
    }
    setSelectedRegency(regency);
    handleFlyTo(center, zoom);
  }, [handleFlyTo]);

  const handleResetToIndonesia = useCallback(() => {
    setFilters((prev) => ({ ...prev, selectedProvince: '__all__' }));
    setSelectedRegency(null);
    setFlyToTarget(null);
    setTimeout(() => {
      setFlyToTarget({ center: [118.0, -2.5], zoom: 4.2 });
      setTimeout(() => setFlyToTarget(null), 800);
    }, 50);
  }, []);

  // Filters State - default akurasi 50% sesuai request
  const [filters, setFilters] = useState<ActiveFilters>({
    confidenceMin: 50,
    selectedProvince: '__all__',
    showHotspots: true,
    showFieldReports: true,
    showPosko: true,
    showISPU: true,
    showRiskPolygons: true,
    showClusterCount: true,
    fireStatusFilter: '__all__',
  });

  const handleUpdateFilters = (newFilters: Partial<ActiveFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  // Compute live province metrics strictly from live hotspot counts (helper, filters applied via effect)
  const computeProvincesFromLiveHotspots = (liveHotspots: Hotspot[], confidenceMin = 0): ProvinceSummary[] => {
    const filtered = liveHotspots.filter((h) => h.confidence >= confidenceMin);
    return BASE_PROVINCES.map((p) => {
      const pCount = filtered.filter(
        (h) => h.province === p.name || (p.name.includes('NTT') && h.province.includes('NTT'))
      ).length;
      
      const burntHa = Math.round(pCount * 5.4 * 10) / 10;
      let risk: 'Kritis' | 'Waspada' | 'Siaga' | 'Aman' = 'Aman';
      if (pCount >= 30) risk = 'Kritis';
      else if (pCount >= 10) risk = 'Waspada';
      else if (pCount >= 1) risk = 'Siaga';

      return {
        ...p,
        activeHotspots: pCount,
        burntAreaHa: burntHa,
        riskLevel: risk,
        damkarUnits: Math.max(2, Math.round(pCount / 8)),
        relawanCount: Math.max(10, pCount * 3),
      };
    });
  };

  // Load Real-time Data (fetch tidak tergantung filter — filter client-side saja)
  const loadData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const { hotspots: fetchedHotspots, isLive, error } = await fetchActiveHotspots();
      setHotspots(fetchedHotspots);
      setIsLiveFeed(isLive);
      setErrorMessage(error || null);
      // provinces dihitung otomatis via effect [hotspots, confidenceMin] dibawah

      // 3. Fetch Real-time Air Quality (ISPU & PM2.5)
      const liveAirQuality = await fetchLiveAirQuality();
      setAirQualityList(liveAirQuality);

      // 4. Load Crowdsourced Reports
      setFieldReports(getFieldReports());
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('Error loading live data:', err);
      setErrorMessage('Terjadi kendala saat memuat data satelit atau kualitas udara.');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    if (!getSavedFirmsKey()) {
      setIsApiKeyModalOpen(true);
    }
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Recompute province summaries when Minimal Akurasi slider changes (live filter)
  useEffect(() => {
    if (hotspots.length === 0) return;
    setProvinces(computeProvincesFromLiveHotspots(hotspots, filters.confidenceMin));
  }, [filters.confidenceMin, hotspots]);

  // Clear regency when province filter changes via dropdown
  useEffect(() => {
    if (filters.selectedProvince === '__all__') {
      setSelectedRegency(null);
    } else if (selectedRegency) {
      const stillValid = hotspots.some((h) => h.province === filters.selectedProvince && h.regency === selectedRegency);
      if (!stillValid) setSelectedRegency(null);
    }
  }, [filters.selectedProvince, hotspots, selectedRegency]);

  // Report Submission
  const handleCreateReport = (
    reportData: Omit<FieldReport, 'id' | 'createdAt' | 'verified' | 'upvotes'>
  ) => {
    const created = addFieldReport(reportData);
    setFieldReports((prev) => [created, ...prev]);
  };

  // Upvote Report
  const handleUpvoteReport = (reportId: string) => {
    const updated = upvoteFieldReport(reportId);
    setFieldReports(updated);
  };

  // Header & banner counts must respect akurasi + wilayah terpilih
  const headerHotspotsCount = hotspots.filter((h) => {
    if (h.confidence < filters.confidenceMin) return false;
    if (filters.selectedProvince !== '__all__' && h.province !== filters.selectedProvince) return false;
    if (selectedRegency && h.regency !== selectedRegency) return false;
    return true;
  }).length;

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* 1. Header Bar */}
      <Header
        onRefresh={loadData}
        isRefreshing={isRefreshing}
        onOpenReportModal={() => setIsReportModalOpen(true)}
        onOpenInfographicModal={() => setIsInfographicModalOpen(true)}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        onOpenSidebar={() => setIsMobileDrawerOpen(true)}
        lastUpdated={lastUpdated}
        isLiveFeed={isLiveFeed}
        hotspotsCount={headerHotspotsCount}
      />

      {/* Warning banner if NASA key is needed */}
      {errorMessage && (
        <div className="bg-amber-950/80 border-b border-amber-800/60 px-4 py-2 flex items-center justify-between text-xs text-amber-200 shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setIsApiKeyModalOpen(true)}
            className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] shrink-0 ml-2"
          >
            Buka NASA Key
          </button>
        </div>
      )}

      {/* 2. Four Metrics Banner (Realtime) - now follows selected wilayah + akurasi */}
      <StatsBanner
        hotspots={hotspots}
        provinces={provinces}
        airQualityList={airQualityList}
        poskoUnits={poskoUnits}
        selectedProvince={filters.selectedProvince}
        selectedRegency={selectedRegency}
        confidenceMin={filters.confidenceMin}
      />

      {/* 3. Main Workspace Area (Sidebar + Interactive Map) */}
      <div className="flex flex-1 min-h-0 relative overflow-hidden">
        {/* Left Sidebar (Desktop & Mobile Drawer) */}
        <SidebarContainer
          hotspots={hotspots}
          fieldReports={fieldReports}
          poskoUnits={poskoUnits}
          provinces={provinces}
          airQualityList={airQualityList}
          filters={filters}
          onUpdateFilters={handleUpdateFilters}
          onFlyTo={handleFlyTo}
          onSelectArea={handleSelectArea}
          selectedRegency={selectedRegency}
          onUpvoteReport={handleUpvoteReport}
          onOpenReportModal={() => setIsReportModalOpen(true)}
          isOpenMobile={isMobileDrawerOpen}
          onCloseMobile={() => setIsMobileDrawerOpen(false)}
        />

        {/* Interactive Map */}
        <div className="flex-1 h-full relative">
          <FireMap
            hotspots={hotspots}
            fieldReports={fieldReports}
            poskoUnits={poskoUnits}
            provinces={provinces}
            airQualityList={airQualityList}
            filters={filters}
            mapCanvasRef={mapCanvasRef}
            flyTo={flyToTarget}
            showResetButton={filters.selectedProvince !== '__all__' || !!selectedRegency}
            onResetIndonesia={handleResetToIndonesia}
            resetLabel={selectedRegency ? selectedRegency : filters.selectedProvince !== '__all__' ? filters.selectedProvince : undefined}
          />

          {/* Floating Mobile Bottom Action Bar - always visible, safe area */}
          <div className="lg:hidden absolute bottom-2 inset-x-2 sm:bottom-3 sm:inset-x-3 z-40 flex items-center gap-2 pb-[env(safe-area-inset-bottom)]">
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-3 rounded-2xl bg-slate-900/95 border border-slate-700/80 text-white font-bold text-xs shadow-2xl backdrop-blur active:scale-95 transition-all"
            >
              <ListFilter className="h-4 w-4 text-orange-400" />
              <span>Daftar & Filter ({headerHotspotsCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setIsReportModalOpen(true)}
              className="flex items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-2xl active:scale-95 transition-all"
            >
              <PlusCircle className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={() => setIsInfographicModalOpen(true)}
              className="flex items-center justify-center p-3 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-2xl active:scale-95 transition-all"
            >
              <Download className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ReportFireModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onSubmit={handleCreateReport}
      />

      <InfographicModal
        isOpen={isInfographicModalOpen}
        onClose={() => setIsInfographicModalOpen(false)}
        mapCanvas={mapCanvasRef.current}
        hotspotsCount={hotspots.length}
        provinces={provinces}
        airQualityList={airQualityList}
        poskoCount={poskoUnits.length}
      />

      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        onSaved={loadData}
      />
    </div>
  );
};

export default App;
