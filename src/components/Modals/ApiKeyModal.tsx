import React, { useState, useEffect } from 'react';
import { Key, X, Check, ExternalLink } from 'lucide-react';
import { getSavedFirmsKey, saveFirmsKey } from '../../services/firmsApi';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onSaved }) => {
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    if (isOpen) {
      setApiKey(getSavedFirmsKey());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveFirmsKey(apiKey);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-5 select-none">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">NASA FIRMS API Key</h3>
              <p className="text-[11px] text-slate-400">Hubungkan data satelit VIIRS / MODIS langsung</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-3.5 text-xs">
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-300 space-y-2">
            <p className="text-[11px] leading-relaxed">
              NASA FIRMS menyediakan API gratis untuk satelit kebakaran hutan global. Kunci API Anda disimpan lokal di browser.
            </p>
            <a
              href="https://firms.modaps.eosdis.nasa.gov/api/map_key/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 font-bold text-[11px]"
            >
              <span>Dapatkan NASA Map Key Gratis</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">MAP KEY Anda</label>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Contoh: 3a9f02c98d712e..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-amber-500 font-mono text-xs"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Kosongkan jika ingin menggunakan dataset simulasi real-time bawaan.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold"
            >
              <Check className="h-4 w-4" />
              <span>Simpan & Terapkan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
