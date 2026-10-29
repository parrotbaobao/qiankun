// 历史入口：现已迁移到 ./chat/，此文件作为薄壳保留以避免大量调用方修改
export {
  createChatStream,
  openAIStreamAdapter,
  OpenAIStreamBusinessError,
  OpenAIStreamProtocolError,
  parseOpenAIStreamEvent,
  type ChatStreamOptions,
  type ChatStream,
  type ChatState,
  type ChatStateOf,
  type ChatMetrics,
  type ChatUsage,
  type StreamAdapter,
  type StreamEventMetadata,
  type StreamProtocolEvent,
} from './chat'
