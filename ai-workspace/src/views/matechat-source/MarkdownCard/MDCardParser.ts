/**
 * MDCardParser.ts
 * 把 HTML 字符串转换为 Vue VNode 数组的工具函数。
 *
 * 为什么需要这个？
 *  matechat 的 MarkdownCard 不用 v-html（全量 DOM 替换），
 *  而是把 HTML 转成 VNode 树，交给 Vue 的 diff 算法做精细更新。
 *  这样在流式输出时，只有新增的部分会触发 DOM 操作，性能更好。
 *
 * 工作流程：
 *  HTML 字符串 → DOMParser 解析成真实 DOM → 递归遍历 DOM 节点 → 生成 VNode 树
 */

import { isValidTagName } from '@matechat/common/MarkdownCard/common/parser';
import { h, isVNode, type VNode } from 'vue';

/**
 * htmlToVNode：将 HTML 字符串转换为 Vue VNode 数组。
 *
 * @param htmlString - 经过 XSS 过滤后的安全 HTML 字符串
 * @returns VNode 或纯文本字符串的数组（Fragment 的子节点）
 *
 * 实现思路：
 *  1. 用浏览器原生的 DOMParser 把 HTML 解析成 DOM 树（更可靠，不需要手写解析器）
 *  2. 用 <body> 包裹 HTML，避免解析时补全 <html>/<head>/<body> 导致层级错误
 *  3. 遍历 body 的直接子节点，每个都调用 nodeToVNode 转成 VNode
 *  4. 给每个 VNode 设置 key（index），帮助 Vue diff 算法识别节点身份
 *
 * 两种特殊情况的处理：
 *  - SSR 环境（无 window/DOMParser）：直接返回原始字符串，不做转换
 *  - 空字符串：直接返回空数组
 */
export const htmlToVNode = (htmlString: string): (VNode | string)[] => {
  // 空内容直接返回
  if (!htmlString || !htmlString.trim()) return [];

  // SSR 环境没有 DOMParser，降级为返回原始字符串
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return [htmlString];
  }

  // 用 DOMParser 解析 HTML 字符串为 DOM 文档
  // 用 <body> 包裹是为了让解析器正确处理片段性的 HTML（如 <p>text</p><code>...）
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<body>${htmlString}</body>`, 'text/html');
  const vnodes: (VNode | string)[] = [];

  // 遍历 body 的直接子节点，逐个转成 VNode
  doc.body.childNodes.forEach((node, index) => {
    const vnode = nodeToVNode(node);

    if (isVNode(vnode) || typeof vnode === 'string') {
      // 给 VNode 设置 key，避免 Vue diff 时把不同节点误判为同一个
      if (typeof vnode === 'object') (vnode as any).key = index;
      vnodes.push(vnode);
    }
  });

  return vnodes;
};

/**
 * nodeToVNode：将单个 DOM 节点递归转换为 Vue VNode 或字符串。
 *
 * @param node - 浏览器原生 DOM 节点
 * @returns VNode（元素节点）| string（文本节点）| null（忽略的节点）
 *
 * 三种节点类型的处理：
 *  - TEXT_NODE（文本节点，如 "hello"）→ 直接返回 textContent 字符串
 *  - ELEMENT_NODE（元素节点，如 <p>）→ 递归处理，用 h() 创建 VNode
 *  - 其他（注释节点等）→ 返回 textContent 或空串（忽略）
 *
 * 元素节点的处理步骤：
 *  1. 提取所有 HTML 属性，转成 VNode props 对象（{ class: '...', href: '...' }）
 *  2. 递归处理所有子节点，得到子 VNode 数组
 *  3. 校验标签名是否合法（防止生成 <script> 等危险标签）
 *  4. 用 Vue 的 h() 函数创建 VNode
 */
const nodeToVNode = (node: Node): VNode | string | null => {
  // 文本节点：直接返回文字内容
  if (node.nodeType === Node.TEXT_NODE) return node.textContent;

  // 非元素节点（注释节点等）：返回文本或空串
  if (node.nodeType !== Node.ELEMENT_NODE) return node.textContent || '';

  const elementNode = node as Element;
  const props: Record<string, any> = {};

  // 提取元素的所有 HTML 属性，转成 props 对象
  // 例如：<a href="..." class="link"> → { href: '...', class: 'link' }
  if (elementNode.hasAttributes() && elementNode.attributes) {
    for (const attr of Array.from(elementNode.attributes)) {
      props[attr.name] = attr.value;
    }
  }

  // 递归处理子节点
  const children: (VNode | string)[] = [];
  if (elementNode.childNodes.length > 0) {
    elementNode.childNodes.forEach((child) => {
      const childVNode = nodeToVNode(child);
      if (isVNode(childVNode) || typeof childVNode === 'string') {
        children.push(childVNode);
      }
    });
  }

  // 安全校验：如果标签名不合法（如 script/object/embed），
  // 退回到纯文本，防止 XSS 过滤后仍残留危险标签
  if (!isValidTagName(elementNode.tagName)) {
    return node?.textContent || '';
  }

  // 用 h() 创建 VNode（标签名统一转小写，HTML 标准要求）
  return h(elementNode.tagName.toLowerCase(), props, children);
};
