import { NextRequest, NextResponse } from 'next/server';
import { KaspiAutomation } from '@/lib/kaspi/automation';
import {
  saveSession,
  loadSession,
  findSessionByUsername,
  decryptPassword,
  updateSessionCookies,
} from '@/lib/kaspi/session-storage';

// Хранилище активных сессий в памяти (для быстрого доступа)
const sessions = new Map<string, KaspiAutomation>();

export async function POST(request: NextRequest) {
  try {
    console.log('=== Login API called ===');
    const { username, password, sessionId, headless = true } = await request.json();

    console.log('Username provided:', username ? 'Yes' : 'No');
    console.log('Password provided:', password ? 'Yes' : 'No');
    console.log('Headless mode:', headless);

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Проверяем, есть ли уже сохраненная сессия для этого пользователя
    const existingSession = await findSessionByUsername(username);

    if (existingSession) {
      console.log(`Found existing session for ${username}, attempting to reuse...`);

      // Пытаемся использовать сохраненные cookies
      try {
        // Проверяем валидность cookies
        const cookieString = existingSession.session.cookies
          .map((c: any) => `${c.name}=${c.value}`)
          .join('; ');

        // Пробуем сделать тестовый запрос
        const testResponse = await fetch(
          `https://mc.shop.kaspi.kz/merchant-nct/mc/nct/kassa-status?m=${existingSession.session.merchantId || '4929016'}`,
          {
            headers: {
              Cookie: cookieString,
              Accept: 'application/json',
              Referer: 'https://kaspi.kz/',
            },
          }
        );

        if (testResponse.ok) {
          console.log('Saved cookies are still valid, reusing session');
          return NextResponse.json({
            success: true,
            sessionId: existingSession.sessionId,
            message: 'Using saved session',
            reused: true,
          });
        } else {
          console.log('Saved cookies expired, creating new session');
        }
      } catch (error) {
        console.log('Failed to validate saved cookies:', error);
      }
    }

    // Создаем новую сессию
    console.log('Creating new automation session');

    const automation = new KaspiAutomation({ username, password });

    console.log('Initializing browser...');
    await automation.init(headless);

    console.log('Browser initialized, attempting login...');
    const loginSuccess = await automation.login();

    if (!loginSuccess) {
      console.error('Login failed - authentication unsuccessful');
      await automation.close();
      return NextResponse.json(
        { error: 'Login failed. Check credentials.' },
        { status: 401 }
      );
    }

    console.log('Login successful, saving session...');

    // Получаем cookies и merchant ID
    const cookies = await automation['context']!.cookies();

    let merchantId: string | undefined;
    try {
      await automation['page']!.goto('https://kaspi.kz/mc/', { waitUntil: 'domcontentloaded' });
      merchantId = await automation['page']!.evaluate(() => {
        const match = document.body.innerHTML.match(/merchantUid["\s:]+(\d+)/);
        return match ? match[1] : undefined;
      });
    } catch (error) {
      console.log('Failed to extract merchant ID:', error);
    }

    // Сохраняем сессию в файл
    const id = await saveSession(username, password, cookies, merchantId);

    // Сохраняем в памяти
    sessions.set(id, automation);

    console.log('Session saved successfully');

    return NextResponse.json({
      success: true,
      sessionId: id,
      message: 'Successfully logged in to Kaspi Merchant Cabinet',
      reused: false,
    });
  } catch (error: any) {
    console.error('=== Login error ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Stack trace:', error.stack);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}

// Проверка статуса сессии
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const automation = sessions.get(sessionId);

    if (!automation) {
      return NextResponse.json(
        { error: 'Session not found', active: false },
        { status: 404 }
      );
    }

    return NextResponse.json({
      active: true,
      sessionId,
    });
  } catch (error: any) {
    console.error('Session check error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// Закрытие сессии
export async function DELETE(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const automation = sessions.get(sessionId);

    if (automation) {
      await automation.close();
      sessions.delete(sessionId);
    }

    return NextResponse.json({
      success: true,
      message: 'Session closed successfully',
    });
  } catch (error: any) {
    console.error('Session close error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// Экспортируем функции для получения и удаления сессии (для использования в других роутах)
export function getSession(sessionId: string): KaspiAutomation | undefined {
  return sessions.get(sessionId);
}

export function removeSession(sessionId: string): void {
  sessions.delete(sessionId);
}
