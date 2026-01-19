interface DashboardCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  trend?: 'up' | 'down';
}

export default function DashboardCard({
  title,
  value,
  change,
  icon,
  trend,
}: DashboardCardProps) {
  return (
    <div className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6 hover:border-blue-500/50 transition-all duration-200">
      {/* Иконка */}
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-lg flex items-center justify-center">
          <div className="text-blue-400">
            {icon}
          </div>
        </div>

        {change !== undefined && (
          <div className={`flex items-center gap-1 text-sm font-medium ${
            trend === 'up' ? 'text-green-400' : 'text-red-400'
          }`}>
            {trend === 'up' ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            )}
            <span>{Math.abs(change)}%</span>
          </div>
        )}
      </div>

      {/* Значение */}
      <div>
        <h3 className="text-3xl font-bold text-white mb-1">{value}</h3>
        <p className="text-slate-400 text-sm">{title}</p>
      </div>
    </div>
  );
}
