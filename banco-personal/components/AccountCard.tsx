"use client"

import { Account } from "@/lib/data"
import { formatCurrency } from "@/lib/utils"
import { CreditCard, TrendingUp, Wallet } from "lucide-react"

const iconMap = {
  checking: CreditCard,
  savings: Wallet,
  crypto: TrendingUp,
}

export default function AccountCard({ account }: { account: Account }) {
  const Icon = iconMap[account.type as keyof typeof iconMap] || Wallet

  return (
    <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 p-6 border border-slate-700 hover:border-blue-500 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Icon className="w-5 h-5 text-blue-400" />
          </div>
          <span className="text-xs text-slate-400 font-mono">•••• {account.lastFour}</span>
        </div>

        <div className="space-y-1">
          <p className="text-sm text-slate-400">{account.name}</p>
          <p className="text-2xl font-bold text-white">
            {formatCurrency(account.balance, account.currency)}
          </p>
        </div>
      </div>
    </div>
  )
}
