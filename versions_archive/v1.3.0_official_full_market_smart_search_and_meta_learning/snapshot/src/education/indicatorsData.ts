export interface IndicatorEducation {
  id: string;
  name: string;
  shortName: string;
  category: 'main' | 'sub' | 'smc' | 'valuation';
  tagline: string;
  analogy: string; // 小白生活化比喻
  whatIsIt: string; // 到底是什麼
  howToUse: {
    title: string;
    buySignal: string;  // 買進/做多信號
    sellSignal: string; // 賣出/做空信號
    neutralSignal?: string;
  };
  pitfalls: string[]; // 小白必踩地雷與盲點
  defaultSettings: string;
}

export const INDICATORS_DATA: Record<string, IndicatorEducation> = {
  MA: {
    id: 'MA',
    name: '移動平均線 (Moving Average)',
    shortName: '均線 (MA)',
    category: 'main',
    tagline: '最經典、最直覺的市場平均持股成本指標',
    analogy: '想像全班同學過去幾次考試的「平均分數」。若最新一次考試成績高於平均，表示班級程度在進步；若成績跌破平均，表示退步中。',
    whatIsIt: '將過去一段時間的收盤價相加後取平均值所畫成的連續平滑曲線。常見週期有 5日(週線)、20日(月線)、60日(季線)。',
    howToUse: {
      title: '如何判讀趨勢與買賣時機',
      buySignal: '【黃金交叉 & 多頭排列】：短週期均線（如 5MA）由下往上穿過長週期均線（如 20MA），且均線呈現發散向上，代表買盤強勁。',
      sellSignal: '【死亡交叉 & 空頭排列】：短週期均線由上往下摜破長週期均線，且所有均線頭部向下傾斜，代表賣壓湧現，宜減碼避險。',
      neutralSignal: '當均線相互糾結纏繞成麻花狀時，代表目前為無趨勢的橫盤整理期，不宜重壓。'
    },
    pitfalls: [
      '均線屬於「落後指標」，當訊號出現時股價往往已經漲或跌了一段。',
      '在盤整盤（忽上忽下）中頻繁交叉容易產生「騙線」，導致被來回巴臉。'
    ],
    defaultSettings: 'MA(5, 10, 20, 60)'
  },
  EMA: {
    id: 'EMA',
    name: '指數移動平均線 (Exponential MA)',
    shortName: '指數均線 (EMA)',
    category: 'main',
    tagline: '對近期價格變化更靈敏的加速型均線',
    analogy: '比起一年前的考試分數，老師顯然更重視「昨天的模擬考成績」。EMA 就是給予最近幾天的價格更高的權重。',
    whatIsIt: '加權平均線的一種，大幅減少傳統 MA 的延遲性，能比普通均線更早幾天發出轉折警訊。國外華爾街交易員最愛用的指標之一。',
    howToUse: {
      title: '如何判讀趨勢與動能',
      buySignal: '股價踩在 EMA(12) 或 EMA(26) 之上持續走高，且斜率陡峭時，為強烈順勢買進訊號。',
      sellSignal: '長黑 K 棒跌破 EMA 支撐線且無法在 3 日內收復，代表上升動能衰竭，應獲利了結。',
    },
    pitfalls: [
      '因為太靈敏，在震盪洗盤時會產生比普通 MA 更多的假突破。'
    ],
    defaultSettings: 'EMA(12, 26)'
  },
  BOLL: {
    id: 'BOLL',
    name: '布林通道 (Bollinger Bands)',
    shortName: '布林帶 (BOLL)',
    category: 'main',
    tagline: '利用統計學標準差，框出股價合理波動的高速公路',
    analogy: '就像一條有彈性的三線道高速公路（上軌、中軌、下軌）。根據統計學，車子（股價）有 95% 的時間都必須行駛在護欄以內。',
    whatIsIt: '由中軌（通常為 20MA）加上正負 2 個標準差構成上軌與下軌。當股價碰到護欄時，往往意味著極端走勢即將收斂。',
    howToUse: {
      title: '開口與軌道判別法',
      buySignal: '【觸底反彈/開口擴大】：股價跌破或觸碰下軌後收出帶下影線的紅K；或通道急劇張口向上，股價強勢貼著上軌狂飆。',
      sellSignal: '【觸頂過熱/跌破中軌】：股價衝出上軌後動能停滯收黑K；或是原本貼上軌上漲的股票跌破中軌支撐。',
      neutralSignal: '通道縮到極窄（收口）代表「暴風雨前的寧靜」，隨時準備迎來大波段爆發行情！'
    },
    pitfalls: [
      '很多小白誤以為「碰到上軌就一定放空、碰下軌就一定買」，但遇到強烈主升段時，股價會連續幾週「沿著上軌往上噴」，盲目放空會被嘎上天！'
    ],
    defaultSettings: 'BOLL(20, 2)'
  },
  SAR: {
    id: 'SAR',
    name: '拋物轉向指標 (Stop and Reverse)',
    shortName: '停損轉向 (SAR)',
    category: 'main',
    tagline: '最無腦直覺的停損與停利導航點點',
    analogy: '就像在車尾緊緊跟隨的智慧自動剎車雷達，一旦煞車距離不夠（被價格穿透），就立刻踩剎車並調轉方向。',
    whatIsIt: '在 K 線上方或下方顯示的一連串拋物線圓點，專門用於波段跟隨與移動停損。',
    howToUse: {
      title: '圓點位置判別法',
      buySignal: '圓點由 K 線「上方」跳轉到 K 線「下方」，代表空翻多，為波段買進訊號。',
      sellSignal: '圓點由 K 線「下方」跳轉到 K 線「上方」，代表多翻空，應無條件執行波段停利或停損。'
    },
    pitfalls: [
      '在無方向的箱型盤整區間，SAR 圓點會上下反覆亂跳，導致交易成本暴增。'
    ],
    defaultSettings: 'SAR(0.02, 0.2)'
  },
  MACD: {
    id: 'MACD',
    name: '平滑異同移動平均線 (MACD)',
    shortName: '指標之王 (MACD)',
    category: 'sub',
    tagline: '全球技術分析者使用率第一名的中長期波段指標',
    analogy: '像是快跑選手（DIF快線）與慢跑選手（DEA慢線）的比賽。快跑選手領先時柱子變長，落後時柱子變短或變色。',
    whatIsIt: '計算快慢兩條均線的差離值，並透過柱狀體（Histogram）視覺化呈現多空雙方的爆發力道。',
    howToUse: {
      title: '零軸、金叉與背離法',
      buySignal: '【水上金叉】：在 0 軸上方快線向上穿越慢線，且柱狀體由綠轉紅（或由負轉正），為極度可靠的強勢波段進場點。',
      sellSignal: '【頂背離 & 死叉】：股價明明創新高，但 MACD 柱子高度卻一波比一波低（頂背離），隨後快線向下穿越慢線，代表大跌即將來臨。'
    },
    pitfalls: [
      '零軸下方的金叉往往只是弱勢反彈，新手不要輕易重壓，零軸上方的金叉勝率才高！'
    ],
    defaultSettings: 'MACD(12, 26, 9)'
  },
  RSI: {
    id: 'RSI',
    name: '相對強弱指標 (Relative Strength Index)',
    shortName: '相對強弱 (RSI)',
    category: 'sub',
    tagline: '快速衡量買氣是否過熱或超賣的最佳鐘擺',
    analogy: '拔河比賽的力量拉鋸。數值在 0~100 之間。超過 70 代表買方使出吃奶的力氣快虛脫了（過熱）；低於 30 代表賣方力氣快用光了（超賣）。',
    whatIsIt: '統計一段時間內多方上漲力量佔整體波動的比例，專門用來捕捉過度極端情緒後的反轉點。',
    howToUse: {
      title: '超買超賣與背離判讀',
      buySignal: 'RSI 跌破 30 或甚至跌到 20 以下（超賣極端），隨後向上勾頭重新突破 30，為搶反彈絕佳甜蜜點。',
      sellSignal: 'RSI 衝破 70 或甚至突破 80 以上（超買極端），隨後向下回落跌破 70；或是價格破頂而 RSI 未過前高（背離）。'
    },
    pitfalls: [
      '「超買不代表馬上會跌」，在大牛市強勢噴發股中，RSI 可以在 80 以上高檔「鈍化」長達數週，單憑 RSI 超買去放空是非常危險的行為！'
    ],
    defaultSettings: 'RSI(6, 12, 24) 或 單線 RSI(14)'
  },
  KDJ: {
    id: 'KDJ',
    name: '隨機指標 (Stochastic Oscillator)',
    shortName: '短線之王 (KDJ)',
    category: 'sub',
    tagline: '亞洲散戶與短線當沖客最愛的敏感高低點捕捉器',
    analogy: '就像一隻敏感的小獵犬，價格稍微有一點微風吹草動，它就會率先狂吠跳躍。由 K值(快)、D值(慢)、J值(方向感應) 組成。',
    whatIsIt: '結合動量理念、強弱指標與移動平均優點，專門用於日線級別或日內短線的極限轉折點預測。',
    howToUse: {
      title: '低檔金叉與高檔死叉',
      buySignal: 'J值或 K值在 20 以下（超賣區）由下往上金叉 D值，尤其是出現雙重築底形態時，短線反彈機率極高。',
      sellSignal: 'J值在 80 或 100 以上（超買過熱）由上向下死叉 D值，代表短線追價買盤力竭，是絕佳的獲利拔檔點。'
    },
    pitfalls: [
      '因為過於靈敏，在強烈的單邊單向大趨勢中會頻繁鈍化，一定要搭配均線趨勢一起使用。'
    ],
    defaultSettings: 'KDJ(9, 3, 3)'
  },
  VOL: {
    id: 'VOL',
    name: '成交量 (Volume)',
    shortName: '成交量 (VOL)',
    category: 'sub',
    tagline: '股市中唯一無法作假的真實主力籌碼與資金指標',
    analogy: '「價格是車子的方向，成交量是汽油」。沒有充足的汽油，車子就算往前衝，很快也會停下來。',
    whatIsIt: '在特定時間週期內市場所有買賣雙方撮合成交的總股數或總張數。所有技術分析的基本核心。',
    howToUse: {
      title: '量價配合四字訣',
      buySignal: '【帶量突破】：股價盤整許久後，突然爆出比平時多 2~3 倍的成交量突破整理區間，代表主力大戶進場！',
      sellSignal: '【高檔爆量長黑】或【量價背離（價漲量縮）】：股價創新高但量能急縮，或是高檔爆出歷史巨量卻收長上影線，代表大戶出貨。'
    },
    pitfalls: [
      '不要只看單一根柱子的高低，要觀察「量能均線」的趨勢變化。'
    ],
    defaultSettings: 'VOL(5, 10, 20)'
  },
  ATR: {
    id: 'ATR',
    name: '真實波動幅度均值 (Average True Range)',
    shortName: '波動率 (ATR)',
    category: 'sub',
    tagline: '職業交易員用來設定停損點與部位大小的神器',
    analogy: '天氣預報的「風浪級數」。告訴你今天的市場是微風徐徐（低波動）還是狂風暴雨（高波動）。',
    whatIsIt: '衡量一段時間內股價每天高低起伏的絕對振幅平均值。它不預測方向，只告訴你「震盪有多劇烈」。',
    howToUse: {
      title: '動態停損與防守',
      buySignal: 'ATR 數值降到歷史相對低位，代表市場極度沉寂，通常預告即將出現突破性的變盤大行情！',
      sellSignal: '以當前買進價「減去 2 倍的 ATR 數值」作為保命停損價。若波動突然暴增且 ATR 飆高，應適度縮小持有部位以控制風險。'
    },
    pitfalls: [
      'ATR 沒有方向性，只反映價格震動劇烈程度，不能單獨作為買進或賣出的方向依據。'
    ],
    defaultSettings: 'ATR(14)'
  },
  OBV: {
    id: 'OBV',
    name: '能量潮指標 (On Balance Volume)',
    shortName: '能量潮 (OBV)',
    category: 'sub',
    tagline: '洞察主力大戶悄悄吸籌或暗中倒貨的X光機',
    analogy: '累積計票箱。上漲當天把所有成交量全算成贊成票（加進箱子），下跌當天全算成反對票（從箱子扣除）。',
    whatIsIt: '透過價格的漲跌將每日成交量作符號化累加，以觀察多空資金在水面下的淨流入流出。',
    howToUse: {
      title: '領先指標特性',
      buySignal: '股價還在橫盤打底，但 OBV 曲線已經領先突破前波高點，代表主力大戶正在默默吃貨吸籌，往往是起漲前兆！',
      sellSignal: '股價在攀升，但 OBV 曲線卻停滯不前或掉頭下行，代表資金早已悄悄撤出（主力出貨）。'
    },
    pitfalls: [
      '若遇到異常的除權息或單日異常巨量跳空，OBV 的累積數值容易失真，需結合其他指標複核。'
    ],
    defaultSettings: 'OBV(30)'
  },
  VWAP: {
    id: 'VWAP',
    name: '成交量加權平均價 (Volume-Weighted Average Price)',
    shortName: '量加權均線 (VWAP)',
    category: 'main',
    tagline: '華爾街機構與日內當沖大戶最不可侵犯的公允成本基準線',
    analogy: '團購批發的真正單價。普通均線不管每次買進多少股，只算每天價格平均；VWAP 則把「大買單成交在什麼價格」精準加權進去，呈現主力真金白銀的平均持有成本。',
    whatIsIt: '結合成交量與成交價格計算出的動態均價基準線。機構交易員的 KPI 通常以能否買在「低於 VWAP」來評估下單績效。',
    howToUse: {
      title: '機構多空分水嶺判讀',
      buySignal: '股價在 VWAP 之上運行且回踩 VWAP 獲得強勁支撐不破，為強烈順勢買點，代表多方主力強力控盤。',
      sellSignal: '股價有效跌破 VWAP 且反彈受阻於 VWAP 之下，代表市場轉為空方主導，當沖或短線多單應果斷停損。'
    },
    pitfalls: [
      'VWAP 最適用於日內分時交易（1分、5分、15分線）。在極長週期日線圖上，需注意每天開盤重置機制。'
    ],
    defaultSettings: 'VWAP(Daily)'
  },
  SMC: {
    id: 'SMC',
    name: '聰明錢機構概念 (Smart Money Concepts)',
    shortName: '機構訂單流 (SMC)',
    category: 'smc',
    tagline: '看穿華爾街大鱷與對沖基金的獵殺手法，跟著機構主力吃香喝辣',
    analogy: '就像看一場專業撲克牌局。散戶總是以為自己在和運氣賭博，但聰明錢機構是「知道所有散戶底牌的牌手」。SMC 幫助你辨認機構何時在下套、何時在真正建倉。',
    whatIsIt: '由資深交易員與機構研究員提煉的一套訂單流（Order Flow）體系，核心聚焦在「流動性池（Liquidity Pool）」、「價值失衡區（FVG）」與「機構訂單塊（Order Block）」。',
    howToUse: {
      title: '如何識別機構動作',
      buySignal: '當機構向下假跌破散戶停損點（清掃賣方流動性 SSL）後迅速拉回，並回踩確認看漲訂單塊或 FVG 缺口時，為最佳機構順風進場點。',
      sellSignal: '當價格向上假突破前期高點（引誘散戶追高並觸發空頭停損）後收出長上影線暴跌，代表主力倒貨完畢，切勿盲目追價。',
      neutralSignal: '在震盪區間內，機構正在密集製造雙向假突破，建議等待結構性破位（BOS）後再進場。'
    },
    pitfalls: [
      '小白最常犯的錯誤是「看到突破就無腦追」。機構最喜歡在散戶集體追高的地方倒貨！'
    ],
    defaultSettings: 'SMC(Auto Detection)'
  },
  FVG: {
    id: 'FVG',
    name: '價值失衡區 (Fair Value Gap)',
    shortName: '失衡缺口 (FVG)',
    category: 'smc',
    tagline: '火箭急速升空留下的價格黑洞，強大引力必將吸引價格回踩補缺',
    analogy: '高速行駛的跑車在路面留下的煞車真空區。市場在短時間內被單邊暴力掃單，買賣雙方來不及充分撮合，因此未來價格有極高機率像磁鐵一樣被吸回來填補這個缺口。',
    whatIsIt: '由三根 K 線組成的失衡形態。第 1 根的頂部與第 3 根的底部之間留下的空白區域。其中間點位稱為 CE（Consequent Encroachment，50% 核心中軸）。',
    howToUse: {
      title: '如何利用 FVG 精準掛單',
      buySignal: '股價強勢噴發後拉回，精準踩到下方綠色看漲 FVG 的 50% 水線（CE）並出現反彈下影線時，為絕佳的低風險順勢進場點。',
      sellSignal: '在空頭下殺後反彈至上方紅色看跌 FVG 區域，常遭遇機構二次拋壓，為逢高減碼或做空的防守點。'
    },
    pitfalls: [
      '如果 FVG 被實體長黑 K 棒暴力貫穿，代表該缺口已被破壞（Inversion），不能再當成支撐使用。'
    ],
    defaultSettings: 'FVG(3-Bar Model)'
  },
  ORDER_BLOCK: {
    id: 'ORDER_BLOCK',
    name: '機構訂單塊 (Order Block)',
    shortName: '機構訂單塊 (OB)',
    category: 'smc',
    tagline: '主升段暴風雨前夕，主力機構最後一次壓盤吃籌的秘密基地',
    analogy: '大軍出征前的秘密糧倉。在機構發動一場大規模單邊暴漲前，往往會故意打壓出最後一根黑 K 線來誘空並吸乾最後的籌碼。這個黑 K 線區域就是機構的持倉成本核心。',
    whatIsIt: '在強勁結構突破（BOS）發起前，最後一根相反顏色的 K 線。機構往往在此留下了大量未完全撮合的限價單。',
    howToUse: {
      title: '訂單塊回測交易法',
      buySignal: '多頭強勢突破後首次回踩看漲訂單塊（Bullish OB）頂部，通常會迎來強烈的二次推升。',
      sellSignal: '空頭行情中反彈重測看跌訂單塊（Bearish OB）底部，通常承壓回落下跌。'
    },
    pitfalls: [
      '第一次回踩（First Touch）勝率最高；如果價格反覆進出該區間多次，代表訂單已被消化殆盡，支撐效力將大幅遞減。'
    ],
    defaultSettings: 'OB(Impulse > 1.8%)'
  },
  DCF: {
    id: 'DCF',
    name: '兩階段現金流折現模型 (Discounted Cash Flow)',
    shortName: '現金流折現 (DCF)',
    category: 'valuation',
    tagline: '巴菲特最推崇的估值聖杯：計算一家公司一生究竟能幫你賺多少真金白銀',
    analogy: '想像你買下一隻會下金蛋的鵝。你算出牠未來 5 年每年能下幾顆金蛋，但因為通貨膨脹與不確定性，明年的金蛋價值要比今年的金蛋「打個折」。把未來所有打折後的金蛋加總，就是這隻鵝今天最真實的價值！',
    whatIsIt: '將公司未來預期產生的自由現金流（FCF），依照加權平均資本成本（WACC）逐年折算回今日現值（PV），再加上永續經營終值，算出的每股公允內在價值。',
    howToUse: {
      title: '安全邊際與定價判斷',
      buySignal: '當目前市價顯著低於 DCF 每股公允價值（安全邊際 >= 20%~30%），代表市場給予了充足的防撞氣囊，是長線價值投資的絕佳買點。',
      sellSignal: '當市價遠超 DCF 公允價值 30% 以上，代表股價已透支未來數年的成長，應提高警覺分批停利。'
    },
    pitfalls: [
      'DCF 模型對「折現率 WACC」與「永續成長率 g」非常敏感。這也是為什麼我們軟體中提供了 5x5 敏感度矩陣，永遠不要相信單一精準數字，而要看整體價值區間！'
    ],
    defaultSettings: 'DCF(2-Stage, 5Y Forecast)'
  },
  GRAHAM: {
    id: 'GRAHAM',
    name: '班傑明·葛拉漢成長股修正公式 (Graham Formula)',
    shortName: '葛拉漢公允價',
    category: 'valuation',
    tagline: '證券分析之父傳承百年的安全邊際買菜打折法',
    analogy: '去菜市場買牛肉，秤重後老闆說這塊肉價值 100 元，但今天只賣你 65 元。這中間省下來的 35 元就是你的「安全邊際」。就算你回家發現肉稍微縮水了一點，你依然完全不會虧錢！',
    whatIsIt: '巴菲特的恩師葛拉漢提出的經典公式：內在價值 = [EPS * (8.5 + 2g) * 4.4] / Y。其中 8.5 為零成長本益比基數，g 為年化成長率，4.4/Y 則是根據當前公債利率進行的折算微調。',
    howToUse: {
      title: '安全邊際防撞法則',
      buySignal: '安全邊際 >= 30%（即現價只有公允價的 7 折以下），具備強烈的價值保護防線。',
      sellSignal: '現價高於公允價 25% 以上（安全邊際為負），市場進入情緒化超買。'
    },
    pitfalls: [
      '葛拉漢公式不適用於研發支出極高、尚未實現穩定獲利的新創科技股。'
    ],
    defaultSettings: 'Graham(RF = 4.2%)'
  },
  PEG: {
    id: 'PEG',
    name: '彼得·林區本益成長比 (Peter Lynch PEG)',
    shortName: '本益成長比 (PEG)',
    category: 'valuation',
    tagline: '傳奇基金經理人彼得·林區：買高成長股，絕不為虛胖本益比當冤大頭',
    analogy: '花錢買跑車。如果一輛跑車加速極快（成長率 30%），賣價稍微貴一點（本益比 30 倍）很合理（PEG = 1.0）；但如果一輛老爺車速度只有 5%，售價卻跟跑車一樣貴（本益比 30 倍，PEG = 6.0），那你顯然被當肥羊宰了！',
    whatIsIt: '本益比（P/E）除以盈餘成長率（g）。平衡了「股價昂貴程度」與「企業增長爆發力」。',
    howToUse: {
      title: 'PEG 數值黃金法則',
      buySignal: 'PEG <= 0.8 時，代表成長性遠遠超過目前估值，被市場嚴重忽視，是爆發力最強的千里馬。',
      sellSignal: 'PEG >= 1.5~2.0 時，代表市場預期過於狂熱，哪怕財報稍有不及預期就容易引發雪崩暴跌。'
    },
    pitfalls: [
      '若一家公司只是因為偶發性一次性處分資產導致單季 EPS 暴增，算出來的 PEG 會產生嚴重誤導。'
    ],
    defaultSettings: 'PEG = P/E / 5Y_Growth'
  },
  MONTE_CARLO: {
    id: 'MONTE_CARLO',
    name: '蒙地卡羅幾何布朗運動模擬 (Monte Carlo Simulation)',
    shortName: '蒙地卡羅模擬',
    category: 'valuation',
    tagline: '擲一千次骰子模擬未來所有可能走勢，徹底告別盲人摸象的點位預測',
    analogy: '就像天氣預報的「降雨機率雷達圖」。預報員不會鐵口直斷「明天下午 2 點 05 分一定下雨」，而是透過超級電腦模擬 1,000 次氣壓風場，告訴你「明天有 85% 機率降雨、最壞情況降雨量多少」，讓你出門前決定要不要帶傘。',
    whatIsIt: '金融工程頂級量化演算法。根據歷史年化波動率與預期漂移率，運行 1,000 條未來 60 天隨機價格路徑，生成未來的扇形機率分佈、95% 信賴區間與最大在險價值（VaR）。',
    howToUse: {
      title: '機率思維與風險控制',
      buySignal: '當中位數期望目標價具備良好上行空間，且跌破 -10% 停損線的機率低於 15% 時，為風險收益比極佳的交易結構。',
      sellSignal: '當模擬顯示跌破防守線的尾部風險極高（VaR 擴大、下行機率 > 40%），即便看多也應大幅縮減倉位。'
    },
    pitfalls: [
      '蒙地卡羅基於歷史波動率假設，若遇突發黑天鵝地緣衝突，實際波動可能會擊穿極限區間。'
    ],
    defaultSettings: '1000 Simulations / 60 Days'
  }
};

