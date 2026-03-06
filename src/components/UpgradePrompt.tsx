'use client';

import Link from 'next/link';
import { PLAN_NAMES } from '@/lib/plan-limits';

interface UpgradePromptProps {
  requiredPlan: 'business' | 'pro';
  featureName: string;
}

export default function UpgradePrompt({ requiredPlan, featureName }: UpgradePromptProps) {
  const planName = PLAN_NAMES[requiredPlan];

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {featureName}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          Эта функция доступна на тарифе <span className="font-semibold text-gray-700 dark:text-gray-300">«{planName}»</span> и выше.
        </p>
        <Link
          href="/app/subscription"
          className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
          Улучшить тариф
        </Link>
      </div>
    </div>
  );
}
