import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  Map as MapLibreMap,
  Popup,
  AttributionControl,
  ScaleControl,
  type GeoJSONSource,
} from 'maplibre-gl';
import {
  Layers,
  Plus,
  Minus,
  Maximize2,
} from 'lucide-react';
import type {
  Hotspot,
  FieldReport,
  PoskoUnit,
  ProvinceSummary,
  AirQualityStation,
  MapLayerStyle,
  ActiveFilters,
} from '../../types/fire';

interface FireMapProps {
  hotspots: Hotspot[];
  fieldReports: FieldReport[];
  poskoUnits: PoskoUnit[];
  provinces: ProvinceSummary[];
  airQualityList: AirQualityStation[];
  filters: ActiveFilters;
  mapCanvasRef?: React.MutableRefObject<HTMLCanvasElement | null>;
  flyTo?: { center: [number, number]; zoom: number } | null;
  showResetButton?: boolean;
  onResetIndonesia?: () => void;
  resetLabel?: string;
}

const INDONESIA_BOUNDS: [[number, number], [number, number]] = [
  [95.0, -11.0],
  [141.0, 6.0],
];

// Clean, 100% Free Tile Layers (No API Key Required, No Watermarks)
const MAP_STYLES: Record<MapLayerStyle, { label: string; style: any }> = {
  dark: {
    label: 'Gelap (Dark Mode)',
    style: {
      version: 8,
      sources: {
        'esri-dark': {
          type: 'raster',
          tiles: [
            'https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
          ],
          tileSize: 256,
          attribution: '&copy; Esri, HERE, Garmin, OpenStreetMap',
        },
      },
      layers: [
        {
          id: 'esri-dark-layer',
          type: 'raster',
          source: 'esri-dark',
          minzoom: 0,
          maxzoom: 19,
        },
      ],
    },
  },
  satellite: {
    label: 'Satelit (Esri Imagery)',
    style: {
      version: 8,
      sources: {
        'esri-sat': {
          type: 'raster',
          tiles: [
            'https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          ],
          tileSize: 256,
          attribution: '&copy; Esri, Maxar, Earthstar Geographics',
        },
      },
      layers: [
        {
          id: 'esri-sat-layer',
          type: 'raster',
          source: 'esri-sat',
          minzoom: 0,
          maxzoom: 19,
        },
      ],
    },
  },
  outdoor: {
    label: 'Tingkat Dampak (Outdoor)',
    style: {
      version: 8,
      sources: {
        'osm-tiles': {
          type: 'raster',
          tiles: [
            'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          ],
          tileSize: 256,
          attribution: '&copy; OpenStreetMap contributors',
        },
      },
      layers: [
        {
          id: 'osm-layer',
          type: 'raster',
          source: 'osm-tiles',
          minzoom: 0,
          maxzoom: 19,
        },
      ],
    },
  },
  topo: {
    label: 'Topografi (Relief)',
    style: {
      version: 8,
      sources: {
        'esri-topo': {
          type: 'raster',
          tiles: [
            'https://services.arcgisonline.com/arcgis/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
          ],
          tileSize: 256,
          attribution: '&copy; Esri, HERE, Intermap, OpenStreetMap',
        },
      },
      layers: [
        {
          id: 'esri-topo-layer',
          type: 'raster',
          source: 'esri-topo',
          minzoom: 0,
          maxzoom: 18,
        },
      ],
    },
  },
};

const RISK_COLORS = {
  Kritis: '#DC2626',   // Red
  Waspada: '#F97316',  // Orange
  Siaga: '#EAB308',    // Yellow
  Aman: '#16A34A',     // Green
};

// Helper: estimate burnt ha from FRP - mirrors Sidebar logic for accuracy with NASA data
function estimateBurntHaFromFRP(frp: number): number {
  if (frp >= 150) return Math.round(frp * 0.12 * 10) / 10;
  if (frp >= 80) return Math.round(frp * 0.09 * 10) / 10;
  if (frp >= 30) return Math.round(frp * 0.07 * 10) / 10;
  return Math.round(frp * 0.05 * 10) / 10;
}

function createCirclePolygon(center: [number, number], radiusKm: number, steps = 48): number[][] {
  const [lng, lat] = center;
  const coords: number[][] = [];
  const latRad = (lat * Math.PI) / 180;
  const kmPerDegLat = 111.32;
  const kmPerDegLng = 111.32 * Math.cos(latRad);
  for (let i = 0; i < steps; i++) {
    const theta = (i / steps) * 2 * Math.PI;
    // Professional subtle irregularity (±4%) + elongation along wind axis for realism
    const jitter = 1 + Math.sin(theta * 2.5 + lng * 0.8) * 0.04 + Math.cos(theta * 3.2 - lat * 0.7) * 0.025;
    const anisotropy = 1 + Math.cos(theta) * 0.06; // slight oval
    const r = radiusKm * jitter * anisotropy;
    const dLat = (r * Math.cos(theta)) / kmPerDegLat;
    const dLng = (r * Math.sin(theta)) / kmPerDegLng;
    coords.push([lng + dLng, lat + dLat]);
  }
  coords.push(coords[0]);
  return coords;
}

export const FireMap: React.FC<FireMapProps> = ({
  hotspots,
  fieldReports,
  poskoUnits,
  filters,
  mapCanvasRef,
  flyTo,
  showResetButton,
  onResetIndonesia,
  resetLabel,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const popupRef = useRef<Popup | null>(null);

  const [activeStyle, setActiveStyle] = useState<MapLayerStyle>('dark');
  const [isStyleMenuOpen, setIsStyleMenuOpen] = useState(false);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [geoJsonData, setGeoJsonData] = useState<any>(null);

  // 1. Fetch Official Smooth Indonesia Province GeoJSON
  useEffect(() => {
    fetch('/geojson/indonesia-provinces.json')
      .then((res) => res.json())
      .then((data) => setGeoJsonData(data))
      .catch((err) => console.error('Failed to load GeoJSON:', err));
  }, []);

  // Compute live province coloring based on actual NASA hotspot distribution (respect Minimal Akurasi)
  const enrichedProvinceGeoJson = useMemo(() => {
    if (!geoJsonData || !geoJsonData.features) return null;

    const filteredByConf = hotspots.filter((h) => h.confidence >= filters.confidenceMin);
    const countByProvince = new Map<string, number>();
    filteredByConf.forEach((h) => {
      const p = h.province.toLowerCase();
      countByProvince.set(p, (countByProvince.get(p) || 0) + 1);
    });

    return {
      type: 'FeatureCollection',
      features: geoJsonData.features.map((feat: any) => {
        const pName = (feat.properties.name || '').toLowerCase();
        let totalCount = 0;

        for (const [k, v] of countByProvince.entries()) {
          if (k.includes(pName) || pName.includes(k) || (pName.includes('timur') && k.includes('ntt'))) {
            totalCount += v;
          }
        }

        let riskLevel = 'Aman';
        if (totalCount >= 100) riskLevel = 'Kritis';
        else if (totalCount >= 25) riskLevel = 'Waspada';
        else if (totalCount >= 5) riskLevel = 'Siaga';

        return {
          ...feat,
          properties: {
            ...feat.properties,
            hotspots: totalCount,
            risk: riskLevel,
          },
        };
      }),
    };
  }, [geoJsonData, hotspots, filters.confidenceMin]);

  // Refs to keep latest data for style-switch repopulation (avoid stale closure)
  const hotspotsRef = useRef(hotspots);
  const fieldReportsRef = useRef(fieldReports);
  const poskoUnitsRef = useRef(poskoUnits);
  const filtersRef = useRef(filters);
  const enrichedRef = useRef(enrichedProvinceGeoJson);
  useEffect(() => { hotspotsRef.current = hotspots; }, [hotspots]);
  useEffect(() => { fieldReportsRef.current = fieldReports; }, [fieldReports]);
  useEffect(() => { poskoUnitsRef.current = poskoUnits; }, [poskoUnits]);
  useEffect(() => { filtersRef.current = filters; }, [filters]);
  useEffect(() => { enrichedRef.current = enrichedProvinceGeoJson; }, [enrichedProvinceGeoJson]);

  // 2. Setup all GeoJSON Sources and Map Layers
  const setupMapLayers = useCallback(
    (map: MapLibreMap) => {
      popupRef.current?.remove();

      // --- A. PROVINCES RISK CHOROPLETH LAYER (Natural Coastline Boundaries) ---
      const provinceGeoJson = enrichedProvinceGeoJson || { type: 'FeatureCollection', features: [] };
      if (!map.getSource('provinces-risk')) {
        map.addSource('provinces-risk', {
          type: 'geojson',
          data: provinceGeoJson,
        });

        // Choropleth fill - zoom-interpolated transparency to emphasize burn segmentation at close zoom
        map.addLayer({
          id: 'provinces-risk-fill',
          type: 'fill',
          source: 'provinces-risk',
          paint: {
            'fill-color': [
              'match',
              ['get', 'risk'],
              'Kritis', RISK_COLORS.Kritis,
              'Waspada', RISK_COLORS.Waspada,
              'Siaga', RISK_COLORS.Siaga,
              RISK_COLORS.Aman,
            ],
            'fill-opacity': [
              'interpolate', ['linear'], ['zoom'],
              4, 0.32,
              6, 0.18,
              8, 0.08,
              10, 0.035,
              13, 0.015,
            ],
          },
        });

        // Crisp White Border Line - fades on zoom
        map.addLayer({
          id: 'provinces-risk-outline',
          type: 'line',
          source: 'provinces-risk',
          paint: {
            'line-color': '#ffffff',
            'line-width': [
              'interpolate', ['linear'], ['zoom'],
              4, 1.2,
              9, 0.9,
              12, 0.5,
            ],
            'line-opacity': [
              'interpolate', ['linear'], ['zoom'],
              4, 0.85,
              8, 0.5,
              11, 0.25,
            ],
          },
        });
      } else {
        (map.getSource('provinces-risk') as GeoJSONSource).setData(provinceGeoJson);
      }

      // --- B. PROFESSIONAL VULNERABILITY HEATMAP (Gowa-style 5-gradasi) ---
      // Continuous raster: Sangat Rendah → Sangat Tinggi, clipped to burn area only
      if (!map.getSource('burn-area-source')) {
        map.addSource('burn-area-source', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });

        map.addLayer({
          id: 'burn-area-heatmap',
          type: 'heatmap',
          source: 'burn-area-source',
          maxzoom: 15,
          paint: {
            'heatmap-weight': [
              'interpolate', ['linear'], ['get', 'frp'],
              5, 0.30,
              30, 0.60,
              80, 1.0,
              150, 1.35,
            ],
            'heatmap-intensity': [
              'interpolate', ['linear'], ['zoom'],
              3, 0.85,
              5, 1.15,
              7, 1.55,
              9, 1.95,
              11, 2.35,
            ],
            // 5-stop Gowa palette — thresholds lowered agar terlihat di zoom jauh (density rendah)
            'heatmap-color': [
              'interpolate', ['linear'], ['heatmap-density'],
              0.0, 'rgba(0,0,0,0)',
              0.08, 'rgba(46,233,160,0.75)',
              0.22, 'rgba(143,227,138,0.82)',
              0.38, 'rgba(255,235,59,0.88)',
              0.60, 'rgba(255,0,0,0.92)',
              1.0, 'rgba(122,0,0,0.96)',
            ],
            'heatmap-radius': [
              'interpolate', ['linear'], ['zoom'],
              3, 36,
              5, 42,
              7, 48,
              9, 54,
              11, 60,
            ],
            'heatmap-opacity': [
              'interpolate', ['linear'], ['zoom'],
              3, 0.85,
              7, 0.75,
              10, 0.55,
              13, 0.35,
              15, 0.18,
            ],
          },
        });
      }

      // --- B2. BURN CONTOUR OUTLINE (thin contour over heatmap, not main fill) ---
      if (!map.getSource('burn-segments')) {
        map.addSource('burn-segments', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });

        // Faint fill retained for click target only (near-transparent)
        map.addLayer({
          id: 'burn-segments-fill',
          type: 'fill',
          source: 'burn-segments',
          paint: {
            'fill-color': '#000000',
            'fill-opacity': 0.01,
          },
        });

        // Crisp thin contour - professional edge, low visual weight
        map.addLayer({
          id: 'burn-segments-line',
          type: 'line',
          source: 'burn-segments',
          paint: {
            'line-color': [
              'step', ['get', 'frp'],
              '#fbbf24',
              30, '#fb923c',
              80, '#fecaca',
            ],
            'line-width': [
              'interpolate', ['linear'], ['zoom'],
              5, 0.6,
              8, 1.0,
              11, 1.4,
              13, 1.8,
            ],
            'line-opacity': [
              'interpolate', ['linear'], ['zoom'],
              5, 0.25,
              8, 0.45,
              11, 0.65,
              13, 0.85,
            ],
          },
        });

        // No glow - heatmap provides volumetric effect
        map.addLayer({
          id: 'burn-segments-glow',
          type: 'fill',
          source: 'burn-segments',
          paint: {
            'fill-color': '#000000',
            'fill-opacity': 0,
          },
        });
      }

      // --- C. HOTSPOTS WITH CLUSTERING ---
      if (!map.getSource('hotspots-source')) {
        map.addSource('hotspots-source', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
          cluster: true,
          clusterRadius: 35,
          clusterMaxZoom: 11,
        });

        // Modern Cluster Bubbles - outer soft halo for depth
        map.addLayer({
          id: 'hotspots-clusters-halo',
          type: 'circle',
          source: 'hotspots-source',
          filter: ['has', 'point_count'],
          paint: {
            'circle-radius': [
              'step',
              ['get', 'point_count'],
              20,   // <10
              10,
              26,   // 10-30
              30,
              32,   // 30-70
              70,
              38,   // >70
            ],
            'circle-color': [
              'step',
              ['get', 'point_count'],
              '#fb923c', // <10 warm orange halo
              10, '#f97316',
              30, '#ef4444',
              70, '#7f1d1d',
            ],
            'circle-opacity': 0.24,
            'circle-blur': 0.65,
            'circle-stroke-width': 0,
          },
        });

        // Hotspot Clusters Circle Badges - modern gradient feel, glass stroke + shadow
        map.addLayer({
          id: 'hotspots-clusters',
          type: 'circle',
          source: 'hotspots-source',
          filter: ['has', 'point_count'],
          paint: {
            'circle-radius': [
              'step',
              ['get', 'point_count'],
              14,   // <10
              10,
              18,   // 10-30
              30,
              22,   // 30-70
              70,
              27,   // >70
            ],
            'circle-color': [
              'step',
              ['get', 'point_count'],
              '#fb923c', // <10
              10, '#f97316', // 10-30
              30, '#ef4444', // 30-70
              70, '#991b1b', // >70 deep red
            ],
            'circle-opacity': 0.96,
            'circle-stroke-width': 2.2,
            'circle-stroke-color': 'rgba(255,255,255,0.92)',
            'circle-stroke-opacity': 0.95,
            'circle-blur': 0.04,
          },
        });

        // Inner glass highlight (subtle white overlay top)
        map.addLayer({
          id: 'hotspots-clusters-inner',
          type: 'circle',
          source: 'hotspots-source',
          filter: ['has', 'point_count'],
          paint: {
            'circle-radius': [
              'step',
              ['get', 'point_count'],
              5,
              10, 6.5,
              30, 8,
              70, 9.5,
            ],
            'circle-color': 'rgba(255,255,255,0.22)',
            'circle-opacity': 0.55,
            'circle-blur': 0.45,
            'circle-translate': [0, -1.2],
          },
        });

        // Cluster Number Count Text - modern bold with halo for readability on gradient
        map.addLayer({
          id: 'hotspots-cluster-count',
          type: 'symbol',
          source: 'hotspots-source',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': '{point_count_abbreviated}',
            'text-size': [
              'step',
              ['get', 'point_count'],
              11,
              30, 12,
              70, 13,
            ],
            'text-font': ['Noto Sans Bold', 'Open Sans Bold'],
            'text-allow-overlap': true,
            'text-ignore-placement': true,
          },
          paint: {
            'text-color': '#ffffff',
            'text-halo-color': 'rgba(0,0,0,0.45)',
            'text-halo-width': 1.1,
            'text-halo-blur': 0.5,
          },
        });

        // Individual Hotspot Outer Glow
        map.addLayer({
          id: 'hotspots-glow',
          type: 'circle',
          source: 'hotspots-source',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-radius': [
              'interpolate',
              ['linear'],
              ['get', 'frp'],
              5, 12,
              50, 18,
              150, 26,
            ],
            'circle-color': '#EF4444',
            'circle-opacity': 0.4,
            'circle-blur': 0.6,
          },
        });

        // Individual Hotspot Core Circle Pin
        map.addLayer({
          id: 'hotspots-circle',
          type: 'circle',
          source: 'hotspots-source',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-radius': [
              'interpolate',
              ['linear'],
              ['get', 'frp'],
              5, 5.5,
              50, 8.5,
              150, 13,
            ],
            'circle-color': [
              'step',
              ['get', 'frp'],
              '#F97316', // Low FRP (<25 MW) -> Orange
              25,
              '#EF4444', // Med FRP (25-80 MW) -> Red
              80,
              '#B91C1C', // High FRP (>80 MW) -> Dark Red
            ],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 0.95,
          },
        });
      }

      // --- C. FIELD REPORTS LAYER ---
      if (!map.getSource('field-reports-source')) {
        map.addSource('field-reports-source', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });

        map.addLayer({
          id: 'field-reports-point',
          type: 'circle',
          source: 'field-reports-source',
          paint: {
            'circle-radius': 8,
            'circle-color': '#7C3AED',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 0.95,
          },
        });
      }

      // --- D. SELECTED HIGHLIGHT (pulse for SUB fly) ---
      if (!map.getSource('selected-highlight')) {
        map.addSource('selected-highlight', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
        map.addLayer({
          id: 'selected-highlight-pulse',
          type: 'circle',
          source: 'selected-highlight',
          paint: {
            'circle-radius': 18,
            'circle-color': '#f97316',
            'circle-opacity': 0.22,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
            'circle-stroke-opacity': 0.9,
            'circle-blur': 0.4,
          },
        });
        map.addLayer({
          id: 'selected-highlight-core',
          type: 'circle',
          source: 'selected-highlight',
          paint: {
            'circle-radius': 7,
            'circle-color': '#ef4444',
            'circle-stroke-width': 2.5,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 1,
          },
        });
      }

      // --- E. POSKO DAMKAR & LOGISTIK ---
      if (!map.getSource('posko-source')) {
        map.addSource('posko-source', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });

        map.addLayer({
          id: 'posko-point',
          type: 'circle',
          source: 'posko-source',
          paint: {
            'circle-radius': 7.5,
            'circle-color': '#0D9488',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 0.95,
          },
        });
      }

      bindLayerEvents(map);
    },
    [enrichedProvinceGeoJson]
  );

  // 3. Interactive Popup & Click handlers
  const bindLayerEvents = (map: MapLibreMap) => {
    map.on('click', 'hotspots-clusters', async (e) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const clusterId = feature.properties?.cluster_id;
      const hotspotProps: any = feature.properties;
      const clusterCoords = (feature.geometry as any).coordinates as [number, number];
      if (clusterId == null) return;

      const source = map.getSource('hotspots-source') as any;
      try {
        const leaves: any[] = await new Promise((resolve, reject) => {
          source.getClusterLeaves(clusterId, 8, 0, (err: any, feats: any[]) => {
            if (err) reject(err); else resolve(feats);
          });
        });
        // Build sidebar-like list for cluster (up to 8 hottest)
        const sorted = leaves.sort((a: any, b: any) => (b.properties.frp || 0) - (a.properties.frp || 0));
        const totalFRP = sorted.reduce((s: number, f: any) => s + (f.properties.frp || 0), 0);
        const avgFRP = sorted.length ? (totalFRP / sorted.length).toFixed(1) : '0';
        const cards = sorted.map((f: any) => {
          const p = f.properties;
          const ha = estimateBurntHaFromFRP(p.frp || 0);
          const confColor = p.confidence >= 80 ? '#4ade80' : p.confidence >= 50 ? '#fbbf24' : '#f87171';
          return `
            <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; padding:8px 10px; background: rgba(30,41,59,0.85); border:1px solid rgba(51,65,85,0.5); border-radius:10px; margin-bottom:6px;">
              <div style="min-width:0; flex:1;">
                <div style="font-family: ui-monospace, monospace; font-size:10px; color:#22d3ee; font-weight:700; display:flex; align-items:center; gap:4px;">📍 ${p.latitude?.toFixed ? p.latitude.toFixed(5) : ''}, ${p.longitude?.toFixed ? p.longitude.toFixed(5) : ''}</div>
                <div style="font-size:10px; color:#cbd5e1; margin-top:2px; display:flex; gap:6px; flex-wrap:wrap;">
                  <span style="color:${p.frp > 80 ? '#ef4444' : p.frp > 30 ? '#f97316' : '#eab308'}; font-weight:800;">🔥 ${p.frp} MW</span>
                  <span style="color:#fdba74;">${p.brightnessCelsius}°C</span>
                  <span style="color:#fcd34d;">~${ha} Ha</span>
                  <span style="color:#94a3b8;">${p.landCover || ''}</span>
                </div>
              </div>
              <span style="font-size:10px; font-weight:700; color:${confColor}; white-space:nowrap;">${p.confidence}% ${p.confidenceLevel || ''}</span>
            </div>
          `;
        }).join('');
        const count = hotspotProps.point_count || leaves.length;
        const htmlCluster = `
          <div style="padding: 14px 14px 10px; font-family: system-ui, sans-serif; min-width: 300px; max-width: 340px; max-height: 420px; overflow-y: auto;">
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
              <div style="width:34px; height:34px; border-radius:10px; background: rgba(220,38,38,0.2); color:#EF4444; display:flex; align-items:center; justify-content:center; font-size:16px; border:1px solid rgba(239,68,68,0.3);">🔥</div>
              <div style="flex:1;">
                <div style="font-size:13px; font-weight:800; color:#ffffff;">Klaster ${count} Titik Panas</div>
                <div style="font-size:10px; color:#94a3b8;">Rata-rata FRP ${avgFRP} MW · Total ~${estimateBurntHaFromFRP(totalFRP).toFixed(1)} Ha terdampak</div>
              </div>
              <button onclick="this.closest('.maplibregl-popup').querySelector('.maplibregl-popup-close-button').click()" style="font-size:11px; color:#94a3b8; background:rgba(51,65,85,0.5); border:1px solid rgba(71,85,105,0.5); border-radius:8px; padding:4px 8px; cursor:pointer;">Tutup</button>
            </div>
            <div style="margin-bottom:8px; padding:6px 10px; background: rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.2); border-radius:8px; font-size:10px; color:#fca5a5; display:flex; justify-content:space-between;">
              <span>Detail mirip Sidebar · Top 8 terpanas</span>
              <span style="color:#f87171; font-weight:700;">${count} titik</span>
            </div>
            <div>${cards}</div>
            ${count > 8 ? `<div style="text-align:center; font-size:10px; color:#64748b; margin-top:6px;">+${count - 8} titik lain di klaster ini — zoom untuk lihat</div>` : ''}
          </div>
        `;
        showPopup(map, clusterCoords, htmlCluster);
        // Also gently zoom toward cluster for better segmentation view
        const zoom = await source.getClusterExpansionZoom(clusterId);
        map.easeTo({ center: clusterCoords, zoom: Math.min(zoom + 0.5, 12) });
        return;
      } catch {
        const zoom2 = await source.getClusterExpansionZoom(clusterId);
        map.easeTo({ center: clusterCoords, zoom: zoom2 + 0.5 });
      }
    });

    // Click on burn segment polygon -> show same hotspot detail via nearest hotspot lookup
    map.on('click', 'burn-segments-fill', (e) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const props = feature.properties as any;
      const lngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      const ha = estimateBurntHaFromFRP(props.frp || 0);
      const htmlSeg = `
        <div style="padding: 14px 16px; font-family: system-ui, sans-serif; min-width: 270px;">
          <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
            <div style="width:32px; height:32px; border-radius:10px; background: rgba(249,115,22,0.18); color:#F97316; display:flex; align-items:center; justify-content:center; font-size:16px; border:1px solid rgba(249,115,22,0.3);">🛰️</div>
            <div>
              <div style="font-size:13px; font-weight:800; color:#ffffff;">Segmentasi Luasan Terbakar</div>
              <div style="font-size:11px; color:#94a3b8;">${props.province || ''} — ${props.regency || ''}</div>
            </div>
          </div>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; padding:10px; background: rgba(30,41,59,0.8); border:1px solid rgba(51,65,85,0.6); border-radius:12px; text-align:center; margin-bottom:10px;">
            <div>
              <div style="font-size:10px; color:#94a3b8; font-weight:600;">FRP / Intensitas</div>
              <div style="font-size:14px; font-weight:800; color:#ef4444;">${props.frp} MW</div>
              <div style="font-size:10px; color:#fca5a5;">~${ha} Ha</div>
            </div>
            <div>
              <div style="font-size:10px; color:#94a3b8; font-weight:600;">Suhu</div>
              <div style="font-size:14px; font-weight:800; color:#f97316;">${props.brightnessCelsius}°C</div>
              <div style="font-size:10px; color:#94a3b8;">${props.confidence}% ${props.confidenceLevel || ''}</div>
            </div>
          </div>
          <div style="font-size:11px; color:#cbd5e1; line-height:1.6;">
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid rgba(51,65,85,0.35); padding:3px 0;"><span style="color:#94a3b8;">Koordinat Pusat:</span><span style="font-family:ui-monospace,monospace; color:#22d3ee; font-weight:700;">${props.latitude?.toFixed ? props.latitude.toFixed(5) : ''}, ${props.longitude?.toFixed ? props.longitude.toFixed(5) : ''}</span></div>
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid rgba(51,65,85,0.35); padding:3px 0;"><span style="color:#94a3b8;">Satelit:</span><span style="font-weight:700; color:#fff;">${props.satellite || 'VIIRS'}</span></div>
            <div style="display:flex; justify-content:space-between; padding:3px 0;"><span style="color:#94a3b8;">Lahan:</span><span style="font-weight:700; color:#fff;">${props.landCover || ''}</span></div>
          </div>
          <div style="margin-top:8px; padding:6px 10px; background: rgba(234,179,8,0.08); border:1px solid rgba(234,179,8,0.2); border-radius:8px; font-size:10px; color:#fde68a;">Segmentasi ini dihitung akurat dari FRP NASA (+ radius ~ ${Math.sqrt((ha/100)/Math.PI).toFixed(2)} km) — bukan bounding box.</div>
        </div>
      `;
      showPopup(map, lngLat, htmlSeg);
    });

    map.on('click', 'hotspots-circle', (e) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const props = feature.properties as any;
      const coords = (feature.geometry as any).coordinates as [number, number];
      const ha = estimateBurntHaFromFRP(props.frp || 0);
      const html = `
        <div style="padding: 14px 14px 10px; font-family: system-ui, sans-serif; min-width: 280px;">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
            <div style="width: 32px; height: 32px; border-radius: 10px; background: rgba(220, 38, 38, 0.2); color: #EF4444; display: flex; align-items: center; justify-content: center; font-size: 16px; border:1px solid rgba(239,68,68,0.3);">🔥</div>
            <div style="flex:1; min-width:0;">
              <div style="font-size: 13px; font-weight: 800; color: #ffffff;">Titik Panas Satelit</div>
              <div style="font-size: 11px; color: #94a3b8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${props.province} — ${props.regency}</div>
            </div>
          </div>
          <div style="padding:8px 10px; background: rgba(15,23,42,0.7); border:1px solid rgba(51,65,85,0.5); border-radius:10px; margin-bottom:10px; display:flex; align-items:center; justify-content:space-between; gap:8px;">
            <span style="font-family: ui-monospace, monospace; font-size:11px; color:#22d3ee; font-weight:700; display:flex; align-items:center; gap:6px;">📍 ${props.latitude?.toFixed ? '' : ''}${coords[1].toFixed(5)}, ${coords[0].toFixed(5)}</span>
            <span style="font-size:10px; color:#fcd34d; font-weight:700; background: rgba(251,191,36,0.12); border:1px solid rgba(251,191,36,0.25); border-radius:999px; padding:2px 8px;">~${ha} Ha</span>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 10px; background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(51, 65, 85, 0.6); border-radius: 12px; text-align: center; margin-bottom: 10px;">
            <div>
              <div style="font-size: 10px; color: #94a3b8; font-weight: 600;">Suhu Kecerahan</div>
              <div style="font-size: 14px; font-weight: 800; color: #f97316;">${props.brightnessCelsius}°C</div>
            </div>
            <div>
              <div style="font-size: 10px; color: #94a3b8; font-weight: 600;">Daya Radiasi (FRP)</div>
              <div style="font-size: 14px; font-weight: 800; color: #ef4444;">${props.frp} MW</div>
            </div>
          </div>

          <div style="font-size: 11px; color: #cbd5e1; line-height: 1.6;">
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(51, 65, 85, 0.4); padding: 3px 0;">
              <span style="color: #94a3b8;">Satelit / Sensor:</span>
              <span style="font-weight: 700; color: #ffffff;">${props.satellite}</span>
            </div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(51, 65, 85, 0.4); padding: 3px 0;">
              <span style="color: #94a3b8;">Tipe Lahan:</span>
              <span style="font-weight: 700; color: #ffffff;">${props.landCover}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 3px 0;">
              <span style="color: #94a3b8;">Akurasi Deteksi:</span>
              <span style="font-weight: 700; color: #4ade80;">${props.confidence}% (${props.confidenceLevel})</span>
            </div>
          </div>
          <div style="margin-top:8px; padding:6px 10px; background: rgba(249,115,22,0.08); border:1px dashed rgba(249,115,22,0.25); border-radius:8px; font-size:10px; color:#fed7aa; display:flex; gap:6px;"><span>🛰️</span><span>Segmentasi poligon luasan di peta ≈ ${ha} Ha (FRP ${props.frp} MW) — lihat layer oranye/merah.</span></div>
        </div>
      `;

      showPopup(map, coords, html);
    });

    map.on('click', 'provinces-risk-fill', (e) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const props = feature.properties as any;

      const html = `
        <div style="padding: 14px 16px; font-family: system-ui, sans-serif; min-width: 240px;">
          <div style="font-size: 14px; font-weight: 800; color: #ffffff;">Provinsi ${props.name}</div>
          <div style="margin: 6px 0 10px; display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 999px; background: ${
            RISK_COLORS[props.risk as keyof typeof RISK_COLORS] || '#16A34A'
          }; color: #ffffff; font-size: 11px; font-weight: 700;">
            Status: ${props.risk || 'Aman'}
          </div>
          <div style="display: flex; gap: 12px; padding: 10px 0; border-top: 1px solid rgba(51, 65, 85, 0.5); font-size: 11px;">
            <div style="flex: 1; text-align: center;">
              <div style="font-size: 15px; font-weight: 800; color: #ef4444;">${props.hotspots || 0}</div>
              <div style="font-size: 9px; color: #94a3b8; text-transform: uppercase;">Titik Panas</div>
            </div>
            <div style="width: 1px; background: rgba(51, 65, 85, 0.5);"></div>
            <div style="flex: 1; text-align: center;">
              <div style="font-size: 15px; font-weight: 800; color: #f97316;">${Math.round((props.hotspots || 0) * 5.4)} Ha</div>
              <div style="font-size: 9px; color: #94a3b8; text-transform: uppercase;">Luas Terbakar</div>
            </div>
          </div>
        </div>
      `;

      showPopup(map, [e.lngLat.lng, e.lngLat.lat], html);
    });

    map.on('click', 'field-reports-point', (e) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const props = feature.properties as any;
      const coords = (feature.geometry as any).coordinates as [number, number];
      const needsArr = JSON.parse(props.urgentNeeds || '[]');

      const html = `
        <div style="padding: 14px 16px; font-family: system-ui, sans-serif; max-width: 290px;">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
            <div style="width: 32px; height: 32px; border-radius: 10px; background: rgba(124, 58, 237, 0.2); color: #A78BFA; display: flex; align-items: center; justify-content: center; font-size: 16px;">📋</div>
            <div>
              <div style="font-size: 13px; font-weight: 800; color: #ffffff;">${props.locationName}</div>
              <div style="font-size: 10px; color: #c4b5fd;">Laporan: ${props.category}</div>
            </div>
          </div>
          <div style="display: inline-block; padding: 2px 8px; border-radius: 999px; background: rgba(220, 38, 38, 0.2); border: 1px solid rgba(220, 38, 38, 0.4); color: #f87171; font-size: 10px; font-weight: 700; margin-bottom: 8px;">
            ${props.fireStatus}
          </div>
          <p style="font-size: 11px; color: #cbd5e1; line-height: 1.5; margin-bottom: 8px;">${props.notes}</p>
          ${
            needsArr.length > 0
              ? `<div style="padding: 6px 10px; background: rgba(30, 41, 59, 0.8); border-radius: 8px; font-size: 10px; color: #c4b5fd; margin-bottom: 8px;">
                  <b>Kebutuhan:</b> ${needsArr.join(', ')}
                </div>`
              : ''
          }
          <div style="font-size: 10px; color: #94a3b8; border-top: 1px solid rgba(51, 65, 85, 0.5); padding-top: 6px; display: flex; justify-content: space-between;">
            <span>Pelapor: <b>${props.reporterName}</b></span>
            <span>👍 ${props.upvotes} Dukungan</span>
          </div>
        </div>
      `;

      showPopup(map, coords, html);
    });

    map.on('click', 'posko-point', (e) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const props = feature.properties as any;
      const coords = (feature.geometry as any).coordinates as [number, number];

      const html = `
        <div style="padding: 14px 16px; font-family: system-ui, sans-serif; min-width: 260px;">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
            <div style="width: 32px; height: 32px; border-radius: 10px; background: rgba(13, 148, 136, 0.2); color: #2DD4BF; display: flex; align-items: center; justify-content: center; font-size: 16px;">🚒</div>
            <div>
              <div style="font-size: 13px; font-weight: 800; color: #ffffff;">${props.name}</div>
              <div style="font-size: 10px; color: #5eead4;">${props.type}</div>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; padding: 8px; background: rgba(30, 41, 59, 0.8); border-radius: 10px; text-align: center; margin-bottom: 10px;">
            <div>
              <div style="font-size: 9px; color: #94a3b8;">Personil</div>
              <div style="font-size: 12px; font-weight: 800; color: #ffffff;">${props.personnelCount}</div>
            </div>
            <div>
              <div style="font-size: 9px; color: #94a3b8;">Tangki Air</div>
              <div style="font-size: 12px; font-weight: 800; color: #2dd4bf;">${props.waterTankerCount} Unit</div>
            </div>
            <div>
              <div style="font-size: 9px; color: #94a3b8;">Masker</div>
              <div style="font-size: 12px; font-weight: 800; color: #4ade80;">${props.n95MaskStock}</div>
            </div>
          </div>
          <div style="font-size: 10px; color: #94a3b8;">
            <div>📍 ${props.locationName}</div>
            <div>📞 PIC: <b style="color: #cbd5e1;">${props.contactPerson} (${props.contactPhone})</b></div>
          </div>
        </div>
      `;

      showPopup(map, coords, html);
    });

    const clickableLayers = [
      'hotspots-clusters',
      'hotspots-circle',
      'provinces-risk-fill',
      'burn-segments-fill',
      'burn-segments-line',
      'field-reports-point',
      'posko-point',
    ];
    clickableLayers.forEach((l) => {
      map.on('mouseenter', l, () => (map.getCanvas().style.cursor = 'pointer'));
      map.on('mouseleave', l, () => (map.getCanvas().style.cursor = ''));
    });
  };

  const showPopup = (map: MapLibreMap, lngLat: [number, number], html: string) => {
    popupRef.current?.remove();
    popupRef.current = new Popup({
      closeButton: true,
      className: 'fire-popup',
      maxWidth: '320px',
    })
      .setLngLat(lngLat)
      .setHTML(html)
      .addTo(map);
  };

  // 4. Initialize Map on Mount
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new MapLibreMap({
      container: mapContainerRef.current,
      style: MAP_STYLES[activeStyle].style,
      bounds: INDONESIA_BOUNDS,
      fitBoundsOptions: { padding: 40 },
      attributionControl: false,
      canvasContextAttributes: { preserveDrawingBuffer: true },
    });

    mapRef.current = map;

    map.addControl(new AttributionControl({ compact: true }), 'bottom-right');
    map.addControl(new ScaleControl({ maxWidth: 120, unit: 'metric' }), 'bottom-left');

    map.on('load', () => {
      setIsMapLoaded(true);
      setupMapLayers(map);
      if (mapCanvasRef) {
        mapCanvasRef.current = map.getCanvas();
      }
      // Ensure map resizes correctly after container flex layout (mobile)
      setTimeout(() => { try { map.resize(); } catch {} }, 100);
      setTimeout(() => { try { map.resize(); } catch {} }, 600);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      setIsMapLoaded(false);
    };
  }, []);

  useEffect(() => {
    if (mapRef.current && mapCanvasRef) {
      mapCanvasRef.current = mapRef.current.getCanvas();
    }
  });

  // Switch Base Map Style — preserve all layers after style change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;

    map.setStyle(MAP_STYLES[activeStyle].style);
    map.once('style.load', () => {
      setupMapLayers(map);
      // Repopulate all data sources after style reload (otherwise layers stay empty → hilang di satelit)
      setTimeout(() => {
        const m = mapRef.current;
        if (!m) return;
        // Retry until sources ready (handle slow style load)
        let tries = 0;
        const tryPopulate = () => {
          if (!m.getSource('hotspots-source') && tries < 10) { tries++; setTimeout(tryPopulate, 100); return; }
          if (!m.getSource('hotspots-source')) return;
        const curHotspots = hotspotsRef.current;
        const curFilters = filtersRef.current;
        const curEnriched = enrichedRef.current;
        const curFieldReports = fieldReportsRef.current;
        const curPosko = poskoUnitsRef.current;
        const filtered = curHotspots.filter((h) => {
          if (h.confidence < curFilters.confidenceMin) return false;
          if (curFilters.selectedProvince !== '__all__' && h.province !== curFilters.selectedProvince) return false;
          return true;
        });
        const hotspotFeatures = filtered.map((h) => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [h.longitude, h.latitude] },
          properties: {
            id: h.id,
            brightnessCelsius: h.brightnessCelsius,
            frp: h.frp,
            confidence: h.confidence,
            confidenceLevel: h.confidenceLevel,
            satellite: h.satellite,
            province: h.province,
            regency: h.regency,
            landCover: h.landCover,
            windDirection: h.windDirection,
            latitude: h.latitude,
            longitude: h.longitude,
          },
        }));
        (m.getSource('hotspots-source') as GeoJSONSource)?.setData({ type: 'FeatureCollection', features: hotspotFeatures });
        (m.getSource('burn-area-source') as GeoJSONSource)?.setData({ type: 'FeatureCollection', features: hotspotFeatures });
        const burnSegSrc = m.getSource('burn-segments') as GeoJSONSource;
        if (burnSegSrc) {
          const segFeatures = filtered.map((h) => {
            const ha = estimateBurntHaFromFRP(h.frp);
            let radiusKm = Math.sqrt((ha * 0.01) / Math.PI);
            radiusKm = Math.max(0.60, Math.min(3.2, radiusKm * 1.6 + h.frp * 0.010));
            if (h.confidence < 50) radiusKm *= 1.10;
            if (h.confidence >= 80) radiusKm *= 0.92;
            const polygon = createCirclePolygon([h.longitude, h.latitude], radiusKm, 32);
            return {
              type: 'Feature' as const,
              geometry: { type: 'Polygon' as const, coordinates: [polygon] },
              properties: {
                id: h.id, frp: h.frp, brightnessCelsius: h.brightnessCelsius, confidence: h.confidence,
                confidenceLevel: h.confidenceLevel, satellite: h.satellite, province: h.province,
                regency: h.regency, landCover: h.landCover, latitude: h.latitude, longitude: h.longitude, burntHa: ha,
              },
            };
          });
          burnSegSrc.setData({ type: 'FeatureCollection', features: segFeatures });
        }
        if (curEnriched && m.getSource('provinces-risk')) {
          (m.getSource('provinces-risk') as GeoJSONSource).setData(curEnriched);
        }
        const repSrc = m.getSource('field-reports-source') as GeoJSONSource;
        if (repSrc) {
          const repFiltered = curFieldReports.filter((r) => {
            if (curFilters.selectedProvince !== '__all__' && r.province !== curFilters.selectedProvince) return false;
            if (curFilters.fireStatusFilter !== '__all__' && r.fireStatus !== curFilters.fireStatusFilter) return false;
            return true;
          });
          repSrc.setData({
            type: 'FeatureCollection',
            features: repFiltered.map((r) => ({
              type: 'Feature', geometry: { type: 'Point', coordinates: [r.longitude, r.latitude] },
              properties: { id: r.id, reporterName: r.reporterName, category: r.category, locationName: r.locationName, fireStatus: r.fireStatus, notes: r.notes, urgentNeeds: JSON.stringify(r.urgentNeeds), upvotes: r.upvotes },
            })),
          });
        }
        const poskoSrc = m.getSource('posko-source') as GeoJSONSource;
        if (poskoSrc) {
          const poskoFiltered = curPosko.filter((p) => curFilters.selectedProvince === '__all__' || p.province === curFilters.selectedProvince);
          poskoSrc.setData({
            type: 'FeatureCollection',
            features: poskoFiltered.map((p) => ({
              type: 'Feature', geometry: { type: 'Point', coordinates: [p.longitude, p.latitude] },
              properties: { id: p.id, name: p.name, type: p.type, locationName: p.locationName, personnelCount: p.personnelCount, waterTankerCount: p.waterTankerCount, n95MaskStock: p.n95MaskStock, contactPerson: p.contactPerson, contactPhone: p.contactPhone },
            })),
          });
        }
        const visHot = curFilters.showHotspots ? 'visible' : 'none';
        const visCluster = curFilters.showHotspots && curFilters.showClusterCount ? 'visible' : 'none';
        ['hotspots-circle','hotspots-glow','burn-area-heatmap','burn-segments-fill','burn-segments-line','burn-segments-glow'].forEach((ly) => {
          if (m.getLayer(ly)) m.setLayoutProperty(ly, 'visibility', visHot);
        });
        ['hotspots-clusters','hotspots-clusters-halo','hotspots-clusters-inner','hotspots-cluster-count'].forEach((ly) => {
          if (m.getLayer(ly)) m.setLayoutProperty(ly, 'visibility', visCluster);
        });
        const visField = curFilters.showFieldReports ? 'visible' : 'none';
        if (m.getLayer('field-reports-point')) m.setLayoutProperty('field-reports-point', 'visibility', visField);
        const visPosko = curFilters.showPosko ? 'visible' : 'none';
        if (m.getLayer('posko-point')) m.setLayoutProperty('posko-point', 'visibility', visPosko);
        const visProv = curFilters.showRiskPolygons ? 'visible' : 'none';
        if (m.getLayer('provinces-risk-fill')) m.setLayoutProperty('provinces-risk-fill', 'visibility', visProv);
        if (m.getLayer('provinces-risk-outline')) m.setLayoutProperty('provinces-risk-outline', 'visibility', visProv);
        (m.getSource('selected-highlight') as GeoJSONSource)?.setData({ type: 'FeatureCollection', features: [] });
        };
        tryPopulate();
      }, 100);
    });
  }, [activeStyle]);

  // Sync Province Choropleth Data when enriched GeoJSON changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded || !enrichedProvinceGeoJson) return;

    if (map.getSource('provinces-risk')) {
      (map.getSource('provinces-risk') as GeoJSONSource).setData(enrichedProvinceGeoJson);
    } else {
      setupMapLayers(map);
    }
  }, [enrichedProvinceGeoJson, isMapLoaded, setupMapLayers]);

  // Fly to target from sidebar + highlight pulse for SUB
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded || !flyTo) return;
    map.flyTo({
      center: flyTo.center,
      zoom: flyTo.zoom,
      speed: 1.2,
      curve: 1.1,
      essential: true,
    });
    // Highlight pulse when zooming to SUB level (>=12.5)
    const selSrc = map.getSource('selected-highlight') as GeoJSONSource;
    if (selSrc) {
      if (flyTo.zoom >= 12) {
        selSrc.setData({
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            geometry: { type: 'Point', coordinates: flyTo.center },
            properties: {},
          }],
        });
        // Auto clear after 8s
        setTimeout(() => {
          try {
            (map.getSource('selected-highlight') as GeoJSONSource)?.setData({ type: 'FeatureCollection', features: [] });
          } catch {}
        }, 8000);
      } else {
        selSrc.setData({ type: 'FeatureCollection', features: [] });
      }
    }
  }, [flyTo, isMapLoaded]);

  // Sync Hotspots Data to Map
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;

    const source = map.getSource('hotspots-source') as GeoJSONSource;
    if (!source) return;

    const filtered = hotspots.filter((h) => {
      if (h.confidence < filters.confidenceMin) return false;
      if (filters.selectedProvince !== '__all__' && h.province !== filters.selectedProvince) {
        return false;
      }
      return true;
    });

    const hotspotFeatures = filtered.map((h) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [h.longitude, h.latitude] },
      properties: {
        id: h.id,
        brightnessCelsius: h.brightnessCelsius,
        frp: h.frp,
        confidence: h.confidence,
        confidenceLevel: h.confidenceLevel,
        satellite: h.satellite,
        province: h.province,
        regency: h.regency,
        landCover: h.landCover,
        windDirection: h.windDirection,
        latitude: h.latitude,
        longitude: h.longitude,
      },
    }));

    source.setData({ type: 'FeatureCollection', features: hotspotFeatures });

    // Also feed the burn-area source with the same data for heatmap/perimeter
    const burnSource = map.getSource('burn-area-source') as GeoJSONSource;
    if (burnSource) {
      burnSource.setData({ type: 'FeatureCollection', features: hotspotFeatures });
    }

    // Generate true polygon segmentation for each hotspot - akurat NASA FRP
    const burnSegSource = map.getSource('burn-segments') as GeoJSONSource;
    if (burnSegSource) {
      const segFeatures = filtered.map((h) => {
        const ha = estimateBurntHaFromFRP(h.frp);
        // Ha to radius km: area km2 = ha * 0.01, r = sqrt(area/pi) — akurat NASA
        let radiusKm = Math.sqrt((ha * 0.01) / Math.PI);
        // Enhance for visual clarity: VIIRS 375m pixel base 0.38km, FRP scaling diperkuat agar segmentasi terlihat jelas & kepotong di areanya saja
        radiusKm = Math.max(0.60, Math.min(3.2, radiusKm * 1.6 + h.frp * 0.010));
        // Confidence adjusts size slightly
        if (h.confidence < 50) radiusKm *= 1.10;
        if (h.confidence >= 80) radiusKm *= 0.92;
        const polygon = createCirclePolygon([h.longitude, h.latitude], radiusKm, 32);
        return {
          type: 'Feature' as const,
          geometry: { type: 'Polygon' as const, coordinates: [polygon] },
          properties: {
            id: h.id,
            frp: h.frp,
            brightnessCelsius: h.brightnessCelsius,
            confidence: h.confidence,
            confidenceLevel: h.confidenceLevel,
            satellite: h.satellite,
            province: h.province,
            regency: h.regency,
            landCover: h.landCover,
            latitude: h.latitude,
            longitude: h.longitude,
            burntHa: ha,
          },
        };
      });
      burnSegSource.setData({ type: 'FeatureCollection', features: segFeatures });
    }

    const vis = filters.showHotspots ? 'visible' : 'none';
    const visCluster = filters.showHotspots && filters.showClusterCount ? 'visible' : 'none';
    if (map.getLayer('hotspots-clusters')) map.setLayoutProperty('hotspots-clusters', 'visibility', visCluster);
    if (map.getLayer('hotspots-clusters-halo')) map.setLayoutProperty('hotspots-clusters-halo', 'visibility', visCluster);
    if (map.getLayer('hotspots-clusters-inner')) map.setLayoutProperty('hotspots-clusters-inner', 'visibility', visCluster);
    if (map.getLayer('hotspots-cluster-count')) map.setLayoutProperty('hotspots-cluster-count', 'visibility', visCluster);
    if (map.getLayer('hotspots-circle')) map.setLayoutProperty('hotspots-circle', 'visibility', vis);
    if (map.getLayer('hotspots-glow')) map.setLayoutProperty('hotspots-glow', 'visibility', vis);
    if (map.getLayer('burn-area-heatmap')) map.setLayoutProperty('burn-area-heatmap', 'visibility', vis);
    // legacy circle hidden (replaced by polygon)
    if (map.getLayer('burn-area-circles')) map.setLayoutProperty('burn-area-circles', 'visibility', 'none');
    if (map.getLayer('burn-segments-fill')) map.setLayoutProperty('burn-segments-fill', 'visibility', vis);
    if (map.getLayer('burn-segments-line')) map.setLayoutProperty('burn-segments-line', 'visibility', vis);
    if (map.getLayer('burn-segments-glow')) map.setLayoutProperty('burn-segments-glow', 'visibility', vis);
  }, [hotspots, filters, isMapLoaded]);


  // Sync Field Reports to Map
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;

    const source = map.getSource('field-reports-source') as GeoJSONSource;
    if (!source) return;

    const filtered = fieldReports.filter((r) => {
      if (filters.selectedProvince !== '__all__' && r.province !== filters.selectedProvince) {
        return false;
      }
      if (filters.fireStatusFilter !== '__all__' && r.fireStatus !== filters.fireStatusFilter) {
        return false;
      }
      return true;
    });

    source.setData({
      type: 'FeatureCollection',
      features: filtered.map((r) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [r.longitude, r.latitude] },
        properties: {
          id: r.id,
          reporterName: r.reporterName,
          category: r.category,
          locationName: r.locationName,
          fireStatus: r.fireStatus,
          notes: r.notes,
          urgentNeeds: JSON.stringify(r.urgentNeeds),
          upvotes: r.upvotes,
        },
      })),
    });

    const vis = filters.showFieldReports ? 'visible' : 'none';
    if (map.getLayer('field-reports-point'))
      map.setLayoutProperty('field-reports-point', 'visibility', vis);
  }, [fieldReports, filters, isMapLoaded]);

  // Sync Posko to Map
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;

    const source = map.getSource('posko-source') as GeoJSONSource;
    if (!source) return;

    const filtered = poskoUnits.filter((p) => {
      if (filters.selectedProvince !== '__all__' && p.province !== filters.selectedProvince) {
        return false;
      }
      return true;
    });

    source.setData({
      type: 'FeatureCollection',
      features: filtered.map((p) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.longitude, p.latitude] },
        properties: {
          id: p.id,
          name: p.name,
          type: p.type,
          locationName: p.locationName,
          personnelCount: p.personnelCount,
          waterTankerCount: p.waterTankerCount,
          n95MaskStock: p.n95MaskStock,
          contactPerson: p.contactPerson,
          contactPhone: p.contactPhone,
        },
      })),
    });

    const vis = filters.showPosko ? 'visible' : 'none';
    if (map.getLayer('posko-point')) map.setLayoutProperty('posko-point', 'visibility', vis);
  }, [poskoUnits, filters, isMapLoaded]);

  // Sync Province Risk Layer visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;

    const vis = filters.showRiskPolygons ? 'visible' : 'none';
    if (map.getLayer('provinces-risk-fill'))
      map.setLayoutProperty('provinces-risk-fill', 'visibility', vis);
    if (map.getLayer('provinces-risk-outline'))
      map.setLayoutProperty('provinces-risk-outline', 'visibility', vis);
  }, [filters.showRiskPolygons, isMapLoaded]);

  const handleResetView = () => {
    mapRef.current?.fitBounds(INDONESIA_BOUNDS, { padding: 40 });
  };

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Floating Map Controls - Top Left + Center - smaller on mobile */}
      <div className="absolute top-3 left-2 sm:top-4 sm:left-4 z-20 flex flex-col gap-1.5 sm:gap-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsStyleMenuOpen(!isStyleMenuOpen)}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-slate-900/95 hover:bg-slate-800 text-white text-[11px] sm:text-xs font-semibold border border-slate-700/80 shadow-xl backdrop-blur transition-all active:scale-95 cursor-pointer"
          >
            <Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-400" />
            <span>Peta: {MAP_STYLES[activeStyle].label.split(' ')[0]}</span>
          </button>

          {isStyleMenuOpen && (
            <div className="absolute top-full mt-1.5 left-0 w-56 rounded-xl bg-slate-900/95 border border-slate-700 shadow-2xl p-1.5 backdrop-blur z-30">
              {(Object.keys(MAP_STYLES) as MapLayerStyle[]).map((key) => (
                <button
                  key={key}
                  onClick={() => {
                    setActiveStyle(key);
                    setIsStyleMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-between ${
                    activeStyle === key
                      ? 'bg-red-600/20 text-red-300 font-bold border border-red-500/30'
                      : 'text-slate-300 hover:bg-slate-800/80'
                  }`}
                >
                  <span>{MAP_STYLES[key].label}</span>
                  {activeStyle === key && <span className="h-1.5 w-1.5 rounded-full bg-red-400" />}
                </button>
              ))}
            </div>
          )}
        </div>
        {showResetButton && onResetIndonesia && (
          <button
            type="button"
            onClick={onResetIndonesia}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] sm:text-xs font-bold border border-emerald-500/50 shadow-xl backdrop-blur transition-all active:scale-95 cursor-pointer"
            title="Kembali ke pantauan seluruh Indonesia"
          >
            <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-white animate-pulse"></span>
            <span>{resetLabel || 'Kembali ke Deteksi Indonesia'}</span>
          </button>
        )}
      </div>

      {/* Center Top Reset Pill (visible on larger screens) */}
      {showResetButton && onResetIndonesia && (
        <div className="hidden lg:flex absolute top-4 left-1/2 -translate-x-1/2 z-20">
          <button
            type="button"
            onClick={onResetIndonesia}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/95 hover:bg-slate-800 text-white text-xs font-bold border border-slate-700/80 shadow-xl backdrop-blur transition-all active:scale-95 cursor-pointer"
          >
            <Maximize2 className="h-3.5 w-3.5 text-emerald-400" />
            <span>Deteksi Indonesia</span>
            {resetLabel && resetLabel !== 'Kembali ke Deteksi Indonesia' && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px]">{resetLabel}</span>
            )}
          </button>
        </div>
      )}

      {/* Floating Map Controls - Top Right - smaller on mobile */}
      <div className="absolute top-3 right-2 sm:top-4 sm:right-4 z-20 flex flex-col gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={handleResetView}
          title="Kembali ke Tampilan Seluruh Indonesia"
          className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-slate-900/95 hover:bg-slate-800 text-white border border-slate-700/80 shadow-xl backdrop-blur transition-all active:scale-95 cursor-pointer"
        >
          <Maximize2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-300" />
        </button>

        <div className="flex flex-col rounded-xl bg-slate-900/95 border border-slate-700/80 shadow-xl backdrop-blur overflow-hidden">
          <button
            type="button"
            onClick={() => mapRef.current?.zoomIn()}
            title="Perbesar"
            className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer border-b border-slate-800"
          >
            <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
          <button
            type="button"
            onClick={() => mapRef.current?.zoomOut()}
            title="Perkecil"
            className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <Minus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
        </div>
      </div>

      {/* Debug badge */}
      <div className="absolute bottom-14 left-4 z-30 px-2 py-1 rounded bg-black/80 text-[10px] font-mono text-white border border-white/20 shadow-lg">
        MAP:{isMapLoaded ? 'OK' : 'LOADING'} | HS:{hotspots.length} | FIL:{hotspots.filter(h=>h.confidence>=filters.confidenceMin && (filters.selectedProvince==='__all__'||h.province===filters.selectedProvince)).length} | CL:{filters.showClusterCount?'ON':'OFF'} | Z:{mapRef.current ? Math.round((mapRef.current.getZoom()*10))/10 : '-'}
      </div>

      {/* Floating Map Legend - Bottom Right Desktop - 5 gradasi kerawanan + points */}
      <div className="hidden lg:flex absolute bottom-4 right-4 z-20 items-center gap-2.5 px-3.5 py-2 rounded-full bg-slate-900/95 border border-slate-800 shadow-xl backdrop-blur text-[10px] font-bold text-slate-200">
        <span className="text-slate-400 font-extrabold mr-1">Kerawanan:</span>
        <div className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-sm border border-white/40" style={{ background: '#2EE9A0' }}></span>
          <span>Sangat Rendah</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-sm border border-white/40" style={{ background: '#8FE38A' }}></span>
          <span>Rendah</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-sm border border-white/40" style={{ background: '#FFEB3B' }}></span>
          <span>Sedang</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-sm border border-white/40" style={{ background: '#FF0000' }}></span>
          <span>Tinggi</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-sm border border-white/40" style={{ background: '#7A0000' }}></span>
          <span>Sangat Tinggi</span>
        </div>
        <span className="w-px h-4 bg-slate-700 mx-1"></span>
        <div className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-red-600 border border-white"></span>
          <span>Hotspot</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-purple-600 border border-white"></span>
          <span>Laporan</span>
        </div>
      </div>
      {/* Mobile legend simplified */}
      <div className="flex lg:hidden absolute bottom-4 right-4 left-4 z-20 items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/95 border border-slate-800 shadow-xl backdrop-blur text-[9px] font-bold text-slate-300">
        <span className="h-2 w-3 rounded-sm" style={{ background: '#2EE9A0' }}></span> Rendah
        <span className="h-2 w-3 rounded-sm" style={{ background: '#FFEB3B' }}></span> Sedang
        <span className="h-2 w-3 rounded-sm" style={{ background: '#FF0000' }}></span> Tinggi
        <span className="h-2 w-3 rounded-sm" style={{ background: '#7A0000' }}></span> Sangat Tinggi
      </div>
    </div>
  );
};
