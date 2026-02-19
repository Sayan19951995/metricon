export default function ProductsSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-start gap-4 mb-6">
        <div>
          <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          <div className="h-4 w-52 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse mt-2" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-9 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          <div className="h-9 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-3 animate-pulse">
            <div className="h-3 w-12 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
            <div className="h-6 w-8 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        ))}
      </div>

      {/* Filters bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm mb-4 flex gap-3">
        <div className="flex-1 h-9 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
        <div className="h-9 w-28 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-4 gap-4 px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          {['w-32', 'w-20', 'w-16', 'w-16'].map((w, i) => (
            <div key={i} className={`h-3 ${w} bg-gray-200 dark:bg-gray-600 rounded animate-pulse`} />
          ))}
        </div>
        {[...Array(8)].map((_, rowIdx) => (
          <div key={rowIdx} className="grid grid-cols-4 gap-4 px-4 py-4 border-b border-gray-50 dark:border-gray-700/50 items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
                <div className="h-2.5 w-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              </div>
            </div>
            <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-4 w-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-5 w-12 bg-gray-100 dark:bg-gray-700 rounded-full animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
