"use client"

import { TrendingUp, TrendingDown, Wallet, Activity } from "lucide-react"

type IconType = "wallet" | "trendingUp" | "trendingDown" | "activity"

interface Stat {
  title: string
  value: string
  change: string
  trend: "up" | "down"
  iconType: IconType
}

const iconMap = {
  wallet: Wallet,
  trendingUp: TrendingUp,
  trendingDown: TrendingDown,
  activity: Activity,
}

export default function StatsGrid({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
        const Icon = iconMap[stat.iconType]
        const TrendIcon = stat.trend === "up" ? TrendingUp : TrendingDown
        const trendColor = stat.trend === "up" ? "text-green-400" : "text-red-400"

        return (
          <div
            key={index}
            className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 p-6 border border-slate-700"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Icon className="w-5 h-5 text-blue-400" />
              </div>
              <div className={`flex items-center gap-1 text-sm ${trendColor}`}>
                <TrendIcon className="w-4 h-4" />
                <span>{stat.change}</span>
              </div>
            </div>

            <div>
              <p className="text-sm text-slate-400 mb-1">{stat.title}</p>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
