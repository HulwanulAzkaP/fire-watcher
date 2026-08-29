import React from 'react';
import { Flame, RefreshCw, Download, PlusCircle, Radio, Menu } from 'lucide-react';

interface HeaderProps {
  onRefresh: () => void;
  isRefreshing: boolean;
  onOpenReportModal: () => void;
  onOpenInfographicModal: () => void;
  onOpenSidebar?: () => void;
  lastUpdated: Date;
  isLiveFeed: boolean;
  hotspotsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  onRefresh,
  isRefreshing,
  onOpenReportModal,
  onOpenInfographicModal,
  onOpenSidebar,
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
    <header className="h-12 sm:h-14 lg:h-16 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-2 sm:px-4 lg:px-5 flex items-center justify-between z-40 shrink-0 select-none gap-2">
      {/* Brand & Status */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {onOpenSidebar && (
          <button
            type="button"
            onClick={onOpenSidebar}
            className="lg:hidden flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 active:scale-95 transition-all"
            title="Buka menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <div className="flex h-8 w-8 sm:h-9 sm:w-9 lg:h-10 lg:w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 via-orange-500 to-amber-500 shadow-lg shadow-red-500/20">
          <Flame className="h-4 w-4 sm:h-5 sm:w-5 text-white animate-pulse" />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <h1 className="text-xs sm:text-sm lg:text-base font-extrabold text-white tracking-tight truncate">
              FIRE WATCHER <span className="text-red-500 font-bold">INDONESIA</span>
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 px-1.5 sm:gap-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold bg-red-950/80 border border-red-800/60 text-red-300">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping"></span>
              {isLiveFeed ? 'LIVE' : 'SIMULASI'}
            </span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 truncate hidden sm:block">
            Pantauan Karhutla & Titik Api Real-Time
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 shrink-0">
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
          className="flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] sm:text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`h-3 w-3 sm:h-3.5 sm:w-3.5 text-slate-300 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="hidden lg:inline">Segarkan</span>
        </button>

        <button
          type="button"
          onClick={onOpenReportModal}
          className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-[11px] sm:text-xs font-bold transition-all shadow-md shadow-orange-600/20 active:scale-95 cursor-pointer"
        >
          <PlusCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
          <span className="hidden sm:inline">Lapor</span>
          <span className="sm:hidden">+</span>
        </button>

        <button
          type="button"
          onClick={onOpenInfographicModal}
          className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 lg:px-3.5 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-[11px] sm:text-xs font-bold transition-all shadow-md shadow-red-600/25 active:scale-95 cursor-pointer"
        >
          <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
          <span className="hidden md:inline">Unduh</span>
          <span className="md:hidden">PNG</span>
        </button>
      </div>
    </header>
  );
};
