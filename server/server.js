const express = require("express");
const path = require("path");
const { exportExcelHandler } = require("./route/exportExcel");
const { uploadMiddleware, uploadHandler, UPLOAD_DIR } = require("./route/upload");

const app = express();
const PORT = 8080;

const MAIN_DIST = path.join(__dirname, '..', 'main-app', 'dist', 'main-app');
const APP1_DIST = path.join(__dirname, '..', 'sub-app', 'dist', 'sub-app');
const APP2_DIST = path.join(__dirname, '..', 'sub-app2', 'dist', 'sub-app2');

app.get("/api/export/excel", exportExcelHandler);

// 上传接口：字段名必须叫 file（对应 upload.single(“file”)）
app.post("/api/upload", uploadMiddleware, uploadHandler);

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
