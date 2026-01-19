import { NextRequest, NextResponse } from 'next/server';
import { getSession, removeSession } from '../login/route';

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const automation = getSession(sessionId);

    if (automation) {
      await automation.close();
      removeSession(sessionId);
      console.log(`Session ${sessionId} closed and removed`);
    }

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error: any) {
    console.error('Error during logout:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to logout',
      },
      { status: 500 }
    );
  }
}
