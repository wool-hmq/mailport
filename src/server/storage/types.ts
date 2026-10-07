/**
 * 存储适配器统一接口 / Unified storage adapter interface
 *
 * 设计参考 Waline 的多数据库方案:每个驱动实现同一套方法,
 * 上层业务代码只面向本接口,不感知具体数据库。
 * 新增数据库支持时,只需在 src/server/storage/drivers/ 下新增一个实现
 * 并在 detectDriver() 中注册识别规则。
 */

export type SenderType = "smtp" | "http" | "outlook_oauth2" | "gmail_oauth2";

export interface Sender {
  id: string;
  /** 路由标识,5-10 位随机字母数字,用于 /api/{pid}/send */
  pid: string;
  name: string;
  type: SenderType;
  enabled: boolean;
  /** SMTP 主机 */
  host: string | null;
  /** SMTP 端口 */
  port: number | null;
  /** 是否 SSL/TLS */
  secure: boolean;
  /** 服务名(nodemailer service,如 QQ) */
  service: string | null;
  /** 发件账号 */
  username: string | null;
  /** 发件密码(密文) */
  password: string | null;
  /** 发件人地址 */
  fromAddress: string | null;
  /** 发件人名称 */
  fromName: string | null;
  /** 允许的收件域名(逗号分隔,空表示不限制) */
  allowedDomains: string[];

  // ---- HTTP API 发件 ----
  /** 请求地址,如 https://api.example.com/send */
  httpUrl: string | null;
  /** 请求方法,默认 POST */
  httpMethod: string | null;
  /** 自定义请求头,标准 JSON 对象文本,如 {"Authorization":"Bearer xxx"} */
  httpHeaders: string | null;
  /** 自定义请求体模板,支持 {{to}} {{subject}} {{text}} {{html}} 占位符 */
  httpBody: string | null;

  // ---- OAuth2 发件(Outlook / Gmail) ----
  /** OAuth 应用 Client ID */
  oauthClientId: string | null;
  /** OAuth 应用 Client Secret(密文) */
  oauthClientSecret: string | null;
  /** 刷新令牌(密文) */
  oauthRefreshToken: string | null;
  /** 已完成授权的时间戳;未授权为 null */
  oauthAuthorizedAt: number | null;

  createdAt: number;
  updatedAt: number;
}

export interface SenderKey {
  id: string;
  senderId: string;
  /** 32 位随机密钥(密文存储,可解密重复查看) */
  key: string;
  /** 密钥备注名 */
  label: string;
  enabled: boolean;
  lastUsedAt: number | null;
  createdAt: number;
}

export type SendLogStatus = "success" | "failed";

export interface SendLog {
  id: string;
  senderId: string;
  keyId: string | null;
  to: string;
  subject: string;
  status: SendLogStatus;
  /** 失败原因 */
  error: string | null;
  /** 耗时毫秒 */
  duration: number;
  createdAt: number;
}

export interface ListOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  order?: "asc" | "desc";
}

export interface ListResult<T> {
  rows: T[];
  total: number;
}

/**
 * 存储适配器必须实现的全部方法。
 * 方法返回的是已解密的明文模型(密码字段由驱动层加解密,
 * 上层不接触密文),调用方无需关心。
 */
export interface IStorage {
  /** 驱动名,如 postgres / mysql / mongodb / sqlite */
  readonly driver: string;

  // ---- 表/集合存在性 ----
  /** 首次部署时调用,建表/集合与索引 */
  init(): Promise<void>;

  // ---- 发件商 ----
  createSender(data: Omit<Sender, "id" | "createdAt" | "updatedAt">): Promise<Sender>;
  updateSender(id: string, data: Partial<Omit<Sender, "id" | "createdAt">>): Promise<Sender | null>;
  getSenderById(id: string): Promise<Sender | null>;
  getSenderByPid(pid: string): Promise<Sender | null>;
  listSenders(options?: ListOptions): Promise<ListResult<Sender>>;
  deleteSender(id: string): Promise<void>;

  // ---- 发件商密钥 ----
  createSenderKey(data: Omit<SenderKey, "id" | "createdAt" | "lastUsedAt">): Promise<SenderKey>;
  listSenderKeys(senderId: string): Promise<SenderKey[]>;
  /** 按 pid + 明文 key 查询,用于发件鉴权 */
  getKeyBySenderAndKey(senderId: string, plainKey: string): Promise<SenderKey | null>;
  updateSenderKey(id: string, data: Partial<Pick<SenderKey, "label" | "enabled">>): Promise<SenderKey | null>;
  touchSenderKey(id: string, time: number): Promise<void>;
  deleteSenderKey(id: string): Promise<void>;

  // ---- 发送日志 ----
  createSendLog(data: Omit<SendLog, "id" | "createdAt">): Promise<SendLog>;
  listSendLogs(senderId: string, options?: ListOptions): Promise<ListResult<SendLog>>;

  // ---- 统计 ----
  countSenders(): Promise<number>;
  countSendLogs(status?: SendLogStatus): Promise<number>;
}
