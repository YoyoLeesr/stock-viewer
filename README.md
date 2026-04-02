# Stock Viewer — Stock Transaction Analyzer

Full-stack web app to analyze stock transactions and generate basic stock insights. Frontend is hosted on GitHub Pages and backend REST API is deployed on Render.

## Live
- Frontend: https://yoyoleesr.github.io/stock-viewer/
- Backend API: https://stock-viewer-backend.onrender.com
- Repo: https://github.com/YoyoLeesr/stock-viewer

## Features
- Fetch transaction records (upstream Pick@Stock API) and export as JSON/CSV
- Fetch historical prices from Yahoo Finance
- Technical analysis: SMA, EMA, RSI, MACD, Bollinger Bands
- Support/resistance, volume surge detection, buy/sell signal generation
- Stock screener (custom criteria) + simple price prediction

## Tech Stack
- Frontend: HTML / CSS / JavaScript
- Backend: Node.js + Express
- Deploy: GitHub Pages (frontend), Render (backend)

## API Endpoints
- `GET /api/health`
- `GET /api/transactions?entity=NAME&rows=100&maxPages=50`
- `GET /api/transactions.csv?entity=NAME&rows=100&maxPages=50`
- `GET /api/stock-price?stock=STOCKCODE&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
- `GET /api/stock-prices-batch?stocks=CODE1,CODE2&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
- `GET /api/stock-analysis?stock=STOCKCODE`
- `POST /api/screen-stocks` (body: `{ "stocks": [], "criteria": {} }`)
- `GET /api/predict-price?stock=STOCKCODE&days=5`
- `GET /api/symbol-cache` | `POST /api/clear-symbol-cache`
- `GET /api/mappings` | `POST /api/add-mapping` (body: `{ "stockCode": "MAYBANK", "numericCode": "1155" }`)

## Local Development
Prereq: Node.js 18+ recommended (built-in `fetch`)

```bash
git clone https://github.com/YoyoLeesr/stock-viewer.git
cd stock-viewer
npm install
node server.js
