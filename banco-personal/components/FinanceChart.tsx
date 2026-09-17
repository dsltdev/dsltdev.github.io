"use client"

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { formatCurrency } from "@/lib/utils"

interface ChartDataPoint {
  month: string
  gastos: number
  ingresos: number
}

export default function FinanceChart({ data }: { data: ChartDataPoint[] }) {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl">
          <p className="text-sm text-slate-300 mb-2">{payload[0].payload.month}</p>
          <div className="space-y-1">
            <p className="text-sm">
              <span className="text-green-400">Ingresos:</span>{" "}
              <span className="font-semibold text-white">
                {formatCurrency(payload[1].value)}
              </span>
            </p>
            <p className="text-sm">
              <span className="text-red-400">Gastos:</span>{" "}
              <span className="font-semibold text-white">
                {formatCurrency(payload[0].value)}
              </span>
            </p>
            <p className="text-sm pt-1 border-t border-slate-700">
              <span className="text-blue-400">Balance:</span>{" "}
              <span className="font-semibold text-white">
                {formatCurrency(payload[1].value - payload[0].value)}
              </span>
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
        <XAxis
          dataKey="month"
          stroke="#94a3b8"
          style={{ fontSize: "12px" }}
        />
        <YAxis
          stroke="#94a3b8"
          style={{ fontSize: "12px" }}
          tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ paddingTop: "20px" }}
          iconType="circle"
        />
        <Area
          type="monotone"
          dataKey="gastos"
          stroke="#ef4444"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorGastos)"
          name="Gastos"
        />
        <Area
          type="monotone"
          dataKey="ingresos"
          stroke="#10b981"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorIngresos)"
          name="Ingresos"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
