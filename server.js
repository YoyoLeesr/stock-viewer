const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const app = express();

// CORS Configuration
app.use(cors({
  origin: '*',
  credentials: true
}));

app.use(express.json());

const PICKASTOCK_BASE = "https://p2.pickastock.info";

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// ============ SYMBOL CACHE & MAPPING ============
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
      
      // Merge saved mappings with built-in ones
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
    
    // Load existing mappings
    if (fs.existsSync(mappingFile)) {
      const data = fs.readFileSync(mappingFile, 'utf8');
      mappings = JSON.parse(data);
    }
    
    // Extract numeric code from symbol (remove .KL, .KLSE suffixes)
    const numericCode = numericSymbol.replace('.KL', '').replace('.KLSE', '').replace('.MY', '');
    
    // Save if it's a new mapping
    if (!mappings[textCode]) {
      mappings[textCode] = numericCode;
      fs.writeFileSync(mappingFile, JSON.stringify(mappings, null, 2), 'utf8');
      console.log(`  💾 Saved mapping: ${textCode} → ${numericCode}`);
      
      // Update in-memory mapping
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
      
      // Filter for Malaysian stocks (.KL or .KLSE)
      const malaysianStocks = quotes.filter(q => 
        q.symbol && (q.symbol.endsWith('.KL') || q.symbol.endsWith('.KLSE'))
      );
      
      if (malaysianStocks.length > 0) {
        // Prefer exact matches or first result
        const exactMatch = malaysianStocks.find(q => 
          q.symbol.toUpperCase().includes(stockName.toUpperCase())
        );
        
        const selectedStock = exactMatch || malaysianStocks[0];
        console.log(`  🔍 Search found: ${stockName} → ${selectedStock.symbol} (${selectedStock.shortname || selectedStock.longname})`);
        return selectedStock.symbol;
      }
    }
  } catch (e) {
    console.error(`  ❌ Search error for ${stockName}:`, e.message);
  }
  
  return null;
}

// ============ SMART YAHOO SYMBOL DETECTION ============
async function findYahooSymbol(stockCode) {
  const code = stockCode.trim().toUpperCase();
  
  // Build variants to try
  let variants = [];
  
  // Check if we have a numeric mapping for this code
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
    // Already a 4-digit numeric code
    variants = [`${code}.KL`, `${code}.KLSE`, `${code}.MY`];
  } else {
    // Text code without mapping
    variants = [`${code}.KL`, code, `${code}.KLSE`, `${code}.MY`];
  }
  
  // Try each variant until we find one that works
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
          // Only accept if there's actual data
          if (timestamps.length > 0) {
            console.log(`  ✅ Found symbol for ${code}: ${symbol}`);
            
            // Save this mapping if it's new
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
  
  // If all variants fail, try search API
  console.log(`  🔍 Trying search API for ${code}...`);
  const searchResult = await searchYahooSymbol(code);
  if (searchResult) {
    // Save this mapping
    if (!numericMappings[code]) {
      saveMapping(code, searchResult);
    }
    return searchResult;
  }
  
  console.log(`  ❌ No valid symbol found for ${code}`);
  return null;
}

async function getYahooSymbolWithCache(stockCode) {
  const code = stockCode.trim().toUpperCase();
  
  // Check cache first
  if (symbolCache.has(code)) {
    return symbolCache.get(code);
  }
  
  // Find symbol
  const symbol = await findYahooSymbol(code);
  
  // Cache the result (even if null, to avoid repeated lookups)
  symbolCache.set(code, symbol);
  
  return symbol;
}

// Load mappings on startup
loadMappings();

// ============ HEALTH CHECK ENDPOINT ============
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

// ============ SHARED FETCH FUNCTION ============
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

// ============ JSON ENDPOINT ============
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
    console.log(`   Settings: ${rowsPerPage} rows/page, max ${maxPages} pages`);

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

// ============ CSV ENDPOINT ============
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
        // Prevent CSV injection
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

// ============ SINGLE STOCK PRICE ENDPOINT ============
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

// ============ BATCH PRICE ENDPOINT WITH SMART DETECTION ============
app.get("/api/stock-prices-batch", async (req, res) => {
  try {
    // ✅ Decode the stocks parameter to handle encoded characters
    const stocksParam = decodeURIComponent(req.query.stocks || "");
    const stocks = stocksParam.trim().split(',').filter(s => s);
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    if (stocks.length === 0) {
      return res.status(400).json({ error: "Missing stocks parameter" });
    }

    console.log(`📈 Fetching prices for ${stocks.length} stocks`);
    console.log(`   First 10 stocks: ${stocks.slice(0, 10).join(', ')}...`);

    const results = {};
    const symbolMapping = {};
    let successCount = 0;
    let failCount = 0;

    // Phase 1: Detect symbols (in parallel batches of 5 to avoid overwhelming the API)
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

    // Phase 2: Fetch prices for detected symbols
    for (const stock of stocks) {
      try {
        const stockCode = stock.trim();
        const symbol = symbolMapping[stockCode];

        if (!symbol) {
          console.log(`  ⚠️ ${stockCode}: Symbol not found`);
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
              console.log(`  ✅ ${stockCode} (${symbol}): ${prices.length} prices`);
            } else {
              failCount++;
              console.log(`  ⚠️ ${stockCode} (${symbol}): 0 prices (no data)`);
            }
          } else {
            results[stockCode] = [];
            failCount++;
            console.log(`  ⚠️ ${stockCode} (${symbol}): No data`);
          }
        } else {
          results[stockCode] = [];
          failCount++;
          console.log(`  ❌ ${stockCode} (${symbol}): API error ${response.status}`);
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 150));

      } catch (e) {
        console.error(`  ❌ Error fetching ${stock}:`, e.message);
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

// ============ CLEAR SYMBOL CACHE ENDPOINT ============
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

// ============ GET SYMBOL CACHE STATUS ============
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

// ============ GET SAVED MAPPINGS ============
app.get("/api/mappings", (req, res) => {
  res.json({
    count: Object.keys(numericMappings).length,
    mappings: numericMappings
  });
});

// ============ MANUALLY ADD MAPPING ============
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
    message: "Pick@Stock Transaction Analyzer API",
    version: "3.0 - Smart Symbol Detection with Auto-Learning",
    endpoints: {
      health: "/api/health",
      transactions: "/api/transactions?entity=NAME&rows=100&maxPages=50",
      csv: "/api/transactions.csv?entity=NAME&rows=100&maxPages=50",
      stockPrice: "/api/stock-price?stock=STOCKCODE&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD",
      stockPricesBatch: "/api/stock-prices-batch?stocks=CODE1,CODE2,CODE3&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD",
      symbolCache: "/api/symbol-cache",
      mappings: "/api/mappings",
      clearCache: "POST /api/clear-symbol-cache",
      addMapping: "POST /api/add-mapping (body: {stockCode, numericCode})"
    },
    features: [
      "Smart Yahoo Finance symbol detection",
      "Dynamic symbol search API fallback",
      "Auto-learning stock code mappings",
      "Persistent mapping storage",
      "Symbol caching for performance",
      "Batch price fetching with 150+ built-in mappings"
    ],
    stats: {
      knownMappings: Object.keys(numericMappings).length,
      cachedSymbols: symbolCache.size
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

// ============ START SERVER ============
const PORT = process.env.PORT || 5177;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔════════════════════════════════════════════╗
║  🚀 Backend Server Started Successfully!   ║
╠════════════════════════════════════════════╣
║  Port: ${PORT}                              ║
║  URL:  http://localhost:${PORT}            ║
╠════════════════════════════════════════════╣
║  Endpoints Available:                      ║
║  • GET  /                                  ║
║  • GET  /api/health                        ║
║  • GET  /api/transactions                  ║
║  • GET  /api/transactions.csv              ║
║  • GET  /api/stock-price                   ║
║  • GET  /api/stock-prices-batch            ║
║  • GET  /api/symbol-cache                  ║
║  • GET  /api/mappings                      ║
║  • POST /api/clear-symbol-cache            ║
║  • POST /api/add-mapping                   ║
╠════════════════════════════════════════════╣
║  Features:                                 ║
║  ✅ Smart symbol detection                 ║
║  ✅ Dynamic Yahoo search                   ║
║  ✅ Auto-learning mappings                 ║
║  ✅ ${Object.keys(numericMappings).length}+ known stock codes               ║
╚════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});