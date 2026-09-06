import { StockAlert } from '../types/stock';

const ALERTS_STORAGE_KEY = 'prostock_active_alerts';

let memoryStore: Record<string, string> = {};

function safeGet(key: string): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      const val = localStorage.getItem(key);
      if (val) return val;
    }
  } catch {}
  return memoryStore[key] || null;
}

function safeSet(key: string, val: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, val);
    }
  } catch {}
  memoryStore[key] = val;
}

export const AlertService = {
  getAlerts(): StockAlert[] {
    try {
      const saved = safeGet(ALERTS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  },

  saveAlerts(alerts: StockAlert[]): void {
    try {
      safeSet(ALERTS_STORAGE_KEY, JSON.stringify(alerts));
    } catch {
      // ignore
    }
  },

  addAlert(alert: Omit<StockAlert, 'id' | 'createdAt' | 'active'>): StockAlert {
    const alerts = this.getAlerts();
    const newAlert: StockAlert = {
      ...alert,
      id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: Date.now(),
      active: true,
    };
    alerts.push(newAlert);
    this.saveAlerts(alerts);

    // 嘗試請求系統通知權限
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return newAlert;
  },

  removeAlert(id: string): void {
    const alerts = this.getAlerts().filter((a) => a.id !== id);
    this.saveAlerts(alerts);
  },

  toggleAlert(id: string): void {
    const alerts = this.getAlerts().map((a) => (a.id === id ? { ...a, active: !a.active } : a));
    this.saveAlerts(alerts);
  },

  checkAlerts(symbol: string, currentPrice: number, currentRsi?: number): StockAlert[] {
    const alerts = this.getAlerts();
    const triggered: StockAlert[] = [];

    const updated = alerts.map((alert) => {
      if (!alert.active || alert.symbol !== symbol) return alert;

      let isTriggered = false;
      let msg = '';

      if (alert.type === 'price_above' && currentPrice >= alert.threshold) {
        isTriggered = true;
        msg = `${alert.name} (${alert.symbol}) 已突破目標價 $${alert.threshold}！當前現價 $${currentPrice}`;
      } else if (alert.type === 'price_below' && currentPrice <= alert.threshold) {
        isTriggered = true;
        msg = `${alert.name} (${alert.symbol}) 已跌破目標價 $${alert.threshold}！當前現價 $${currentPrice}`;
      } else if (alert.type === 'rsi_overbought' && currentRsi != null && currentRsi >= alert.threshold) {
        isTriggered = true;
        msg = `${alert.name} (${alert.symbol}) RSI 已達 ${currentRsi.toFixed(1)}，觸發超買警戒！`;
      } else if (alert.type === 'rsi_oversold' && currentRsi != null && currentRsi <= alert.threshold) {
        isTriggered = true;
        msg = `${alert.name} (${alert.symbol}) RSI 跌至 ${currentRsi.toFixed(1)}，觸發超賣反彈警戒！`;
      }

      if (isTriggered) {
        triggered.push(alert);

        // 觸發原生桌面系統通知
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          new Notification('📈 ProStock 股票預警通知', {
            body: msg,
            icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%232962ff'/><text x='50%' y='68%' font-size='55' text-anchor='middle' fill='white'>📈</text></svg>",
          });
        }

        return {
          ...alert,
          active: false,
          triggeredAt: Date.now(),
        };
      }

      return alert;
    });

    if (triggered.length > 0) {
      this.saveAlerts(updated);
    }

    return triggered;
  },
};
