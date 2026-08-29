import React, { useState } from 'react';
import {
  X,
  MapPin,
  Flame,
  Send,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { FieldReport } from '../../types/fire';

interface ReportFireModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (report: Omit<FieldReport, 'id' | 'createdAt' | 'verified' | 'upvotes'>) => void;
}

const COMMON_NEEDS = [
  'Mobil Tangki Air',
  'Pompa Apung Portable',
  'Selang 2.5 Inch',
  'Masker N95',
  'Water Bombing Udara',
  'Oksigen Medis',
  'Personil Damkar / Relawan',
  'Evakuasi Warga',
];

export const ReportFireModal: React.FC<ReportFireModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [reporterName, setReporterName] = useState('');
  const [organization, setOrganization] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState<FieldReport['category']>('Karhutla');
  const [locationName, setLocationName] = useState('');
  const [province, setProvince] = useState('Riau');
  const [regency, setRegency] = useState('');
  const [latitude, setLatitude] = useState<number>(0.53);
  const [longitude, setLongitude] = useState<number>(101.44);
  const [fireStatus, setFireStatus] = useState<FieldReport['fireStatus']>('Api Membesar');
  const [waterAccess, setWaterAccess] = useState(true);
  const [roadAccess, setRoadAccess] = useState(true);
  const [selectedNeeds, setSelectedNeeds] = useState<string[]>(['Mobil Tangki Air', 'Masker N95']);
  const [notes, setNotes] = useState('');
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  if (!isOpen) return null;

  const handleGetLocation = () => {
    if ('geolocation' in navigator) {
      setIsGettingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(pos.coords.latitude);
          setLongitude(pos.coords.longitude);
          setIsGettingLocation(false);
        },
        () => {
          alert('Tidak dapat mendeteksi lokasi GPS secara otomatis. Silakan masukkan secara manual.');
          setIsGettingLocation(false);
        }
      );
    }
  };

  const toggleNeed = (need: string) => {
    if (selectedNeeds.includes(need)) {
      setSelectedNeeds(selectedNeeds.filter((n) => n !== need));
    } else {
      setSelectedNeeds([...selectedNeeds, need]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reporterName.trim() || !locationName.trim() || !notes.trim()) {
      alert('Harap lengkapi nama pelapor, nama lokasi, dan kronologi kejadian.');
      return;
    }

    onSubmit({
      reporterName: reporterName.trim(),
      organization: organization.trim() || 'Masyarakat / Relawan',
      phone: phone.trim(),
      category,
      locationName: locationName.trim(),
      province,
      regency: regency.trim() || 'Wilayah Terdampak',
      latitude: Number(latitude),
      longitude: Number(longitude),
      fireStatus,
      waterAccess,
      roadAccess,
      urgentNeeds: selectedNeeds,
      notes: notes.trim(),
    });

    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-white">
                Laporkan Kejadian Titik Api / Karhutla
              </h3>
              <p className="text-[11px] text-slate-400">
                Informasi Anda sangat berharga untuk percepatan armada pemadam & relawan
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* Identitas Pelapor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Nama Pelapor *</label>
              <input
                type="text"
                required
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                placeholder="Contoh: Rahmat Hidayat"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Organisasi / Komunitas</label>
              <input
                type="text"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder="Contoh: Relawan MPA / Pecinta Alam"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">No. WhatsApp / HP</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0812-xxxx-xxxx"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Kabupaten / Kota</label>
              <input
                type="text"
                value={regency}
                onChange={(e) => setRegency(e.target.value)}
                placeholder="Contoh: Bengkalis / Palangka Raya"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {/* Kategori & Status Api */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Kategori Kebakaran</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500"
              >
                <option value="Karhutla">Kebakaran Hutan & Lahan (Karhutla)</option>
                <option value="Lahan Gambut">Lahan Gambut Bawah Tanah</option>
                <option value="Pemukiman">Kebakaran Pemukiman Warga</option>
                <option value="Hutan Gunung">Hutan Lindung Pegunungan</option>
                <option value="Industri">Kebakaran Industri / Pabrik</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Status Api Terkini</label>
              <select
                value={fireStatus}
                onChange={(e) => setFireStatus(e.target.value as any)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500"
              >
                <option value="Api Membesar">🔥 Api Membesar & Menjalar Cepat</option>
                <option value="Asap Pekat">🌫️ Asap Pekat Membatasi Penglihatan</option>
                <option value="Terkendali">⚠️ Terkendali (Proses Pendinginan/Sekat)</option>
                <option value="Padam">✅ Padam Total</option>
              </select>
            </div>
          </div>

          {/* Lokasi Kejadian */}
          <div className="space-y-2 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
            <div className="flex items-center justify-between">
              <span className="text-slate-200 font-bold flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-red-400" />
                Detail Titik Lokasi
              </span>
              <button
                type="button"
                onClick={handleGetLocation}
                disabled={isGettingLocation}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-orange-300 font-semibold text-[11px] transition-colors"
              >
                <MapPin className="h-3 w-3" />
                <span>{isGettingLocation ? 'Mendeteksi...' : 'Ambil GPS Otomatis'}</span>
              </button>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Nama Dusun / Desa / Titik Landmark *</label>
              <input
                type="text"
                required
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="Contoh: Dusun 2 Desa Rimba Jaya, Belakang Pasar"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="col-span-2">
                <label className="block text-slate-400 mb-1">Provinsi</label>
                <select
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  <option value="Riau">Riau</option>
                  <option value="Kalimantan Tengah">Kalimantan Tengah</option>
                  <option value="Kalimantan Barat">Kalimantan Barat</option>
                  <option value="Sumatera Selatan">Sumatera Selatan</option>
                  <option value="Jambi">Jambi</option>
                  <option value="Kalimantan Selatan">Kalimantan Selatan</option>
                  <option value="Nusa Tenggara Timur">Nusa Tenggara Timur</option>
                  <option value="Jawa Timur (Bromo/Arjuno)">Jawa Timur</option>
                  <option value="Jawa Barat">Jawa Barat</option>
                  <option value="Papua Selatan (Merauke)">Papua Selatan</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Latitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={latitude}
                  onChange={(e) => setLatitude(parseFloat(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Longitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={longitude}
                  onChange={(e) => setLongitude(parseFloat(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-white"
                />
              </div>
            </div>
          </div>

          {/* Akses Jalan & Air */}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800 border border-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={waterAccess}
                onChange={(e) => setWaterAccess(e.target.checked)}
                className="rounded accent-orange-500"
              />
              <span className="text-slate-300 font-medium">Ada Akses Sumber Air</span>
            </label>

            <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800 border border-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={roadAccess}
                onChange={(e) => setRoadAccess(e.target.checked)}
                className="rounded accent-orange-500"
              />
              <span className="text-slate-300 font-medium">Dapat Diakses Mobil Tangki</span>
            </label>
          </div>

          {/* Kebutuhan Mendesak */}
          <div>
            <label className="block text-slate-300 font-semibold mb-2">Kebutuhan Bantuan Mendesak</label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_NEEDS.map((need) => {
                const isSelected = selectedNeeds.includes(need);
                return (
                  <button
                    key={need}
                    type="button"
                    onClick={() => toggleNeed(need)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-orange-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '}
                    {need}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Kronologi / Catatan */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Kronologi & Kondisi Lapangan *
            </label>
            <textarea
              required
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ceritakan kondisi sebaran api, arah angin, perkiraan jarak dari permukiman warga..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-orange-500 resize-none leading-relaxed"
            />
          </div>

          {/* Submit Action */}
          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold shadow-lg shadow-orange-600/30"
            >
              <Send className="h-4 w-4" />
              <span>Kirim Laporan Lapangan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
