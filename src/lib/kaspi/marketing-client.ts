/**
 * Kaspi Marketing API Client — работа с marketing.kaspi.kz
 */

const MARKETING_BASE = 'https://marketing.kaspi.kz';

const DEFAULT_HEADERS: Record<string, string> = {
  'Accept': 'application/json, text/plain, */*',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
  'x-front-version': '5.0.458',
  'x-requested-with': 'XMLHttpRequest',
};

export interface MarketingCampaign {
  id: number;
  name: string;
  dailyBudget: number;
  startDate: string;
  endDate?: string;
  biddingType: string | number;
  defaultBid: number;
  state: 'Enabled' | 'Paused' | 'Archived';
  targetLocationIds: number[];
  views: number;
  clicks: number;
  favorites: number;
  carts: number;
  ctr: number;
  gmv: number;
  transactions: number;
  cost: number;
  crr: number;
  recordTimeStamp?: string;
}

export interface CampaignProduct {
  id: number;
  sku: string;
  productName: string;
  productUrl?: string;
  imageUrl?: string;
  bid: number;
  campaignState: string;
  productState: string;
  views: number;
  clicks: number;
  favorites: number;
  carts: number;
  ctr: number;
  gmv: number;
  transactions: number;
  cost: number;
  crr: number;
}

export interface MarketingLoginResponse {
  result: string;
  data: {
    userId: string;
    sessionDuration: number;
    sessionStartDateTime: string;
    pay: {
      merchantId: number;
      context: {
        phone: string;
        organizationName: string;
        userFullName: string;
        payPermissions: string[];
      };
    };
    shop: {
      merchantBusinessId: string;
      merchantName: string;
      userType: number;
      merchants: Array<{
        id: number;
        merchantBusinessId: string;
        merchantName: string;
        promotionTypeId: number;
        merchantType: string;
      }>;
    };
    profiles: Array<{
      id: number;
      organizationIdn: string;
      organizationName: string;
      merchants: Array<{ id: number; merchantBusinessId: string; merchantName: string }>;
    }>;
  };
}

export interface MarketingSession {
  user_token: string;
  session_id: string;
  merchant_id: number;
  marketing_user_id: string;
  merchant_name: string;
  created_at: string;
  username?: string;
  password?: string;
}

export class KaspiMarketingClient {
  private cookies: string;
  private merchantId: number;

  constructor(session: MarketingSession) {
    this.cookies = `user_token=${session.user_token}; X-Kb-Session-Id=${session.session_id}`;
    this.merchantId = session.merchant_id;
  }

  /**
   * Попытка переподключения если сессия протухла.
   * Возвращает новую сессию или null если нет credentials.
   */
  static async tryReconnect(session: MarketingSession): Promise<MarketingSession | null> {
    if (!session.username || !session.password) return null;
    try {
      const { session: newSession } = await KaspiMarketingClient.login(session.username, session.password);
      return newSession;
    } catch {
      return null;
    }
  }

  /**
   * Логин в Kaspi Marketing
   */
  static async login(username: string, password: string): Promise<{
    session: MarketingSession;
    loginData: MarketingLoginResponse['data'];
  }> {
    // Нормализуем телефон: +77076207065 → 87076207065 (11 цифр)
    let phone = username.replace(/[\s\-\(\)]/g, '');
    if (phone.startsWith('+7')) {
      phone = '8' + phone.slice(2);
    }

    // URLSearchParams для application/x-www-form-urlencoded (как в браузере)
    const body = new URLSearchParams();
    body.append('username', phone);
    body.append('password', password);

    const response = await fetch(`${MARKETING_BASE}/accounts/api/User/login`, {
      method: 'POST',
      headers: {
        ...DEFAULT_HEADERS,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': `${MARKETING_BASE}/sign-in`,
        'Origin': MARKETING_BASE,
      },
      body: body.toString(),
      redirect: 'manual',
    });

    // Собираем cookies из Set-Cookie
    const setCookies = response.headers.getSetCookie?.() || [];
    let userToken = '';
    let sessionId = '';

    for (const cookie of setCookies) {
      const match = cookie.match(/^([^=]+)=([^;]+)/);
      if (match) {
        if (match[1] === 'user_token') userToken = match[2];
        if (match[1] === 'X-Kb-Session-Id') sessionId = match[2];
      }
    }

    // Также попробуем получить из raw headers
    if (!userToken || !sessionId) {
      const rawHeaders = response.headers;
      const allSetCookies: string[] = [];
      rawHeaders.forEach((value, key) => {
        if (key.toLowerCase() === 'set-cookie') {
          allSetCookies.push(value);
        }
      });
      for (const cookie of allSetCookies) {
        const parts = cookie.split(',');
        for (const part of parts) {
          const match = part.trim().match(/^([^=]+)=([^;]+)/);
          if (match) {
            if (match[1].trim() === 'user_token') userToken = match[2];
            if (match[1].trim() === 'X-Kb-Session-Id') sessionId = match[2];
          }
        }
      }
    }

    // Если redirect (302/303), тело может быть пустым — пробуем читать текст
    const text = await response.text();
    let json: MarketingLoginResponse;
    try {
      json = JSON.parse(text) as MarketingLoginResponse;
    } catch {
      console.error('Marketing login response not JSON:', response.status, text.slice(0, 500));
      throw new Error(`Marketing login failed: HTTP ${response.status}`);
    }

    if (json.result !== 'Ok' || !json.data) {
      console.error('Marketing login rejected:', JSON.stringify(json).slice(0, 500));
      // Показываем валидационную ошибку от Kaspi если есть
      const msg = (json as unknown as { message?: string }).message || json.result;
      throw new Error(msg);
    }

    const merchant = json.data.shop?.merchants?.[0];
    if (!merchant) {
      throw new Error('No merchant found in marketing login response');
    }

    const session: MarketingSession = {
      user_token: userToken,
      session_id: sessionId,
      merchant_id: merchant.id,
      marketing_user_id: json.data.userId,
      merchant_name: merchant.merchantName,
      created_at: new Date().toISOString(),
      username,
      password,
    };

    return { session, loginData: json.data };
  }

  /**
   * Получить все кампании за период
   */
  async getCampaigns(startDate: string, endDate: string): Promise<MarketingCampaign[]> {
    const url = `${MARKETING_BASE}/advertising/products/api/v5/merchant/${this.merchantId}/Campaigns?StartDate=${startDate}&EndDate=${endDate}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...DEFAULT_HEADERS,
        'Cookie': this.cookies,
        'Referer': `${MARKETING_BASE}/advertising/campaigns?tab=campaigns`,
      },
    });

    const json = await response.json() as { result: string; data: MarketingCampaign[] };

    if (json.result !== 'Ok') {
      throw new Error(`Failed to fetch campaigns: ${json.result}`);
    }

    return json.data || [];
  }

  /**
   * Получить активные кампании за период
   */
  async getActiveCampaigns(startDate: string, endDate: string): Promise<MarketingCampaign[]> {
    const url = `${MARKETING_BASE}/advertising/products/api/v5/merchant/${this.merchantId}/Campaigns?StartDate=${startDate}&EndDate=${endDate}&state=Enabled`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...DEFAULT_HEADERS,
        'Cookie': this.cookies,
        'Referer': `${MARKETING_BASE}/advertising/campaigns?tab=campaigns`,
      },
    });

    const json = await response.json() as { result: string; data: MarketingCampaign[] };

    if (json.result !== 'Ok') {
      throw new Error(`Failed to fetch active campaigns: ${json.result}`);
    }

    return json.data || [];
  }

  /**
   * Получить товары кампании
   */
  async getCampaignProducts(campaignId: number, startDate: string, endDate: string): Promise<CampaignProduct[]> {
    const url = `${MARKETING_BASE}/advertising/products/api/v5/merchant/${this.merchantId}/Campaign/${campaignId}/Products?StartDate=${startDate}&EndDate=${endDate}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...DEFAULT_HEADERS,
        'Cookie': this.cookies,
        'Referer': `${MARKETING_BASE}/advertising/campaigns/${campaignId}?tab=products`,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = await response.json() as { result: string; data: any[] };

    if (json.result !== 'Ok') {
      throw new Error(`Failed to fetch campaign products: ${json.result}`);
    }

    // Маппим поля API к нашему интерфейсу
    return (json.data || []).map((raw): CampaignProduct => ({
      id: raw.campaignProductId,
      sku: raw.sku,
      productName: raw.title,
      productUrl: raw.itemUrl,
      imageUrl: raw.imageUrl,
      bid: raw.bid,
      campaignState: raw.campaignState || '',
      productState: raw.productState || '',
      views: raw.views || 0,
      clicks: raw.clicks || 0,
      favorites: raw.favorites || 0,
      carts: raw.carts || 0,
      ctr: raw.ctr || 0,
      gmv: raw.gmv || 0,
      transactions: raw.transactions || 0,
      cost: raw.cost || 0,
      crr: raw.crr || 0,
    }));
  }

  /**
   * Получить обзор (Overview)
   */
  async getOverview(startDate: string, endDate: string): Promise<Record<string, unknown>> {
    const url = `${MARKETING_BASE}/advertising/products/api/v4/merchant/${this.merchantId}/Overview`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...DEFAULT_HEADERS,
        'Content-Type': 'application/json',
        'Cookie': this.cookies,
        'Referer': `${MARKETING_BASE}/advertising/overview?tab=overview&activeTab=Enabled`,
        'Origin': MARKETING_BASE,
      },
      body: JSON.stringify({ startDate, endDate }),
    });

    const json = await response.json() as { result: string; data: Record<string, unknown> };
    return json.data || {};
  }

  /**
   * Агрегация: общие расходы на рекламу
   */
  static aggregateCampaigns(campaigns: MarketingCampaign[]) {
    let totalCost = 0;
    let totalViews = 0;
    let totalClicks = 0;
    let totalTransactions = 0;
    let totalGmv = 0;
    let totalFavorites = 0;
    let totalCarts = 0;

    for (const c of campaigns) {
      totalCost += c.cost || 0;
      totalViews += c.views || 0;
      totalClicks += c.clicks || 0;
      totalTransactions += c.transactions || 0;
      totalGmv += c.gmv || 0;
      totalFavorites += c.favorites || 0;
      totalCarts += c.carts || 0;
    }

    const avgCtr = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;
    const roas = totalCost > 0 ? totalGmv / totalCost : 0;
    const crr = totalGmv > 0 ? (totalCost / totalGmv) * 100 : 0;

    return {
      totalCost,
      totalViews,
      totalClicks,
      totalTransactions,
      totalGmv,
      totalFavorites,
      totalCarts,
      avgCtr,
      roas,
      crr,
      activeCampaigns: campaigns.filter(c => c.state !== 'Paused' && c.state !== 'Archived').length,
      totalCampaigns: campaigns.length,
    };
  }
}
