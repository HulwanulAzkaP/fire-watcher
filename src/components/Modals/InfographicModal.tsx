import React, { useState, useEffect } from 'react';
import { Download, X, Sparkles, RefreshCw } from 'lucide-react';
import { generateInfographicImage } from '../../utils/infographicGenerator';
import type { ProvinceSummary, AirQualityStation } from '../../types/fire';

interface InfographicModalProps {
  isOpen: boolean;
  onClose: () => void;
  mapCanvas: HTMLCanvasElement | null;
  hotspotsCount: number;
  provinces: ProvinceSummary[];
  airQualityList: AirQualityStation[];
  poskoCount: number;
}

export const InfographicModal: React.FC<InfographicModalProps> = ({
  isOpen,
  onClose,
  mapCanvas,
  hotspotsCount,
  provinces,
  airQualityList,
  poskoCount,
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(true);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const totalBurntHa = provinces.reduce((acc, p) => acc + p.burntAreaHa, 0);
  const worstAir = [...airQualityList].sort((a, b) => b.ispu - a.ispu)[0];

  const handleGenerate = async () => {
    setIsGenerating(true);
    setDownloadError(null);
    try {
      const nowStr = new Date().toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }) + ' WIB';

      const url = await generateInfographicImage(mapCanvas, {
        hotspotsCount,
        totalBurntAreaHa: Math.round(totalBurntHa),
        criticalProvincesCount: provinces.filter((p) => p.riskLevel === 'Kritis').length,
        activePoskoCount: poskoCount,
        worstCityName: worstAir?.cityName || 'Pekanbaru',
        worstCityISPU: worstAir?.ispu || 182,
        updatedAt: nowStr,
        legendItems: [
          { label: 'Sangat Rendah', color: '#2EE9A0' },
          { label: 'Rendah', color: '#8FE38A' },
          { label: 'Sedang', color: '#FFEB3B' },
          { label: 'Tinggi', color: '#FF0000' },
          { label: 'Sangat Tinggi', color: '#7A0000' },
        ],
      });

      setImageUrl(url);
    } catch (err: any) {
      console.error('Failed to generate infographic:', err);
      setDownloadError(err?.message || 'Gagal membuat infografis');
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      handleGenerate();
    } else {
      setImageUrl(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;


  const handleDownload = async () => {
    if (!imageUrl) return;
    setDownloadError(null);
    try {
      let blob: Blob;
      if (imageUrl.startsWith('data:')) {
        const res = await fetch(imageUrl);
        blob = await res.blob();
      } else {
        const res = await fetch(imageUrl);
        blob = await res.blob();
      }

      // Mobile: coba Web Share API (iOS/Android) dulu
      if (isMobile && (navigator as any).canShare) {
        try {
          const file = new File([blob], `infografis-karhutla-${Date.now()}.png`, { type: 'image/png' });
          const nav: any = navigator;
          if (nav.canShare({ files: [file] })) {
            await nav.share({ files: [file], title: 'Infografis Karhutla Indonesia', text: 'Fire Watcher Indonesia' });
            return;
          }
        } catch (shareErr) {
          console.warn('Share failed, fallback to download', shareErr);
        }
      }

      // Desktop & fallback mobile: blob download
      const url = URL.createObjectURL(blob);
      // iOS membutuhkan target berbeda
      if (isMobile) {
        // Buka di tab baru agar bisa long-press simpan
        const win = window.open();
        if (win) {
          win.document.write(`<html><head><title>Infografis</title><meta name="viewport" content="width=device-width,initial-scale=1"/><style>body{margin:0;background:#020617;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:16px}img{max-width:100%;border-radius:12px;box-shadow:0 20px 40px rgba(0,0,0,0.5)}p{color:#94a3b8;font-family:system-ui;font-size:12px;margin-top:12px;text-align:center}</style></head><body><img src="${imageUrl}" alt="Infografis"/><p>Tahan gambar lalu pilih <b>Simpan Gambar</b> / <b>Bagikan</b></p></body></html>`);
        } else {
          // Fallback download attr
          const a = document.createElement('a');
          a.download = `infografis-karhutla-indonesia-${Date.now()}.png`;
          a.href = url;
          document.body.appendChild(a);
          a.click();
          a.remove();
        }
        setTimeout(() => URL.revokeObjectURL(url), 3000);
        return;
      }

      const a = document.createElement('a');
      a.download = `infografis-karhutla-indonesia-${Date.now()}.png`;
      a.href = url;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      console.error('Download fallback to direct link', e);
      try {
        if (isMobile) {
          window.open(imageUrl, '_blank');
        } else {
          const a = document.createElement('a');
          a.download = `infografis-karhutla-indonesia-${Date.now()}.png`;
          a.href = imageUrl;
          a.click();
        }
      } catch (e2: any) {
        setDownloadError(e2?.message || 'Gagal mengunduh infografis — tahan gambar preview untuk menyimpan manual.');
      }
    }
  };

  const handleOpenNewTab = () => {
    if (!imageUrl) return;
    window.open(imageUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[95vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/20 text-red-400 border border-red-500/30">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-white">
                Infografis Siap Publikasi Media Sosial
              </h3>
              <p className="text-[11px] text-slate-400">
                Format Instagram Portrait (1080×1350) lengkap dengan rekapitulasi data & hotline posko
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center bg-slate-950/60 min-h-[380px]">
          {isGenerating ? (
            <div className="flex flex-col items-center gap-3 text-slate-400">
              <RefreshCw className="h-8 w-8 text-red-500 animate-spin" />
              <span className="text-xs font-semibold">Menyusun infografis resolusi tinggi...</span>
            </div>
          ) : imageUrl ? (
            <div className="space-y-2 w-full flex flex-col items-center">
              <div className="relative max-w-sm w-full rounded-xl overflow-hidden shadow-2xl border border-slate-700">
                <img
                  src={imageUrl}
                  alt="Infografis Preview"
                  className="w-full h-auto object-contain"
                  style={{ aspectRatio: '1080 / 1350' }}
                />
              </div>
              {isMobile && (
                <p className="text-[11px] text-slate-400 text-center max-w-sm">
                  📱 Tahan gambar di atas lalu <b className="text-slate-200">Simpan / Bagikan</b> · atau pakai tombol di bawah
                </p>
              )}
              {downloadError && (
                <div className="text-[11px] text-amber-300 bg-amber-950/40 border border-amber-800/50 rounded-lg px-3 py-2 max-w-sm">{downloadError}</div>
              )}
            </div>
          ) : (
            <div className="space-y-1 text-center">
              <div className="text-xs text-red-400">Gagal menghasilkan infografis.</div>
              {downloadError && <div className="text-[11px] text-amber-300">{downloadError}</div>}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-900 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold order-1"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>Generate Ulang</span>
          </button>

          <div className="flex items-center gap-2 order-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Tutup
            </button>
            {isMobile && imageUrl && !isGenerating && (
              <button
                type="button"
                onClick={handleOpenNewTab}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold"
              >
                Buka Tab
              </button>
            )}
            <button
              type="button"
              onClick={handleDownload}
              disabled={isGenerating || !imageUrl}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold shadow-lg shadow-red-600/30 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              <span>{isMobile ? 'Bagikan / Simpan' : 'Unduh Gambar PNG'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
