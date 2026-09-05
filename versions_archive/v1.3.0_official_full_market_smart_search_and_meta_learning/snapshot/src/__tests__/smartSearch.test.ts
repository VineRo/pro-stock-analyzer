import { describe, it, expect } from 'vitest';
import { searchStockDirectory } from '../data/stockDirectory';

describe('智慧人性化股票搜尋與分類測試 (Smart Stock Search & Scope)', () => {
  // 1. 中文公司名稱搜尋測試
  it('應能透過中文公司名稱精確搜尋到對應股票代碼', () => {
    const resEvergreen = searchStockDirectory('長榮', 'ALL');
    expect(resEvergreen.some((s) => s.symbol === '2603.TW')).toBe(true);

    const resTsmc = searchStockDirectory('台積電', 'ALL');
    expect(resTsmc.some((s) => s.symbol === '2330.TW')).toBe(true);

    const resMicrosoft = searchStockDirectory('微軟', 'ALL');
    expect(resMicrosoft.some((s) => s.symbol === 'MSFT')).toBe(true);

    const resTesla = searchStockDirectory('特斯拉', 'ALL');
    expect(resTesla.some((s) => s.symbol === 'TSLA')).toBe(true);

    const resNvidia = searchStockDirectory('輝達', 'ALL');
    expect(resNvidia.some((s) => s.symbol === 'NVDA')).toBe(true);

    const resFubon = searchStockDirectory('富邦金', 'ALL');
    expect(resFubon.some((s) => s.symbol === '2881.TW')).toBe(true);
  });

  // 2. 英文名稱與別名關鍵字搜尋測試
  it('應能透過英文名稱或俗稱別名（如 Google, Apple, 航海王, 護國神山）搜尋到對應股票', () => {
    const resGoogle = searchStockDirectory('Google', 'ALL');
    expect(resGoogle.some((s) => s.symbol === 'GOOGL')).toBe(true);

    const resApple = searchStockDirectory('Apple', 'ALL');
    expect(resApple.some((s) => s.symbol === 'AAPL')).toBe(true);

    const resShipping = searchStockDirectory('航海王', 'ALL');
    expect(resShipping.some((s) => s.symbol === '2603.TW')).toBe(true);

    const resGuardian = searchStockDirectory('護國神山', 'ALL');
    expect(resGuardian.some((s) => s.symbol === '2330.TW')).toBe(true);

    const resHighDividend = searchStockDirectory('高股息', 'ALL');
    expect(resHighDividend.some((s) => s.symbol === '0056.TW')).toBe(true);
    expect(resHighDividend.some((s) => s.symbol === '00878.TW')).toBe(true);
  });

  // 3. 股票代碼搜尋測試
  it('應能直接透過代碼 (如 2330, AAPL, NVDA) 搜尋', () => {
    const resCode = searchStockDirectory('2330', 'ALL');
    expect(resCode.some((s) => s.symbol === '2330.TW')).toBe(true);

    const resUs = searchStockDirectory('AAPL', 'ALL');
    expect(resUs.some((s) => s.symbol === 'AAPL')).toBe(true);
  });

  // 4. 三大分類模式過濾測試 (全部 / 國內台股 / 國外美股)
  it('切換「國內 (台股)」分類時，應只返回台灣上市櫃股票', () => {
    const domesticAll = searchStockDirectory('', 'DOMESTIC');
    expect(domesticAll.length).toBeGreaterThan(10);
    domesticAll.forEach((s) => {
      expect(s.market).toBe('TW');
    });

    // 在國內模式搜尋「蘋果」或「微軟」不應返回美股
    const foreignUnderDomestic = searchStockDirectory('微軟', 'DOMESTIC');
    expect(foreignUnderDomestic.length).toBe(0);

    // 在國內模式搜尋「台積電」應正常命中
    const twUnderDomestic = searchStockDirectory('台積電', 'DOMESTIC');
    expect(twUnderDomestic.some((s) => s.symbol === '2330.TW')).toBe(true);
  });

  it('切換「國外 (美股)」分類時，應只返回美股與國際標的', () => {
    const foreignAll = searchStockDirectory('', 'FOREIGN');
    expect(foreignAll.length).toBeGreaterThan(10);
    foreignAll.forEach((s) => {
      expect(s.market).not.toBe('TW');
    });

    // 在國外模式搜尋「長榮」不應返回台股長榮
    const twUnderForeign = searchStockDirectory('長榮', 'FOREIGN');
    expect(twUnderForeign.length).toBe(0);

    // 在國外模式搜尋「特斯拉」應正常命中
    const usUnderForeign = searchStockDirectory('特斯拉', 'FOREIGN');
    expect(usUnderForeign.some((s) => s.symbol === 'TSLA')).toBe(true);
  });

  it('切換「全部」模式時，應能同時包含國內外兩類標的', () => {
    const allStocks = searchStockDirectory('', 'ALL');
    const hasTw = allStocks.some((s) => s.market === 'TW');
    const hasUs = allStocks.some((s) => s.market === 'US');
    expect(hasTw).toBe(true);
    expect(hasUs).toBe(true);
  });

  // 5. 亞洲與國際大盤指數搜尋測試 (日/韓/中/港/台/美)
  it('應能透過中文名或代號搜尋日本、韓國、中國大陸、香港之大盤指數', () => {
    // 日本：日經225、東證
    const resNikkei = searchStockDirectory('日經', 'ALL');
    expect(resNikkei.some((s) => s.symbol === '^N225')).toBe(true);
    const resTopix = searchStockDirectory('東證', 'ALL');
    expect(resTopix.some((s) => s.symbol === '^TOPX')).toBe(true);

    // 韓國：KOSPI、科斯達克
    const resKospi = searchStockDirectory('韓國綜合', 'ALL');
    expect(resKospi.some((s) => s.symbol === '^KS11')).toBe(true);
    const resKosdaq = searchStockDirectory('科斯達克', 'ALL');
    expect(resKosdaq.some((s) => s.symbol === '^KQ11')).toBe(true);

    // 中國大陸：上證、滬深300、深證成指
    const resSse = searchStockDirectory('上證', 'ALL');
    expect(resSse.some((s) => s.symbol === '000001.SS')).toBe(true);
    const resCsi = searchStockDirectory('滬深300', 'ALL');
    expect(resCsi.some((s) => s.symbol === '000300.SS')).toBe(true);
    const resSzse = searchStockDirectory('深證成指', 'ALL');
    expect(resSzse.some((s) => s.symbol === '399001.SZ')).toBe(true);

    // 香港：恆生指數、恆生科技指數
    const resHsi = searchStockDirectory('恆生', 'ALL');
    expect(resHsi.some((s) => s.symbol === '^HSI')).toBe(true);
    const resHstech = searchStockDirectory('恆生科技', 'ALL');
    expect(resHstech.some((s) => s.symbol === '^HSTECH')).toBe(true);
  });

  it('國際大盤指數在分類過濾中的行為應符合規則', () => {
    // 台灣加權屬於國內
    const twiiInDomestic = searchStockDirectory('台灣加權', 'DOMESTIC');
    expect(twiiInDomestic.some((s) => s.symbol === '^TWII')).toBe(true);

    // 國際指數 (日、韓、中、港、美) 在國內過濾中不應出現國際指數代碼 ^N225
    const nikkeiInDomestic = searchStockDirectory('日經', 'DOMESTIC');
    expect(nikkeiInDomestic.some((s) => s.symbol === '^N225')).toBe(false);
    nikkeiInDomestic.forEach((s) => expect(s.market).toBe('TW'));

    // 國際指數在國外過濾中應正常呈現
    const foreignIndices = searchStockDirectory('', 'FOREIGN');
    expect(foreignIndices.some((s) => s.symbol === '^N225')).toBe(true);
    expect(foreignIndices.some((s) => s.symbol === '^KS11')).toBe(true);
    expect(foreignIndices.some((s) => s.symbol === '000001.SS')).toBe(true);
    expect(foreignIndices.some((s) => s.symbol === '^HSI')).toBe(true);
  });

  // 6. 國內生技醫療類股精確與別名搜尋（特別測試：中裕、藥華藥、保瑞等）
  it('應能透過名稱「中裕」、代號「4147」或英文「TaiMed」精準搜尋到中裕新藥', () => {
    // 透過名稱「中裕」
    const resZhongyu = searchStockDirectory('中裕', 'ALL');
    expect(resZhongyu.length).toBeGreaterThan(0);
    expect(resZhongyu[0].symbol).toBe('4147.TWO');
    expect(resZhongyu[0].name).toBe('中裕新藥');

    // 透過全名「中裕新藥」
    const resZhongyuFull = searchStockDirectory('中裕新藥', 'DOMESTIC');
    expect(resZhongyuFull.some((s) => s.symbol === '4147.TWO')).toBe(true);

    // 透過代號「4147」
    const resCode = searchStockDirectory('4147', 'DOMESTIC');
    expect(resCode.some((s) => s.symbol === '4147.TWO')).toBe(true);

    // 透過英文「TaiMed」
    const resEnglish = searchStockDirectory('TaiMed', 'ALL');
    expect(resEnglish.some((s) => s.symbol === '4147.TWO')).toBe(true);
  });

  it('應能正常搜尋其他熱門生技醫療類股（藥華藥、保瑞、合一、美時）', () => {
    const resPharma = searchStockDirectory('藥華藥', 'DOMESTIC');
    expect(resPharma.some((s) => s.symbol === '6446.TWO')).toBe(true);

    const resBora = searchStockDirectory('保瑞', 'DOMESTIC');
    expect(resBora.some((s) => s.symbol === '6472.TW')).toBe(true);

    const resOneness = searchStockDirectory('合一', 'DOMESTIC');
    expect(resOneness.some((s) => s.symbol === '4743.TWO')).toBe(true);

    const resLotus = searchStockDirectory('美時', 'DOMESTIC');
    expect(resLotus.some((s) => s.symbol === '1795.TW')).toBe(true);
  });

  it('若輸入未在字典收錄的 4 位數台股代碼，應動態生成上市與上櫃的查詢備選項', () => {
    const resUnknown = searchStockDirectory('9988', 'DOMESTIC');
    expect(resUnknown.some((s) => s.symbol === '9988.TW')).toBe(true);
    expect(resUnknown.some((s) => s.symbol === '9988.TWO')).toBe(true);
  });

  // 7. 臺灣證交所與櫃買中心官方全市場名冊覆蓋率測試
  it('官方全市場名冊應收錄超過 2,300 檔台灣上市櫃標的，且任意冷門/熱門公司名稱皆能自動秒搜', () => {
    // 總量驗證：全市場應大於 2,300 檔
    const allDomestic = searchStockDirectory('', 'DOMESTIC');
    expect(allDomestic.length).toBeGreaterThan(2300);

    // 以前未手動建檔的冷門或高價股，現在也能透過中文名或簡稱直接搜尋
    // 3661 世芯-KY
    const resShixin = searchStockDirectory('世芯', 'DOMESTIC');
    expect(resShixin.some((s) => s.symbol === '3661.TW')).toBe(true);

    // 00940 元大台灣價值高息 ETF
    const res00940 = searchStockDirectory('元大台灣價值高息', 'DOMESTIC');
    expect(res00940.some((s) => s.symbol === '00940.TW')).toBe(true);

    // 4147 中裕
    const resZhongyu = searchStockDirectory('中裕', 'DOMESTIC');
    expect(resZhongyu.some((s) => s.symbol === '4147.TWO')).toBe(true);

    // 6472 保瑞
    const resBaorui = searchStockDirectory('保瑞', 'DOMESTIC');
    expect(resBaorui.some((s) => s.symbol === '6472.TW')).toBe(true);

    // 3529 力旺
    const resLiwang = searchStockDirectory('力旺', 'DOMESTIC');
    expect(resLiwang.some((s) => s.symbol === '3529.TWO')).toBe(true);

    // 6491 晶碩
    const resJingshuo = searchStockDirectory('晶碩', 'DOMESTIC');
    expect(resJingshuo.some((s) => s.symbol === '6491.TW')).toBe(true);
  });
});

