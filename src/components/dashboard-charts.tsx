"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const colors = ["#2563EB", "#10B981", "#F59E0B", "#EF4444", "#64748B"];

type Props = {
  trend: { date: string; sales: number }[];
  payments: { name: string; value: number }[];
  topProducts: { name: string; quantity: number }[];
  branches: { name: string; sales: number }[];
};

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="mb-4 text-sm font-semibold text-slate-900">{title}</h2>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
      </div>
    </section>
  );
}

export function DashboardCharts({ trend, payments, topProducts, branches }: Props) {
  const hasSales = trend.some((point) => point.sales > 0);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <ChartCard title="Sales Trend (last 7 days)">
        <AreaChart data={trend} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Area type="monotone" dataKey="sales" stroke="#2563EB" fill="url(#salesFill)" strokeWidth={2} />
        </AreaChart>
      </ChartCard>

      <ChartCard title="Payment Methods">
        <PieChart>
          <Pie data={payments} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} label>
            {payments.map((entry, index) => (
              <Cell key={entry.name} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ChartCard>

      <ChartCard title="Top Products">
        <BarChart data={topProducts} layout="vertical" margin={{ top: 8, right: 12, bottom: 0, left: 40 }}>
          <XAxis type="number" tick={{ fontSize: 11 }} />
          <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="quantity" fill="#10B981" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ChartCard>

      <ChartCard title="Branch Performance">
        <BarChart data={branches} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="sales" fill="#2563EB" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartCard>

      {!hasSales && (
        <p className="text-xs text-slate-400 xl:col-span-2">
          No sales recorded in the last 7 days yet. Charts will fill in as orders are paid.
        </p>
      )}
    </div>
  );
}
