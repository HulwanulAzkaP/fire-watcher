import React from 'react';
import { Flame, Trees, Wind, ShieldAlert } from 'lucide-react';
import type { Hotspot, ProvinceSummary, AirQualityStation, PoskoUnit } from '../types/fire';

interface StatsBannerProps {
  hotspots: Hotspot[];
  provinces: ProvinceSummary[];
  airQualityList: AirQualityStation[];
  poskoUnits: PoskoUnit[];
  selectedProvince: string;
  selectedRegency: string | null;
  confidenceMin: number;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function estimateBurntHa(frp: number): number {
  if (frp >= 150) return Math.round(frp * 0.12 * 10) / 10;
  if (frp >= 80) return Math.round(frp * 0.09 * 10) / 10;
  if (frp >= 30) return Math.round(frp * 0.07 * 10) / 10;
  return Math.round(frp * 0.05 * 10) / 10;
}

export const StatsBanner: React.FC<StatsBannerProps> = ({
  hotspots,
  provinces,
  airQualityList,
  poskoUnits,
  selectedProvince,
  selectedRegency,
  confidenceMin,
}) => {
  const isLocationFiltered = selectedProvince !== '__all__' || !!selectedRegency;
  const locationLabel = selectedRegency || (selectedProvince !== '__all__' ? selectedProvince : null);

  const filteredHotspots = hotspots.filter((h) => {
    if (h.confidence < confidenceMin) return false;
    if (selectedProvince !== '__all__' && h.province !== selectedProvince) return false;
    if (selectedRegency && h.regency !== selectedRegency) return false;
    return true;
  });

  const hotspotsCount = filteredHotspots.length;

  // Burnt area: if regency selected, sum from hotspots; else if province selected, use province summary; else total
  let totalBurntHa = 0;
  if (selectedRegency) {
    totalBurntHa = filteredHotspots.reduce((s, h) => s + estimateBurntHa(h.frp), 0);
  } else if (selectedProvince !== '__all__') {
    const prov = provinces.find((p) => p.name === selectedProvince);
    totalBurntHa = prov ? prov.burntAreaHa : filteredHotspots.reduce((s, h) => s + estimateBurntHa(h.frp), 0);
  } else {
    totalBurntHa = provinces.reduce((acc, p) => acc + p.burntAreaHa, 0);
  }

  // Posko filtered (hanya lokasi, bukan akurasi)
  const filteredPosko = poskoUnits.filter((p) => {
    if (selectedProvince !== '__all__' && p.province !== selectedProvince) return false;
    if (selectedRegency && p.regency !== selectedRegency && !p.locationName.includes(selectedRegency)) return false;
    return true;
  });
  const poskoCount = isLocationFiltered ? filteredPosko.length : poskoUnits.length;

  // Air Quality: filter by lokasi, jika lokasi tidak difilter tampil global terburuk
  let displayAir: AirQualityStation | null = null;
  if (!isLocationFiltered) {
    displayAir = [...airQualityList].sort((a, b) => b.ispu - a.ispu)[0] || null;
  } else {
    const provinceMatches = airQualityList.filter((a) => {
      if (selectedProvince !== '__all__') {
        return a.province.toLowerCase().includes(selectedProvince.toLowerCase().split(' ')[0]) || selectedProvince.toLowerCase().includes(a.province.toLowerCase());
      }
      return false;
    });
    if (provinceMatches.length > 0) {
      displayAir = [...provinceMatches].sort((a, b) => b.ispu - a.ispu)[0];
    } else if (selectedRegency && filteredHotspots.length > 0) {
      const avgLat = filteredHotspots.reduce((s, h) => s + h.latitude, 0) / filteredHotspots.length;
      const avgLng = filteredHotspots.reduce((s, h) => s + h.longitude, 0) / filteredHotspots.length;
      let nearest: AirQualityStation | null = null;
      let bestDist = Infinity;
      airQualityList.forEach((a) => {
        const d = haversineKm(avgLat, avgLng, a.latitude, a.longitude);
        if (d < bestDist) { bestDist = d; nearest = a; }
      });
      displayAir = nearest;
    } else if (selectedProvince !== '__all__') {
      const provCenter = provinces.find((p) => p.name === selectedProvince)?.center;
      if (provCenter && airQualityList.length) {
        const [lng, lat] = provCenter;
        let nearest: AirQualityStation | null = null;
        let bestDist = Infinity;
        airQualityList.forEach((a) => {
          const d = haversineKm(lat, lng, a.latitude, a.longitude);
          if (d < bestDist) { bestDist = d; nearest = a; }
        });
        displayAir = nearest;
      } else {
        displayAir = [...airQualityList].sort((a, b) => b.ispu - a.ispu)[0] || null;
      }
    } else {
      displayAir = [...airQualityList].sort((a, b) => b.ispu - a.ispu)[0] || null;
    }
  }
  const worstAir = displayAir;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 p-3 bg-slate-900/60 border-b border-slate-800 shrink-0">
      {/* 1. Hotspots */}
      <div className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-br from-red-950/40 to-slate-900/80 border border-red-900/30">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-400 border border-red-500/20">
          <Flame className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-red-400 tracking-tight">
              {hotspotsCount.toLocaleString('id-ID')}
            </span>
            <span className="text-[11px] font-semibold text-red-500/80 uppercase">Titik</span>
          </div>
          <p className="text-[11px] font-semibold text-slate-400 truncate">
            Hotspot Satelit (24 Jam){locationLabel ? ` · ${locationLabel}` : ''}
          </p>
        </div>
      </div>

      {/* 2. Burnt Area */}
      <div className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-br from-orange-950/40 to-slate-900/80 border border-orange-900/30">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/15 text-orange-400 border border-orange-500/20">
          <Trees className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-orange-400 tracking-tight">
              {Math.round(totalBurntHa).toLocaleString('id-ID')}
            </span>
            <span className="text-[11px] font-semibold text-orange-500/80 uppercase">Hektar</span>
          </div>
          <p className="text-[11px] font-semibold text-slate-400 truncate">
            Perkiraan Luas Terbakar{locationLabel ? ` · ${locationLabel}` : ''}
          </p>
        </div>
      </div>

      {/* 3. ISPU Air Quality */}
      <div className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-br from-purple-950/40 to-slate-900/80 border border-purple-900/30">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/20">
          <Wind className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-purple-400 tracking-tight">
              {worstAir ? worstAir.ispu : 0}
            </span>
            <span className="text-[10px] font-bold text-purple-300 uppercase px-1.5 py-0.5 rounded bg-purple-950/80 border border-purple-800/40 truncate max-w-[90px]">
              {worstAir?.cityName || 'ISPU'}
            </span>
          </div>
          <p className="text-[11px] font-semibold text-slate-400 truncate">
            {worstAir ? `${worstAir.category}${isLocationFiltered ? ` · ${worstAir.cityName}` : ''}` : 'Kualitas Udara — tidak ada data'}
          </p>
        </div>
      </div>

      {/* 4. Posko & Damkar */}
      <div className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-br from-blue-950/40 to-slate-900/80 border border-blue-900/30">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/20">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-blue-400 tracking-tight">
              {poskoCount}
            </span>
            <span className="text-[11px] font-semibold text-blue-500/80 uppercase">Posko</span>
          </div>
          <p className="text-[11px] font-semibold text-slate-400 truncate">
            Damkar & Relawan Siaga{locationLabel ? ` · ${locationLabel}` : ''}
          </p>
        </div>
      </div>
    </div>
  );
};
