import * as cheerio from 'cheerio';
import type { CompetitorData } from '@/types/kaspi';

export class KaspiScraper {
  private baseUrl = 'https://kaspi.kz';

  /**
   * Search for products and get competitor prices
   */
  async searchProduct(productName: string): Promise<CompetitorData[]> {
    try {
      const searchUrl = `${this.baseUrl}/shop/search/?text=${encodeURIComponent(productName)}`;

      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      const competitors: CompetitorData[] = [];

      // Parse product listings
      $('.item-card').each((_, element) => {
        const $element = $(element);

        const name = $element.find('.item-card__name').text().trim();
        const priceText = $element.find('.item-card__prices-price').text().trim();
        const price = parseFloat(priceText.replace(/[^\d]/g, ''));
        const merchantName = $element.find('.item-card__merchant-name').text().trim();
        const ratingText = $element.find('.rating').attr('data-rating');
        const rating = ratingText ? parseFloat(ratingText) : undefined;
        const reviewsText = $element.find('.reviews-count').text().trim();
        const reviewsCount = reviewsText ? parseInt(reviewsText.replace(/[^\d]/g, '')) : undefined;
        const url = this.baseUrl + $element.find('a.item-card__link').attr('href');

        if (name && !isNaN(price) && merchantName) {
          competitors.push({
            productName: name,
            price,
            merchantName,
            rating,
            reviewsCount,
            url,
            scrapedAt: new Date(),
          });
        }
      });

      return competitors;
    } catch (error) {
      console.error('Error scraping Kaspi:', error);
      return [];
    }
  }

  /**
   * Get detailed product information
   */
  async getProductDetails(productUrl: string): Promise<CompetitorData | null> {
    try {
      const response = await fetch(productUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      const name = $('.product__name').text().trim();
      const priceText = $('.product__price-value').text().trim();
      const price = parseFloat(priceText.replace(/[^\d]/g, ''));
      const merchantName = $('.merchant__name').text().trim();
      const ratingText = $('.rating').attr('data-rating');
      const rating = ratingText ? parseFloat(ratingText) : undefined;
      const reviewsText = $('.reviews-count').text().trim();
      const reviewsCount = reviewsText ? parseInt(reviewsText.replace(/[^\d]/g, '')) : undefined;

      if (name && !isNaN(price) && merchantName) {
        return {
          productName: name,
          price,
          merchantName,
          rating,
          reviewsCount,
          url: productUrl,
          scrapedAt: new Date(),
        };
      }

      return null;
    } catch (error) {
      console.error('Error getting product details:', error);
      return null;
    }
  }

  /**
   * Compare prices for a specific product across merchants
   */
  async comparePrices(productName: string, limit = 10): Promise<CompetitorData[]> {
    const competitors = await this.searchProduct(productName);

    // Sort by price ascending
    competitors.sort((a, b) => a.price - b.price);

    // Return top N results
    return competitors.slice(0, limit);
  }
}

export const kaspiScraper = new KaspiScraper();
