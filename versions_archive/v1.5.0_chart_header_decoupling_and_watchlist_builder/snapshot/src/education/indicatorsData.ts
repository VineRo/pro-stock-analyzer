export interface IndicatorEducation {
  id: string;
  name: string;
  shortName: string;
  category: 'main' | 'sub' | 'smc' | 'valuation';
  tagline: string;
  analogy: string; // 觀念比喻
  whatIsIt: string; // 指標原理
  howToUse: {
    title: string;
    buySignal: string;  // 偏多信號
    sellSignal: string; // 偏空信號
    neutralSignal?: string;
  };
  pitfalls: string[]; // 實戰經驗提醒與常見盲點
  defaultSettings: string;
}

export const INDICATORS_DATA: Record<string, IndicatorEducation> = {
  MA: {
    id: 'MA',
    name: '移動平均線 (Moving Average)',
    shortName: '均線 (MA)',
    category: 'main',
    tagline: '最經典的趨勢指標，反映市場一段時間內的平均持股成本',
    analogy: '好比班級歷次測驗的平均成績。當最新成績站上平均線，代表整體實力在往上走；若持續低於平均線，則反映走勢偏向疲軟。',
    whatIsIt: '將過去特定週期（如 5 日、20 日月線、60 日季線）的收盤價相加求取平均值所形成的平滑曲線，用以過濾短期雜訊並判讀中長期趨勢。',
    howToUse: {
      title: '如何判讀趨勢與多空轉折',
      buySignal: '【黃金交叉 & 多頭排列】：短週期均線（如 5MA）由下向上穿過長週期均線（如 20MA），且長短期均線同步斜向上發散，顯示多方動能增強。',
      sellSignal: '【死亡交叉 & 空頭排列】：短週期均線由上往下跌破長週期均線，且均線開始下彎，顯示賣壓加重，宜提高風險意識。',
      neutralSignal: '均線若相互糾結、缺乏明確傾斜角度時，代表市場正處於區間橫盤整理，建議多看少做。'
    },
    pitfalls: [
      '均線本質上是歷史數據的平滑化，訊號往往落後於即時轉折點。',
      '在無方向的震盪洗盤盤面中，頻繁交叉容易產生假突破或來回停損，宜搭配成交量檢視。'
    ],
    defaultSettings: 'MA(5, 10, 20, 60)'
  },
  EMA: {
    id: 'EMA',
    name: '指數移動平均線 (Exponential MA)',
    shortName: '指數均線 (EMA)',
    category: 'main',
    tagline: '對近期價格變化更敏銳的加權均線，反應速度優於傳統均線',
    analogy: '評估球員近況時，昨天的比賽表現通常比一個月前的數據更具參考價值。EMA 正是給予越靠近現在的價格更高的權重比例。',
    whatIsIt: '加權移動平均的一種，有效降低了普通 MA 的滯後性，在波段發動初期能更快反應趨勢轉折，常為順勢交易者所採用。',
    howToUse: {
      title: '如何判讀趨勢強弱與順勢點',
      buySignal: '股價站穩 EMA(12) 或 EMA(26) 向上推進且均線斜率陡峭時，為具備動能的順勢偏多訊號。',
      sellSignal: '帶量長黑跌破關鍵 EMA 支撐且短期內無法收復，代表上升慣性遭到破壞，宜適度減碼獲利。',
    },
    pitfalls: [
      '由於對短期價格過於靈敏，在震盪洗盤行情中容易出現較多雜訊，需留意假訊號。'
    ],
    defaultSettings: 'EMA(12, 26)'
  },
  BOLL: {
    id: 'BOLL',
    name: '布林通道 (Bollinger Bands)',
    shortName: '布林帶 (BOLL)',
    category: 'main',
    tagline: '運用統計學常態分佈原理，標示價格合理波動的上下軌道範圍',
    analogy: '好比一條有彈性的三線道高速公路。依據常態分佈統計，大約有 95% 的車流會行駛在護欄內，一旦車輛偏離護欄過遠，便容易出現回歸中線的慣性。',
    whatIsIt: '以中軌（通常為 20MA）為基準，分別向上與向下加上 2 個標準差構成上軌與下軌，用以衡量市場波動率並尋找超買超賣邊界。',
    howToUse: {
      title: '軌道開口與多空判讀',
      buySignal: '【下軌支撐 / 開口擴大】：股價回測或跌破下軌後收出帶下影線紅K；或是通道突然大幅張口向上，股價強勢貼著上軌推升。',
      sellSignal: '【衝出上軌承壓 / 跌破中軌】：價格觸及或衝出上軌後動能停滯收黑；或是原先的多頭推升跌破中軌月線支撐。',
      neutralSignal: '通道大幅緊縮（收口）通常代表市場正處於低波動整理期，往往預告新一波單邊行情即將醞釀展開。'
    },
    pitfalls: [
      '常見的誤區是以為「碰到上軌就該做空、碰到下軌就該買進」。在強烈的單邊主升段中，價格可能連續多日貼著上軌狂飆，此時逆勢放空風險極大。'
    ],
    defaultSettings: 'BOLL(20, 2)'
  },
  SAR: {
    id: 'SAR',
    name: '拋物轉向指標 (Stop and Reverse)',
    shortName: '停損轉向 (SAR)',
    category: 'main',
    tagline: '清楚標示波段趨勢轉折點，適合用作移動停損停利的客觀參考',
    analogy: '好比跟在車輛後方的自動安全雷達，隨著車速推移持續向前緊跟；一旦距離被價格回測跌破，便代表這段行程告一段落，需要調轉防守方向。',
    whatIsIt: '在 K 線圖上方或下方繪製的一連串拋物線圓點，專門用於追蹤趨勢並提供客觀的移動停損價位。',
    howToUse: {
      title: '圓點位置切換判別',
      buySignal: 'SAR 點位由 K 線「上方」切換至「下方」，代表空方慣性轉為多方，可視為波段進場或回補訊號。',
      sellSignal: 'SAR 點位由 K 線「下方」跳轉至「上方」，代表多方動能受阻，宜無條件執行停利或保本停損。'
    },
    pitfalls: [
      '在無明顯方向的區間震盪盤面中，點位容易上下頻繁翻轉，容易增加摩擦成本。'
    ],
    defaultSettings: 'SAR(0.02, 0.2)'
  },
  MACD: {
    id: 'MACD',
    name: '平滑異同移動平均線 (MACD)',
    shortName: '指數平滑異同 (MACD)',
    category: 'sub',
    tagline: '廣泛應用於全球金融市場的經典指標，兼具趨勢判斷與動能評估',
    analogy: '就像快跑選手（DIF快線）與慢跑選手（DEA慢線）的拉鋸。快線領先慢線時柱狀體增長，差距拉大代表加速；差距縮小時代表動能逐漸收斂。',
    whatIsIt: '透過計算兩條不同速度指數均線的差離值，並以柱狀體呈現差離變化，能有效輔助判斷中長期趨勢強弱與背離轉折。',
    howToUse: {
      title: '零軸多空界線、交叉與背離',
      buySignal: '【零軸上金叉】：快線在 0 軸上方向上穿越慢線，柱狀體翻紅擴大，通常代表多方趨勢具備延續性。',
      sellSignal: '【頂背離與死叉】：價格創出新高，但 MACD 柱狀體高度或快線高點卻逐漸降低（頂部背離），隨後死叉確認，常預告漲勢趨緩或回檔。'
    },
    pitfalls: [
      '在 0 軸下方的金叉多半屬於弱勢反彈，勝率相對有限；在 0 軸上方的順勢金叉往往更具可靠性。'
    ],
    defaultSettings: 'MACD(12, 26, 9)'
  },
  RSI: {
    id: 'RSI',
    name: '相對強弱指標 (Relative Strength Index)',
    shortName: '相對強弱 (RSI)',
    category: 'sub',
    tagline: '衡量買賣雙方力道對比，輔助研判短線動能過熱或超賣狀態',
    analogy: '如同拔河時雙方的力量拉扯。數值在 0 至 100 之間，超過 70 代表買盤已發力較長一段時間（可能面臨氣力放緩）；低於 30 則顯示賣方壓制已至極限。',
    whatIsIt: '統計一段時間內多方上漲幅度佔總波動幅度的比率，專門用來評估多空情緒極值與潛在反轉機會。',
    howToUse: {
      title: '超買超賣與背離判讀',
      buySignal: 'RSI 跌入 30 以下超賣區後向上勾頭重新突破 30，且價格未破底時，具備短線跌深反彈的觀察價值。',
      sellSignal: 'RSI 衝破 70 甚至 80 以上高檔區後回落；或是價格續創新高但 RSI 無法同步過前高（動能背離），宜留意回檔壓力。'
    },
    pitfalls: [
      '超買並不等於價格會立即下跌。在強勁的主升段中，RSI 可能長時間維持在 70-80 以上（鈍化），切勿單純因 RSI 偏高而盲目放空。'
    ],
    defaultSettings: 'RSI(6, 12, 24) 或 單線 RSI(14)'
  },
  KDJ: {
    id: 'KDJ',
    name: '隨機指標 (Stochastic Oscillator)',
    shortName: '隨機指標 (KDJ)',
    category: 'sub',
    tagline: '反應敏銳的短線振盪指標，適合輔助捕捉轉折位',
    analogy: '好比靈敏的警示鈴，價格一旦出現微幅位移，指標曲線便會率先產生反應。由 K值、D值與方向靈敏度最高的 J值 共同組成。',
    whatIsIt: '結合動量理念、強弱相對位置與移動平均計算，擅長在日級別或短時間週期內捕捉極端位置的轉折契機。',
    howToUse: {
      title: '低檔金叉與高檔死叉',
      buySignal: 'J值或 K值在 20 以下低檔區向上黃金交叉 D值，若搭配打底形態，短線回升機率相對較高。',
      sellSignal: 'J值在 80 或 100 以上高檔過熱區向下死亡交叉 D值，顯示短期追價力道暫告一段落，為分批獲利減碼的參考點。'
    },
    pitfalls: [
      '因靈敏度高，在明確的單邊大波段中容易頻繁鈍化，必須搭配中長期均線方向綜合評估。'
    ],
    defaultSettings: 'KDJ(9, 3, 3)'
  },
  VOL: {
    id: 'VOL',
    name: '成交量 (Volume)',
    shortName: '成交量 (VOL)',
    category: 'sub',
    tagline: '市場資金參與程度的真實量化，是檢驗價格真實性的重要基石',
    analogy: '「價格是車行的方向，成交量是油門深淺」。沒有足夠的量能支撐，即便價格往上推升，往往也難以維持太久。',
    whatIsIt: '特定週期內市場買賣雙方撮合成交的總股數或總金額。所有技術分析形態與指標的實質底層支撐。',
    howToUse: {
      title: '量價配合的判別原則',
      buySignal: '【帶量突破】：價格經歷整理後，伴隨明顯高於近期的成交量放量突破區間壓力，通常為買盤積極表態的訊號。',
      sellSignal: '【高檔爆量滯漲】或【量價背離】：股價創高但成交量急遽萎縮，或是在波段相對高檔爆出巨量卻收長上影線，需防主力資金逢高調節。'
    },
    pitfalls: [
      '切勿只看單一根成交量柱的高低，應配合均量線（如 5 日均量、20 日均量）觀察量能趨勢結構。'
    ],
    defaultSettings: 'VOL(5, 10, 20)'
  },
  ATR: {
    id: 'ATR',
    name: '真實波動幅度均值 (Average True Range)',
    shortName: '波動率 (ATR)',
    category: 'sub',
    tagline: '衡量市場真實波動幅度，作為設定停損範圍與部位控管的參考',
    analogy: '好比氣象預報中的風浪等級。它不告訴你風向吹往何方，但能清楚讓你知道當前海面是微風細浪還是巨浪翻騰。',
    whatIsIt: '計算特定期間內每日實際波動範圍（含跳空差距）的平均值。它不預測多空方向，而是衡量行情的震盪激烈程度。',
    howToUse: {
      title: '動態停損點與風控設定',
      buySignal: 'ATR 數值收斂至歷史相對低檔，代表市場處於壓縮整理，往往預告後續即將迎來方向性突破。',
      sellSignal: '交易時可以進場價「減去 1.5 ~ 2 倍 ATR」作為動態風控停損點；若 ATR 急遽飆高，應適度調降持倉規模以平衡風險。'
    },
    pitfalls: [
      'ATR 沒有多空方向性，僅反映震盪幅度大小，無法單獨作為買進或放空的決策依據。'
    ],
    defaultSettings: 'ATR(14)'
  },
  OBV: {
    id: 'OBV',
    name: '能量潮指標 (On Balance Volume)',
    shortName: '能量潮 (OBV)',
    category: 'sub',
    tagline: '透過量能累積觀察資金流向，輔助評估吸籌與調節跡象',
    analogy: '好比資金的累積計票箱。上漲當天的總成交量全數記為正向買單，下跌當天則記為負向賣單，觀察長期累積淨值的變化。',
    whatIsIt: '依據價格漲跌方向將每日成交量進行符號化累計，用以洞察表面價格震盪下的深層資金流向。',
    howToUse: {
      title: '領先指標與背離判斷',
      buySignal: '價格尚處於橫盤打底階段，但 OBV 曲線已率先突破前波高點，顯示市場資金正逐步沉澱佈局，為潛在起漲特徵。',
      sellSignal: '價格持續走高，但 OBV 卻未能同步走揚甚至向下拐頭，顯示價格推升缺乏實質量能跟進，需防資金悄悄離場。'
    },
    pitfalls: [
      '若遇上特殊除權息跳空或單日非市場性巨量，OBV 累積值容易失真，建議結合其他量價指標一同檢視。'
    ],
    defaultSettings: 'OBV(30)'
  },
  VWAP: {
    id: 'VWAP',
    name: '成交量加權平均價 (Volume-Weighted Average Price)',
    shortName: '量加權均線 (VWAP)',
    category: 'main',
    tagline: '日內交易的重要公允成本基準，反映全市場成交量加權的真實均價',
    analogy: '如同團購的真實平均單價。一般均線只計算每日價格平均，不管每筆買進了多少股；VWAP 則把成交量真實權重納入計算，反映當日主流資金的持股成本。',
    whatIsIt: '結合每筆成交量與成交價格計算出的動態均價基準線。機構交易員常以能否成交在優於 VWAP 的價格來評估執行績效。',
    howToUse: {
      title: '日內多空分水嶺判讀',
      buySignal: '價格運行於 VWAP 之上，回測 VWAP 能獲得明確支撐不破時，為順勢多方的觀察切入點。',
      sellSignal: '價格跌破 VWAP 且反彈受阻於線下，代表當日空方力道佔據主導，短線部位應注意風險。'
    },
    pitfalls: [
      'VWAP 最適用於日內分時圖（如 1分、5分、15分線）。在日線以上長週期圖表，需留意跨日開盤重新計算的邏輯。'
    ],
    defaultSettings: 'VWAP(Daily)'
  },
  SMC: {
    id: 'SMC',
    name: '聰明錢機構概念 (Smart Money Concepts)',
    tagline: '觀察大額資金流向與流動性分佈，跟隨主力邏輯提升勝率',
    shortName: '機構訂單流 (SMC)',
    category: 'smc',
    analogy: '觀察大額資金在市場中的行為軌跡。機構資金由於規模龐大，進出場時必定會在特定價位留下痕跡，SMC 便是幫助我們辨識這些關鍵位置。',
    whatIsIt: '以訂單流（Order Flow）為核心的分析體系，聚焦於「流動性池（Liquidity Pool）」、「價值失衡區（FVG）」與「訂單塊（Order Block）」，解構價格推動背後的供需邏輯。',
    howToUse: {
      title: '如何辨識關鍵結構位置',
      buySignal: '當價格向下回測前期低點誘發賣盤流動性（SSL）後迅速收復，並在看漲訂單塊或 FVG 缺口獲得確認時，為合理的低風險進場位置。',
      sellSignal: '當價格向上突破前高誘發追價買盤後迅速收出長上影線回落，常反映高檔供應出籠，切忌急躁追價。',
      neutralSignal: '處於區間範圍內時，價格常出現雙向掃盤，建議等待結構性突破（BOS）明確後再行定奪。'
    },
    pitfalls: [
      '實戰中常見的陷阱是「看到突破就急著追價」，大資金往往會在流動性充足時進行對沖或出場，應注意假突破風險。'
    ],
    defaultSettings: 'SMC(Auto Detection)'
  },
  FVG: {
    id: 'FVG',
    name: '價值失衡區 (Fair Value Gap)',
    shortName: '失衡缺口 (FVG)',
    category: 'smc',
    tagline: '單邊快速行情留下的價格失衡區，常具備回測與支撐阻力參考價值',
    analogy: '好比高速行駛車輛在路面上留下的空間。行情在短時間內被單邊強勢推升，買賣雙方尚未充分換手，後續價格往往有回測填補此一失衡區間的傾向。',
    whatIsIt: '由連續三根 K 線組成的失衡形態。第 1 根高點與第 3 根低點之間的未重疊區域即為 FVG，其中 50% 位置稱為 CE（中軸平衡位）。',
    howToUse: {
      title: '如何利用 FVG 尋找回測支撐',
      buySignal: '價格在強勢推升後拉回，若回測至下方綠色看漲 FVG 的 50% 核心軸（CE）並出現踩穩支撐訊號，為低風險順勢切入點。',
      sellSignal: '空頭下行後反彈至上方紅色看跌 FVG 區域，常面臨二次拋壓，為多單減碼或觀察空方防守的位置。'
    },
    pitfalls: [
      '如果 FVG 被長實體 K 線直接摜破，代表該缺口已被打破失效（Inversion），不能再視為有效支撐。'
    ],
    defaultSettings: 'FVG(3-Bar Model)'
  },
  ORDER_BLOCK: {
    id: 'ORDER_BLOCK',
    name: '機構訂單塊 (Order Block)',
    shortName: '機構訂單塊 (OB)',
    category: 'smc',
    tagline: '大單突破前最後整理區間，常視為關鍵流動性與成本參考',
    analogy: '如同大軍出發前設立的物資集結區。在發動大幅推升之前，主力資金往往會在整理末端進行最後的籌碼收集，該區域便成為後續重要的防守基礎。',
    whatIsIt: '在強勁結構突破（BOS）前，最後一根反向顏色的 K 線區域。機構通常在此累積了大量掛單，回測時常具有強大支撐阻力效果。',
    howToUse: {
      title: '訂單塊回測交易應用',
      buySignal: '價格向上突破結構後，首次回踩看漲訂單塊（Bullish OB）頂部並獲得承接，常會迎來第二波推升。',
      sellSignal: '空頭結構中反彈測試看跌訂單塊（Bearish OB）下緣受阻回落，常反映空方防守堅決。'
    },
    pitfalls: [
      '首次回測（First Touch）的支撐阻力效果通常最強；若同一個區間被反覆測試多次，剩餘未成交掛單將逐漸耗盡，防守力道也會減弱。'
    ],
    defaultSettings: 'OB(Impulse > 1.8%)'
  },
  DCF: {
    id: 'DCF',
    name: '兩階段現金流折現模型 (Discounted Cash Flow)',
    shortName: '現金流折現 (DCF)',
    category: 'valuation',
    tagline: '經典內在價值評估模型：以未來自由現金流折現評估企業實質價值',
    analogy: '買下一間長期營運的店鋪，你需要估算它未來五年每年能實質賺進多少乾淨現金，並把通貨膨脹與風險貼水折算回今天的價值。所有折現後的現金加總，就是今天該付出的合理價。',
    whatIsIt: '預測企業未來的自由現金流（FCF），以加權平均資本成本（WACC）折現至當期現值，加上永續經營終值，換算出的每股公允價值。',
    howToUse: {
      title: '安全邊際與價值評估',
      buySignal: '當目前股價顯著低於 DCF 計算之公允價值（安全邊際 >= 20%~30%），代表下檔具備較充裕的防撞保護，為長線價值投資的關注時機。',
      sellSignal: '當股價大幅高於 DCF 公允價值 30% 以上，顯示市場評價已透支未來數年預期成長，宜提高風險警覺。'
    },
    pitfalls: [
      'DCF 結果對「折現率 WACC」與「永續成長率 g」極為敏感。因此系統提供 5x5 敏感度矩陣，建議以價值區間來思考，而非單一固定數值。'
    ],
    defaultSettings: 'DCF(2-Stage, 5Y Forecast)'
  },
  GRAHAM: {
    id: 'GRAHAM',
    name: '班傑明·葛拉漢成長股修正公式 (Graham Formula)',
    shortName: '葛拉漢公允價',
    category: 'valuation',
    tagline: '證券分析經典公式：結合成長率與利率環境計算合理價值',
    analogy: '到市場挑選商品，如果一件品質良好的商品定價 100 元，現在促銷打折只賣 70 元，這中間省下的 30 元就是你的安全邊際，即使後續有些微波動，依然保有充分的緩衝空間。',
    whatIsIt: '價值投資之父葛拉漢提出之經典估值公式：內在價值 = [EPS * (8.5 + 2g) * 4.4] / Y。其中 8.5 為基礎本益比，g 為年化預估成長率，4.4/Y 則依當前無風險利率進行折算調整。',
    howToUse: {
      title: '安全邊際防護法則',
      buySignal: '安全邊際 >= 30%（即現價約在公允價七折以下），代表具備較為厚實的評價面防線。',
      sellSignal: '現價高於公允價值 25% 以上（安全邊際為負值），反映市場情緒較為亢奮，宜審慎因應。'
    },
    pitfalls: [
      '葛拉漢公式主要適用於具備穩定獲利與可預測成長的成熟企業，不適用於尚未獲利之新創科技股。'
    ],
    defaultSettings: 'Graham(RF = 4.2%)'
  },
  PEG: {
    id: 'PEG',
    name: '彼得·林區本益成長比 (Peter Lynch PEG)',
    shortName: '本益成長比 (PEG)',
    category: 'valuation',
    tagline: '彼得·林區評價法：衡量本益比是否與企業盈餘成長相符',
    analogy: '如同挑選高性能跑車。若一輛車加速極快（高成長率 30%），賣價稍微偏高（本益比 30 倍）尚稱合理（PEG 約為 1.0）；但若一輛車動力平平，售價卻比照跑車，那顯然買得過於昂貴。',
    whatIsIt: '以本益比（P/E）除以預期盈餘成長率（g），用以平衡評估「股價昂貴程度」與「企業成長潛力」。',
    howToUse: {
      title: 'PEG 數值判讀指引',
      buySignal: 'PEG <= 0.8 時，代表其成長動能相對估值而言具備吸引力，可能被市場暫時低估。',
      sellSignal: 'PEG >= 1.8 ~ 2.0 時，反映市場預期已相當充分甚至過熱，後續若財報成長稍不如預期，易面臨估值下修風險。'
    },
    pitfalls: [
      '若企業是因為偶發性業外收益導致單季 EPS 短暫暴衝，計算出的 PEG 將失去參考意義，需檢視本業獲利的真實性。'
    ],
    defaultSettings: 'PEG = P/E / 5Y_Growth'
  },
  MONTE_CARLO: {
    id: 'MONTE_CARLO',
    name: '蒙地卡羅幾何布朗運動模擬 (Monte Carlo Simulation)',
    shortName: '蒙地卡羅模擬',
    category: 'valuation',
    tagline: '透過隨機路徑模擬價格分佈，以機率思維評估未來波動與風險',
    analogy: '如同氣象觀測中的降雨機率預測。預報員不會斷言某個確切分鐘一定下雨，而是透過多次模型運算，評估有 80% 機率降雨及可能的雨量範圍，幫助我們提早做好防範準備。',
    whatIsIt: '量化金融工程演算法。依據歷史年化波動率與漂移率，隨機生成 1,000 條未來價格可能走勢路徑，藉此統計未來價格的區間分佈機率、信賴區間與潛在最大風險（VaR）。',
    howToUse: {
      title: '機率思維與風險控制應用',
      buySignal: '當中位數期望目標具備良好的向上空間，且跌破下檔停損線的機率低於 15% 時，為風險報酬比相對理想的交易架構。',
      sellSignal: '當模擬顯示跌破防守線的下行風險偏高（下行機率 > 35%~40%），即便整體偏多，也宜縮減曝險部位以控管下檔風險。'
    },
    pitfalls: [
      '蒙地卡羅模擬是建立在過去波動率的基礎上，若市場面臨突發性重大地緣政治或總體黑天鵝事件，極端走勢可能超出常態區間。'
    ],
    defaultSettings: '1000 Simulations / 60 Days'
  }
};
