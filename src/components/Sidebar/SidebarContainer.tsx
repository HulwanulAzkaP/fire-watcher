import React, { useState } from 'react';
import {
  Flame,
  Wind,
  FileText,
  Shield,
  Layers,
  ChevronDown,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import type {
  Hotspot,
  FieldReport,
  PoskoUnit,
  ProvinceSummary,
  AirQualityStation,
  ActiveFilters,
} from '../../types/fire';
import { HotspotListTab } from './HotspotListTab';
import { AirQualityTab } from './AirQualityTab';
import { FieldReportsTab } from './FieldReportsTab';
import { PoskoTab } from './PoskoTab';

type TabType = 'hotspots' | 'ispu' | 'reports' | 'posko';

interface SidebarContainerProps {
  hotspots: Hotspot[];
  fieldReports: FieldReport[];
  poskoUnits: PoskoUnit[];
  provinces: ProvinceSummary[];
  airQualityList: AirQualityStation[];
  filters: ActiveFilters;
  onUpdateFilters: (newFilters: Partial<ActiveFilters>) => void;
  onFlyTo: (coords: [number, number], zoom?: number) => void;
  onSelectArea?: (province: string | null, regency: string | null, center: [number, number], zoom: number) => void;
  selectedRegency?: string | null;
  onUpvoteReport: (id: string) => void;
  onOpenReportModal: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const SidebarContainer: React.FC<SidebarContainerProps> = ({
  hotspots,
  fieldReports,
  poskoUnits,
  provinces,
  airQualityList,
  filters,
  onUpdateFilters,
  onFlyTo,
  onSelectArea,
  selectedRegency,
  onUpvoteReport,
  onOpenReportModal,
  isOpenMobile,
  onCloseMobile,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('hotspots');
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [pendingConfidence, setPendingConfidence] = useState(filters.confidenceMin);
  // Sync pending jika filter diubah dari luar (reset, load)
  React.useEffect(() => {
    setPendingConfidence(filters.confidenceMin);
  }, [filters.confidenceMin]);
  const hasPending = pendingConfidence !== filters.confidenceMin;

  const filteredHotspots = hotspots.filter((h) => {
    if (h.confidence < filters.confidenceMin) return false;
    if (filters.selectedProvince !== '__all__' && h.province !== filters.selectedProvince) {
      return false;
    }
    return true;
  });

  const content = (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800 select-none overflow-hidden">
      {/* 1. Global Filter Header */}
      <div className="p-3 border-b border-slate-800 bg-slate-900/90 shrink-0 space-y-2.5">
        {/* Province Selector & Filter Button */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <select
              value={filters.selectedProvince}
              onChange={(e) => onUpdateFilters({ selectedProvince: e.target.value })}
              className="w-full appearance-none bg-slate-800 hover:bg-slate-700/80 text-white text-xs font-semibold px-3 py-2 rounded-xl border border-slate-700/80 pr-8 focus:outline-none focus:border-red-500 transition-colors cursor-pointer"
            >
              <option value="__all__">🌐 Seluruh Indonesia ({hotspots.length} Titik)</option>
              {provinces.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name} ({p.riskLevel}) — {p.activeHotspots} Hotspot
                </option>
              ))}
            </select>
            <ChevronDown className="h-4 w-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          <button
            type="button"
            onClick={() => setIsFilterExpanded(!isFilterExpanded)}
            title="Pengaturan Filter & Layer"
            className={`p-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
              isFilterExpanded
                ? 'bg-red-600/20 border-red-500/50 text-red-400'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>

        {/* Expandable Advanced Filters */}
        {isFilterExpanded && (
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/70 space-y-3 animate-in fade-in duration-200">
            {/* Confidence Slider */}
            <div>
              <div className="flex justify-between text-[11px] font-semibold text-slate-300 mb-1">
                <span>Minimal Akurasi:</span>
                <span className={`font-bold ${hasPending ? 'text-amber-400' : 'text-red-400'}`}>{pendingConfidence}%{hasPending ? ' → ' + filters.confidenceMin + '%' : ''}</span>
              </div>
              <input
                type="range"
                min="0"
                max="90"
                step="10"
                value={pendingConfidence}
                onChange={(e) => setPendingConfidence(parseInt(e.target.value))}
                className="w-full accent-red-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-[10px] text-slate-500">
                  {pendingConfidence < 50 ? 'Menampilkan laporan sensitivitas rendah' : pendingConfidence >= 80 ? 'Hanya titik presisi tinggi' : 'Filter default 50%'}
                </span>
                <button
                  type="button"
                  onClick={() => onUpdateFilters({ confidenceMin: pendingConfidence })}
                  disabled={!hasPending}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${hasPending ? 'bg-red-600 hover:bg-red-500 text-white shadow-md cursor-pointer active:scale-95' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}
                >
                  Terapkan Filter
                </button>
              </div>
              {hasPending && (
                <p className="text-[10px] text-amber-400 mt-1">Klik Terapkan untuk update peta & layer provinsi.</p>
              )}
            </div>

            {/* Layer Checkboxes */}
            <div className="space-y-1.5 pt-2 border-t border-slate-700 text-[11px]">
              <label className="flex items-center justify-between text-slate-300 cursor-pointer">
                <span className="flex items-center gap-1.5">
                  <Flame className="h-3.5 w-3.5 text-red-400" />
                  <span>Titik Panas Satelit</span>
                </span>
                <input
                  type="checkbox"
                  checked={filters.showHotspots}
                  onChange={(e) => onUpdateFilters({ showHotspots: e.target.checked })}
                  className="rounded accent-red-500"
                />
              </label>

              <label className="flex items-center justify-between text-slate-300 cursor-pointer">
                <span className="flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-orange-400" />
                  <span>Poligon Zona Risiko Provinsi</span>
                </span>
                <input
                  type="checkbox"
                  checked={filters.showRiskPolygons}
                  onChange={(e) => onUpdateFilters({ showRiskPolygons: e.target.checked })}
                  className="rounded accent-orange-500"
                />
              </label>

              <label className="flex items-center justify-between text-slate-300 cursor-pointer">
                <span className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-purple-400" />
                  <span>Laporan Warga / Relawan</span>
                </span>
                <input
                  type="checkbox"
                  checked={filters.showFieldReports}
                  onChange={(e) => onUpdateFilters({ showFieldReports: e.target.checked })}
                  className="rounded accent-purple-500"
                />
              </label>

              <label className="flex items-center justify-between text-slate-300 cursor-pointer">
                <span className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Posko Damkar & Logistik</span>
                </span>
                <input
                  type="checkbox"
                  checked={filters.showPosko}
                  onChange={(e) => onUpdateFilters({ showPosko: e.target.checked })}
                  className="rounded accent-cyan-500"
                />
              </label>

              <label className="flex items-center justify-between text-slate-300 cursor-pointer">
                <span className="flex items-center gap-1.5">
                  <span className="h-3.5 w-3.5 rounded-full bg-red-600 border border-white flex items-center justify-center text-[7px] text-white font-black">9</span>
                  <span>Bubble Klaster + Angka</span>
                </span>
                <input
                  type="checkbox"
                  checked={filters.showClusterCount}
                  onChange={(e) => onUpdateFilters({ showClusterCount: e.target.checked })}
                  className="rounded accent-red-500"
                />
              </label>
            </div>
          </div>
        )}

        {/* 4 Tabs Bar */}
        <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-slate-800/80 border border-slate-700/80">
          <button
            type="button"
            onClick={() => setActiveTab('hotspots')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
              activeTab === 'hotspots'
                ? 'bg-red-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            }`}
          >
            <Flame className="h-3.5 w-3.5 mb-0.5" />
            <span>Api ({filteredHotspots.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ispu')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
              activeTab === 'ispu'
                ? 'bg-purple-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            }`}
          >
            <Wind className="h-3.5 w-3.5 mb-0.5" />
            <span>ISPU ({airQualityList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
              activeTab === 'reports'
                ? 'bg-purple-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            }`}
          >
            <FileText className="h-3.5 w-3.5 mb-0.5" />
            <span>Lapor ({fieldReports.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('posko')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
              activeTab === 'posko'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            }`}
          >
            <Shield className="h-3.5 w-3.5 mb-0.5" />
            <span>Posko ({poskoUnits.length})</span>
          </button>
        </div>
      </div>

      {/* 2. Tab Content Scrollable Body */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'hotspots' && (
          <HotspotListTab
            hotspots={filteredHotspots}
            onFlyTo={onFlyTo}
            onSelectArea={onSelectArea}
            selectedRegency={selectedRegency}
            filters={filters}
            airQualityList={airQualityList}
            poskoUnits={poskoUnits}
          />
        )}
        {activeTab === 'ispu' && (
          <AirQualityTab airQualityList={airQualityList} onFlyTo={onFlyTo} selectedProvince={filters.selectedProvince} />
        )}
        {activeTab === 'reports' && (
          <FieldReportsTab
            reports={fieldReports}
            onFlyTo={onFlyTo}
            onUpvote={onUpvoteReport}
            onOpenReportModal={onOpenReportModal}
          />
        )}
        {activeTab === 'posko' && <PoskoTab poskoList={poskoUnits} onFlyTo={onFlyTo} selectedProvince={filters.selectedProvince} selectedRegency={selectedRegency || undefined} />}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Fixed Left 380px) */}
      <aside className="hidden lg:flex w-[380px] shrink-0 h-full">{content}</aside>

      {/* Mobile Drawer Sheet */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-black/60 backdrop-blur-sm lg:hidden animate-in fade-in duration-200">
          <div className="flex items-center justify-between p-3 bg-slate-900 border-b border-slate-800 shrink-0">
            <h3 className="text-sm font-bold text-white">Detail Pantauan & Laporan</h3>
            <button
              onClick={onCloseMobile}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-hidden bg-slate-900">{content}</div>
        </div>
      )}
    </>
  );
};
