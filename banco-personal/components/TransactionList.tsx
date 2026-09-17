"use client"

import { Transaction } from "@/lib/data"
import { formatCurrency, formatDate, cn } from "@/lib/utils"
import { ArrowDownRight, ArrowUpRight } from "lucide-react"

export default function TransactionList({ transactions }: { transactions: Transaction[] }) {
  return (
    <div className="space-y-2">
      {transactions.map((transaction) => (
        <div
          key={transaction.id}
          className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className={cn(
              "p-2 rounded-full",
              transaction.type === "income" 
                ? "bg-green-500/20 text-green-400" 
                : "bg-red-500/20 text-red-400"
            )}>
              {transaction.type === "income" ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )}
            </div>
            
            <div>
              <p className="text-sm font-medium text-white">{transaction.description}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-slate-400">{transaction.category}</span>
                <span className="text-xs text-slate-500">•</span>
                <span className="text-xs text-slate-400">{formatDate(transaction.date)}</span>
              </div>
            </div>
          </div>

          <p className={cn(
            "text-lg font-semibold",
            transaction.type === "income" ? "text-green-400" : "text-red-400"
          )}>
            {transaction.type === "income" ? "+" : ""}
            {formatCurrency(Math.abs(transaction.amount))}
          </p>
        </div>
      ))}
    </div>
  )
}
