/**
 * Kaspi API Client для работы с merchant API через cookies
 */

export interface KaspiProduct {
  sku: string;
  name: string;
  price: number;
  stock: number;
  category?: string;
  brand?: string;
  images: string[];
  offerId?: string;
  masterSku?: string;
  shopLink?: string;
  availabilities?: any[];
}

export class KaspiAPIClient {
  private cookieString: string;
  private merchantId: string;

  constructor(cookies: string, merchantId: string = '4929016') {
    this.cookieString = cookies;
    this.merchantId = merchantId;
  }

  /**
   * Получить все товары продавца
   */
  async getAllProducts(): Promise<KaspiProduct[]> {
    const allProducts: KaspiProduct[] = [];
    let page = 0;
    const limit = 100;

    while (true) {
      console.log(`Fetching products page ${page}...`);

      const products = await this.getProductsPage(page, limit);

      if (products.length === 0) {
        break;
      }

      allProducts.push(...products);

      // Если получили меньше limit, это последняя страница
      if (products.length < limit) {
        break;
      }

      page++;
    }

    console.log(`Total products fetched: ${allProducts.length}`);
    return allProducts;
  }

  /**
   * Получить одну страницу товаров
   */
  async getProductsPage(page: number = 0, limit: number = 100): Promise<KaspiProduct[]> {
    const url = `https://mc.shop.kaspi.kz/bff/offer-view/list?m=${this.merchantId}&p=${page}&l=${limit}&a=true&t=&c=&lowStock=false&notSpecifiedStock=false`;

    try {
      const response = await fetch(url, {
        headers: {
          'Cookie': this.cookieString,
          'Accept': 'application/json',
          'Referer': 'https://kaspi.kz/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.data || !Array.isArray(data.data)) {
        return [];
      }

      // Преобразуем в удобный формат
      const products: KaspiProduct[] = data.data.map((item: any) => ({
        sku: item.sku || item.masterSku,
        name: item.title || item.masterTitle,
        price: item.price || 0,
        stock: this.calculateTotalStock(item.availabilities),
        category: item.masterCategory || item.verticalCategory,
        brand: item.brand || null,
        images: item.images || [],
        offerId: item.offerId,
        masterSku: item.masterSku,
        shopLink: item.shopLink,
        availabilities: item.availabilities,
      }));

      return products;
    } catch (error) {
      console.error(`Error fetching products page ${page}:`, error);
      throw error;
    }
  }

  /**
   * Подсчитать общий остаток из всех складов
   */
  private calculateTotalStock(availabilities: any[] | undefined): number {
    if (!availabilities || !Array.isArray(availabilities)) {
      return 0;
    }

    return availabilities.reduce((sum, avail) => {
      return sum + (avail.stockCount || 0);
    }, 0);
  }

  /**
   * Получить количество товаров
   */
  async getProductsCount(): Promise<number> {
    const url = `https://mc.shop.kaspi.kz/bff/offer-view/count?m=${this.merchantId}`;

    try {
      const response = await fetch(url, {
        headers: {
          'Cookie': this.cookieString,
          'Accept': 'application/json',
          'Referer': 'https://kaspi.kz/',
        },
      });

      if (!response.ok) {
        throw new Error(`Count request failed: ${response.status}`);
      }

      const data = await response.json();
      return data.count || 0;
    } catch (error) {
      console.error('Error getting products count:', error);
      return 0;
    }
  }
}