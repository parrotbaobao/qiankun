#!/bin/bash
echo "🚀 启动 Wujie 微前端 Demo..."
echo ""

cd "$(dirname "$0")"

echo "📦 安装依赖..."
(cd todo-app && npm install) &
(cd counter-app && npm install) &
(cd user-directory-app && npm install) &
(cd wujie-shell && npm install) &
wait

echo ""
echo "🔥 启动所有应用..."
(cd todo-app && npm run dev) &
(cd counter-app && npm run dev) &
(cd user-directory-app && npm run dev) &
sleep 2
(cd wujie-shell && npm run dev) &

echo ""
echo "========================================="
echo "  主应用:   http://localhost:7100"
echo "  子应用1:  http://localhost:7101 (待办清单)"
echo "  子应用2:  http://localhost:7102 (计数器)"
echo "  子应用3:  http://localhost:7103 (用户卡片)"
echo "========================================="
echo ""
echo "按 Ctrl+C 停止所有应用"

wait
