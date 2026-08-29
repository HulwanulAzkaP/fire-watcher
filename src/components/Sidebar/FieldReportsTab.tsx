import React from 'react';
import {
  ThumbsUp,
  Droplet,
  PlusCircle,
  FileCheck2,
} from 'lucide-react';
import type { FieldReport } from '../../types/fire';

interface FieldReportsTabProps {
  reports: FieldReport[];
  onFlyTo: (coords: [number, number], zoom?: number) => void;
  onUpvote: (id: string) => void;
  onOpenReportModal: () => void;
}

export const FieldReportsTab: React.FC<FieldReportsTabProps> = ({
  reports,
  onFlyTo,
  onUpvote,
  onOpenReportModal,
}) => {
  return (
    <div className="p-3 space-y-3">
      {/* Banner */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-purple-950/30 border border-purple-800/40">
        <div>
          <h4 className="text-xs font-bold text-white">Laporan Lapangan Masyarakat</h4>
          <p className="text-[10px] text-slate-400">Partisipasi warga & relawan pemadam</p>
        </div>
        <button
          type="button"
          onClick={onOpenReportModal}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-colors cursor-pointer active:scale-95 shadow-sm"
        >
          <PlusCircle className="h-3.5 w-3.5" />
          <span>Buat Laporan</span>
        </button>
      </div>

      {/* Empty State or List */}
      {reports.length === 0 ? (
        <div className="py-12 px-4 text-center rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto">
            <FileCheck2 className="h-6 w-6" />
          </div>
          <div>
            <h5 className="text-xs font-bold text-slate-200">Belum Ada Laporan Lapangan</h5>
            <p className="text-[11px] text-slate-400 mt-1 max-w-[240px] mx-auto leading-relaxed">
              Masyarakat dan relawan yang melihat titik kebakaran dapat langsung membuat laporan baru.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenReportModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/20 cursor-pointer active:scale-95"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Lapor Titik Api Pertama</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {reports.map((r) => {
            const timeAgo = Math.round(
              (Date.now() - new Date(r.createdAt).getTime()) / (60 * 1000)
            );

            return (
              <div
                key={r.id}
                className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2.5 select-none"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div
                    onClick={() => onFlyTo([r.longitude, r.latitude])}
                    className="cursor-pointer group flex-1"
                  >
                    <h5 className="text-xs font-bold text-white group-hover:text-purple-400 transition-colors">
                      {r.locationName}
                    </h5>
                    <div className="text-[10px] text-slate-400">
                      {r.province} — {r.regency} · {timeAgo > 0 ? `${timeAgo} mnt lalu` : 'Baru saja'}
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                      r.fireStatus === 'Api Membesar'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : r.fireStatus === 'Asap Pekat'
                        ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {r.fireStatus}
                  </span>
                </div>

                {/* Description */}
                <p className="text-[11px] text-slate-300 leading-relaxed">{r.notes}</p>

                {/* Urgent Needs */}
                {r.urgentNeeds.length > 0 && (
                  <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                    <div className="text-[10px] font-bold text-slate-400 mb-1">Kebutuhan Mendesak:</div>
                    <div className="flex flex-wrap gap-1">
                      {r.urgentNeeds.map((need, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 rounded bg-purple-950/80 border border-purple-800/50 text-purple-300 text-[10px] font-medium"
                        >
                          {need}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Status Chips & Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-700/50 text-[10px]">
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="flex items-center gap-1">
                      <Droplet className={`h-3 w-3 ${r.waterAccess ? 'text-cyan-400' : 'text-red-400'}`} />
                      {r.waterAccess ? 'Akses Air Ada' : 'Krisis Air'}
                    </span>
                    <span>·</span>
                    <span>Oleh: <b className="text-slate-300">{r.reporterName}</b></span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onUpvote(r.id)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-purple-300 font-bold transition-colors cursor-pointer active:scale-95"
                  >
                    <ThumbsUp className="h-3 w-3" />
                    <span>{r.upvotes} Dukung</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
