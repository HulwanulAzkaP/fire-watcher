import React, { useState, useMemo } from 'react';
import {
  Flame,
  ChevronDown,
  ChevronRight,
  MapPin,
  Layers2,
  Copy,
  Check,
} from 'lucide-react';
import type { Hotspot, AirQualityStation, PoskoUnit, ActiveFilters } from '../../types/fire';

interface HotspotListTabProps {
  hotspots: Hotspot[];
  onFlyTo: (coords: [number, number], zoom?: number) => void;
  onSelectArea?: (province: string | null, regency: string | null, center: [number, number], zoom: number) => void;
  selectedRegency?: string | null;
  filters?: ActiveFilters;
  airQualityList?: AirQualityStation[];
  poskoUnits?: PoskoUnit[];
}

// Estimate burnt area from FRP (Fire Radiative Power in MW)
// Based on NASA research: ~0.368 kg/m²/s per MW, typical fire ~ 0.5 Ha per hotspot
// We scale by FRP intensity
function estimateBurntHa(frp: number): number {
  if (frp >= 150) return Math.round(frp * 0.12 * 10) / 10;
  if (frp >= 80)  return Math.round(frp * 0.09 * 10) / 10;
  if (frp >= 30)  return Math.round(frp * 0.07 * 10) / 10;
  return Math.round(frp * 0.05 * 10) / 10;
}

export const HotspotListTab: React.FC<HotspotListTabProps> = ({ hotspots, onFlyTo, onSelectArea }) => {
  const [expandedProvince, setExpandedProvince] = useState<string | null>(null);
  const [expandedRegency, setExpandedRegency] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Group hotspots: Province → Regency → Hotspot[]
  const grouped = useMemo(() => {
    const map = new Map<string, Map<string, Hotspot[]>>();

    hotspots.forEach((h) => {
      if (!map.has(h.province)) map.set(h.province, new Map());
      const regMap = map.get(h.province)!;
      if (!regMap.has(h.regency)) regMap.set(h.regency, []);
      regMap.get(h.regency)!.push(h);
    });

    // Sort province by hotspot count descending
    const sorted = Array.from(map.entries())
      .map(([province, regMap]) => {
        const regencies = Array.from(regMap.entries())
          .map(([regency, spots]) => ({
            regency,
            spots: spots.sort((a, b) => b.frp - a.frp), // sort by FRP desc
            totalHa: spots.reduce((sum, h) => sum + estimateBurntHa(h.frp), 0),
            maxFrp: Math.max(...spots.map((s) => s.frp)),
          }))
          .sort((a, b) => b.totalHa - a.totalHa);

        const totalHotspots = regencies.reduce((s, r) => s + r.spots.length, 0);
        const totalHa = regencies.reduce((s, r) => s + r.totalHa, 0);

        return {
          province,
          regencies,
          totalHotspots,
          totalHa: Math.round(totalHa * 10) / 10,
        };
      })
      .sort((a, b) => b.totalHotspots - a.totalHotspots);

    return sorted;
  }, [hotspots]);

  const copyCoords = (hotspot: Hotspot) => {
    const txt = `${hotspot.latitude.toFixed(5)}, ${hotspot.longitude.toFixed(5)}`;
    navigator.clipboard.writeText(txt).catch(() => {});
    setCopiedId(hotspot.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  if (hotspots.length === 0) {
    return (
      <div className="p-8 text-center space-y-2">
        <Flame className="h-8 w-8 text-slate-600 mx-auto" />
        <p className="text-xs text-slate-500">Tidak ada titik panas yang cocok dengan filter.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-800/80">
      {/* Summary Header */}
      <div className="px-3.5 py-2.5 bg-slate-800/40 flex items-center justify-between text-[10px] text-slate-400 font-semibold">
        <span className="flex items-center gap-1.5">
          <Layers2 className="h-3.5 w-3.5 text-orange-400" />
          {grouped.length} Provinsi · {hotspots.length} Titik Panas
        </span>
        <span className="text-orange-300 font-bold">
          ~{hotspots.reduce((s, h) => s + estimateBurntHa(h.frp), 0).toLocaleString('id-ID', { maximumFractionDigits: 0 })} Ha Terdampak
        </span>
      </div>

      {/* Province Groups */}
      {grouped.map(({ province, regencies, totalHotspots, totalHa }) => {
        const isProvOpen = expandedProvince === province;
        const topFrp = Math.max(...regencies.map((r) => r.maxFrp));
        // Average center for this province (for flyTo)
        const allSpotsProv = regencies.flatMap((r) => r.spots);
        const avgLngProv = allSpotsProv.reduce((s, h) => s + h.longitude, 0) / (allSpotsProv.length || 1);
        const avgLatProv = allSpotsProv.reduce((s, h) => s + h.latitude, 0) / (allSpotsProv.length || 1);

        return (
          <div key={province}>
            {/* Province Row - click flies + expands + sync widget */}
            <button
              type="button"
              onClick={() => {
                const willOpen = !isProvOpen;
                setExpandedProvince(willOpen ? province : null);
                setExpandedRegency(null);
                if (willOpen && allSpotsProv.length > 0) {
                  if (onSelectArea) onSelectArea(province, null, [avgLngProv, avgLatProv], 6.5);
                  else onFlyTo([avgLngProv, avgLatProv], 6.5);
                }
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-3 hover:bg-slate-800/50 transition-colors cursor-pointer group text-left"
            >
              {/* Risk color dot */}
              <div className={`w-2 h-2 rounded-full shrink-0 ${
                totalHotspots >= 100 ? 'bg-red-500' :
                totalHotspots >= 25  ? 'bg-orange-500' :
                totalHotspots >= 5   ? 'bg-yellow-400' :
                'bg-emerald-500'
              }`} />

              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-slate-100 group-hover:text-orange-300 transition-colors truncate">
                  {province}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                  <span className="text-red-400 font-semibold">{totalHotspots} titik</span>
                  <span>·</span>
                  <span className="text-orange-300 font-semibold">~{totalHa.toLocaleString('id-ID')} Ha</span>
                  <span>·</span>
                  <span>{regencies.length} Kabupaten</span>
                </div>
              </div>

              {/* Max FRP Badge */}
              <div className="text-right shrink-0">
                <div className={`text-[10px] font-extrabold ${
                  topFrp > 90 ? 'text-red-400' : topFrp > 40 ? 'text-orange-400' : 'text-amber-400'
                }`}>
                  {topFrp} MW
                </div>
                {isProvOpen
                  ? <ChevronDown className="h-3.5 w-3.5 text-slate-500 ml-auto mt-0.5" />
                  : <ChevronRight className="h-3.5 w-3.5 text-slate-600 ml-auto mt-0.5" />
                }
              </div>
            </button>

            {/* Regency (Kabupaten) List */}
            {isProvOpen && (
              <div className="bg-slate-900/60 border-t border-slate-800/60">
                {regencies.map(({ regency, spots, totalHa: regHa, maxFrp: regMaxFrp }) => {
                  const regKey = `${province}::${regency}`;
                  const isRegOpen = expandedRegency === regKey;

                  const avgLngReg = spots.reduce((s, h) => s + h.longitude, 0) / (spots.length || 1);
                  const avgLatReg = spots.reduce((s, h) => s + h.latitude, 0) / (spots.length || 1);

                  return (
                    <div key={regency} className="border-b border-slate-800/40 last:border-0">
                      {/* Kabupaten Row - click flies + expands + sync widget SUB */}
                      <button
                        type="button"
                        onClick={() => {
                          const willOpen = !isRegOpen;
                          setExpandedRegency(willOpen ? regKey : null);
                          if (willOpen) {
                            if (onSelectArea) onSelectArea(province, regency, [avgLngReg, avgLatReg], 8.5);
                            else onFlyTo([avgLngReg, avgLatReg], 8.5);
                          }
                        }}
                        className="w-full flex items-center gap-2.5 pl-7 pr-3.5 py-2.5 hover:bg-slate-800/40 transition-colors cursor-pointer text-left group"
                      >
                        <Flame className={`h-3.5 w-3.5 shrink-0 ${
                          regMaxFrp > 90 ? 'text-red-400' : regMaxFrp > 40 ? 'text-orange-400' : 'text-amber-400'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-semibold text-slate-200 group-hover:text-orange-300 truncate">
                            {regency}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500">
                            <span>{spots.length} hotspot</span>
                            <span>·</span>
                            <span className="text-orange-400 font-bold">~{regHa.toLocaleString('id-ID', { maximumFractionDigits: 1 })} Ha</span>
                          </div>
                        </div>
                        {isRegOpen
                          ? <ChevronDown className="h-3 w-3 text-slate-500 shrink-0" />
                          : <ChevronRight className="h-3 w-3 text-slate-600 shrink-0" />
                        }
                      </button>

                      {/* Hotspot coordinates list */}
                      {isRegOpen && (
                        <div className="pl-10 pr-3.5 pb-2 space-y-1.5">
                          {spots.map((hs) => {
                            const timeAgo = Math.round(
                              (Date.now() - new Date(hs.acqDateTime).getTime()) / (60 * 1000)
                            );
                            const haEst = estimateBurntHa(hs.frp);

                            return (
                              <div
                                key={hs.id}
                                onClick={() => {
                                  if (onSelectArea) onSelectArea(hs.province, hs.regency, [hs.longitude, hs.latitude], 13.5);
                                  else onFlyTo([hs.longitude, hs.latitude], 13.5);
                                }}
                                className="rounded-lg bg-slate-800/70 border border-slate-700/50 p-2.5 text-[10px] space-y-1.5 cursor-pointer hover:bg-slate-700/70 hover:border-orange-500/30 active:scale-[0.98] transition-all group/card"
                                title="Klik untuk terbang ke lokasi SUB & update widget"
                              >
                                {/* Top row: coordinates + copy */}
                                <div className="flex items-center justify-between gap-2">
                                  <span
                                    className="flex items-center gap-1 font-mono text-cyan-400 group-hover/card:text-cyan-300 transition-colors"
                                  >
                                    <MapPin className="h-3 w-3 shrink-0" />
                                    <span>{hs.latitude.toFixed(5)}, {hs.longitude.toFixed(5)}</span>
                                    <span className="ml-1 text-[9px] font-bold text-orange-400/70 group-hover/card:text-orange-300">→ SUB</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); copyCoords(hs); }}
                                    title="Salin koordinat"
                                    className="p-1 rounded text-slate-500 hover:text-slate-200 transition-colors cursor-pointer shrink-0"
                                  >
                                    {copiedId === hs.id
                                      ? <Check className="h-3 w-3 text-emerald-400" />
                                      : <Copy className="h-3 w-3" />
                                    }
                                  </button>
                                </div>

                                {/* Metrics row */}
                                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] pointer-events-none">
                                  <span className={`font-bold ${
                                    hs.frp > 90 ? 'text-red-400' : hs.frp > 40 ? 'text-orange-400' : 'text-amber-400'
                                  }`}>
                                    🔥 {hs.frp} MW
                                  </span>
                                  <span className="text-slate-300">{hs.brightnessCelsius}°C</span>
                                  <span className="text-orange-300 font-semibold">~{haEst} Ha</span>
                                  <span className="text-slate-400">{hs.landCover}</span>
                                </div>

                                {/* Time + satellite + confidence */}
                                <div className="flex items-center justify-between text-slate-500 pointer-events-none">
                                  <span>{hs.satellite} · {timeAgo > 0 ? `${timeAgo} mnt lalu` : 'Baru saja'}</span>
                                  <span className="text-emerald-500 font-semibold">{hs.confidence}% {hs.confidenceLevel}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
