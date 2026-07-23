// 历史入口：现已迁移到 ./chat/，此文件作为薄壳保留以避免大量调用方修改
export {
  createChatStream,
  type ChatStreamOptions,
  type ChatStream,
  type ChatState,
  type ChatStateOf,
} from './chat'
