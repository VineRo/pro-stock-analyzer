import { PaperAccount, PaperTradeRecord } from '../types/stock';

const PAPER_STORAGE_KEY = 'prostock_paper_account_v1';
const DEFAULT_CAPITAL = 100000;

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

export const PaperTradingService = {
  getAccount(): PaperAccount {
    try {
      const saved = safeGet(PAPER_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }

    const initial: PaperAccount = {
      balance: DEFAULT_CAPITAL,
      initialCapital: DEFAULT_CAPITAL,
      positions: [],
      history: [],
    };
    this.saveAccount(initial);
    return initial;
  },

  saveAccount(account: PaperAccount): void {
    try {
      safeSet(PAPER_STORAGE_KEY, JSON.stringify(account));
    } catch {
      // ignore
    }
  },

  resetAccount(capital = DEFAULT_CAPITAL): PaperAccount {
    const account: PaperAccount = {
      balance: capital,
      initialCapital: capital,
      positions: [],
      history: [],
    };
    this.saveAccount(account);
    return account;
  },

  buy(symbol: string, name: string, price: number, shares: number, currency = 'USD'): { success: boolean; message: string } {
    if (shares <= 0 || price <= 0) {
      return { success: false, message: '股數與價格必須大於 0' };
    }

    const account = this.getAccount();
    const fee = Number((price * shares * 0.0015).toFixed(2)); // 0.15% 手續費
    const totalCost = price * shares + fee;

    if (account.balance < totalCost) {
      return { success: false, message: `資金不足！需要 $${totalCost.toLocaleString()}，可用餘額 $${account.balance.toLocaleString()}` };
    }

    account.balance -= totalCost;

    // 更新持倉
    const existingIndex = account.positions.findIndex((p) => p.symbol === symbol);
    if (existingIndex >= 0) {
      const existing = account.positions[existingIndex];
      const newShares = existing.shares + shares;
      const totalSpend = existing.avgCostPrice * existing.shares + price * shares;
      const avgCostPrice = Number((totalSpend / newShares).toFixed(2));

      account.positions[existingIndex] = {
        ...existing,
        shares: newShares,
        avgCostPrice,
        currentPrice: price,
        unrealizedProfit: Number(((price - avgCostPrice) * newShares).toFixed(2)),
        unrealizedProfitPercent: Number((((price - avgCostPrice) / avgCostPrice) * 100).toFixed(2)),
      };
    } else {
      account.positions.push({
        symbol,
        name,
        shares,
        avgCostPrice: price,
        currentPrice: price,
        unrealizedProfit: 0,
        unrealizedProfitPercent: 0,
        currency,
      });
    }

    // 寫入交易紀錄
    const record: PaperTradeRecord = {
      id: `trade_${Date.now()}`,
      timestamp: Date.now(),
      symbol,
      type: 'BUY',
      shares,
      price,
      amount: Number((price * shares).toFixed(2)),
      fee,
    };
    account.history.unshift(record);

    this.saveAccount(account);
    return { success: true, message: `成功買進 ${name} (${symbol}) ${shares} 股！` };
  },

  sell(symbol: string, price: number, shares: number): { success: boolean; message: string } {
    if (shares <= 0 || price <= 0) {
      return { success: false, message: '賣出股數與價格必須大於 0' };
    }

    const account = this.getAccount();
    const posIndex = account.positions.findIndex((p) => p.symbol === symbol);

    if (posIndex < 0 || account.positions[posIndex].shares < shares) {
      const avail = posIndex >= 0 ? account.positions[posIndex].shares : 0;
      return { success: false, message: `持倉不足！當前持有 ${avail} 股，無法賣出 ${shares} 股` };
    }

    const pos = account.positions[posIndex];
    const fee = Number((price * shares * 0.0015).toFixed(2));
    const proceeds = price * shares - fee;

    account.balance += proceeds;

    if (pos.shares === shares) {
      // 全數賣出平倉
      account.positions.splice(posIndex, 1);
    } else {
      // 部分減倉
      const remaining = pos.shares - shares;
      account.positions[posIndex] = {
        ...pos,
        shares: remaining,
        currentPrice: price,
        unrealizedProfit: Number(((price - pos.avgCostPrice) * remaining).toFixed(2)),
        unrealizedProfitPercent: Number((((price - pos.avgCostPrice) / pos.avgCostPrice) * 100).toFixed(2)),
      };
    }

    // 寫入紀錄
    const record: PaperTradeRecord = {
      id: `trade_${Date.now()}`,
      timestamp: Date.now(),
      symbol,
      type: 'SELL',
      shares,
      price,
      amount: Number((price * shares).toFixed(2)),
      fee,
    };
    account.history.unshift(record);

    this.saveAccount(account);
    return { success: true, message: `成功賣出 ${pos.name} (${symbol}) ${shares} 股！` };
  },

  updatePrices(symbolPriceMap: Record<string, number>): PaperAccount {
    const account = this.getAccount();
    let updated = false;

    account.positions.forEach((pos) => {
      const newPrice = symbolPriceMap[pos.symbol];
      if (newPrice && newPrice !== pos.currentPrice) {
        pos.currentPrice = newPrice;
        pos.unrealizedProfit = Number(((newPrice - pos.avgCostPrice) * pos.shares).toFixed(2));
        pos.unrealizedProfitPercent = Number((((newPrice - pos.avgCostPrice) / pos.avgCostPrice) * 100).toFixed(2));
        updated = true;
      }
    });

    if (updated) {
      this.saveAccount(account);
    }

    return account;
  },
};
