const fs = require('fs');
const path = require('path');

async function buildRegistries() {
  console.log('Fetching TWSE and TPEx data...');
  const [twseRes, tpexRes] = await Promise.all([
    fetch('https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL').then(r => r.json()),
    fetch('https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes').then(r => r.json())
  ]);

  console.log('TWSE raw count:', twseRes.length, 'TPEx raw count:', tpexRes.length);

  // 1. Process TPEx (櫃買中心)
  const tpexProcessed = [];
  for (const item of tpexRes) {
    const code = item.SecuritiesCompanyCode;
    const name = item.CompanyName ? item.CompanyName.trim() : '';
    if (!code || !name) continue;
    
    // Common equities: 4 digits (e.g. 8299, 3260, 6488)
    // ETFs: 00...
    const isEquity = /^\d{4}$/.test(code);
    const isEtf = /^00\d{3,4}[A-Z]?$/.test(code);
    if (!isEquity && !isEtf) continue;

    const closeStr = item.Close ? item.Close.replace(/,/g, '') : '';
    const price = closeStr && !isNaN(parseFloat(closeStr)) ? parseFloat(closeStr) : 50.0;
    const changeStr = item.Change ? item.Change.replace(/,/g, '').replace('+', '') : '';
    const change = changeStr && !isNaN(parseFloat(changeStr)) ? parseFloat(changeStr) : 0.0;
    const prev = price - change;
    const changePercent = prev > 0 ? Number(((change / prev) * 100).toFixed(2)) : 0.0;

    tpexProcessed.push({
      s: code + '.TWO',
      c: code,
      n: name,
      i: isEtf ? 'ETF 指數股票型基金' : '台灣櫃檯買賣市場',
      t: isEtf ? 'ETF' : 'EQ',
      p: price,
      ch: change,
      cp: changePercent
    });
  }

  const phison = tpexProcessed.find(x => x.c === '8299');
  console.log('TPEx Processed count:', tpexProcessed.length, '8299 Phison:', phison);

  fs.writeFileSync(
    path.join(__dirname, '../src/data/tpexFullRegistry.json'),
    JSON.stringify(tpexProcessed)
  );
  console.log('Saved src/data/tpexFullRegistry.json successfully.');

  // 2. Read existing twseFullRegistry to keep industry classifications and enrich with latest price
  const twsePath = path.join(__dirname, '../src/data/twseFullRegistry.json');
  let existingTwse = [];
  if (fs.existsSync(twsePath)) {
    existingTwse = JSON.parse(fs.readFileSync(twsePath, 'utf-8'));
  }

  const twsePriceMap = new Map();
  for (const item of twseRes) {
    const code = item.Code;
    const closeStr = item.ClosingPrice ? item.ClosingPrice.replace(/,/g, '') : '';
    const price = closeStr && !isNaN(parseFloat(closeStr)) ? parseFloat(closeStr) : 50.0;
    const changeStr = item.Change ? item.Change.replace(/,/g, '').replace('+', '') : '';
    const change = changeStr && !isNaN(parseFloat(changeStr)) ? parseFloat(changeStr) : 0.0;
    const prev = price - change;
    const changePercent = prev > 0 ? Number(((change / prev) * 100).toFixed(2)) : 0.0;
    twsePriceMap.set(code, { price, change, changePercent });
  }

  const enrichedTwse = existingTwse.map(item => {
    const q = twsePriceMap.get(item.c);
    return {
      ...item,
      p: q ? q.price : (item.p || 50.0),
      ch: q ? q.change : (item.ch || 0.0),
      cp: q ? q.changePercent : (item.cp || 0.0)
    };
  });

  const tsmc = enrichedTwse.find(x => x.c === '2330');
  console.log('TWSE Processed count:', enrichedTwse.length, '2330 TSMC:', tsmc);

  fs.writeFileSync(twsePath, JSON.stringify(enrichedTwse));
  console.log('Enriched and saved src/data/twseFullRegistry.json successfully.');
}

buildRegistries().catch(err => {
  console.error('Error building registries:', err);
  process.exit(1);
});
