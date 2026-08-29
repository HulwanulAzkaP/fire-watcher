interface InfographicData {
  hotspotsCount: number;
  totalBurntAreaHa: number;
  criticalProvincesCount: number;
  activePoskoCount: number;
  worstCityName: string;
  worstCityISPU: number;
  updatedAt: string;
  legendItems: { label: string; color: string }[];
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h);
  }
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(' ');
  let line = '';
  let curY = y;
  for (const w of words) {
    const testLine = line ? `${line} ${w}` : w;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, curY);
      line = w;
      curY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) {
    ctx.fillText(line, x, curY);
  }
  return curY;
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLCanvasElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number
) {
  const sw = img.width;
  const sh = img.height;
  if (sw === 0 || sh === 0 || dw === 0 || dh === 0) {
    ctx.drawImage(img, dx, dy, dw, dh);
    return;
  }
  const srcAspect = sw / sh;
  const dstAspect = dw / dh;
  let sx = 0, sy = 0, sW = sw, sH = sh;
  if (srcAspect > dstAspect) {
    sW = sh * dstAspect;
    sx = (sw - sW) / 2;
  } else {
    sH = sw / dstAspect;
    sy = (sh - sH) / 2;
  }
  ctx.drawImage(img, sx, sy, sW, sH, dx, dy, dw, dh);
}

export async function generateInfographicImage(
  mapCanvas: HTMLCanvasElement | null,
  data: InfographicData,
  scale: number = 2
): Promise<string> {
  const canvas = document.createElement('canvas');
  const width = 1080;
  const height = 1350;

  canvas.width = width * scale;
  canvas.height = height * scale;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context is not available');

  ctx.scale(scale, scale);
  const fontMain = '"Plus Jakarta Sans", "Rethink Sans", system-ui, sans-serif';

  // 1. Background
  ctx.fillStyle = '#080c14';
  ctx.fillRect(0, 0, width, height);

  // 2. Blurred Map Backdrop - cover aspect tanpa stretch
  if (mapCanvas && mapCanvas.width > 0 && mapCanvas.height > 0) {
    try {
      mapCanvas.toDataURL('image/png');
      ctx.save();
      try {
        ctx.filter = 'blur(16px) brightness(0.4) saturate(1.2)';
      } catch {}
      // Backdrop cover full canvas with bleed
      drawImageCover(ctx, mapCanvas, -30, -30, width + 60, height + 60);
      ctx.restore();
      try { ctx.filter = 'none'; } catch {}
    } catch (e) {
      console.warn('Map canvas tainted, using fallback background for infographic', e);
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      for (let x = 0; x < width; x += 80) {
        ctx.fillRect(x, 0, 1, height);
      }
      for (let y = 0; y < height; y += 80) {
        ctx.fillRect(0, y, width, 1);
      }
      ctx.restore();
    }
  }

  // 3. Dark gradient overlay
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, 'rgba(8, 12, 20, 0.75)');
  grad.addColorStop(0.28, 'rgba(8, 12, 20, 0.88)');
  grad.addColorStop(0.68, 'rgba(8, 12, 20, 0.94)');
  grad.addColorStop(1, 'rgba(4, 6, 11, 0.98)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // 4. Header Bar & Title
  ctx.fillStyle = '#ef4444';
  roundRect(ctx, 50, 50, 52, 52, 14);
  ctx.fill();

  ctx.font = `bold 28px ${fontMain}`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText('🔥', 76, 86);

  ctx.textAlign = 'left';
  ctx.font = `800 24px ${fontMain}`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText('FIRE WATCHER INDONESIA', 118, 74);

  ctx.font = `600 13px ${fontMain}`;
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('PUSAT PANTAUAN TITIK API & KARHUTLA NUSANTARA', 118, 95);

  // Live status badge top right
  ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
  roundRect(ctx, 840, 54, 190, 42, 21);
  ctx.fill();
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(862, 75, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#ef4444';
  ctx.fill();

  ctx.font = `700 12px ${fontMain}`;
  ctx.fillStyle = '#fca5a5';
  ctx.fillText('MONITORING AKTIF', 878, 79);

  // 5. Four Key Metric Cards
  const kpis = [
    {
      val: data.hotspotsCount.toLocaleString('id-ID'),
      unit: 'Titik',
      label: 'HOTSPOT SATELIT',
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.12)',
    },
    {
      val: `${data.totalBurntAreaHa.toLocaleString('id-ID')}`,
      unit: 'Ha',
      label: 'LUAS TERBAKAR',
      color: '#f97316',
      bg: 'rgba(249, 115, 22, 0.12)',
    },
    {
      val: `${data.worstCityISPU}`,
      unit: `ISPU (${data.worstCityName})`,
      label: 'UDARA TERBURUK',
      color: '#a855f7',
      bg: 'rgba(168, 85, 247, 0.12)',
    },
    {
      val: `${data.activePoskoCount}`,
      unit: 'Posko',
      label: 'DAMKAR / RELAWAN',
      color: '#3b82f6',
      bg: 'rgba(59, 130, 246, 0.12)',
    },
  ];

  const cardW = 222;
  const cardGap = 26;
  const startX = 50;
  const cardY = 135;
  const cardH = 110;

  kpis.forEach((kpi, idx) => {
    const x = startX + idx * (cardW + cardGap);

    ctx.fillStyle = kpi.bg;
    roundRect(ctx, x, cardY, cardW, cardH, 16);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = kpi.color;
    ctx.font = `800 32px ${fontMain}`;
    ctx.fillText(kpi.val, x + 16, cardY + 44);

    const valWidth = ctx.measureText(kpi.val).width;
    ctx.font = `600 13px ${fontMain}`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText(kpi.unit, x + 16 + valWidth + 6, cardY + 44);

    ctx.font = `700 12px ${fontMain}`;
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(kpi.label, x + 16, cardY + 80);
  });

  // 6. Map Viewport Frame
  const mapFrameX = 50;
  const mapFrameY = 275;
  const mapFrameW = 980;
  const mapFrameH = 590;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = '#0f172a';
  roundRect(ctx, mapFrameX, mapFrameY, mapFrameW, mapFrameH, 20);
  ctx.fill();
  ctx.restore();

  if (mapCanvas && mapCanvas.width > 0 && mapCanvas.height > 0) {
    try {
      mapCanvas.toDataURL('image/png');
      ctx.save();
      roundRect(ctx, mapFrameX, mapFrameY, mapFrameW, mapFrameH, 20);
      ctx.clip();
      // Frame: cover aspect tanpa stretch — peta tidak gepeng
      drawImageCover(ctx, mapCanvas, mapFrameX, mapFrameY, mapFrameW, mapFrameH);
      ctx.restore();
    } catch (e) {
      console.warn('Map frame tainted, drawing placeholder', e);
      ctx.save();
      roundRect(ctx, mapFrameX, mapFrameY, mapFrameW, mapFrameH, 20);
      ctx.fillStyle = '#1e293b';
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#64748b';
      ctx.font = `600 13px ${fontMain}`;
      ctx.textAlign = 'center';
      ctx.fillText('Peta satelit tidak tersedia untuk export (CORS)', width/2, mapFrameY + mapFrameH/2);
      ctx.textAlign = 'left';
    }
  } else {
    // No canvas available - draw placeholder
    ctx.save();
    roundRect(ctx, mapFrameX, mapFrameY, mapFrameW, mapFrameH, 20);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.restore();
  }

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, mapFrameX, mapFrameY, mapFrameW, mapFrameH, 20);
  ctx.stroke();

  // 7. Legend & Source Notes
  let legendY = 895;
  let legendX = 50;
  ctx.font = `700 13px ${fontMain}`;

  data.legendItems.forEach((item) => {
    ctx.fillStyle = item.color;
    ctx.beginPath();
    ctx.arc(legendX + 6, legendY - 4, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillText(item.label, legendX + 18, legendY);
    legendX += ctx.measureText(item.label).width + 36;
  });

  ctx.font = `500 12px ${fontMain}`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.fillText(
    `* Sumber Data: NASA FIRMS (VIIRS 375m / MODIS) · BMKG · KLHK SiPongi+ · Diperbarui: ${data.updatedAt}`,
    50,
    legendY + 28
  );

  // 8. Emergency Hotline & Posko Box
  const footerY = 960;
  const colW = 460;

  ctx.fillStyle = 'rgba(239, 68, 68, 0.08)';
  roundRect(ctx, 50, footerY, colW, 160, 16);
  ctx.fill();
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.font = `700 12px ${fontMain}`;
  ctx.fillStyle = '#f87171';
  ctx.fillText('LAYANAN DARURAT KEBAKARAN:', 70, footerY + 30);

  ctx.font = `800 20px ${fontMain}`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText('DAMKAR: 113  |  BNPB: 117', 70, footerY + 62);

  ctx.font = `500 12px ${fontMain}`;
  ctx.fillStyle = '#cbd5e1';
  wrapText(
    ctx,
    'Laporkan titik api baru segera kepada posko Damkar atau Satgas Karhutla terdekat untuk pemadaman dini.',
    70,
    footerY + 90,
    colW - 40,
    18
  );

  // Box for Logistics / Donation
  const col2X = 570;
  ctx.fillStyle = 'rgba(59, 130, 246, 0.08)';
  roundRect(ctx, col2X, footerY, colW, 160, 16);
  ctx.fill();
  ctx.strokeStyle = 'rgba(59, 130, 246, 0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.font = `700 12px ${fontMain}`;
  ctx.fillStyle = '#60a5fa';
  ctx.fillText('DUKUNGAN LOGISTIK & RELAWAN:', col2X + 20, footerY + 30);

  ctx.font = `800 18px ${fontMain}`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText('BANK MANDIRI : 130-00-1544501-1', col2X + 20, footerY + 60);

  ctx.font = `600 13px ${fontMain}`;
  ctx.fillStyle = '#93c5fd';
  ctx.fillText('a.n. Posko Relawan Karhutla Indonesia', col2X + 20, footerY + 84);

  ctx.font = `500 12px ${fontMain}`;
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('WhatsApp Konfirmasi: 0812-7890-4412 (Satgas Posko)', col2X + 20, footerY + 115);

  // 9. Bottom Footer Lockup
  const bottomY = 1260;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(50, bottomY - 30);
  ctx.lineTo(width - 50, bottomY - 30);
  ctx.stroke();

  ctx.font = `700 14px ${fontMain}`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText('FIRE WATCHER INDONESIA', 50, bottomY);

  ctx.font = `500 12px ${fontMain}`;
  ctx.fillStyle = '#64748b';
  ctx.fillText('Gerakan Gotong Royong Tanggap Bencana Api', 50, bottomY + 22);

  ctx.textAlign = 'right';
  ctx.font = `700 14px ${fontMain}`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText('@firewatcher.id', width - 50, bottomY);

  ctx.font = `500 12px ${fontMain}`;
  ctx.fillStyle = '#64748b';
  ctx.fillText('Akses Web: firewatcher.id', width - 50, bottomY + 22);

  try {
    return canvas.toDataURL('image/png');
  } catch (e) {
    console.error('Failed to export canvas toDataURL (tainted?)', e);
    // Try with lower quality jpeg as last resort
    try {
      return canvas.toDataURL('image/jpeg', 0.85);
    } catch (_e2) {
      throw new Error('Gagal export infografis: canvas tainted oleh peta. Coba ganti style peta ke Topo/Outdoor.');
    }
  }
}
