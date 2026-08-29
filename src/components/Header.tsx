import React from 'react';
import { Flame, RefreshCw, Download, PlusCircle, Radio, Key } from 'lucide-react';

interface HeaderProps {
  onRefresh: () => void;
  isRefreshing: boolean;
  onOpenReportModal: () => void;
  onOpenInfographicModal: () => void;
  onOpenApiKeyModal: () => void;
  lastUpdated: Date;
  isLiveFeed: boolean;
  hotspotsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  onRefresh,
  isRefreshing,
  onOpenReportModal,
  onOpenInfographicModal,
  onOpenApiKeyModal,
  lastUpdated,
  isLiveFeed,
  hotspotsCount,
}) => {
  const formattedTime = lastUpdated.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <header className="h-16 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-3 sm:px-5 flex items-center justify-between z-30 shrink-0 select-none">
      {/* Brand & Status */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 via-orange-500 to-amber-500 shadow-lg shadow-red-500/20">
          <Flame className="h-5 w-5 text-white animate-pulse" />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-extrabold text-white tracking-tight truncate">
              FIRE WATCHER <span className="text-red-500 font-bold">INDONESIA</span>
            </h1>
            <span className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-950/80 border border-red-800/60 text-red-300">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping"></span>
              {isLiveFeed ? 'NASA FIRMS LIVE' : 'SIMULASI AKTIF'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 truncate hidden xs:block">
            Pantauan Karhutla, Titik Api & Kualitas Udara Real-Time
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400 mr-1 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/50">
          <Radio className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
          <span>Update: <b className="text-slate-200">{formattedTime} WIB</b></span>
          <span className="text-slate-600">|</span>
          <span className="text-red-400 font-semibold">{hotspotsCount} Titik Panas</span>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Muat ulang data terbaru"
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-slate-300 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Segarkan</span>
        </button>

        <button
          type="button"
          onClick={onOpenApiKeyModal}
          title="Atur NASA FIRMS API Key (Gratis)"
          className="hidden md:flex items-center gap-1 px-2.5 py-2 rounded-xl bg-slate-800/70 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-all cursor-pointer active:scale-95"
        >
          <Key className="h-3.5 w-3.5 text-amber-400" />
          <span>NASA Key</span>
        </button>

        <button
          type="button"
          onClick={onOpenReportModal}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-bold transition-all shadow-md shadow-orange-600/20 active:scale-95 cursor-pointer"
        >
          <PlusCircle className="h-4 w-4 text-white" />
          <span className="hidden sm:inline">Lapor Api</span>
          <span className="sm:hidden">Lapor</span>
        </button>

        <button
          type="button"
          onClick={onOpenInfographicModal}
          className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold transition-all shadow-md shadow-red-600/25 active:scale-95 cursor-pointer"
        >
          <Download className="h-4 w-4 text-white" />
          <span className="hidden sm:inline">Unduh Infografis</span>
          <span className="sm:hidden">Infografis</span>
        </button>
      </div>
    </header>
  );
};
