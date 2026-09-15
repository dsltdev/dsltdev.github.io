export interface Transaction {
  id: string
  description: string
  amount: number
  category: string
  date: string
  type: "income" | "expense"
  account: string
}

export interface Account {
  id: string
  name: string
  type: string
  balance: number
  currency: string
  lastFour: string
}

export interface Budget {
  category: string
  spent: number
  limit: number
  color: string
}

export const accounts: Account[] = [
  {
    id: "1",
    name: "Bancolombia Corriente",
    type: "checking",
    balance: 8_450_000,
    currency: "COP",
    lastFour: "1234",
  },
  {
    id: "2",
    name: "Nequi",
    type: "savings",
    balance: 2_150_000,
    currency: "COP",
    lastFour: "5678",
  },
  {
    id: "3",
    name: "Binance",
    type: "crypto",
    balance: 1_200_000,
    currency: "COP",
    lastFour: "9012",
  },
]

export const transactions: Transaction[] = [
  {
    id: "1",
    description: "Proyecto freelance - Wompi Integration",
    amount: 3_500_000,
    category: "Ingresos",
    date: "2026-09-15",
    type: "income",
    account: "Bancolombia",
  },
  {
    id: "2",
    description: "Arriendo apartamento",
    amount: -2_200_000,
    category: "Vivienda",
    date: "2026-09-14",
    type: "expense",
    account: "Bancolombia",
  },
  {
    id: "3",
    description: "Éxito - Mercado",
    amount: -450_000,
    category: "Alimentación",
    date: "2026-09-13",
    type: "expense",
    account: "Nequi",
  },
  {
    id: "4",
    description: "Netflix subscription",
    amount: -42_000,
    category: "Entretenimiento",
    date: "2026-09-12",
    type: "expense",
    account: "Bancolombia",
  },
  {
    id: "5",
    description: "Uber - Centro a casa",
    amount: -18_500,
    category: "Transporte",
    date: "2026-09-12",
    type: "expense",
    account: "Nequi",
  },
  {
    id: "6",
    description: "Café y coworking",
    amount: -85_000,
    category: "Trabajo",
    date: "2026-09-11",
    type: "expense",
    account: "Nequi",
  },
  {
    id: "7",
    description: "Consultoría Stripe - Cliente USA",
    amount: 2_800_000,
    category: "Ingresos",
    date: "2026-09-10",
    type: "income",
    account: "Bancolombia",
  },
  {
    id: "8",
    description: "AWS hosting",
    amount: -125_000,
    category: "Trabajo",
    date: "2026-09-09",
    type: "expense",
    account: "Bancolombia",
  },
]

export const budgets: Budget[] = [
  {
    category: "Vivienda",
    spent: 2_200_000,
    limit: 2_500_000,
    color: "#3b82f6",
  },
  {
    category: "Alimentación",
    spent: 850_000,
    limit: 1_200_000,
    color: "#10b981",
  },
  {
    category: "Transporte",
    spent: 320_000,
    limit: 500_000,
    color: "#f59e0b",
  },
  {
    category: "Entretenimiento",
    spent: 180_000,
    limit: 300_000,
    color: "#8b5cf6",
  },
  {
    category: "Trabajo",
    spent: 410_000,
    limit: 800_000,
    color: "#ec4899",
  },
]

export const chartData = [
  { month: "Abril", gastos: 3_200_000, ingresos: 4_500_000 },
  { month: "Mayo", gastos: 2_800_000, ingresos: 5_200_000 },
  { month: "Junio", gastos: 3_500_000, ingresos: 4_800_000 },
  { month: "Julio", gastos: 3_100_000, ingresos: 6_100_000 },
  { month: "Agosto", gastos: 2_900_000, ingresos: 5_500_000 },
  { month: "Sep", gastos: 2_995_500, ingresos: 6_300_000 },
]
