/* eslint-disable @typescript-eslint/no-explicit-any */
import { AdminConfig } from './admin.types';

interface TVBoxSite {
  key: string;
  name: string;
  type: number;
  api: string;
  searchable?: number;
  quickSearch?: number;
  filterable?: number;
  ext?: string;
  categories?: string[];
}

interface TVBoxJson {
  spider?: string;
  wallpaper?: string;
  sites: TVBoxSite[];
  lives?: any[];
}

export async function fetchTVBoxConfig(url: string): Promise<TVBoxJson> {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });
  if (!res.ok) {
    throw new Error(
      `Failed to fetch TVBox config: ${res.status} ${res.statusText}`
    );
  }
  const text = await res.text();
  try {
    // 尝试解析 JSON
    return JSON.parse(text);
  } catch (e) {
    // 有些配置可能是加密的或者格式不规范，这里简单处理，如果不是 JSON 则抛出
    // 也可以尝试处理 base64 或者其他格式，但目前先支持标准 JSON
    throw new Error('Invalid TVBox config format: not a valid JSON');
  }
}

export function parseTVBoxSites(config: TVBoxJson): TVBoxSite[] {
  if (!config.sites || !Array.isArray(config.sites)) {
    return [];
  }
  // 过滤出支持的类型：1 (json)
  // DecoTV 目前仅支持 JSON 格式的 CMS 接口
  return config.sites.filter((site) => site.type === 1);
}

export function sanitizeKey(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
}

export function mergeTVBoxSites(
  adminConfig: AdminConfig,
  sites: TVBoxSite[],
  subscriptionName: string
): AdminConfig {
  const newConfig = { ...adminConfig };
  const safeName = sanitizeKey(subscriptionName);

  // 移除该订阅源之前的站点（如果有）
  newConfig.SourceConfig = newConfig.SourceConfig.filter(
    (s) => !s.key.startsWith(`tvbox_${safeName}_`)
  );

  // 添加新站点
  const newSites = sites.map((site) => ({
    key: `tvbox_${safeName}_${site.key}`,
    name: `${site.name}`,
    api: site.api,
    from: 'tvbox' as const,
    disabled: false,
    is_adult: false, // 默认为非成人，后续可手动修改
    detail: site.name, // 存储原始名称作为详情
  }));

  newConfig.SourceConfig.push(...newSites);

  return newConfig;
}

export function removeTVBoxSites(
  adminConfig: AdminConfig,
  subscriptionName: string
): AdminConfig {
  const newConfig = { ...adminConfig };
  const safeName = sanitizeKey(subscriptionName);

  newConfig.SourceConfig = newConfig.SourceConfig.filter(
    (s) => !s.key.startsWith(`tvbox_${safeName}_`)
  );

  return newConfig;
}
