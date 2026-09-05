/**
 * 臺灣證券交易所 (TWSE) 與 證券櫃檯買賣中心 (TPEx) 官方全市場證券名冊自動同步工具
 * 透過官方 ISIN (國際證券編碼) 系統自動擷取全台上市/上櫃 2,300+ 檔股票、ETF 與創新板證券
 */
const fs = require("fs");
const path = require("path");

async function parseISIN(mode) {
  const url = "https://isin.twse.com.tw/isin/C_public.jsp?strMode=" + mode;
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  const html = new TextDecoder("big5").decode(buf);
  const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/g) || [];
  const items = [];
  let currentCategory = "";

  for (const row of rows) {
    if (row.includes("colspan")) {
      const catMatch = row.match(/<B>\s*([^<]+)\s*<B>/i) || row.match(/<b>\s*([^<]+)\s*<\/b>/i);
      if (catMatch) currentCategory = catMatch[1].trim();
      continue;
    }
    if (!["股票", "創新板", "ETF", "臺灣存託憑證(TDR)"].some((c) => currentCategory.includes(c))) {
      continue;
    }

    const cells = (row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || []).map((c) =>
      c.replace(/<[^>]+>/g, "").trim().replace(/&nbsp;/g, "")
    );
    if (cells.length >= 5) {
      const codeAndName = cells[0];
      const match = codeAndName.match(/^([0-9A-Z]{4,6})\s*[\s　]\s*(.+)$/);
      if (match) {
        const code = match[1];
        const name = match[2].trim();
        const suffix = mode === 2 ? "TW" : "TWO";
        const sector = cells[4] || "";
        items.push({
          s: code + "." + suffix,
          c: code,
          n: name,
          i: sector,
          t: currentCategory === "ETF" ? "ETF" : "EQ",
        });
      }
    }
  }
  return items;
}

async function run() {
  console.log("正在從臺灣證券交易所官方 ISIN 系統同步全市場證券名冊...");
  const [twse, tpex] = await Promise.all([parseISIN(2), parseISIN(4)]);
  console.log("TWSE (上市/創新板/ETF): " + twse.length + " 檔");
  console.log("TPEx (上櫃/ETF): " + tpex.length + " 檔");

  const map = new Map();
  for (const item of [...twse, ...tpex]) {
    if (!map.has(item.s)) {
      map.set(item.s, item);
    }
  }

  const allSecurities = Array.from(map.values());
  const outputPath = path.resolve(__dirname, "../src/data/twseFullRegistry.json");
  fs.writeFileSync(outputPath, JSON.stringify(allSecurities), "utf-8");

  const stats = fs.statSync(outputPath);
  console.log("同步完成！共收錄 " + allSecurities.length + " 檔證券。");
  console.log("檔案儲存於: " + outputPath + " (" + (stats.size / 1024).toFixed(1) + " KB)");
}

run().catch((err) => {
  console.error("同步失敗:", err);
  process.exit(1);
});
