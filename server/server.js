const express = require("express");
const path = require("path");
const { exportExcelHandler } = require("./route/exportExcel");
const { uploadMiddleware, uploadHandler, UPLOAD_DIR } = require("./route/upload");

const app = express();
const PORT = 8080;

// ⚠️ 一定要指到 dist/项目名 这一层
const MAIN_DIST = "C:/我的代码/qiankun/main-app/dist/main-app";
const APP1_DIST = "C:/我的代码/qiankun/sub-app/dist/sub-app";
const APP2_DIST = "C:/我的代码/qiankun/sub2-app2/dist/sub2-app2";

/**
 * 1) API 一定要放在 “所有兜底路由” 之前
 */
app.get("/api/export/excel", exportExcelHandler);

// 上传接口：字段名必须叫 file（对应 upload.single("file")）
app.post("/api/upload", uploadMiddleware, uploadHandler);

/**
 * 2) 上传文件静态访问（建议放在静态资源和兜底之前）
 */
app.use("/uploads", express.static(UPLOAD_DIR, { index: false }));

/**
 * 3) 静态资源
 */
app.use("/app1", express.static(APP1_DIST, { index: false }));
app.use("/app2", express.static(APP2_DIST, { index: false }));
app.use("/", express.static(MAIN_DIST, { index: false }));

/**
 * 4) 子应用 history fallback（必须在主应用兜底之前）
 */
app.get(/^\/app1(\/.*)?$/, (req, res) => {
  res.sendFile(path.join(APP1_DIST, "index.html"));
});

app.get(/^\/app2(\/.*)?$/, (req, res) => {
  res.sendFile(path.join(APP2_DIST, "index.html"));
});

/**
 * 5) 主应用 history fallback（最后兜底）
 */
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(MAIN_DIST, "index.html"));
});

app.listen(PORT, () => {
  console.log(`MFE server running: http://localhost:${PORT}`);
});
