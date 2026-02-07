export default function SettingsLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 pt-16 lg:pt-0 lg:pl-64">
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 lg:mb-8">
            <div className="h-8 w-40 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
            <div className="h-4 w-72 bg-gray-200 dark:bg-gray-700 rounded mt-2 animate-pulse" />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm mb-6 lg:mb-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse" />
              <div className="flex-1">
                <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-4 w-36 bg-gray-200 dark:bg-gray-700 rounded mt-2 animate-pulse" />
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded-full mt-2 animate-pulse" />
              </div>
            </div>
          </div>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="mb-6">
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-3 animate-pulse" />
              <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-sm overflow-hidden">
                {[1, 2].map((j) => (
                  <div key={j} className="flex items-center gap-4 p-4 border-b border-gray-50 dark:border-gray-700 last:border-0">
                    <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
                    <div className="flex-1">
                      <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      <div className="h-3 w-48 bg-gray-200 dark:bg-gray-700 rounded mt-1 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
