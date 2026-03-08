export type StatCardProps = {
  value: string | number
  label: string
  className?: string
  valueClassName?: string
  labelClassName?: string
}

export function StatCard({ value, label, className = '', valueClassName = '', labelClassName = '' }: StatCardProps) {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <span className={`text-2xl font-bold text-gray-800 dark:text-gray-200 ${valueClassName}`}>{value}</span>
      <span className={`text-sm text-gray-500 dark:text-gray-400 ${labelClassName}`}>{label}</span>
    </div>
  )
}

export type StatsRowProps = {
  stats: Array<{ value: string | number; label: string }>
  className?: string
}

export function StatsRow({ stats, className = '' }: StatsRowProps) {
  return (
    <div className={`card flex rounded-xl bg-white p-4 opacity-50 transition-colors duration-300 dark:bg-gray-800 ${className}`}>
      {stats.map((stat, index) => (
        <StatCard key={index} value={stat.value} label={stat.label} />
      ))}
    </div>
  )
}
