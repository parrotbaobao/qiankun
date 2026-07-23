#!/bin/bash
echo "🚀 启动 Wujie 微前端 Demo..."
echo ""

cd "$(dirname "$0")"

echo "📦 安装依赖..."
(cd sub-app1 && npm install) &
(cd sub-app2 && npm install) &
(cd sub-app3 && npm install) &
(cd main-app && npm install) &
wait

echo ""
echo "🔥 启动所有应用..."
(cd sub-app1 && npm run dev) &
(cd sub-app2 && npm run dev) &
(cd sub-app3 && npm run dev) &
sleep 2
(cd main-app && npm run dev) &

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
