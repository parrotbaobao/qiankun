const path = require("path");
const fs = require("fs");
const multer = require("multer");

const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOAD_DIR),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname || "");
    const base = path.basename(file.originalname || "file", ext);
    const safeBase = base.replace(/[^\w\u4e00-\u9fa5.-]/g, "_");
    cb(null, `${safeBase}_${Date.now()}${ext}`);
  },
});

const upload = multer({ storage });

// middleware：必须是函数
const uploadMiddleware = upload.single("file");

// handler：必须是函数
function uploadHandler(req, res) {
  const biz = req.body?.biz;

  if (!req.file) {
    return res.status(400).json({ code: 400, message: "missing file field: file" });
  }

  res.json({
    code: 0,
    message: "ok",
    data: {
      biz,
      originalName: req.file.originalname,
      filename: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      url: `/uploads/${req.file.filename}`,
    },
  });
}

// 关键：导出对象（给 server.js 解构用）
module.exports = { uploadMiddleware, uploadHandler, UPLOAD_DIR };
