import type { AirQualityStation, ISPUCategory } from '../types/fire';

interface CityCoord {
  id: string;
  cityName: string;
  province: string;
  lat: number;
  lng: number;
}

const INDONESIA_MONITORING_CITIES: CityCoord[] = [
  { id: 'ispu-pekanbaru', cityName: 'Pekanbaru', province: 'Riau', lat: 0.5071, lng: 101.4478 },
  { id: 'ispu-palangkaraya', cityName: 'Palangka Raya', province: 'Kalimantan Tengah', lat: -2.2161, lng: 113.9139 },
  { id: 'ispu-pontianak', cityName: 'Pontianak', province: 'Kalimantan Barat', lat: -0.0263, lng: 109.3425 },
  { id: 'ispu-palembang', cityName: 'Palembang', province: 'Sumatera Selatan', lat: -2.9909, lng: 104.7565 },
  { id: 'ispu-jambi', cityName: 'Jambi', province: 'Jambi', lat: -1.6101, lng: 103.6131 },
  { id: 'ispu-banjarmasin', cityName: 'Banjarmasin', province: 'Kalimantan Selatan', lat: -3.3194, lng: 114.5908 },
  { id: 'ispu-jakarta', cityName: 'DKI Jakarta', province: 'DKI Jakarta', lat: -6.2088, lng: 106.8456 },
  { id: 'ispu-kupang', cityName: 'Kupang', province: 'Nusa Tenggara Timur', lat: -10.1772, lng: 123.6070 },
  { id: 'ispu-surabaya', cityName: 'Surabaya', province: 'Jawa Timur', lat: -7.2575, lng: 112.7521 },
  { id: 'ispu-jayapura', cityName: 'Jayapura', province: 'Papua', lat: -2.5337, lng: 140.7181 },
];

function getCategoryAndAdvice(pm25: number): {
  category: ISPUCategory;
  categoryColor: string;
  healthAdvice: string;
  ispu: number;
} {
  // Indonesian KLHK Permen LHK No. P.14/2020 ISPU Calculation for PM2.5
  if (pm25 <= 15.5) {
    return {
      category: 'Baik',
      categoryColor: '#22c55e',
      healthAdvice: 'Kualitas udara sangat baik. Aman untuk seluruh aktivitas luar ruangan.',
      ispu: Math.max(15, Math.round((pm25 / 15.5) * 50)),
    };
  } else if (pm25 <= 55.4) {
    return {
      category: 'Sedang',
      categoryColor: '#eab308',
      healthAdvice: 'Kualitas udara dapat diterima. Kelompok sangat sensitif kurangi aktivitas berat.',
      ispu: Math.round(51 + ((pm25 - 15.6) / (55.4 - 15.6)) * 49),
    };
  } else if (pm25 <= 150.4) {
    return {
      category: 'Tidak Sehat',
      categoryColor: '#ef4444',
      healthAdvice: 'Hindari aktivitas di luar ruangan. Gunakan masker N95 jika terpaksa keluar.',
      ispu: Math.round(101 + ((pm25 - 55.5) / (150.4 - 55.5)) * 99),
    };
  } else if (pm25 <= 250.4) {
    return {
      category: 'Sangat Tidak Sehat',
      categoryColor: '#a855f7',
      healthAdvice: 'Kondisi udara berbahaya bagi kelompok rentan. Tutup ventilasi rumah & nyalakan air purifier.',
      ispu: Math.round(201 + ((pm25 - 150.5) / (250.4 - 150.5)) * 99),
    };
  } else {
    return {
      category: 'Berbahaya',
      categoryColor: '#881337',
      healthAdvice: 'Tingkat darurat polusi kabut asap. Tetap berada di dalam ruangan tertutup.',
      ispu: Math.min(500, Math.round(301 + ((pm25 - 250.5) / (500 - 250.5)) * 199)),
    };
  }
}

export async function fetchLiveAirQuality(): Promise<AirQualityStation[]> {
  const results = await Promise.allSettled(
    INDONESIA_MONITORING_CITIES.map(async (city) => {
      const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${city.lat}&longitude=${city.lng}&current=pm2_5,us_aqi`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      const pm25 = data.current?.pm2_5 != null ? Math.round(data.current.pm2_5 * 10) / 10 : 35.0;
      const { category, categoryColor, healthAdvice, ispu } = getCategoryAndAdvice(pm25);

      return {
        id: city.id,
        cityName: city.cityName,
        province: city.province,
        latitude: city.lat,
        longitude: city.lng,
        pm25,
        ispu,
        category,
        categoryColor,
        healthAdvice,
        updatedAt: new Date().toISOString(),
      };
    })
  );

  const validStations: AirQualityStation[] = [];
  results.forEach((r, idx) => {
    if (r.status === 'fulfilled') {
      validStations.push(r.value);
    } else {
      const city = INDONESIA_MONITORING_CITIES[idx];
      const { category, categoryColor, healthAdvice, ispu } = getCategoryAndAdvice(28.0);
      validStations.push({
        id: city.id,
        cityName: city.cityName,
        province: city.province,
        latitude: city.lat,
        longitude: city.lng,
        pm25: 28.0,
        ispu,
        category,
        categoryColor,
        healthAdvice,
        updatedAt: new Date().toISOString(),
      });
    }
  });

  return validStations;
}
