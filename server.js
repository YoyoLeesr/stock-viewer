// ============================================================================
// PICK@STOCK TRANSACTION ANALYZER PRO - COMPLETE SERVER
// Advanced Stock Analysis & Trading Bot Backend
// ============================================================================
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const cron = require("node-cron");
const app = express();

// ============ CORS CONFIGURATION ============
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());

// ============ CONSTANTS ============
const PICKASTOCK_BASE = "https://p2.pickastock.info";
const PORT = process.env.PORT || 5177;

// ============ REQUEST LOGGING MIDDLEWARE ============
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// ============================================================================
// SYMBOL CACHE & MAPPING SYSTEM
// ============================================================================
const symbolCache = new Map();
const mappingFile = path.join(__dirname, 'stock_mappings.json');

// Known mappings for common Malaysian stocks (numeric codes)
const numericMappings = {
  'PETGAS': '6033',
  'MRDIY': '5296',
  'MAYBANK': '1155',
  'CIMB': '1023',
  'PBBANK': '1295',
  'RHBBANK': '1066',
  'HLBANK': '5819',
  'AMBANK': '1015',
  'BIMB': '5258',
  'ABMB': '2488',
  'TENAGA': '5347',
  'AXIATA': '6888',
  'MAXIS': '6012',
  'DIGI': '6947',
  'TM': '4863',
  'TIMECOM': '5031',
  'PCHEM': '5183',
  'MISC': '3816',
  'DIALOG': '7277',
  'BURSA': '1818',
  'IHH': '5225',
  'KLK': '2445',
  'SIME': '4197',
  'IOICORP': '1961',
  'FGV': '5222',
  'FELDA': '5222',
  'GENTING': '3182',
  'GENM': '4715',
  'RESORTS': '4715',
  'AIRASIA': '5099',
  'AIRASIAX': '5238',
  'MMHE': '5186',
  'SAPNRG': '5218',
  'VELESTO': '5243',
  'DAYANG': '5141',
  'BAUTO': '5248',
  'PENTA': '7160',
  'INARI': '0166',
  'UNISEM': '5005',
  'NESTLE': '4707',
  'HLFG': '1082',
  'ALLIANZ': '1163',
  'TAKAFUL': '6139',
  'SUNWAY': '5211',
  'SPSETIA': '8664',
  'UOADEV': '5200',
  'SIMEPROP': '5288',
  'MRCB': '1651',
  'IJMLAND': '5215',
  'IJM': '3336',
  'GAMUDA': '5398',
  'WCT': '9679',
  'YTL': '4677',
  'YTLPOWR': '6742',
  'YTLREIT': '5109',
  'SUNREIT': '5176',
  'PAVREIT': '5212',
  'IGBREIT': '5227',
  'AXREIT': '5106',
  'AMFIRST': '5120',
  'CAPITALAND': '5186',
  'MALAKOF': '5264',
  'PMETAL': '8869',
  'KOSSAN': '7153',
  'TOPGLOV': '7113',
  'HARTA': '5168',
  'SUPERMX': '7106',
  'PADINI': '7052',
  'AEON': '6599',
  'AEONCR': '5139',
  'PARKSON': '5657',
  'PETDAG': '5681',
  'PETRONM': '5983',
  'SCOMNET': '0062',
  'FRONTKN': '0128',
  'VS': '6963',
  'SKPRES': '7155',
  'PLINTAS': '5246',
  'LITRAK': '6645',
  'PLUS': '5090',
  'DRBHCOM': '1619',
  'PROTON': '7089',
  'MBSB': '1171',
  'AFFIN': '5185',
  'AHEALTH': '6399',
  'ASTRO': '6399',
  'MEDIA': '8818',
  'STAR': '6084',
  'BERJAYA': '3395',
  'BJFOOD': '5196',
  'BJTOTO': '1562',
  'MAGNUM': '3859',
  'MPI': '3859',
  'TANJONG': '2291',
  'GKENT': '3204',
  'EKOVEST': '8133',
  'KIMLUN': '5171',
  'GLOMAC': '5020',
  'MATRIX': '5236',
  'ECONPILE': '5139',
  'MUHIBAH': '5703',
  'MELATI': '5129',
  'SENDAI': '5205',
  'SASBADI': '5252',
  'DATAPRP': '5037',
  'PRESBHD': '5204',
  'HENGYUAN': '4324',
  'PARAMON': '5081',
  'SERBADK': '5279',
  'SDG': '5279',
  'PERDANA': '7108',
  'ALAM': '5115',
  'COASTAL': '5071',
  'HANDAL': '5098',
  'SCOMI': '7158',
  'SCGBHD': '7247',
  'CLMT': '5011',
  'PANAMY': '9075',
  'MFCB': '3069',
  'ORKIM': '5201',
  'SDS': '0212',
  'PARADIGM': '7034',
  '99SMART': '5237',
  'CTOS': '5301',
  'FFB': '5197',
  'UWC': '5292',
  'DPHARMA': '7148',
  'E&O': '3417',
  'SAM': '5304',
  'WASCO': '5142',
  'ATECH': '5265',
  'AME': '5122',
  'CDB': '7076',
  'SMRT': '0058',
  'D&O': '7204',
  'ITMAX': '5309',
  'UTDPLT': '2119',
  'F&N': '3689',
  'GENP': '2291',
  'JPG': '5323',
  'PPB': '4065',
  'KGB': '5193'
};

// Load saved mappings from file
function loadMappings() {
  try {
    if (fs.existsSync(mappingFile)) {
      const data = fs.readFileSync(mappingFile, 'utf8');
      const savedMappings = JSON.parse(data);
      console.log(`📚 Loaded ${Object.keys(savedMappings).length} saved mappings`);
      Object.assign(numericMappings, savedMappings);
    }
  } catch (e) {
    console.error('Error loading mappings:', e.message);
  }
}

// Save new mapping to file
function saveMapping(textCode, numericSymbol) {
  try {
    let mappings = {};
    if (fs.existsSync(mappingFile)) {
      const data = fs.readFileSync(mappingFile, 'utf8');
      mappings = JSON.parse(data);
    }
    const numericCode = numericSymbol.replace('.KL', '').replace('.KLSE', '').replace('.MY', '');
    if (!mappings[textCode]) {
      mappings[textCode] = numericCode;
      fs.writeFileSync(mappingFile, JSON.stringify(mappings, null, 2), 'utf8');
      console.log(`💾 Saved mapping: ${textCode} → ${numericCode}`);
      numericMappings[textCode] = numericCode;
    }
  } catch (e) {
    console.error('Error saving mapping:', e.message);
  }
}

// ============ DYNAMIC SYMBOL SEARCH ============
async function searchYahooSymbol(stockName) {
  try {
    const searchUrl = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(stockName)}&quotesCount=10&newsCount=0&enableFuzzyQuery=false&quotesQueryId=tss_match_phrase_query&region=MY`;
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    if (response.ok) {
      const data = await response.json();
      const quotes = data.quotes || [];
      const malaysianStocks = quotes.filter(q =>
        q.symbol && (q.symbol.endsWith('.KL') || q.symbol.endsWith('.KLSE'))
      );
      if (malaysianStocks.length > 0) {
        const exactMatch = malaysianStocks.find(q =>
          q.symbol.toUpperCase().includes(stockName.toUpperCase())
        );
        const selectedStock = exactMatch || malaysianStocks[0];
        console.log(`🔍 Search found: ${stockName} → ${selectedStock.symbol} (${selectedStock.shortname || selectedStock.longname})`);
        return selectedStock.symbol;
      }
    }
  } catch (e) {
    console.error(`❌ Search error for ${stockName}:`, e.message);
  }
  return null;
}

// ============ SMART YAHOO SYMBOL DETECTION ============
async function findYahooSymbol(stockCode) {
  const code = stockCode.trim().toUpperCase();
  let variants = [];
  
  if (numericMappings[code]) {
    const numericCode = numericMappings[code];
    variants = [
      `${numericCode}.KL`,
      `${numericCode}.KLSE`,
      `${code}.KL`,
      code,
      `${code}.KLSE`,
      `${code}.MY`
    ];
  } else if (/^\d{4}$/.test(code)) {
    variants = [`${code}.KL`, `${code}.KLSE`, `${code}.MY`];
  } else {
    variants = [`${code}.KL`, code, `${code}.KLSE`, `${code}.MY`];
  }
  
  for (const symbol of variants) {
    try {
      const testUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=5d&interval=1d`;
      const response = await fetch(testUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.chart && data.chart.result && data.chart.result.length > 0) {
          const timestamps = data.chart.result[0].timestamp || [];
          if (timestamps.length > 0) {
            console.log(`✅ Found symbol for ${code}: ${symbol}`);
            if (!numericMappings[code] && /^\d{4}/.test(symbol)) {
              saveMapping(code, symbol);
            }
            return symbol;
          }
        }
      }
    } catch (e) {
      // Continue to next variant
    }
  }
  
  console.log(`🔍 Trying search API for ${code}...`);
  const searchResult = await searchYahooSymbol(code);
  if (searchResult) {
    if (!numericMappings[code]) {
      saveMapping(code, searchResult);
    }
    return searchResult;
  }
  
  console.log(`❌ No valid symbol found for ${code}`);
  return null;
}

async function getYahooSymbolWithCache(stockCode) {
  const code = stockCode.trim().toUpperCase();
  if (symbolCache.has(code)) {
    return symbolCache.get(code);
  }
  const symbol = await findYahooSymbol(code);
  symbolCache.set(code, symbol);
  return symbol;
}

// Load mappings on startup
loadMappings();

// ============================================================================
// TECHNICAL INDICATORS MODULE
// ============================================================================
const technicalIndicators = {
  // Simple Moving Average
  calculateSMA(prices, period) {
    if (prices.length < period) return null;
    const sum = prices.slice(-period).reduce((a, b) => a + b.close, 0);
    return sum / period;
  },

  // Exponential Moving Average
  calculateEMA(prices, period) {
    if (prices.length < period) return null;
    const multiplier = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((a, b) => a + b.close, 0) / period;
    for (let i = period; i < prices.length; i++) {
      ema = (prices[i].close - ema) * multiplier + ema;
    }
    return ema;
  },

  // Relative Strength Index
  calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return null;
    let gains = 0, losses = 0;
    for (let i = prices.length - period; i < prices.length; i++) {
      const change = prices[i].close - prices[i - 1].close;
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  },

  // MACD (Moving Average Convergence Divergence)
  calculateMACD(prices) {
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    if (!ema12 || !ema26) return null;
    const macdLine = ema12 - ema26;
    return {
      macd: macdLine,
      ema12,
      ema26
    };
  },

  // Bollinger Bands
  calculateBollingerBands(prices, period = 20, stdDev = 2) {
    if (prices.length < period) return null;
    const sma = this.calculateSMA(prices, period);
    const priceValues = prices.slice(-period).map(p => p.close);
    const variance = priceValues.reduce((sum, price) => {
      return sum + Math.pow(price - sma, 2);
    }, 0) / period;
    const standardDeviation = Math.sqrt(variance);
    return {
      upper: sma + (standardDeviation * stdDev),
      middle: sma,
      lower: sma - (standardDeviation * stdDev)
    };
  },

  // Volume Analysis
  analyzeVolume(prices, period = 20) {
    if (prices.length < period) return null;
    const recentVolumes = prices.slice(-period).map(p => p.volume);
    const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / period;
    const currentVolume = prices[prices.length - 1].volume;
    return {
      currentVolume,
      avgVolume,
      volumeRatio: currentVolume / avgVolume,
      isVolumeSurge: currentVolume > avgVolume * 1.5
    };
  },

  // Support and Resistance Levels
  findSupportResistance(prices, period = 20) {
    if (prices.length < period) return null;
    const recentPrices = prices.slice(-period);
    const highs = recentPrices.map(p => p.high);
    const lows = recentPrices.map(p => p.low);
    return {
      resistance: Math.max(...highs),
      support: Math.min(...lows),
      current: prices[prices.length - 1].close
    };
  },

  // Comprehensive Analysis
  analyzeStock(prices) {
    if (prices.length < 50) {
      return { error: "Insufficient data (need at least 50 days)" };
    }

    const currentPrice = prices[prices.length - 1].close;
    const sma20 = this.calculateSMA(prices, 20);
    const sma50 = this.calculateSMA(prices, 50);
    const ema12 = this.calculateEMA(prices, 12);
    const rsi = this.calculateRSI(prices, 14);
    const macd = this.calculateMACD(prices);
    const bollinger = this.calculateBollingerBands(prices, 20, 2);
    const volume = this.analyzeVolume(prices, 20);
    const levels = this.findSupportResistance(prices, 20);

    // Generate signals
    const signals = [];
    let bullishScore = 0;
    let bearishScore = 0;

    // RSI Signals
    if (rsi < 30) {
      signals.push({ type: 'BUY', reason: 'RSI Oversold (<30)', strength: 'STRONG' });
      bullishScore += 3;
    } else if (rsi > 70) {
      signals.push({ type: 'SELL', reason: 'RSI Overbought (>70)', strength: 'STRONG' });
      bearishScore += 3;
    }

    // Moving Average Signals
    if (currentPrice > sma20 && sma20 > sma50) {
      signals.push({ type: 'BUY', reason: 'Price above SMA20 & SMA50 (Uptrend)', strength: 'MEDIUM' });
      bullishScore += 2;
    } else if (currentPrice < sma20 && sma20 < sma50) {
      signals.push({ type: 'SELL', reason: 'Price below SMA20 & SMA50 (Downtrend)', strength: 'MEDIUM' });
      bearishScore += 2;
    }

    // MACD Signal
    if (macd && macd.macd > 0) {
      signals.push({ type: 'BUY', reason: 'MACD Positive', strength: 'MEDIUM' });
      bullishScore += 2;
    } else if (macd && macd.macd < 0) {
      signals.push({ type: 'SELL', reason: 'MACD Negative', strength: 'MEDIUM' });
      bearishScore += 2;
    }

    // Bollinger Bands
    if (bollinger) {
      if (currentPrice < bollinger.lower) {
        signals.push({ type: 'BUY', reason: 'Price below lower Bollinger Band', strength: 'MEDIUM' });
        bullishScore += 2;
      } else if (currentPrice > bollinger.upper) {
        signals.push({ type: 'SELL', reason: 'Price above upper Bollinger Band', strength: 'MEDIUM' });
        bearishScore += 2;
      }
    }

    // Volume Analysis
    if (volume && volume.isVolumeSurge) {
      signals.push({
        type: 'INFO',
        reason: `Volume surge detected (${volume.volumeRatio.toFixed(2)}x average)`,
        strength: 'HIGH'
      });
      bullishScore += 1;
    }

    // Overall Recommendation
    let recommendation = 'HOLD';
    if (bullishScore > bearishScore + 3) recommendation = 'STRONG BUY';
    else if (bullishScore > bearishScore) recommendation = 'BUY';
    else if (bearishScore > bullishScore + 3) recommendation = 'STRONG SELL';
    else if (bearishScore > bullishScore) recommendation = 'SELL';

    return {
      stockAnalysis: {
        currentPrice,
        indicators: {
          sma20,
          sma50,
          ema12,
          rsi,
          macd: macd?.macd,
          bollingerBands: bollinger,
          volume,
          supportResistance: levels
        },
        signals,
        scores: {
          bullish: bullishScore,
          bearish: bearishScore
        },
        recommendation,
        confidence: Math.abs(bullishScore - bearishScore) / (bullishScore + bearishScore) * 100 || 0
      }
    };
  }
};

// ============================================================================
// PRICE PREDICTION MODULE
// ============================================================================
const predictions = {
  // Linear Regression Prediction
  predictLinearRegression(prices, days = 5) {
    const n = Math.min(prices.length, 30);
    const recentPrices = prices.slice(-n);
    
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    recentPrices.forEach((price, i) => {
      sumX += i;
      sumY += price.close;
      sumXY += i * price.close;
      sumX2 += i * i;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    const predictedPrice = slope * (n + days - 1) + intercept;
    const currentPrice = prices[prices.length - 1].close;
    const percentChange = ((predictedPrice - currentPrice) / currentPrice) * 100;

    return {
      method: 'Linear Regression',
      currentPrice,
      predictedPrice: predictedPrice.toFixed(2),
      daysAhead: days,
      percentChange: percentChange.toFixed(2),
      trend: slope > 0 ? 'UPWARD' : 'DOWNWARD'
    };
  },

  // Moving Average Prediction
  predictMovingAverage(prices, days = 5) {
    const sma20 = technicalIndicators.calculateSMA(prices, 20);
    const sma50 = technicalIndicators.calculateSMA(prices, 50);
    const currentPrice = prices[prices.length - 1].close;
    
    const trend = sma20 > sma50 ? 'BULLISH' : 'BEARISH';
    const trendStrength = Math.abs((sma20 - sma50) / sma50) * 100;

    const recentChange = prices.slice(-5).reduce((sum, p, i, arr) => {
      if (i === 0) return 0;
      return sum + (p.close - arr[i-1].close);
    }, 0) / 5;

    const predictedPrice = currentPrice + (recentChange * days);
    const percentChange = ((predictedPrice - currentPrice) / currentPrice) * 100;

    return {
      method: 'Moving Average Momentum',
      currentPrice,
      predictedPrice: predictedPrice.toFixed(2),
      daysAhead: days,
      percentChange: percentChange.toFixed(2),
      trend,
      trendStrength: trendStrength.toFixed(2)
    };
  },

  // Combined Prediction
  predictPrice(prices, days = 5) {
    const lr = this.predictLinearRegression(prices, days);
    const ma = this.predictMovingAverage(prices, days);
    
    const avgPredicted = (parseFloat(lr.predictedPrice) + parseFloat(ma.predictedPrice)) / 2;
    const avgChange = (parseFloat(lr.percentChange) + parseFloat(ma.percentChange)) / 2;

    return {
      currentPrice: lr.currentPrice,
      predictions: [lr, ma],
      consensus: {
        predictedPrice: avgPredicted.toFixed(2),
        percentChange: avgChange.toFixed(2),
        confidence: Math.abs(parseFloat(lr.percentChange) - parseFloat(ma.percentChange)) < 5 ? 'HIGH' : 'MEDIUM'
      }
    };
  }
};

// ============================================================================
// TRANSACTION FETCHING (Original Functionality)
// ============================================================================
async function fetchTransactions(entity, rowsPerPage, maxPages) {
  const headers = {};
  if (process.env.PICKASTOCK_TOKEN) {
    headers["Authorization"] = `Bearer ${process.env.PICKASTOCK_TOKEN}`;
  }

  let page = 1;
  const all = [];

  while (page <= maxPages) {
    const url =
      `${PICKASTOCK_BASE}/api/ShareTransaction` +
      `?q=${encodeURIComponent(entity)}` +
      `&category=0&type=0&page=${page}&rows=${rowsPerPage}`;
    
    console.log(`Fetching page ${page}...`);
    const resp = await fetch(url, { headers });
    
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Upstream error ${resp.status}: ${text.slice(0, 200)}`);
    }

    const json = await resp.json();
    const items = json.items || [];
    if (items.length === 0) break;

    for (const x of items) {
      all.push({
        annDate: x.DataDate ?? "",
        stockCode: x.Symbol ?? "",
        stockName: x.Name ?? "",
        transDate: x.DateOfChange ?? "",
        type: x.TransactionType ?? "",
        shares: x.NoOfShares ?? null,
        registeredHolder: x.RegisteredHolder ?? "",
        remarks: x.Remarks ?? "",
        totalShareAfterChange: x.TotalShareAfterChange ?? null,
      });
    }
    page += 1;
  }

  return { all, pagesFetched: page - 1 };
}

// ============================================================================
// API ENDPOINTS
// ============================================================================

// ============ HEALTH CHECK ============
app.get("/api/health", (req, res) => {
  console.log("✅ Health check called");
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    upstreamBase: PICKASTOCK_BASE,
    symbolCacheSize: symbolCache.size,
    knownMappings: Object.keys(numericMappings).length
  });
});

// ============ TRANSACTIONS JSON ============
app.get("/api/transactions", async (req, res) => {
  try {
    const entity = String(req.query.entity || "").trim();
    if (!entity) {
      console.log("❌ Missing entity parameter");
      return res.status(400).json({ error: "Missing entity parameter" });
    }

    const rowsPerPage = Number(req.query.rows || 100);
    const maxPages = Number(req.query.maxPages || 50);

    console.log(`📊 Fetching transactions for: "${entity}"`);
    console.log(`Settings: ${rowsPerPage} rows/page, max ${maxPages} pages`);

    const { all, pagesFetched } = await fetchTransactions(entity, rowsPerPage, maxPages);

    console.log(`✅ Fetched ${all.length} transactions in ${pagesFetched} pages`);

    res.json({
      entity,
      rowsPerPage,
      pagesFetched,
      count: all.length,
      data: all,
      stoppedBecause: pagesFetched >= maxPages ? "maxPages_reached" : "no_more_items",
    });
  } catch (e) {
    console.error("❌ API Error:", e.message);
    res.status(500).json({
      error: e.message || "Internal server error",
      details: String(e)
    });
  }
});

// ============ TRANSACTIONS CSV ============
app.get("/api/transactions.csv", async (req, res) => {
  try {
    const entity = String(req.query.entity || "").trim();
    if (!entity) {
      return res.status(400).send("Missing entity parameter");
    }

    const rows = Number(req.query.rows || 100);
    const maxPages = Number(req.query.maxPages || 50);

    console.log(`📥 CSV Export for: "${entity}"`);

    const { all } = await fetchTransactions(entity, rows, maxPages);

    if (all.length === 0) {
      return res.status(404).send("No data found");
    }

    const header = [
      "annDate", "stockCode", "stockName", "transDate", "type", "shares",
      "registeredHolder", "remarks", "totalShareAfterChange"
    ];

    const lines = [header.join(",")];
    for (const r of all) {
      const row = header.map((k) => {
        const val = r[k];
        if (val === null || val === undefined) return '""';
        let str = String(val);
        if (/^[=+\-@]/.test(str)) {
          str = "'" + str;
        }
        return `"${str.replaceAll('"', '""')}"`;
      });
      lines.push(row.join(","));
    }

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${entity}-transactions.csv"`);
    res.send(lines.join("\n"));
    console.log(`✅ CSV exported: ${all.length} rows`);
  } catch (e) {
    console.error("❌ CSV Error:", e.message);
    res.status(500).send(String(e));
  }
});

// ============ SINGLE STOCK PRICE ============
app.get("/api/stock-price", async (req, res) => {
  try {
    const stockCode = String(req.query.stock || "").trim();
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    if (!stockCode) {
      return res.status(400).json({ error: "Missing stock parameter" });
    }

    console.log(`📈 Fetching price for: ${stockCode}`);

    const symbol = await getYahooSymbolWithCache(stockCode);
    if (!symbol) {
      return res.json({
        stockCode,
        symbol: null,
        prices: [],
        message: "Stock symbol not found on Yahoo Finance"
      });
    }

    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 365 * 24 * 60 * 60 * 1000);
    
    const period1 = Math.floor(start.getTime() / 1000);
    const period2 = Math.floor(end.getTime() / 1000);

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${period1}&period2=${period2}&interval=1d`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Yahoo Finance API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
      return res.json({
        stockCode,
        symbol,
        prices: [],
        message: "No price data available"
      });
    }

    const result = data.chart.result[0];
    const timestamps = result.timestamp || [];
    const quotes = result.indicators.quote[0];

    const prices = timestamps.map((ts, i) => ({
      date: new Date(ts * 1000).toISOString().split('T')[0],
      open: quotes.open[i],
      high: quotes.high[i],
      low: quotes.low[i],
      close: quotes.close[i],
      volume: quotes.volume[i]
    })).filter(p => p.close !== null);

    console.log(`✅ Fetched ${prices.length} price points for ${stockCode} (${symbol})`);

    res.json({
      stockCode,
      symbol,
      currency: result.meta.currency || 'MYR',
      exchangeName: result.meta.exchangeName || 'Bursa Malaysia',
      count: prices.length,
      prices
    });
  } catch (e) {
    console.error("Price API Error:", e.message);
    res.status(500).json({
      error: e.message,
      stockCode: req.query.stock
    });
  }
});

// ============ BATCH PRICE ENDPOINT ============
app.get("/api/stock-prices-batch", async (req, res) => {
  try {
    const stocksParam = decodeURIComponent(req.query.stocks || "");
    const stocks = stocksParam.trim().split(',').filter(s => s);
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    if (stocks.length === 0) {
      return res.status(400).json({ error: "Missing stocks parameter" });
    }

    console.log(`📈 Fetching prices for ${stocks.length} stocks`);
    console.log(`First 10 stocks: ${stocks.slice(0, 10).join(', ')}...`);

    const results = {};
    const symbolMapping = {};
    let successCount = 0;
    let failCount = 0;

    console.log('🔍 Phase 1: Detecting symbols...');
    
    const batchSize = 5;
    for (let i = 0; i < stocks.length; i += batchSize) {
      const batch = stocks.slice(i, i + batchSize);
      const symbols = await Promise.all(batch.map(async (stock) => {
        const stockCode = stock.trim();
        const symbol = await getYahooSymbolWithCache(stockCode);
        return { stockCode, symbol };
      }));
      
      symbols.forEach(({ stockCode, symbol }) => {
        symbolMapping[stockCode] = symbol;
      });
    }

    console.log('💰 Phase 2: Fetching prices...');

    for (const stock of stocks) {
      try {
        const stockCode = stock.trim();
        const symbol = symbolMapping[stockCode];
        
        if (!symbol) {
          console.log(`⚠️ ${stockCode}: Symbol not found`);
          results[stockCode] = [];
          failCount++;
          continue;
        }

        const end = endDate ? new Date(endDate) : new Date();
        const start = startDate ? new Date(startDate) : new Date(end.getTime() - 365 * 24 * 60 * 60 * 1000);
        
        const period1 = Math.floor(start.getTime() / 1000);
        const period2 = Math.floor(end.getTime() / 1000);

        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${period1}&period2=${period2}&interval=1d`;

        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.chart && data.chart.result && data.chart.result.length > 0) {
            const result = data.chart.result[0];
            const timestamps = result.timestamp || [];
            const quotes = result.indicators.quote[0];

            const prices = timestamps.map((ts, i) => ({
              date: new Date(ts * 1000).toISOString().split('T')[0],
              open: quotes.open[i],
              close: quotes.close[i],
              high: quotes.high[i],
              low: quotes.low[i],
              volume: quotes.volume[i]
            })).filter(p => p.close !== null);

            results[stockCode] = prices;
            
            if (prices.length > 0) {
              successCount++;
              console.log(`✅ ${stockCode} (${symbol}): ${prices.length} prices`);
            } else {
              failCount++;
              console.log(`⚠️ ${stockCode} (${symbol}): 0 prices (no data)`);
            }
          } else {
            results[stockCode] = [];
            failCount++;
            console.log(`⚠️ ${stockCode} (${symbol}): No data`);
          }
        } else {
          results[stockCode] = [];
          failCount++;
          console.log(`❌ ${stockCode} (${symbol}): API error ${response.status}`);
        }

        await new Promise(resolve => setTimeout(resolve, 150));
      } catch (e) {
        console.error(`❌ Error fetching ${stock}:`, e.message);
        results[stock] = [];
        failCount++;
      }
    }

    console.log(`✅ Batch complete: ${successCount} success, ${failCount} failed`);

    res.json({
      stocks: stocks,
      symbolMapping: symbolMapping,
      count: Object.keys(results).length,
      successCount,
      failCount,
      data: results
    });
  } catch (e) {
    console.error("Batch Price Error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// ============ STOCK ANALYSIS ENDPOINT ============
app.get("/api/stock-analysis", async (req, res) => {
  try {
    const stockCode = String(req.query.stock || "").trim();
    
    if (!stockCode) {
      return res.status(400).json({ error: "Missing stock parameter" });
    }

    console.log(`📊 Analyzing stock: ${stockCode}`);

    const symbol = await getYahooSymbolWithCache(stockCode);
    if (!symbol) {
      return res.status(404).json({
        error: "Stock symbol not found",
        stockCode
      });
    }

    const end = new Date();
    const start = new Date(end.getTime() - 365 * 24 * 60 * 60 * 1000);
    
    const period1 = Math.floor(start.getTime() / 1000);
    const period2 = Math.floor(end.getTime() / 1000);

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${period1}&period2=${period2}&interval=1d`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Yahoo Finance API error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.chart.result[0];
    const timestamps = result.timestamp || [];
    const quotes = result.indicators.quote[0];

    const prices = timestamps.map((ts, i) => ({
      date: new Date(ts * 1000).toISOString().split('T')[0],
      open: quotes.open[i],
      high: quotes.high[i],
      low: quotes.low[i],
      close: quotes.close[i],
      volume: quotes.volume[i]
    })).filter(p => p.close !== null);

    if (prices.length < 50) {
      return res.status(400).json({
        error: "Insufficient historical data (need at least 50 days)",
        stockCode,
        symbol
      });
    }

    const analysis = technicalIndicators.analyzeStock(prices);

    console.log(`✅ Analysis complete for ${stockCode}: ${analysis.stockAnalysis.recommendation}`);

    res.json({
      stockCode,
      symbol,
      currency: result.meta.currency || 'MYR',
      exchangeName: result.meta.exchangeName || 'Bursa Malaysia',
      dataPoints: prices.length,
      lastUpdate: prices[prices.length - 1].date,
      ...analysis
    });
  } catch (e) {
    console.error("Analysis Error:", e.message);
    res.status(500).json({
      error: e.message,
      stockCode: req.query.stock
    });
  }
});

// ============ STOCK SCREENER ENDPOINT ============
app.post("/api/screen-stocks", async (req, res) => {
  try {
    const { stocks, criteria } = req.body;
    
    if (!stocks || !Array.isArray(stocks)) {
      return res.status(400).json({ error: "Missing stocks array" });
    }

    console.log(`🔍 Screening ${stocks.length} stocks with criteria:`, criteria);

    const results = [];
    const defaultCriteria = {
      rsiMin: criteria?.rsiMin || 0,
      rsiMax: criteria?.rsiMax || 100,
      volumeSurge: criteria?.volumeSurge || false,
      priceAboveSMA50: criteria?.priceAboveSMA50 || false,
      minScore: criteria?.minScore || 0
    };

    for (const stockCode of stocks) {
      try {
        const symbol = await getYahooSymbolWithCache(stockCode);
        if (!symbol) continue;

        const end = new Date();
        const start = new Date(end.getTime() - 180 * 24 * 60 * 60 * 1000);
        
        const period1 = Math.floor(start.getTime() / 1000);
        const period2 = Math.floor(end.getTime() / 1000);

        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${period1}&period2=${period2}&interval=1d`;

        const response = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        if (!response.ok) continue;

        const data = await response.json();
        const result = data.chart.result[0];
        const timestamps = result.timestamp || [];
        const quotes = result.indicators.quote[0];

        const prices = timestamps.map((ts, i) => ({
          date: new Date(ts * 1000).toISOString().split('T')[0],
          open: quotes.open[i],
          high: quotes.high[i],
          low: quotes.low[i],
          close: quotes.close[i],
          volume: quotes.volume[i]
        })).filter(p => p.close !== null);

        if (prices.length < 50) continue;

        const analysis = technicalIndicators.analyzeStock(prices);
        const indicators = analysis.stockAnalysis.indicators;
        const recommendation = analysis.stockAnalysis.recommendation;
        const bullishScore = analysis.stockAnalysis.scores.bullish;

        let passedFilters = true;

        if (indicators.rsi < defaultCriteria.rsiMin || indicators.rsi > defaultCriteria.rsiMax) {
          passedFilters = false;
        }

        if (defaultCriteria.priceAboveSMA50 && indicators.sma50) {
          if (analysis.stockAnalysis.currentPrice < indicators.sma50) {
            passedFilters = false;
          }
        }

        if (defaultCriteria.volumeSurge && !indicators.volume.isVolumeSurge) {
          passedFilters = false;
        }

        if (bullishScore < defaultCriteria.minScore) {
          passedFilters = false;
        }

        if (passedFilters) {
          results.push({
            stockCode,
            symbol,
            currentPrice: analysis.stockAnalysis.currentPrice,
            rsi: indicators.rsi,
            recommendation,
            bullishScore,
            signals: analysis.stockAnalysis.signals,
            volumeSurge: indicators.volume.isVolumeSurge
          });
        }

        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (e) {
        console.error(`Error screening ${stockCode}:`, e.message);
      }
    }

    results.sort((a, b) => b.bullishScore - a.bullishScore);

    console.log(`✅ Screening complete: ${results.length} stocks passed filters`);

    res.json({
      totalScreened: stocks.length,
      passed: results.length,
      criteria: defaultCriteria,
      results: results.slice(0, 50)
    });
  } catch (e) {
    console.error("Screener Error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// ============ PRICE PREDICTION ENDPOINT ============
app.get("/api/predict-price", async (req, res) => {
  try {
    const stockCode = String(req.query.stock || "").trim();
    const days = parseInt(req.query.days || 5);

    if (!stockCode) {
      return res.status(400).json({ error: "Missing stock parameter" });
    }

    console.log(`🔮 Predicting price for ${stockCode} (${days} days ahead)`);

    const symbol = await getYahooSymbolWithCache(stockCode);
    if (!symbol) {
      return res.status(404).json({ error: "Stock not found" });
    }

    const end = new Date();
    const start = new Date(end.getTime() - 180 * 24 * 60 * 60 * 1000);
    
    const period1 = Math.floor(start.getTime() / 1000);
    const period2 = Math.floor(end.getTime() / 1000);

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${period1}&period2=${period2}&interval=1d`;

    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    if (!response.ok) {
      throw new Error(`Yahoo Finance error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.chart.result[0];
    const timestamps = result.timestamp || [];
    const quotes = result.indicators.quote[0];

    const prices = timestamps.map((ts, i) => ({
      date: new Date(ts * 1000).toISOString().split('T')[0],
      close: quotes.close[i],
      high: quotes.high[i],
      low: quotes.low[i],
      volume: quotes.volume[i]
    })).filter(p => p.close !== null);

    if (prices.length < 30) {
      return res.status(400).json({ error: "Insufficient historical data" });
    }

    const prediction = predictions.predictPrice(prices, days);
    const percentChange = parseFloat(prediction.consensus.percentChange);

    const potentialProfits = [1000, 5000, 10000, 50000].map(amount => ({
      investment: amount,
      potentialProfit: (amount * percentChange / 100).toFixed(2),
      finalValue: (amount * (1 + percentChange / 100)).toFixed(2)
    }));

    console.log(`✅ Prediction: ${prediction.consensus.percentChange}% change`);

    res.json({
      stockCode,
      symbol,
      lastUpdate: prices[prices.length - 1].date,
      ...prediction,
      potentialProfits
    });
  } catch (e) {
    console.error("Prediction Error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// ============ SYMBOL CACHE MANAGEMENT ============
app.post("/api/clear-symbol-cache", (req, res) => {
  const size = symbolCache.size;
  symbolCache.clear();
  console.log("✅ Symbol cache cleared");
  res.json({
    message: "Cache cleared",
    clearedEntries: size,
    currentSize: symbolCache.size
  });
});

app.get("/api/symbol-cache", (req, res) => {
  const cacheEntries = Array.from(symbolCache.entries()).map(([code, symbol]) => ({
    stockCode: code,
    yahooSymbol: symbol
  }));
  
  res.json({
    size: symbolCache.size,
    knownMappings: Object.keys(numericMappings).length,
    entries: cacheEntries
  });
});

app.get("/api/mappings", (req, res) => {
  res.json({
    count: Object.keys(numericMappings).length,
    mappings: numericMappings
  });
});

app.post("/api/add-mapping", (req, res) => {
  try {
    const { stockCode, numericCode } = req.body;
    
    if (!stockCode || !numericCode) {
      return res.status(400).json({ error: "Missing stockCode or numericCode" });
    }

    saveMapping(stockCode.toUpperCase(), `${numericCode}.KL`);
    
    res.json({
      message: "Mapping added",
      stockCode: stockCode.toUpperCase(),
      numericCode: numericCode
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============ ROOT ENDPOINT ============
app.get("/", (req, res) => {
  res.json({
    message: "Pick@Stock Transaction Analyzer API - Complete Trading System",
    version: "4.0 - Full Trading Analysis Suite",
    endpoints: {
      health: "/api/health",
      transactions: "/api/transactions?entity=NAME&rows=100&maxPages=50",
      csv: "/api/transactions.csv?entity=NAME&rows=100&maxPages=50",
      stockPrice: "/api/stock-price?stock=STOCKCODE&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD",
      stockPricesBatch: "/api/stock-prices-batch?stocks=CODE1,CODE2,CODE3&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD",
      stockAnalysis: "/api/stock-analysis?stock=STOCKCODE",
      stockScreener: "POST /api/screen-stocks (body: {stocks: [], criteria: {}})",
      pricePrediction: "/api/predict-price?stock=STOCKCODE&days=5",
      symbolCache: "/api/symbol-cache",
      mappings: "/api/mappings",
      clearCache: "POST /api/clear-symbol-cache",
      addMapping: "POST /api/add-mapping (body: {stockCode, numericCode})"
    },
    features: [
      "✅ Institutional transaction tracking",
      "✅ Real-time stock price data (Yahoo Finance)",
      "✅ Technical analysis (RSI, MACD, SMA, EMA, Bollinger Bands)",
      "✅ Buy/Sell signal generation",
      "✅ Stock screener with custom criteria",
      "✅ Price prediction (Linear Regression + MA Momentum)",
      "✅ Profit calculator",
      "✅ Volume surge detection",
      "✅ Support/Resistance levels",
      "✅ Auto-learning symbol mapping",
      "✅ Batch processing for multiple stocks"
    ],
    stats: {
      knownMappings: Object.keys(numericMappings).length,
      cachedSymbols: symbolCache.size
    },
    documentation: {
      github: "https://github.com/yourusername/stock-analyzer",
      apiDocs: "https://docs.stockanalyzer.com"
    }
  });
});

// ============ ERROR HANDLER ============
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: err.message
  });
});

// ============================================================================
// START SERVER
// ============================================================================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║  🚀 PICK@STOCK TRANSACTION ANALYZER PRO                        ║
║     Complete Trading Analysis & Prediction System              ║
╠════════════════════════════════════════════════════════════════╣
║  Server Status: ONLINE ✅                                       ║
║  Port: ${PORT}                                                  ║
║  URL:  http://localhost:${PORT}                                ║
╠════════════════════════════════════════════════════════════════╣
║  📊 AVAILABLE ENDPOINTS:                                       ║
║                                                                ║
║  Transaction Tracking:                                         ║
║  • GET  /api/transactions                                      ║
║  • GET  /api/transactions.csv                                  ║
║                                                                ║
║  Stock Price Data:                                             ║
║  • GET  /api/stock-price                                       ║
║  • GET  /api/stock-prices-batch                                ║
║                                                                ║
║  Trading Analysis:                                             ║
║  • GET  /api/stock-analysis          [NEW]                     ║
║  • POST /api/screen-stocks           [NEW]                     ║
║  • GET  /api/predict-price           [NEW]                     ║
║                                                                ║
║  System Management:                                            ║
║  • GET  /api/health                                            ║
║  • GET  /api/symbol-cache                                      ║
║  • GET  /api/mappings                                          ║
║  • POST /api/clear-symbol-cache                                ║
║  • POST /api/add-mapping                                       ║
╠════════════════════════════════════════════════════════════════╣
║  🎯 FEATURES:                                                  ║
║  ✅ Technical Indicators (RSI, MACD, SMA, EMA, Bollinger)      ║
║  ✅ Buy/Sell Signal Generation                                 ║
║  ✅ Stock Screener with Custom Filters                         ║
║  ✅ Price Prediction (5-30 days)                               ║
║  ✅ Profit Calculator                                          ║
║  ✅ Volume Surge Detection                                     ║
║  ✅ Support/Resistance Levels                                  ║
║  ✅ Institutional Transaction Tracking                         ║
║  ✅ Auto-Learning Symbol Mapping (${Object.keys(numericMappings).length}+ codes)              ║
╠════════════════════════════════════════════════════════════════╣
║  📈 EXAMPLE USAGE:                                             ║
║                                                                ║
║  Analyze a stock:                                              ║
║  curl http://localhost:${PORT}/api/stock-analysis?stock=MAYBANK║
║                                                                ║
║  Screen stocks:                                                ║
║  curl -X POST http://localhost:${PORT}/api/screen-stocks \\     ║
║    -H "Content-Type: application/json" \\                      ║
║    -d '{"stocks":["MAYBANK","TENAGA","CIMB"]}'                 ║
║                                                                ║
║  Predict price:                                                ║
║  curl http://localhost:${PORT}/api/predict-price?stock=PETGAS&days=5║
╠════════════════════════════════════════════════════════════════╣
║  💡 TIP: Open your browser to http://localhost:${PORT}         ║
║          for full API documentation                            ║
╚════════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('⚠️  SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n⚠️  SIGINT signal received: closing HTTP server');
  process.exit(0);
});