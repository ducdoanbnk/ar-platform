# {{EVENT_NAME}} — Zoustec 活動網站（Next.js 專案匯出）

這是您活動網站的**完整 Next.js 原始碼**。開發者可自由修改程式碼與版面，
並部署到任何支援 Node.js 的主機（Vercel / Render / 自有伺服器）。

## 快速開始

```bash
npm install
npm run dev        # http://localhost:3000
```

正式部署：

```bash
npm run build
npm start          # 或部署到 Vercel / Render
```

## 運作方式

- 內容（版面區塊、佈景主題、頁面、任務清單）**每 60 秒自動同步**自
  Zoustec 平台（headless API，使用 `.env.local` 內的專屬金鑰）。
  在平台的拖曳設計器修改後，此網站無需重新部署即會更新。
- 平台離線或金鑰被撤銷時，自動改用 `data/site.json` 的快照。
- 玩家的 AR 集章流程仍在 LINE（LIFF）內進行 — 「開始旅程」按鈕
  會開啟 LINE。報名、任務、印章、獎勵等邏輯全部由平台提供。

## 專案結構

| 路徑 | 說明 |
|---|---|
| `app/page.jsx` | 首頁（Hero + 區塊內容） |
| `app/[page]/page.jsx` | 子頁面（於平台設計器建立） |
| `components/Site.jsx` | Hero／導覽列／頁尾 — 想改整體版型從這裡 |
| `lib/site-blocks.jsx` | 區塊庫 + 佈景主題（與平台相同）— 可自訂區塊樣式 |
| `lib/site-data.js` | 平台 API 同步邏輯 |
| `data/site.json` | 匯出時的內容快照（離線備援） |
| `.env.local` | API 位址與專屬金鑰（**請勿公開此檔**） |

## 修改內容 vs 修改程式碼

- **內容／版面區塊／主題**：建議回到 Zoustec 平台的拖曳設計器修改 —
  此網站會自動同步，也可把 `data/site.json` 的 `event.config`（`puck`、
  `pages`）修改後，用設計器的「匯入設計 JSON」上傳回平台。
- **程式碼**（元件、樣式、新功能）：直接修改本專案並部署到您自己的
  主機。程式碼修改**無法**上傳回平台（多租戶安全限制）。

## 金鑰管理

`.env.local` 內的 `ZOUSTEC_EXPORT_KEY` 為此活動專屬的唯讀金鑰，
只能讀取本活動的公開內容（無會員資料、無寫入權限）。如需撤銷，
請至平台後台的匯出金鑰管理。
