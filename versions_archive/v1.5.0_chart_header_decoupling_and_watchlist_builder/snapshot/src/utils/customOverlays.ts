import { registerOverlay, PolygonType } from 'klinecharts';

let isRegistered = false;

/**
 * 註冊客製化圖表覆蓋物 (Custom Overlays)
 * 補齊 KlineCharts 原生未內建的矩形箱體 (rect)、趨勢線 (trendLine) 與文字標註 (text)
 */
export function registerCustomOverlays() {
  if (isRegistered) return;
  isRegistered = true;

  try {
    // 1. 矩形箱體 (Rect / Box)
    // 支援兩點定義對角線，以閉合多邊形 (Polygon) 繪製，具備自定義邊框與半透明背景填充
    registerOverlay({
      name: 'rect',
      totalStep: 3,
      needDefaultPointFigure: true,
      needDefaultXAxisFigure: true,
      needDefaultYAxisFigure: true,
      createPointFigures: ({ coordinates, overlay }) => {
        if (coordinates.length > 1) {
          const p0 = coordinates[0];
          const p1 = coordinates[1];
          return [
            {
              type: 'polygon',
              attrs: {
                coordinates: [
                  p0,
                  { x: p1.x, y: p0.y },
                  p1,
                  { x: p0.x, y: p1.y },
                ],
              },
              styles: {
                style: PolygonType.StrokeFill,
                ...(overlay?.styles?.rect || overlay?.styles?.polygon || {}),
              },
            },
          ];
        }
        return [];
      },
    });

    // 2. 趨勢線 (Trend Line)
    // 支援兩點間直線段繪製，提供關鍵高低點走勢指引
    registerOverlay({
      name: 'trendLine',
      totalStep: 3,
      needDefaultPointFigure: true,
      needDefaultXAxisFigure: true,
      needDefaultYAxisFigure: true,
      createPointFigures: ({ coordinates, overlay }) => {
        if (coordinates.length > 1) {
          return [
            {
              type: 'line',
              attrs: { coordinates },
              styles: overlay?.styles?.line,
            },
          ];
        }
        return [];
      },
    });

    // 3. 文字標註 (Text Annotation)
    // 支援單點點擊放置文字註記，可自定義註記內容與標籤背景
    registerOverlay({
      name: 'text',
      totalStep: 2,
      needDefaultPointFigure: true,
      needDefaultXAxisFigure: true,
      needDefaultYAxisFigure: true,
      createPointFigures: ({ coordinates, overlay }) => {
        if (coordinates.length > 0) {
          const textVal =
            typeof overlay?.extendData === 'string' && overlay.extendData
              ? overlay.extendData
              : '標註筆記';
          return [
            {
              type: 'text',
              attrs: {
                x: coordinates[0].x,
                y: coordinates[0].y,
                text: textVal,
                align: 'center',
                baseline: 'bottom',
              },
              styles: {
                color: '#ffffff',
                backgroundColor: overlay?.styles?.text?.backgroundColor || '#2962ff',
                size: 12,
                paddingLeft: 6,
                paddingRight: 6,
                paddingTop: 4,
                paddingBottom: 4,
                borderRadius: 4,
                ...(overlay?.styles?.text || {}),
              },
            },
          ];
        }
        return [];
      },
    });
  } catch (err) {
    console.warn('[customOverlays] Failed to register custom overlays:', err);
  }
}

// 於模組引用時自動執行全域註冊
registerCustomOverlays();
