import React from 'react';
import { Shield, Truck, Phone, MapPin, Users } from 'lucide-react';
import type { PoskoUnit } from '../../types/fire';

interface PoskoTabProps {
  poskoList: PoskoUnit[];
  onFlyTo: (coords: [number, number], zoom?: number) => void;
  selectedProvince?: string;
  selectedRegency?: string;
}

export const PoskoTab: React.FC<PoskoTabProps> = ({ poskoList, onFlyTo, selectedProvince, selectedRegency }) => {
  const isFiltered = selectedProvince && selectedProvince !== '__all__' || !!selectedRegency;
  const filtered = poskoList.filter((p) => {
    if (selectedProvince && selectedProvince !== '__all__' && p.province !== selectedProvince) return false;
    if (selectedRegency && p.regency !== selectedRegency && !p.locationName.includes(selectedRegency)) return false;
    return true;
  });
  const displayList = isFiltered ? filtered : poskoList;
  return (
    <div className="p-3 space-y-3">
      {/* Informative Header */}
      <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-xs text-slate-300 flex items-start gap-2.5">
        <Shield className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-white mb-0.5">Posko Komando & Satgas Karhutla</h4>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Pangkalan brigade Manggala Agni, BPBD & Damkar, serta posko logistik relawan siaga.
          </p>
        </div>
      </div>

      {isFiltered && displayList.length === 0 ? (
        <div className="p-6 text-center rounded-xl bg-slate-800/40 border border-dashed border-slate-700">
          <p className="text-xs text-slate-400">Tidak ada posko di <b className="text-slate-200">{selectedRegency || selectedProvince}</b></p>
          <p className="text-[11px] text-slate-500 mt-1">Menampilkan seluruh posko sebagai referensi.</p>
        </div>
      ) : null}
      <div className="space-y-2.5">
        {(isFiltered && displayList.length > 0 ? displayList : poskoList).map((item) => (
          <div
            key={item.id}
            onClick={() => onFlyTo([item.longitude, item.latitude])}
            className="p-3.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition-colors cursor-pointer group select-none space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h5 className="text-xs font-bold text-white group-hover:text-cyan-400 transition-colors">
                  {item.name}
                </h5>
                <span className="text-[10px] text-cyan-300">{item.type}</span>
              </div>

              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {item.status}
              </span>
            </div>

            <div className="flex items-center gap-1 text-[11px] text-slate-300">
              <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
              <span className="truncate">{item.locationName}</span>
            </div>

            {/* Inventory Grid */}
            <div className="grid grid-cols-3 gap-1.5 p-2 rounded-lg bg-slate-900/70 border border-slate-800 text-center">
              <div>
                <div className="text-[9px] text-slate-400 font-semibold">Personil</div>
                <div className="text-xs font-bold text-white flex items-center justify-center gap-1">
                  <Users className="h-3 w-3 text-slate-400" />
                  {item.personnelCount}
                </div>
              </div>
              <div>
                <div className="text-[9px] text-slate-400 font-semibold">Mobil Tangki</div>
                <div className="text-xs font-bold text-cyan-400 flex items-center justify-center gap-1">
                  <Truck className="h-3 w-3 text-cyan-400" />
                  {item.waterTankerCount}
                </div>
              </div>
              <div>
                <div className="text-[9px] text-slate-400 font-semibold">Stok Masker</div>
                <div className="text-xs font-bold text-emerald-400">{item.n95MaskStock}</div>
              </div>
            </div>

            {/* Contact */}
            <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 border-t border-slate-700/50">
              <span>PIC: <b className="text-slate-300">{item.contactPerson}</b></span>
              <a
                href={`tel:${item.contactPhone.replace(/[^0-9]/g, '')}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 px-2 py-1 rounded bg-cyan-950/80 border border-cyan-800/50 text-cyan-300 font-bold hover:bg-cyan-900"
              >
                <Phone className="h-2.5 w-2.5" />
                <span>{item.contactPhone}</span>
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
