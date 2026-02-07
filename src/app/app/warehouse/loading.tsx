export default function WarehouseLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="h-8 w-28 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          <div className="h-4 w-52 bg-gray-100 dark:bg-gray-800 rounded animate-pulse mt-2" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-36 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <div className="h-3 w-24 bg-gray-100 dark:bg-gray-700 rounded animate-pulse mb-2" />
            <div className="h-7 w-20 bg-gray-200 dark:bg-gray-600 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <div className="h-10 w-64 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
        </div>
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border-b border-gray-50 dark:border-gray-700 last:border-0">
            <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-lg animate-pulse" />
            <div className="flex-1">
              <div className="h-4 w-40 bg-gray-200 dark:bg-gray-600 rounded animate-pulse mb-1" />
              <div className="h-3 w-24 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
            </div>
            <div className="h-4 w-16 bg-gray-200 dark:bg-gray-600 rounded animate-pulse" />
            <div className="h-6 w-20 bg-gray-100 dark:bg-gray-700 rounded-full animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
