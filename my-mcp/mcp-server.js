// mcp-server.ts (ESM / Node 18+)
// 直接整文件替换你当前的 MCP server 文件即可
// 目标：在 sub-app 中运行，允许在 sub-app/src/app 下生成组件；保留 read_md / write_files 原有语义不变

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import * as path from "node:path";
import { spawn } from "node:child_process";
import * as fs from "node:fs/promises";
import { promisify } from "node:util";
import { execFile } from "node:child_process";

// ========== 配置常量 ==========

// 工作区根目录
const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || process.cwd();

// 读写大小限制
const MAX_READ_BYTES = 200 * 1024; // 200KB
const MAX_WRITE_BYTES = 400 * 1024; // 400KB（单文件）

// ✅write_files 只允许写到 sub-app/src/app/**（保留原约束语义不变）
const WRITE_ROOT_REL = "sub-app/src/app"; // 注意：不要带结尾 "/"
const ALLOWED_WRITE_EXT = new Set([".ts", ".html", ".scss"]);

// Angular 项目根目录（ng 命令在哪跑）
const NG_PROJECT_ROOT_REL = "sub-app";

// src/app 的绝对路径（用于限制 create_angular_component）
const APP_ROOT_REL = "sub-app/src/app";
const APP_ROOT_ABS = path.resolve(WORKSPACE_ROOT, APP_ROOT_REL);

// ✅create_angular_component 允许生成到 src/app 下的哪个子目录（相对 src/app）
// 为空字符串表示：允许在 src/app 任意位置（包括根目录）生成
const ALLOWED_COMPONENT_DIR_REL = "";

const execFileAsync = promisify(execFile);


// ========== 工具函数 ==========

// 确保任意解析的绝对路径都在 WORKSPACE_ROOT 内（防路径穿越）
function resolveUnderWorkspace(relPath) {
  const abs = path.resolve(WORKSPACE_ROOT, relPath);
  const rootAbs = path.resolve(WORKSPACE_ROOT);
  if (!abs.startsWith(rootAbs + path.sep) && abs !== rootAbs) {
    throw new Error("Path is outside WORKSPACE_ROOT.");
  }
  return abs;
}

// 判断 child 是否在 parent 下（或等于 parent）
function isSubPath(parent, child) {
  const rel = path.relative(parent, child);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

// 将“相对 src/app 的路径”解析为绝对路径，并保证在 src/app 内
function resolveUnderApp(relPathUnderApp) {
  // 兼容低 lib：不用 replaceAll
  const cleaned = relPathUnderApp.replace(/\\/g, "/").replace(/^\/+/, "");
  const abs = path.resolve(APP_ROOT_ABS, cleaned);
  if (!isSubPath(APP_ROOT_ABS, abs)) {
    throw new Error(`Path is outside ${APP_ROOT_REL}.`);
  }
  return abs;
}

// 确保 write_files 的目标路径合法：必须在 WRITE_ROOT_REL/** 且扩展名白名单
function ensureAllowedWriteTarget(relativePath) {
  // 兼容低 lib：不用 replaceAll
  const cleaned = relativePath.replace(/\\/g, "/");
  const base = WRITE_ROOT_REL.replace(/\\/g, "/").replace(/\/+$/, "");

  // 必须在 base/ 下（保持原语义：必须写在指定目录树内）
  if (!cleaned.startsWith(base + "/")) {
    throw new Error(`Write is restricted to "${WRITE_ROOT_REL}/**"`);
  }

  const ext = path.extname(cleaned).toLowerCase();
  if (!ALLOWED_WRITE_EXT.has(ext)) {
    throw new Error(`Disallowed file extension: ${ext}`);
  }

  return cleaned;
}

// 运行命令（用于 npx ng g c）
async function runCmd(cmd, args, cwd) {
  try {
    const { stdout, stderr } = await execFileAsync(cmd, args, {
      cwd,
      windowsHide: true,
      shell: false, // 用 execFile 跑可执行文件，不走 shell
      maxBuffer: 10 * 1024 * 1024, // 10MB，避免输出过大截断
    });

    return { code: 0, stdout: stdout ?? "", stderr: stderr ?? "" };
  } catch (e) {
    // execFile 在退出码非 0 时会 throw，把信息转成你原先的结构
    return {
      code: typeof e?.code === "number" ? e.code : 1,
      stdout: e?.stdout?.toString?.() ?? "",
      stderr: e?.stderr?.toString?.() ?? e?.message ?? String(e),
    };
  }
}

// ========== MCP 服务器初始化 ==========
const server = new Server(
  { name: "my-mcp", version: "0.0.3" },
  { capabilities: { tools: {} } }
);

// ========== 注册工具列表 ==========
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "read_md",
        description:
          "Read a local markdown file under WORKSPACE_ROOT and return its content.",
        inputSchema: {
          type: "object",
          properties: { relativePath: { type: "string" } },
          required: ["relativePath"],
        },
      },
      {
        name: "write_files",
        description: `Write multiple files under "${WRITE_ROOT_REL}/". Allowed extensions: .ts/.html/.scss`,
        inputSchema: {
          type: "object",
          properties: {
            overwrite: { type: "boolean", default: false },
            files: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  relativePath: { type: "string" },
                  content: { type: "string" },
                },
                required: ["relativePath", "content"],
              },
              minItems: 1,
            },
          },
          required: ["files"],
        },
      },
      {
        name: "create_angular_component",
        description:
          `Generate an Angular component by running "npx ng g c" in "${NG_PROJECT_ROOT_REL}". ` +
          `targetDir is relative to "src/app".`,
        inputSchema: {
          type: "object",
          properties: {
            componentName: {
              type: "string",
              description: 'Component name (kebab-case, e.g. "ai-chat").',
            },
            targetDir: {
              type: "string",
              description:
                'Directory relative to "src/app". Use "" to generate under src/app root.',
              default: ALLOWED_COMPONENT_DIR_REL, // 这里允许默认 ""
            },
            style: {
              type: "string",
              enum: ["scss", "css", "less"],
              default: "scss",
            },
            skipTests: { type: "boolean", default: true },
            standalone: {
              type: "boolean",
              default: false,
              description:
                "If true, pass --standalone (may fail depending on Angular/CLI config).",
            },
            dryRun: {
              type: "boolean",
              default: false,
              description: "If true, pass --dry-run (no files written).",
            },
          },
          required: ["componentName"],
        },
      },
    ],
  };
});

// ========== 工具调用分发 ==========
server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  console.log("[CallTool]", req.params.name, req.params.arguments);


  // ---- read_md ----
  if (name === "read_md") {
    const parsed = z.object({ relativePath: z.string().min(1) }).parse(args);

    if (!parsed.relativePath.toLowerCase().endsWith(".md")) {
      throw new Error("Only .md files are allowed.");
    }

    const abs = resolveUnderWorkspace(parsed.relativePath);
    const stat = await fs.stat(abs);

    if (stat.size > MAX_READ_BYTES) {
      throw new Error(
        `File too large: ${stat.size} bytes (max ${MAX_READ_BYTES}).`
      );
    }

    const text = await fs.readFile(abs, "utf8");
    return { content: [{ type: "text", text }] };
  }

  // ---- write_files ----
  if (name === "write_files") {
    const parsed = z
      .object({
        overwrite: z.boolean().optional().default(false),
        files: z
          .array(
            z.object({
              relativePath: z.string().min(1),
              content: z.string(),
            })
          )
          .min(1),
      })
      .parse(args);

    const overwrite = !!parsed.overwrite;
    const written = [];

    for (const f of parsed.files) {
      const cleanedRel = ensureAllowedWriteTarget(f.relativePath);
      const abs = resolveUnderWorkspace(cleanedRel);

      const bytes = Buffer.byteLength(f.content, "utf8");
      if (bytes > MAX_WRITE_BYTES) {
        throw new Error(
          `File too large to write: ${cleanedRel} (${bytes} bytes, max ${MAX_WRITE_BYTES})`
        );
      }

      await fs.mkdir(path.dirname(abs), { recursive: true });

      // overwrite=false：文件存在则失败（保持原语义）
      if (!overwrite) {
        await fs.writeFile(abs, f.content, {
          encoding: "utf8",
          flag: "wx",
        });
      } else {
        await fs.writeFile(abs, f.content, { encoding: "utf8" });
      }

      written.push(cleanedRel);
    }

    return {
      content: [
        {
          type: "text",
          text: `Wrote ${written.length} file(s):\n` + written.join("\n"),
        },
      ],
    };
  }

  // ---- create_angular_component ----
  if (name === "create_angular_component") {
    const parsed = z
      .object({
        componentName: z.string().min(1),
        // 允许 ""（生成到 src/app 根）
        targetDir: z.string().optional().default(ALLOWED_COMPONENT_DIR_REL),
        style: z.enum(["scss", "css", "less"]).default("scss"),
        skipTests: z.boolean().default(true),
        standalone: z.boolean().default(false),
        dryRun: z.boolean().default(false),
      })
      .parse(args);

    // 组件名只允许 kebab-case，防止注入/奇怪路径（保持原语义）
    if (!/^[a-z][a-z0-9-]*$/.test(parsed.componentName)) {
      throw new Error(
        `Invalid componentName "${parsed.componentName}". Use kebab-case like "ai-chat".`
      );
    }

    // targetDir 相对 src/app；允许 ""
    const cleanedTargetDir = (parsed.targetDir || "")
      .replace(/\\/g, "/")
      .replace(/^\/+/, "")
      .replace(/\/+$/, "");

    // 如果配置了 allowed 子目录，则强制限制；否则（""）放行到 src/app 任意位置
    if (ALLOWED_COMPONENT_DIR_REL) {
      if (
        cleanedTargetDir !== ALLOWED_COMPONENT_DIR_REL &&
        !cleanedTargetDir.startsWith(ALLOWED_COMPONENT_DIR_REL + "/")
      ) {
        throw new Error(
          `targetDir must be under "${ALLOWED_COMPONENT_DIR_REL}/" (relative to src/app).`
        );
      }
    }

    // 确保目录存在（相对 src/app）
    const targetAbs = resolveUnderApp(cleanedTargetDir);
    await fs.mkdir(targetAbs, { recursive: true });

    // 传给 ng 的路径是相对 src/app 的：targetDir/componentName
    // 若 targetDir="" 则等价于 "componentName"
    const componentPathRel = path.posix
      .join(cleanedTargetDir, parsed.componentName)
      .replace(/^\/+/, "");

    const cmd = process.platform === "win32" ? "npx.cmd" : "npx";
    const cmdArgs = [
      "ng",
      "g",
      "c",
      componentPathRel,
      `--style=${parsed.style}`,
    ];

    if (parsed.skipTests) cmdArgs.push("--skip-tests");
    if (parsed.standalone) cmdArgs.push("--standalone");
    if (parsed.dryRun) cmdArgs.push("--dry-run");

    // 在 sub-app 目录执行（那里应有 angular.json）
    const ngCwd = path.resolve(WORKSPACE_ROOT, NG_PROJECT_ROOT_REL);
    const { code, stdout, stderr } = await runCmd(cmd, cmdArgs, ngCwd);

    const resultText =
      `CWD: ${ngCwd}\n` +
      `Command: ${cmd} ${cmdArgs.join(" ")}\n` +
      `ExitCode: ${code}\n\n` +
      (stdout ? `STDOUT:\n${stdout}\n\n` : "") +
      (stderr ? `STDERR:\n${stderr}\n` : "");

    if (code !== 0) {
      return {
        content: [{ type: "text", text: resultText }],
        isError: true,
      };
    }

    return {
      content: [{ type: "text", text: resultText }],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

// ========== 启动 ==========
// 避免顶层 await（不改变功能，只是兼容更多 tsconfig）
const transport = new StdioServerTransport();
(async () => {
  await server.connect(transport);
})();
