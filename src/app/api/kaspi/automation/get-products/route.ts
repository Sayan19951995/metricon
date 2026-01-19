import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../login/route';
import { validateAndRefreshSession } from '@/lib/kaspi/session-storage';
import { KaspiAPIClient } from '@/lib/kaspi/api-client';

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    console.log('Getting products from Kaspi cabinet...');

    // Используем validateAndRefreshSession для автоматического обновления cookies при необходимости
    const sessionData = await validateAndRefreshSession(sessionId);

    if (sessionData) {
      console.log(
        sessionData.refreshed
          ? 'Using refreshed session cookies (auto-relogin performed)'
          : 'Using saved session cookies (no browser)'
      );

      try {
        const apiClient = new KaspiAPIClient(
          sessionData.cookieString,
          sessionData.merchantId
        );

        const products = await apiClient.getAllProducts();

        return NextResponse.json({
          success: true,
          products,
          message: `Found ${products.length} products`,
          usedSavedSession: true,
          autoReloginPerformed: sessionData.refreshed,
        });
      } catch (error) {
        console.error('Failed to get products using saved session:', error);
        // Продолжаем с fallback на браузер
      }
    }

    // Fallback: используем браузер
    console.log('Fallback to browser-based session');
    const automation = getSession(sessionId);

    if (!automation) {
      return NextResponse.json(
        { success: false, error: 'Session not found or expired' },
        { status: 404 }
      );
    }

    const products = await automation.getProducts();

    if (!products || products.length === 0) {
      return NextResponse.json(
        {
          success: true,
          products: [],
          message: 'No products found',
        }
      );
    }

    return NextResponse.json({
      success: true,
      products,
      message: `Found ${products.length} products`,
      usedSavedSession: false,
    });
  } catch (error: any) {
    console.error('Error getting products:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get products',
      },
      { status: 500 }
    );
  }
}
