const express = require("express");
const path = require("path");
const { exportExcelHandler } = require("./route/exportExcel");
const { uploadMiddleware, uploadHandler, UPLOAD_DIR } = require("./route/upload");
const { sdkHandler } = require("./route/sdk");
const { getServicesHandler, getErrorsHandler } = require("./route/errors");

const app = express();
const PORT = 3300;

app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

const MAIN_DIST = path.join(__dirname, '..', 'portal-shell', 'dist', 'portal-shell');
const APP1_DIST = path.join(__dirname, '..', 'operations-workbench', 'dist', 'operations-workbench');
const APP2_DIST = path.join(__dirname, '..', 'error-center', 'dist', 'error-center');

app.get("/api/export/excel", exportExcelHandler);
app.post("/api/upload", uploadMiddleware, uploadHandler);
app.get("/api/sdks", sdkHandler);
app.get("/api/errors/services", getServicesHandler);
app.get("/api/errors", getErrorsHandler);

app.use("/uploads", express.static(UPLOAD_DIR, { index: false }));

app.use("/app1", express.static(APP1_DIST, { index: false }));
app.use("/app2", express.static(APP2_DIST, { index: false }));
app.use("/", express.static(MAIN_DIST, { index: false }));

app.get(/^\/app1(\/.*)?$/, (req, res) => {
  res.sendFile(path.join(APP1_DIST, "index.html"));
});

app.get(/^\/app2(\/.*)?$/, (req, res) => {
  res.sendFile(path.join(APP2_DIST, "index.html"));
});

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(MAIN_DIST, "index.html"));
});

app.listen(PORT, () => {
  console.log(`MFE server running: http://localhost:${PORT}`);
});
