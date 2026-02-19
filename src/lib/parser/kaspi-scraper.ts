import * as cheerio from 'cheerio';
import type { CompetitorData } from '@/types/kaspi';

const LOCAL_CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
];

// Log collector for returning debug logs to the client
type LogCollector = string[];

function log(logs: LogCollector, msg: string) {
  console.log(msg);
  logs.push(msg);
}

async function getRenderedHtml(url: string, logs: LogCollector): Promise<string> {
  log(logs, `[scraper] getRenderedHtml start: ${url}`);
  const puppeteer = await import('puppeteer-core');

  let executablePath: string;
  let args: string[];

  const isVercel = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
  log(logs, `[scraper] isVercel: ${isVercel}`);

  if (isVercel) {
    const chromium = await import('@sparticuz/chromium');
    executablePath = await chromium.default.executablePath();
    args = chromium.default.args;
  } else {
    const fs = await import('fs');
    const found = LOCAL_CHROME_PATHS.find(p => fs.existsSync(p));
    log(logs, `[scraper] Local Chrome found: ${found || 'NOT FOUND'}`);
    if (!found) throw new Error('Chrome not found locally. Install Chrome or set CHROME_PATH env.');
    executablePath = process.env.CHROME_PATH || found;
    args = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'];
  }

  log(logs, `[scraper] Launching browser: ${executablePath}`);
  const browser = await puppeteer.default.launch({
    args,
    defaultViewport: { width: 1280, height: 800 },
    executablePath,
    headless: true,
  });
  log(logs, `[scraper] Browser launched OK`);

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    log(logs, `[scraper] Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    log(logs, `[scraper] Page loaded`);

    // Wait for search results to render
    const found = await page.waitForSelector('.item-card', { timeout: 15000 })
      .then(() => true)
      .catch(() => false);
    log(logs, `[scraper] .item-card found: ${found}`);

    if (!found) {
      // Try alternative selectors
      const altSelectors = ['.item-cards-grid', '.search-results', '[data-product]', '.product-card'];
      for (const sel of altSelectors) {
        const altFound = await page.$(sel);
        if (altFound) {
          log(logs, `[scraper] Alternative selector found: ${sel}`);
        }
      }
      // Log page title and a snippet of the HTML
      const title = await page.title();
      log(logs, `[scraper] Page title: ${title}`);
      const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
      log(logs, `[scraper] Body text (first 500 chars): ${bodyText}`);
    }

    const html = await page.content();
    const itemCardCount = (html.match(/item-card/g) || []).length;
    log(logs, `[scraper] HTML length: ${html.length} | item-card mentions: ${itemCardCount}`);

    return html;
  } finally {
    await browser.close();
    log(logs, `[scraper] Browser closed`);
  }
}

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

  /**
   * Check search position for a product by kaspi_id.
   * Kaspi search shows products (not merchants), so we match by product ID in URLs.
   * Uses headless Chrome because Kaspi renders search results via JS.
   */
  async checkPosition(query: string, kaspiId: string | null): Promise<{
    positionOrganic: number | null;
    positionAd: number | null;
    totalResults: number;
    logs: string[];
  }> {
    const logs: string[] = [];
    try {
      const searchUrl = `${this.baseUrl}/shop/search/?text=${encodeURIComponent(query)}`;
      log(logs, `[checkPosition] query="${query}" kaspiId="${kaspiId}" url=${searchUrl}`);

      if (!kaspiId) {
        log(logs, `[checkPosition] No kaspiId — cannot match product in results`);
        return { positionOrganic: null, positionAd: null, totalResults: 0, logs };
      }

      const html = await getRenderedHtml(searchUrl, logs);
      const $ = cheerio.load(html);

      let positionOrganic: number | null = null;
      let positionAd: number | null = null;
      let organicIdx = 0;
      let adIdx = 0;
      let totalResults = 0;

      const itemCards = $('.item-card');
      log(logs, `[checkPosition] Found ${itemCards.length} .item-card elements`);

      // Log first 3 item cards for debugging
      itemCards.slice(0, 3).each((idx, element) => {
        const $el = $(element);
        const href = $el.find('a').first().attr('href') || '';
        const name = $el.find('.item-card__name').first().text().trim().substring(0, 60);
        log(logs, `[checkPosition] Card #${idx}: name="${name}" href="${href.substring(0, 80)}"`);
      });

      itemCards.each((_, element) => {
        const $el = $(element);
        totalResults++;

        // Extract product URL to find kaspi_id
        const href = $el.find('a').first().attr('href') || '';

        // Check if this is an ad (promoted) result
        const classAttr = $el.attr('class') || '';
        const innerHtml = $el.html() || '';
        const isAd =
          classAttr.includes('sponsored') ||
          classAttr.includes('promot') ||
          innerHtml.includes('sponsored') ||
          innerHtml.includes('promot') ||
          innerHtml.includes('Реклама') ||
          $el.find('[class*="sponsor"], [class*="promot"], [class*="ad-label"]').length > 0;

        if (isAd) {
          adIdx++;
        } else {
          organicIdx++;
        }

        // Match by kaspi_id in product URL (e.g. /shop/p/116615366/...)
        if (href.includes(`/p/${kaspiId}`) || href.includes(`-${kaspiId}/`) || href.includes(`/${kaspiId}?`)) {
          log(logs, `[checkPosition] MATCH! kaspiId=${kaspiId} at organic=${organicIdx} ad=${adIdx} href="${href.substring(0, 80)}"`);
          if (isAd && positionAd === null) {
            positionAd = adIdx;
          } else if (!isAd && positionOrganic === null) {
            positionOrganic = organicIdx;
          }
        }
      });

      log(logs, `[checkPosition] Result: organic=${positionOrganic} ad=${positionAd} total=${totalResults}`);
      return { positionOrganic, positionAd, totalResults, logs };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      log(logs, `[checkPosition] ERROR: ${errMsg}`);
      return { positionOrganic: null, positionAd: null, totalResults: 0, logs };
    }
  }
}

export const kaspiScraper = new KaspiScraper();
