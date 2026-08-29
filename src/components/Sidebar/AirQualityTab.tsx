import React from 'react';
import { AlertTriangle, HeartPulse } from 'lucide-react';
import type { AirQualityStation } from '../../types/fire';

interface AirQualityTabProps {
  airQualityList: AirQualityStation[];
  onFlyTo: (coords: [number, number], zoom?: number) => void;
  selectedProvince?: string;
}

export const AirQualityTab: React.FC<AirQualityTabProps> = ({ airQualityList, onFlyTo, selectedProvince }) => {
  const isFiltered = selectedProvince && selectedProvince !== '__all__';
  const filtered = isFiltered
    ? airQualityList.filter((a) => a.province.toLowerCase().includes(selectedProvince.toLowerCase().split(' ')[0]) || selectedProvince.toLowerCase().includes(a.province.toLowerCase()))
    : airQualityList;
  const displayList = filtered.length > 0 ? filtered : isFiltered ? [] : airQualityList;
  const sorted = [...displayList].sort((a, b) => b.ispu - a.ispu);

  return (
    <div className="p-3 space-y-3">
      {/* Informative Header */}
      <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-800/40 text-xs text-slate-300 flex items-start gap-2.5">
        <HeartPulse className="h-5 w-5 text-purple-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-white mb-0.5">Indeks Standar Pencemar Udara (ISPU)</h4>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Data konsentrasi partikulat halus PM2.5 stasiun KLHK & OpenAQ di wilayah rawan kabut asap Karhutla.
          </p>
        </div>
      </div>

      {isFiltered && sorted.length === 0 ? (
        <div className="p-6 text-center rounded-xl bg-slate-800/40 border border-dashed border-slate-700">
          <p className="text-xs text-slate-400">Tidak ada stasiun ISPU di wilayah <b className="text-slate-200">{selectedProvince}</b></p>
          <p className="text-[11px] text-slate-500 mt-1">Widget menampilkan stasiun terdekat sebagai referensi.</p>
        </div>
      ) : null}
      <div className="space-y-2.5">
        {sorted.map((item) => {
          const isHazardous = item.ispu > 200;
          const isUnhealthy = item.ispu > 100;

          return (
            <div
              key={item.id}
              onClick={() => onFlyTo([item.longitude, item.latitude])}
              className="p-3.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition-colors cursor-pointer group select-none"
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h5 className="text-xs font-extrabold text-white group-hover:text-purple-400 transition-colors">
                    {item.cityName}
                  </h5>
                  <span className="text-[10px] text-slate-400">{item.province}</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <span
                      className={`text-lg font-black ${
                        isHazardous
                          ? 'text-purple-400'
                          : isUnhealthy
                          ? 'text-red-400'
                          : item.ispu > 50
                          ? 'text-yellow-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {item.ispu}
                    </span>
                    <span className="text-[9px] text-slate-400 block font-semibold">ISPU</span>
                  </div>

                  <span
                    className="px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider"
                    style={{
                      backgroundColor: `${item.categoryColor}22`,
                      color: item.categoryColor,
                      border: `1px solid ${item.categoryColor}55`,
                    }}
                  >
                    {item.category}
                  </span>
                </div>
              </div>

              {/* PM2.5 Bar & Health Advice */}
              <div className="space-y-1.5 pt-2 border-t border-slate-700/50">
                <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                  <span>Partikulat PM2.5:</span>
                  <span className="text-slate-200 font-bold">{item.pm25} µg/m³</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min((item.pm25 / 200) * 100, 100)}%`,
                      backgroundColor: item.categoryColor,
                    }}
                  />
                </div>
                <p className="text-[10px] text-slate-300/90 leading-snug pt-1 flex items-start gap-1">
                  <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0 mt-0.5" />
                  <span>{item.healthAdvice}</span>
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
