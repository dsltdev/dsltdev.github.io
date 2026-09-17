import Hero3D from "@/components/Hero3D"
import AccountCard from "@/components/AccountCard"
import TransactionList from "@/components/TransactionList"
import BudgetOverview from "@/components/BudgetOverview"
import FinanceChart from "@/components/FinanceChart"
import StatsGrid from "@/components/StatsGrid"
import { accounts, transactions, budgets, chartData } from "@/lib/data"
import { formatCurrency } from "@/lib/utils"
import { Wallet, TrendingUp, TrendingDown, Activity } from "lucide-react"

export default function Home() {
  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0)
  
  const thisMonthIncome = transactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0)
  
  const thisMonthExpenses = Math.abs(
    transactions
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0)
  )

  const statsData = [
    {
      title: "Balance Total",
      value: formatCurrency(totalBalance),
      change: "+12.5%",
      trend: "up" as const,
      iconType: "wallet" as const,
    },
    {
      title: "Ingresos del Mes",
      value: formatCurrency(thisMonthIncome),
      change: "+18.2%",
      trend: "up" as const,
      iconType: "trendingUp" as const,
    },
    {
      title: "Gastos del Mes",
      value: formatCurrency(thisMonthExpenses),
      change: "-8.1%",
      trend: "down" as const,
      iconType: "trendingDown" as const,
    },
    {
      title: "Balance Mes",
      value: formatCurrency(thisMonthIncome - thisMonthExpenses),
      change: "+42.3%",
      trend: "up" as const,
      iconType: "activity" as const,
    },
  ]

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 backdrop-blur-sm bg-slate-950/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Mi Banco Personal
              </h1>
              <p className="text-sm text-slate-400">Dashboard Financiero</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-xs text-slate-400">David López</p>
                <p className="text-xs text-slate-500">david@dsltdev.com</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center font-semibold">
                DL
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero 3D */}
        <Hero3D totalBalance={totalBalance} />

        {/* Stats Grid */}
        <StatsGrid stats={statsData} />

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Cuentas */}
            <section>
              <h2 className="text-xl font-semibold mb-4 text-white">Mis Cuentas</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {accounts.map((account) => (
                  <AccountCard key={account.id} account={account} />
                ))}
              </div>
            </section>

            {/* Gráfico */}
            <section className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4 text-white">Ingresos vs Gastos</h2>
              <FinanceChart data={chartData} />
            </section>

            {/* Transacciones */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Transacciones Recientes</h2>
                <button className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                  Ver todas →
                </button>
              </div>
              <TransactionList transactions={transactions.slice(0, 6)} />
            </section>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Presupuestos */}
            <section className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-6 text-white">Presupuestos del Mes</h2>
              <BudgetOverview budgets={budgets} />
            </section>

            {/* Quick Actions */}
            <section className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4 text-white">Acciones Rápidas</h2>
              <div className="space-y-2">
                <button className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors">
                  Agregar Transacción
                </button>
                <button className="w-full py-3 px-4 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-colors">
                  Conectar Cuenta
                </button>
                <button className="w-full py-3 px-4 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-colors">
                  Exportar Datos
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-slate-500">
            Construido con Next.js + React Three Fiber | © 2026 David López
          </p>
        </div>
      </footer>
    </main>
  )
}
