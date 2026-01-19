/**
 * Тестовый скрипт для проверки автоматизации Kaspi
 *
 * Запуск:
 * npx tsx scripts/test-kaspi-automation.ts
 */

import { KaspiAutomation } from '../lib/kaspi/automation';
import * as dotenv from 'dotenv';

// Загружаем переменные окружения
dotenv.config({ path: '.env.local' });

async function testAutomation() {
  const username = process.env.KASPI_MERCHANT_USERNAME;
  const password = process.env.KASPI_MERCHANT_PASSWORD;

  if (!username || !password) {
    console.error('❌ Ошибка: KASPI_MERCHANT_USERNAME и KASPI_MERCHANT_PASSWORD должны быть установлены в .env.local');
    process.exit(1);
  }

  console.log('🤖 Начинаем тестирование автоматизации Kaspi...\n');

  const automation = new KaspiAutomation({
    username,
    password,
  });

  try {
    // 1. Инициализация браузера
    console.log('📦 Инициализация браузера...');
    await automation.init(false); // headless: false чтобы видеть процесс
    console.log('✅ Браузер инициализирован\n');

    // 2. Авторизация
    console.log('🔐 Авторизация в личном кабинете Kaspi...');
    const loginSuccess = await automation.login();

    if (!loginSuccess) {
      console.error('❌ Авторизация не удалась!');
      console.log('💡 Проверьте:');
      console.log('   - Правильность логина/пароля в .env.local');
      console.log('   - Скриншот: kaspi-login-error.png');
      process.exit(1);
    }

    console.log('✅ Успешная авторизация!\n');

    // 3. Сохранение сессии
    console.log('💾 Сохранение сессии...');
    await automation.saveSession('./sessions/test-session.json');
    console.log('✅ Сессия сохранена\n');

    // Пауза для просмотра
    console.log('⏸️  Пауза 5 секунд для просмотра кабинета...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 4. Тестирование обновления цены (закомментировано для безопасности)
    /*
    console.log('💰 Тестирование обновления цены...');
    const priceUpdateResult = await automation.updateProductPrice({
      sku: 'TEST-SKU-001',
      name: 'Тестовый товар',
      newPrice: 9990,
    });

    if (priceUpdateResult) {
      console.log('✅ Цена обновлена успешно!\n');
    } else {
      console.log('⚠️  Не удалось обновить цену (возможно товар не найден)\n');
    }
    */

    console.log('\n✅ Тест завершен успешно!');
    console.log('📝 Результаты:');
    console.log('   - Авторизация: OK');
    console.log('   - Сохранение сессии: OK');
    console.log('   - Сессия сохранена в: ./sessions/test-session.json');
    console.log('\n💡 Советы:');
    console.log('   - Раскомментируйте тесты обновления цен/остатков для проверки');
    console.log('   - Используйте тестовые товары для проверки');
    console.log('   - Проверьте документацию в docs/kaspi-automation.md');

  } catch (error) {
    console.error('\n❌ Ошибка во время теста:', error);
    console.log('\n💡 Для отладки проверьте:');
    console.log('   - Скриншоты ошибок (kaspi-*.png)');
    console.log('   - Логи выше');
    console.log('   - Селекторы в lib/kaspi/automation.ts');
  } finally {
    console.log('\n🧹 Закрытие браузера...');
    await automation.close();
    console.log('✅ Браузер закрыт\n');
  }
}

// Тест загрузки сохраненной сессии
async function testSessionLoading() {
  console.log('\n🔄 Тестирование загрузки сохраненной сессии...\n');

  const username = process.env.KASPI_MERCHANT_USERNAME;
  const password = process.env.KASPI_MERCHANT_PASSWORD;

  if (!username || !password) {
    console.error('❌ Credentials не найдены');
    return;
  }

  const automation = new KaspiAutomation({ username, password });

  try {
    console.log('📦 Инициализация браузера...');
    await automation.init(true); // headless mode

    console.log('💾 Загрузка сохраненной сессии...');
    const sessionLoaded = await automation.loadSession('./sessions/test-session.json');

    if (sessionLoaded) {
      console.log('✅ Сессия загружена успешно!');
      console.log('💡 Можно использовать automation без повторной авторизации');
    } else {
      console.log('⚠️  Сессия не загружена (файл не найден или устарел)');
    }

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await automation.close();
  }
}

// Главная функция
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--test-session')) {
    await testSessionLoading();
  } else {
    await testAutomation();
  }
}

// Запуск
main().catch(console.error);
