import { chromium, Browser, Page, BrowserContext } from 'playwright';

export interface KaspiCredentials {
  username: string;
  password: string;
}

export interface ProductPriceUpdate {
  sku: string;
  name: string;
  newPrice: number;
}

export interface ProductStockUpdate {
  sku: string;
  name: string;
  newStock: number;
}

export interface NewProduct {
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  images?: string[];
  sku?: string;
}

export interface PreOrderConfig {
  sku: string;
  enabled: boolean;
  availableFrom?: string;
}

export class KaspiAutomation {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private isAuthenticated: boolean = false;
  private credentials: KaspiCredentials;

  constructor(credentials: KaspiCredentials) {
    this.credentials = credentials;
  }

  /**
   * Инициализация браузера
   */
  async init(headless: boolean = true): Promise<void> {
    try {
      this.browser = await chromium.launch({
        headless,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      this.context = await this.browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
        locale: 'ru-RU',
      });

      this.page = await this.context.newPage();

      console.log('Browser initialized successfully');
    } catch (error) {
      console.error('Failed to initialize browser:', error);
      throw error;
    }
  }

  /**
   * Авторизация в личном кабинете Kaspi
   */
  async login(): Promise<boolean> {
    if (!this.page) {
      throw new Error('Browser not initialized. Call init() first.');
    }

    try {
      console.log('Navigating to Kaspi Merchant login page...');

      // Переход на страницу авторизации
      await this.page.goto('https://kaspi.kz/merchantcabinet/', {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      // Ждем загрузки страницы
      await this.page.waitForTimeout(2000);

      console.log('Page loaded, looking for login form...');

      // Проверяем, не залогинены ли мы уже
      const currentUrl = this.page.url();
      if (currentUrl.includes('/merchantcabinet') && !currentUrl.includes('/login') && !currentUrl.includes('/auth')) {
        console.log('Already logged in!');
        this.isAuthenticated = true;
        return true;
      }

      // Ищем поле для ввода (может быть разные типы)
      const usernameSelector = 'input[type="text"], input[type="tel"], input[type="email"], input[name*="user"], input[name*="login"], input[name*="phone"]';
      await this.page.waitForSelector(usernameSelector, { timeout: 10000 });

      console.log('Login form found, entering credentials...');

      // Вводим логин (кликаем на поле сначала)
      await this.page.click(usernameSelector);
      await this.page.fill(usernameSelector, this.credentials.username);

      // Небольшая задержка для имитации человека
      await this.page.waitForTimeout(800);

      // Вводим пароль
      const passwordSelector = 'input[type="password"]';
      await this.page.click(passwordSelector);
      await this.page.fill(passwordSelector, this.credentials.password);

      await this.page.waitForTimeout(800);

      console.log('Credentials entered, looking for submit button...');

      // Ждем немного чтобы форма была готова
      await this.page.waitForTimeout(1000);

      // Ищем кнопку входа (разные варианты)
      const buttonSelectors = [
        'button.is-primary:visible',
        'button:has-text("Продолжить"):visible',
        'button[type="submit"]:visible',
        'button:has-text("Войти"):visible',
        'button:has-text("Login"):visible',
        'button:has-text("Sign in"):visible',
        '[type="submit"]:visible',
        'button.btn:visible',
        'button:visible',
      ];

      let buttonFound = false;
      for (const selector of buttonSelectors) {
        try {
          // Проверяем что кнопка существует, видима и кликабельна
          const button = await this.page.$(selector);
          if (button) {
            const isVisible = await button.isVisible();
            const isEnabled = await button.isEnabled();

            if (isVisible && isEnabled) {
              console.log(`Found clickable button with selector: ${selector}`);

              // Скроллим к кнопке если нужно
              await button.scrollIntoViewIfNeeded();
              await this.page.waitForTimeout(300);

              // Кликаем
              await button.click();
              buttonFound = true;
              console.log('Button clicked successfully');
              break;
            } else {
              console.log(`Button found but not clickable: visible=${isVisible}, enabled=${isEnabled}`);
            }
          }
        } catch (e) {
          continue;
        }
      }

      // Если не нашли кнопку, попробуем нажать Enter
      if (!buttonFound) {
        console.log('Button not found, trying Enter key...');
        await this.page.keyboard.press('Enter');
      }

      console.log('Login submitted, waiting for navigation...');

      // Ждем успешной авторизации или ошибки
      await this.page.waitForTimeout(5000);

      // Проверяем URL и содержимое страницы
      const finalUrl = this.page.url();
      console.log('Final URL:', finalUrl);

      // Если все еще на странице логина - значит ошибка
      if (finalUrl.includes('/login')) {
        console.error('Still on login page - authentication failed');

        // Проверим есть ли сообщение об ошибке
        const errorMessage = await this.page.evaluate(() => {
          const errorEl = document.querySelector('[class*="error"], [class*="alert"]');
          return errorEl ? errorEl.textContent : 'Unknown error';
        });

        console.error('Login error message:', errorMessage);
        this.isAuthenticated = false;
        return false;
      }

      // Проверяем, что мы на странице кабинета
      const isLoggedIn = await this.page.evaluate(() => {
        // Ищем признаки успешного входа
        const hasMenu = document.querySelector('[class*="menu"], nav, aside');
        const hasContent = document.querySelector('[class*="content"], main');
        const bodyText = document.body.innerText.toLowerCase();
        const hasKeywords = bodyText.includes('товар') || bodyText.includes('заказ') || bodyText.includes('управление');
        return !!(hasMenu || (hasContent && hasKeywords));
      });

      if (isLoggedIn) {
        this.isAuthenticated = true;
        console.log('Successfully logged in to Kaspi Merchant Cabinet');
        return true;
      } else {
        console.error('Login verification failed - dashboard elements not found');
        return false;
      }
    } catch (error) {
      console.error('Login failed:', error);
      this.isAuthenticated = false;

      // Сохраним скриншот для отладки
      if (this.page) {
        await this.page.screenshot({
          path: 'kaspi-login-error.png',
          fullPage: true
        });
        console.log('Screenshot saved to kaspi-login-error.png');
      }

      return false;
    }
  }

  /**
   * Проверка авторизации
   */
  private ensureAuthenticated(): void {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated. Call login() first.');
    }
    if (!this.page) {
      throw new Error('Browser not initialized.');
    }
  }

  /**
   * Изменение цены товара
   */
  async updateProductPrice(update: ProductPriceUpdate): Promise<boolean> {
    this.ensureAuthenticated();

    try {
      console.log(`Updating price for product: ${update.name} (${update.sku})`);

      // Переход в раздел товаров
      await this.page!.goto('https://kaspi.kz/merchantcabinet/#/products', {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      // Поиск товара по SKU или названию
      const searchInput = await this.page!.waitForSelector('input[type="search"], input[placeholder*="Поиск"]', {
        timeout: 10000,
      });

      await searchInput.fill(update.sku || update.name);
      await this.page!.waitForTimeout(1000);
      await searchInput.press('Enter');

      // Ждем результатов поиска
      await this.page!.waitForTimeout(2000);

      // Находим товар в списке и кликаем на него
      const productRow = await this.page!.waitForSelector(`tr:has-text("${update.sku}"), tr:has-text("${update.name}")`, {
        timeout: 10000,
      });

      await productRow.click();

      // Ждем открытия карточки товара
      await this.page!.waitForTimeout(1500);

      // Находим поле цены и меняем значение
      const priceInput = await this.page!.waitForSelector('input[type="number"]:near(:text("Цена")), input[name*="price"]', {
        timeout: 10000,
      });

      await priceInput.fill('');
      await priceInput.fill(update.newPrice.toString());

      await this.page!.waitForTimeout(500);

      // Сохраняем изменения
      const saveButton = await this.page!.waitForSelector('button:has-text("Сохранить"), button[type="submit"]', {
        timeout: 10000,
      });

      await saveButton.click();

      // Ждем подтверждения сохранения
      await this.page!.waitForTimeout(2000);

      console.log(`Price updated successfully for ${update.sku}: ${update.newPrice}`);
      return true;
    } catch (error) {
      console.error(`Failed to update price for ${update.sku}:`, error);

      if (this.page) {
        await this.page.screenshot({
          path: `kaspi-price-error-${update.sku}.png`,
          fullPage: true
        });
      }

      return false;
    }
  }

  /**
   * Обновление остатков товара
   */
  async updateProductStock(update: ProductStockUpdate): Promise<boolean> {
    this.ensureAuthenticated();

    try {
      console.log(`Updating stock for product: ${update.name} (${update.sku})`);

      await this.page!.goto('https://kaspi.kz/merchantcabinet/#/products', {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      // Поиск товара
      const searchInput = await this.page!.waitForSelector('input[type="search"], input[placeholder*="Поиск"]', {
        timeout: 10000,
      });

      await searchInput.fill(update.sku || update.name);
      await this.page!.waitForTimeout(1000);
      await searchInput.press('Enter');
      await this.page!.waitForTimeout(2000);

      // Клик на товар
      const productRow = await this.page!.waitForSelector(`tr:has-text("${update.sku}"), tr:has-text("${update.name}")`, {
        timeout: 10000,
      });

      await productRow.click();
      await this.page!.waitForTimeout(1500);

      // Обновление остатков
      const stockInput = await this.page!.waitForSelector('input[type="number"]:near(:text("Остаток")), input[name*="stock"], input[name*="quantity"]', {
        timeout: 10000,
      });

      await stockInput.fill('');
      await stockInput.fill(update.newStock.toString());
      await this.page!.waitForTimeout(500);

      // Сохранение
      const saveButton = await this.page!.waitForSelector('button:has-text("Сохранить"), button[type="submit"]', {
        timeout: 10000,
      });

      await saveButton.click();
      await this.page!.waitForTimeout(2000);

      console.log(`Stock updated successfully for ${update.sku}: ${update.newStock}`);
      return true;
    } catch (error) {
      console.error(`Failed to update stock for ${update.sku}:`, error);

      if (this.page) {
        await this.page.screenshot({
          path: `kaspi-stock-error-${update.sku}.png`,
          fullPage: true
        });
      }

      return false;
    }
  }

  /**
   * Добавление нового товара
   */
  async addNewProduct(product: NewProduct): Promise<boolean> {
    this.ensureAuthenticated();

    try {
      console.log(`Adding new product: ${product.name}`);

      await this.page!.goto('https://kaspi.kz/merchantcabinet/#/products', {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      // Нажимаем кнопку "Добавить товар"
      const addButton = await this.page!.waitForSelector('button:has-text("Добавить"), button:has-text("Создать")');
      await addButton.click();
      await this.page!.waitForTimeout(2000);

      // Заполняем название
      const nameInput = await this.page!.waitForSelector('input[name*="name"], input[placeholder*="Название"]');
      await nameInput.fill(product.name);
      await this.page!.waitForTimeout(300);

      // Заполняем описание
      if (product.description) {
        const descInput = await this.page!.waitForSelector('textarea[name*="description"], textarea[placeholder*="Описание"]');
        await descInput.fill(product.description);
        await this.page!.waitForTimeout(300);
      }

      // Заполняем цену
      const priceInput = await this.page!.waitForSelector('input[name*="price"]');
      await priceInput.fill(product.price.toString());
      await this.page!.waitForTimeout(300);

      // Заполняем остаток
      const stockInput = await this.page!.waitForSelector('input[name*="stock"], input[name*="quantity"]');
      await stockInput.fill(product.stock.toString());
      await this.page!.waitForTimeout(300);

      // Выбираем категорию (упрощенная версия)
      if (product.category) {
        const categorySelect = await this.page!.waitForSelector('select[name*="category"], input[name*="category"]');
        await categorySelect.click();
        await this.page!.waitForTimeout(500);

        // Попытка найти и выбрать категорию
        const categoryOption = await this.page!.waitForSelector(`option:has-text("${product.category}"), li:has-text("${product.category}")`);
        await categoryOption.click();
        await this.page!.waitForTimeout(300);
      }

      // Загрузка изображений (если есть)
      if (product.images && product.images.length > 0) {
        const fileInput = await this.page!.waitForSelector('input[type="file"]');

        for (const imagePath of product.images) {
          await fileInput.setInputFiles(imagePath);
          await this.page!.waitForTimeout(1000);
        }
      }

      // Сохраняем товар
      const saveButton = await this.page!.waitForSelector('button:has-text("Сохранить"), button:has-text("Создать"), button[type="submit"]');
      await saveButton.click();

      // Ждем подтверждения
      await this.page!.waitForTimeout(3000);

      console.log(`Product added successfully: ${product.name}`);
      return true;
    } catch (error) {
      console.error(`Failed to add product ${product.name}:`, error);

      if (this.page) {
        await this.page.screenshot({
          path: `kaspi-add-product-error.png`,
          fullPage: true
        });
      }

      return false;
    }
  }

  /**
   * Управление предзаказом товара
   */
  async configurePreOrder(config: PreOrderConfig): Promise<boolean> {
    this.ensureAuthenticated();

    try {
      console.log(`Configuring pre-order for product: ${config.sku}`);

      await this.page!.goto('https://kaspi.kz/merchantcabinet/#/products', {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      // Поиск товара
      const searchInput = await this.page!.waitForSelector('input[type="search"]');
      await searchInput.fill(config.sku);
      await this.page!.waitForTimeout(1000);
      await searchInput.press('Enter');
      await this.page!.waitForTimeout(2000);

      // Открываем товар
      const productRow = await this.page!.waitForSelector(`tr:has-text("${config.sku}")`);
      await productRow.click();
      await this.page!.waitForTimeout(1500);

      // Находим чекбокс или переключатель предзаказа
      const preOrderToggle = await this.page!.waitForSelector('input[type="checkbox"]:near(:text("Предзаказ")), label:has-text("Предзаказ")');

      const isChecked = await preOrderToggle.isChecked();

      if (config.enabled && !isChecked) {
        await preOrderToggle.click();
      } else if (!config.enabled && isChecked) {
        await preOrderToggle.click();
      }

      await this.page!.waitForTimeout(500);

      // Если нужно указать дату доступности
      if (config.enabled && config.availableFrom) {
        const dateInput = await this.page!.waitForSelector('input[type="date"]:near(:text("Дата")), input[name*="availableFrom"]');
        await dateInput.fill(config.availableFrom);
        await this.page!.waitForTimeout(300);
      }

      // Сохраняем
      const saveButton = await this.page!.waitForSelector('button:has-text("Сохранить")');
      await saveButton.click();
      await this.page!.waitForTimeout(2000);

      console.log(`Pre-order configured for ${config.sku}: ${config.enabled}`);
      return true;
    } catch (error) {
      console.error(`Failed to configure pre-order for ${config.sku}:`, error);

      if (this.page) {
        await this.page.screenshot({
          path: `kaspi-preorder-error-${config.sku}.png`,
          fullPage: true
        });
      }

      return false;
    }
  }

  /**
   * Массовое обновление цен
   */
  async bulkUpdatePrices(updates: ProductPriceUpdate[]): Promise<{ success: string[]; failed: string[] }> {
    const results = { success: [] as string[], failed: [] as string[] };

    for (const update of updates) {
      try {
        const success = await this.updateProductPrice(update);
        if (success) {
          results.success.push(update.sku);
        } else {
          results.failed.push(update.sku);
        }

        // Небольшая пауза между операциями
        await this.page!.waitForTimeout(1000);
      } catch (error) {
        console.error(`Error updating ${update.sku}:`, error);
        results.failed.push(update.sku);
      }
    }

    return results;
  }

  /**
   * Массовое обновление остатков
   */
  async bulkUpdateStock(updates: ProductStockUpdate[]): Promise<{ success: string[]; failed: string[] }> {
    const results = { success: [] as string[], failed: [] as string[] };

    for (const update of updates) {
      try {
        const success = await this.updateProductStock(update);
        if (success) {
          results.success.push(update.sku);
        } else {
          results.failed.push(update.sku);
        }

        await this.page!.waitForTimeout(1000);
      } catch (error) {
        console.error(`Error updating stock for ${update.sku}:`, error);
        results.failed.push(update.sku);
      }
    }

    return results;
  }

  /**
   * Сохранение сессии (cookies) для повторного использования
   */
  async saveSession(path: string = './kaspi-session.json'): Promise<void> {
    if (!this.context) {
      throw new Error('No active session to save');
    }

    const cookies = await this.context.cookies();
    const fs = await import('fs/promises');
    await fs.writeFile(path, JSON.stringify(cookies, null, 2));
    console.log(`Session saved to ${path}`);
  }

  /**
   * Загрузка сохраненной сессии
   */
  async loadSession(path: string = './kaspi-session.json'): Promise<boolean> {
    try {
      if (!this.context) {
        throw new Error('Browser not initialized');
      }

      const fs = await import('fs/promises');
      const cookiesString = await fs.readFile(path, 'utf-8');
      const cookies = JSON.parse(cookiesString);

      await this.context.addCookies(cookies);
      this.isAuthenticated = true;

      console.log('Session loaded successfully');
      return true;
    } catch (error) {
      console.error('Failed to load session:', error);
      return false;
    }
  }

  /**
   * Получение списка товаров через Kaspi API (быстрый метод)
   */
  async getProducts(): Promise<any[]> {
    this.ensureAuthenticated();

    try {
      console.log('Getting products via Kaspi API...');

      // Получаем cookies из браузера
      const cookies = await this.context!.cookies();
      const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

      // Извлекаем merchant ID
      await this.page!.goto('https://kaspi.kz/mc/', { waitUntil: 'domcontentloaded', timeout: 15000 });
      await this.page!.waitForTimeout(2000);

      const merchantId = await this.page!.evaluate(() => {
        const match = document.body.innerHTML.match(/merchantUid["\s:]+(\d+)/);
        return match ? match[1] : '4929016';
      });

      console.log(`Using merchant ID: ${merchantId}`);

      // Получаем все товары через API
      const { KaspiAPIClient } = await import('./api-client');
      const apiClient = new KaspiAPIClient(cookieString, merchantId);

      const products = await apiClient.getAllProducts();

      console.log(`Successfully fetched ${products.length} products via API`);
      return products;

    } catch (error) {
      console.error('Failed to get products via API:', error);
      throw error;
    }
  }

  /**
   * Закрытие браузера и освобождение ресурсов
   */
  async close(): Promise<void> {
    try {
      if (this.page) {
        await this.page.close();
      }
      if (this.context) {
        await this.context.close();
      }
      if (this.browser) {
        await this.browser.close();
      }

      this.page = null;
      this.context = null;
      this.browser = null;
      this.isAuthenticated = false;

      console.log('Browser closed successfully');
    } catch (error) {
      console.error('Error closing browser:', error);
    }
  }
}
