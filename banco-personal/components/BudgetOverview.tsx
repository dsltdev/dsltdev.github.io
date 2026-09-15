"use client"

import { Budget } from "@/lib/data"
import { formatCurrency } from "@/lib/utils"

export default function BudgetOverview({ budgets }: { budgets: Budget[] }) {
  return (
    <div className="space-y-6">
      {budgets.map((budget) => {
        const percentage = (budget.spent / budget.limit) * 100
        const isOverBudget = percentage > 100

        return (
          <div key={budget.category} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-300">{budget.category}</span>
              <span className="text-sm text-slate-400">
                {formatCurrency(budget.spent)} / {formatCurrency(budget.limit)}
              </span>
            </div>

            <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(percentage, 100)}%`,
                  backgroundColor: isOverBudget ? "#ef4444" : budget.color,
                }}
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className={isOverBudget ? "text-red-400" : "text-slate-500"}>
                {percentage.toFixed(0)}% usado
              </span>
              <span className="text-slate-500">
                {formatCurrency(budget.limit - budget.spent)} disponible
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
