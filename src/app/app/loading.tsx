export default function DashboardLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header skeleton */}
      <div className="flex justify-between items-start gap-4 mb-6 lg:mb-8">
        <div>
          <div className="h-8 w-40 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          <div className="h-4 w-64 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse mt-2" />
        </div>
        <div className="flex gap-2">
          <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
          <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
        </div>
      </div>

      {/* Cards grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-4">
        {/* Sales chart skeleton */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg animate-pulse" />
            <div className="flex-1">
              <div className="h-3 w-24 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-6 w-36 bg-gray-200 dark:bg-gray-600 rounded animate-pulse mt-1" />
            </div>
          </div>
          <div className="h-[140px] lg:h-[180px] bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
        </div>

        {/* Payments skeleton */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg animate-pulse" />
            <div className="flex-1">
              <div className="h-3 w-28 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-6 w-40 bg-gray-200 dark:bg-gray-600 rounded animate-pulse mt-1" />
            </div>
          </div>
          <div className="h-[120px] lg:h-[160px] bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
        </div>

        {/* Month stats skeleton */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg animate-pulse" />
            <div className="flex-1">
              <div className="h-3 w-32 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-6 w-44 bg-gray-200 dark:bg-gray-600 rounded animate-pulse mt-1" />
            </div>
          </div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex justify-between">
                <div className="h-3 w-20 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-3 w-16 bg-gray-200 dark:bg-gray-600 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Top products skeleton */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg animate-pulse" />
            <div className="flex-1">
              <div className="h-3 w-24 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-6 w-28 bg-gray-200 dark:bg-gray-600 rounded animate-pulse mt-1" />
            </div>
          </div>
          <div className="space-y-2.5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-600 animate-pulse" />
                <div className="flex-1 h-3 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-3 w-12 bg-gray-200 dark:bg-gray-600 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick actions skeleton */}
      <div className="mt-4 lg:mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gray-200 dark:bg-gray-600 rounded-lg animate-pulse" />
            <div className="flex-1">
              <div className="h-4 w-16 bg-gray-200 dark:bg-gray-600 rounded animate-pulse" />
              <div className="h-3 w-24 bg-gray-100 dark:bg-gray-700 rounded animate-pulse mt-1 hidden sm:block" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
