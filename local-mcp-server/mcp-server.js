const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 3000;
const DOCS_DIR = path.join(__dirname, '../docs');

app.use(express.json());

function isSafeFileName(name) {
  return /^[a-zA-Z0-9_-]+$/.test(name);
}

async function getAllDocFiles() {
  const files = await fs.readdir(DOCS_DIR);
  return files
    .filter(file => file.endsWith('.md'))
    .map(file => file.replace(/\.md$/, ''));
}

// 列出所有文档
app.get('/listDocs', async (req, res) => {
  try {
    const docs = await getAllDocFiles();
    res.json({ docs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 读取整个文档
app.post('/readDocFile', async (req, res) => {
  try {
    const { fileName } = req.body;

    if (!isSafeFileName(fileName)) {
      return res.status(400).json({ error: 'Invalid fileName' });
    }

    const filePath = path.join(DOCS_DIR, `${fileName}.md`);
    const content = await fs.readFile(filePath, 'utf8');
    res.json({ fileName, content });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: 'File not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

// 搜索文档
app.post('/searchDocs', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'query is required' });
    }

    const docs = await getAllDocFiles();
    const keywords = query.toLowerCase().split(/\s+/).filter(Boolean);

    const results = [];

    for (const fileName of docs) {
      const filePath = path.join(DOCS_DIR, `${fileName}.md`);
      const content = await fs.readFile(filePath, 'utf8');
      const lower = content.toLowerCase();

      const score = keywords.reduce((acc, kw) => {
        let s = 0;
        if (fileName.toLowerCase().includes(kw)) s += 5;
        if (lower.includes(kw)) s += 1;
        return acc + s;
      }, 0);

      if (score > 0) {
        results.push({
          fileName,
          score,
          snippet: content.slice(0, 300)
        });
      }
    }

    results.sort((a, b) => b.score - a.score);
    res.json({ results: results.slice(0, 10) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 按标题读取 section
app.post('/readDocSection', async (req, res) => {
  try {
    const { fileName, heading } = req.body;

    if (!isSafeFileName(fileName)) {
      return res.status(400).json({ error: 'Invalid fileName' });
    }

    const filePath = path.join(DOCS_DIR, `${fileName}.md`);
    const content = await fs.readFile(filePath, 'utf8');

    // 简单按 markdown heading 截取
    const lines = content.split('\n');
    const startIndex = lines.findIndex(line => {
      const t = line.trim().toLowerCase();
      return t === `## ${heading}`.toLowerCase() || t === `# ${heading}`.toLowerCase();
    });

    if (startIndex === -1) {
      return res.status(404).json({ error: `Heading "${heading}" not found` });
    }

    let endIndex = lines.length;
    for (let i = startIndex + 1; i < lines.length; i++) {
      if (/^#{1,6}\s+/.test(lines[i])) {
        endIndex = i;
        break;
      }
    }

    const section = lines.slice(startIndex, endIndex).join('\n');
    res.json({ fileName, heading, section });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: 'File not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Doc server running at http://localhost:${PORT}`);
});