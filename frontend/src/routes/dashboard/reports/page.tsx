import { useState, useEffect } from "react";
import {
  BarChart2, TrendingUp, DollarSign, Users, Plane,
  Download, FileText, RefreshCw, ArrowUpRight, ArrowDownRight,
  Minus, CreditCard, Activity
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
  CartesianGrid
} from "recharts";
import { useTheme } from "../../../contexts/theme-context";
import toast from "react-hot-toast";

const API = "https://steve-airways.onrender.com";
const COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899", "#14b8a6"];

type Totals = {
  currency: string;
  total_bookings: number;
  total_revenue: number;
  avg_booking_value: number;
  total_passengers: number;
};

type ReportData = {
  by_month: any[];
  by_type: any[];
  by_route: any[];
  by_payment: any[];
  by_status: any[];
  totals: Totals[];
};

const fmt = (n: number, cur: string) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: cur, maximumFractionDigits: 2 }).format(n || 0);

const fmtShort = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return String(n);
};

const MONTH_LABELS: Record<string, string> = {
  "01": "Jan", "02": "Fev", "03": "Mar", "04": "Avr", "05": "Mai", "06": "Jun",
  "07": "Jul", "08": "Aou", "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec"
};

function formatMonth(m: string) {
  if (!m) return m;
  const parts = m.split("-");
  return (MONTH_LABELS[parts[1]] || parts[1]) + " " + parts[0];
}

const STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirme", pending: "En attente", cancelled: "Annule",
  completed: "Termine", boarded: "Embarque"
};

function TicketIcon({ size, className }: { size: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
      <path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/>
    </svg>
  );
}

export default function ReportsPage() {
  const { theme } = useTheme();
  const dark = theme === "dark";

  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 6);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [typeVol, setTypeVol] = useState("");
  const [currency, setCurrency] = useState("USD");

  const token = localStorage.getItem("token");

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ start_date: startDate, end_date: endDate });
      if (typeVol) params.set("type_vol", typeVol);
      if (currency) params.set("currency", currency);
      const res = await fetch(`${API}/api/reports/financial?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      setData(d);
    } catch {
      toast.error("Impossible de charger les rapports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReports(); }, []);

  const totals: Partial<Totals> = data?.totals?.find((t) => t.currency === currency) || {};
  const byMonth = (data?.by_month || [])
    .filter((m) => !currency || m.currency === currency)
    .map((m) => ({ ...m, month: formatMonth(m.month), revenue: Number(m.revenue) || 0, bookings: Number(m.bookings) || 0 }));
  const byType = (data?.by_type || [])
    .filter((t) => !currency || t.currency === currency)
    .map((t) => ({ ...t, revenue: Number(t.revenue) || 0, bookings: Number(t.bookings) || 0 }));
  const byRoute = (data?.by_route || [])
    .filter((r) => !currency || r.currency === currency)
    .map((r) => ({ ...r, revenue: Number(r.revenue) || 0, bookings: Number(r.bookings) || 0, route: r.departure + " > " + r.destination }));
  const byPayment = (data?.by_payment || [])
    .filter((p) => !currency || p.currency === currency)
    .map((p) => ({ ...p, amount: Number(p.amount) || 0, count: Number(p.count) || 0 }));
  const byStatus = (data?.by_status || [])
    .map((s) => ({ ...s, count: Number(s.count) || 0, name: STATUS_LABELS[s.status] || s.status }));

  const growthPct = (() => {
    if (byMonth.length < 2) return null;
    const half = Math.floor(byMonth.length / 2);
    const first = byMonth.slice(0, half).reduce((s, m) => s + m.revenue, 0);
    const second = byMonth.slice(half).reduce((s, m) => s + m.revenue, 0);
    if (!first) return null;
    return ((second - first) / first) * 100;
  })();

  const cardBg = dark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200";
  const textMain = dark ? "text-white" : "text-gray-900";
  const textSub = dark ? "text-slate-400" : "text-gray-500";
  const inputCls = `rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${dark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-gray-300 text-gray-900"}`;
  const tooltipStyle = { background: dark ? "#1e293b" : "#fff", border: "1px solid #334155", borderRadius: 8, fontSize: 12 };
  const axisColor = dark ? "#94a3b8" : "#64748b";
  const gridColor = dark ? "#1e293b" : "#f1f5f9";

  const exportCSV = () => {
    if (!data) return toast.error("Aucune donnee a exporter");
    const rows: string[] = [];
    rows.push("=== TOTAUX ===");
    rows.push("Devise,Revenus,Reservations,Passagers,Valeur Moy.");
    (data.totals || []).forEach(t =>
      rows.push(`${t.currency},${Number(t.total_revenue).toFixed(2)},${t.total_bookings},${t.total_passengers},${Number(t.avg_booking_value).toFixed(2)}`)
    );
    rows.push("\n=== REVENUS PAR MOIS ===");
    rows.push("Mois,Devise,Revenus,Reservations");
    (data.by_month || []).forEach(m =>
      rows.push(`${m.month},${m.currency},${Number(m.revenue).toFixed(2)},${m.bookings}`)
    );
    rows.push("\n=== REVENUS PAR TYPE ===");
    rows.push("Type,Devise,Revenus,Reservations");
    (data.by_type || []).forEach(t =>
      rows.push(`${t.type_vol},${t.currency},${Number(t.revenue).toFixed(2)},${t.bookings}`)
    );
    rows.push("\n=== TOP ROUTES ===");
    rows.push("Depart,Destination,Devise,Revenus,Reservations");
    (data.by_route || []).forEach(r =>
      rows.push(`${r.departure},${r.destination},${r.currency},${Number(r.revenue).toFixed(2)},${r.bookings}`)
    );
    rows.push("\n=== PAIEMENTS ===");
    rows.push("Methode,Devise,Montant,Nb");
    (data.by_payment || []).forEach(p =>
      rows.push(`${p.payment_method},${p.currency},${Number(p.amount).toFixed(2)},${p.count}`)
    );
    const blob = new Blob(["﻿" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rapport-financier-${startDate}-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Rapport CSV exporte !");
  };

  const exportPDF = () => window.print();

  const totalRevenue = Number(totals.total_revenue || 0);
  const totalBookings = Number(totals.total_bookings || 0);
  const totalPassengers = Number(totals.total_passengers || 0);
  const avgValue = Number(totals.avg_booking_value || 0);

  const StatCard = ({ icon: Icon, label, value, sub, color, trend }: any) => (
    <div className={`rounded-2xl border p-5 ${cardBg} relative overflow-hidden`}>
      <div className="absolute top-0 right-0 w-24 h-24 opacity-5 rounded-full -translate-y-6 translate-x-6 bg-blue-500" />
      <div className="flex items-start justify-between mb-3">
        <p className={`text-sm font-medium ${textSub}`}>{label}</p>
        <div className={`p-2 rounded-xl bg-gradient-to-br ${color}`}>
          <Icon size={16} className="text-white" />
        </div>
      </div>
      <p className={`text-2xl font-bold ${textMain} mb-1`}>{value}</p>
      {sub && <p className={`text-xs ${textSub}`}>{sub}</p>}
      {trend != null && (
        <div className={`mt-2 flex items-center gap-1 text-xs font-semibold ${trend > 0 ? "text-green-500" : trend < 0 ? "text-red-500" : "text-gray-400"}`}>
          {trend > 0 ? <ArrowUpRight size={12} /> : trend < 0 ? <ArrowDownRight size={12} /> : <Minus size={12} />}
          {Math.abs(trend).toFixed(1)}% tendance
        </div>
      )}
    </div>
  );

  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      ` }} />

      <div className={`p-6 space-y-6`}>

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 shadow-lg shadow-blue-500/20">
              <BarChart2 className="text-white" size={22} />
            </div>
            <div>
              <h1 className={`text-2xl font-bold ${textMain}`}>Rapports Financiers</h1>
              <p className={`text-sm ${textSub}`}>{startDate} au {endDate} · {currency}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 no-print">
            <button onClick={exportCSV}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${dark ? "border-slate-600 text-slate-300 hover:bg-slate-700" : "border-gray-300 text-gray-600 hover:bg-gray-100"}`}>
              <Download size={15} /> Excel / CSV
            </button>
            <button onClick={exportPDF}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-medium hover:opacity-90 shadow-md shadow-blue-500/20">
              <FileText size={15} /> PDF
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className={`rounded-2xl border p-4 flex flex-wrap gap-3 items-end ${cardBg} no-print`}>
          <div>
            <label className={`block text-xs font-semibold mb-1 ${textSub}`}>Debut</label>
            <input type="date" className={inputCls} value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className={`block text-xs font-semibold mb-1 ${textSub}`}>Fin</label>
            <input type="date" className={inputCls} value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <div>
            <label className={`block text-xs font-semibold mb-1 ${textSub}`}>Type de vol</label>
            <select className={inputCls} value={typeVol} onChange={e => setTypeVol(e.target.value)}>
              <option value="">Tous</option>
              <option value="plane">Avion</option>
              <option value="helicopter">Helicoptere</option>
              <option value="charter">Charter</option>
            </select>
          </div>
          <div>
            <label className={`block text-xs font-semibold mb-1 ${textSub}`}>Devise</label>
            <select className={inputCls} value={currency} onChange={e => setCurrency(e.target.value)}>
              <option value="USD">USD $</option>
              <option value="HTG">HTG G</option>
            </select>
          </div>
          <button onClick={fetchReports}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 shadow-md shadow-blue-500/20">
            <RefreshCw size={14} /> Generer
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
            <p className={`text-sm ${textSub}`}>Chargement du rapport...</p>
          </div>
        ) : !data ? (
          <div className={`rounded-2xl border p-12 text-center ${cardBg}`}>
            <BarChart2 size={48} className={`mx-auto mb-4 ${textSub}`} />
            <p className={textSub}>Aucune donnee disponible</p>
          </div>
        ) : (
          <div className="space-y-6">

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={DollarSign} label={"Revenus totaux (" + currency + ")"} value={fmt(totalRevenue, currency)} sub={"Sur " + totalBookings + " reservations"} color="from-blue-500 to-blue-600" trend={growthPct} />
              <StatCard icon={TicketIcon} label="Reservations" value={totalBookings.toLocaleString("fr-FR")} sub={byStatus.find((s: any) => s.status === "confirmed") ? byStatus.find((s: any) => s.status === "confirmed")!.count + " confirmees" : undefined} color="from-purple-500 to-purple-600" />
              <StatCard icon={Users} label="Passagers transportes" value={totalPassengers.toLocaleString("fr-FR")} sub={totalBookings ? "~" + (totalPassengers / totalBookings).toFixed(1) + " par vol" : undefined} color="from-emerald-500 to-emerald-600" />
              <StatCard icon={TrendingUp} label={"Valeur moy. (" + currency + ")"} value={fmt(avgValue, currency)} sub={byMonth.length > 0 ? "Sur " + byMonth.length + " mois" : undefined} color="from-orange-500 to-orange-600" />
            </div>

            {/* Revenue by Month */}
            {byMonth.length > 0 && (
              <div className={`rounded-2xl border p-6 ${cardBg}`}>
                <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                  <div>
                    <h2 className={`font-bold text-base ${textMain}`}>Evolution des revenus mensuels</h2>
                    <p className={`text-xs ${textSub} mt-0.5`}>Revenus encaisses et volume de reservations</p>
                  </div>
                  {growthPct != null && (
                    <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold ${growthPct >= 0 ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
                      {growthPct >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                      {Math.abs(growthPct).toFixed(1)}% croissance
                    </div>
                  )}
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={byMonth} margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradBook" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => fmtShort(v)} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                    <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#3b82f6" fill="url(#gradRev)" strokeWidth={2.5} name={"Revenus (" + currency + ")"} dot={{ fill: "#3b82f6", r: 3 }} />
                    <Area yAxisId="right" type="monotone" dataKey="bookings" stroke="#8b5cf6" fill="url(#gradBook)" strokeWidth={2} strokeDasharray="5 3" name="Reservations" dot={{ fill: "#8b5cf6", r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* By Type + By Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {byType.length > 0 && (
                <div className={`rounded-2xl border p-6 ${cardBg}`}>
                  <h2 className={`font-bold text-base mb-1 ${textMain}`}>Revenus par type de vol</h2>
                  <p className={`text-xs ${textSub} mb-5`}>Comparaison des segments d'activite</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={byType} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                      <XAxis dataKey="type_vol" tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => fmtShort(v)} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [fmt(Number(v), currency), "Revenus"]} />
                      <Bar dataKey="revenue" radius={[8, 8, 0, 0]} name={"Revenus (" + currency + ")"} maxBarSize={60}>
                        {byType.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex gap-2 mt-4 flex-wrap">
                    {byType.map((t: any, i: number) => (
                      <div key={i} className={`flex-1 min-w-[80px] rounded-xl p-3 text-center ${dark ? "bg-slate-700/40" : "bg-gray-50"}`}>
                        <div className="w-2 h-2 rounded-full mx-auto mb-1" style={{ background: COLORS[i % COLORS.length] }} />
                        <p className={`text-xs capitalize font-medium ${textMain}`}>{t.type_vol || "---"}</p>
                        <p className="text-xs text-blue-500 font-semibold">{t.bookings} res.</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {byStatus.length > 0 ? (
                <div className={`rounded-2xl border p-6 ${cardBg}`}>
                  <h2 className={`font-bold text-base mb-1 ${textMain}`}>Statut des reservations</h2>
                  <p className={`text-xs ${textSub} mb-5`}>Repartition par etat de reservation</p>
                  <div className="flex items-center">
                    <ResponsiveContainer width="50%" height={200}>
                      <PieChart>
                        <Pie data={byStatus} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45} paddingAngle={3}>
                          {byStatus.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-2 pl-2">
                      {byStatus.map((s: any, i: number) => {
                        const total = byStatus.reduce((acc: number, x: any) => acc + x.count, 0);
                        const pct = total ? ((s.count / total) * 100).toFixed(0) : "0";
                        return (
                          <div key={i} className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-center">
                                <span className={`text-xs truncate ${textMain}`}>{s.name}</span>
                                <span className={`text-xs font-bold ml-1 ${textSub}`}>{pct}%</span>
                              </div>
                              <div className={`h-1 rounded-full mt-0.5 ${dark ? "bg-slate-700" : "bg-gray-100"}`}>
                                <div className="h-1 rounded-full" style={{ width: pct + "%", background: COLORS[i % COLORS.length] }} />
                              </div>
                            </div>
                            <span className={`text-xs font-semibold ${textMain} flex-shrink-0`}>{s.count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className={`rounded-2xl border p-6 flex items-center justify-center ${cardBg}`}>
                  <div className="text-center">
                    <Activity size={32} className={`mx-auto mb-2 ${textSub}`} />
                    <p className={`text-sm ${textSub}`}>Donnees de statut non disponibles</p>
                  </div>
                </div>
              )}
            </div>

            {/* Top Routes */}
            {byRoute.length > 0 && (
              <div className={`rounded-2xl border p-6 ${cardBg}`}>
                <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                  <div>
                    <h2 className={`font-bold text-base ${textMain}`}>Top Routes Rentables</h2>
                    <p className={`text-xs ${textSub} mt-0.5`}>Classement par revenus generes</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-semibold ${dark ? "bg-blue-500/10 text-blue-400" : "bg-blue-50 text-blue-600"}`}>
                    <Plane size={10} className="inline mr-1" />{byRoute.length} routes
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className={dark ? "bg-slate-700/50" : "bg-gray-50"}>
                          <th className={`px-3 py-2 text-left font-semibold ${textSub}`}>#</th>
                          <th className={`px-3 py-2 text-left font-semibold ${textSub}`}>Route</th>
                          <th className={`px-3 py-2 text-right font-semibold ${textSub}`}>Res.</th>
                          <th className={`px-3 py-2 text-right font-semibold ${textSub}`}>Revenus</th>
                        </tr>
                      </thead>
                      <tbody>
                        {byRoute.map((r: any, i: number) => {
                          const maxRev = byRoute[0]?.revenue || 1;
                          const pct = ((r.revenue / maxRev) * 100).toFixed(0);
                          return (
                            <tr key={i} className={`border-t ${dark ? "border-slate-700 hover:bg-slate-700/30" : "border-gray-100 hover:bg-gray-50"}`}>
                              <td className={`px-3 py-2 font-bold ${textSub}`}>{i + 1}</td>
                              <td className={`px-3 py-2 font-medium ${textMain}`}>
                                <div className="flex items-center gap-1">
                                  <Plane size={10} style={{ color: COLORS[i % COLORS.length] }} />
                                  {r.departure} &rarr; {r.destination}
                                </div>
                                <div className={`h-0.5 rounded-full mt-1 ${dark ? "bg-slate-700" : "bg-gray-100"}`}>
                                  <div className="h-0.5 rounded-full" style={{ width: pct + "%", background: COLORS[i % COLORS.length] }} />
                                </div>
                              </td>
                              <td className={`px-3 py-2 text-right ${textSub}`}>{r.bookings}</td>
                              <td className="px-3 py-2 text-right font-bold text-blue-500">{fmt(r.revenue, currency)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className={`border-t-2 ${dark ? "border-slate-600" : "border-gray-200"}`}>
                          <td colSpan={2} className={`px-3 py-2 font-bold text-xs ${textMain}`}>Total affiche</td>
                          <td className={`px-3 py-2 text-right font-bold text-xs ${textMain}`}>{byRoute.reduce((s: number, r: any) => s + r.bookings, 0)}</td>
                          <td className="px-3 py-2 text-right font-bold text-xs text-blue-500">{fmt(byRoute.reduce((s: number, r: any) => s + r.revenue, 0), currency)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <ResponsiveContainer width="100%" height={byRoute.length * 38 + 20}>
                    <BarChart data={byRoute} layout="vertical" margin={{ top: 0, right: 70, left: 10, bottom: 0 }}>
                      <XAxis type="number" tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => fmtShort(v)} />
                      <YAxis type="category" dataKey="route" tick={{ fill: axisColor, fontSize: 10 }} axisLine={false} tickLine={false} width={115} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [fmt(Number(v), currency), "Revenus"]} />
                      <Bar dataKey="revenue" radius={[0, 6, 6, 0]} maxBarSize={16} label={{ position: "right", fill: axisColor, fontSize: 9, formatter: (v: any) => fmtShort(Number(v)) }}>
                        {byRoute.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Payment Methods */}
            {byPayment.length > 0 && (
              <div className={`rounded-2xl border p-6 ${cardBg}`}>
                <div className="flex items-center gap-2 mb-5">
                  <CreditCard size={16} className="text-blue-500" />
                  <div>
                    <h2 className={`font-bold text-base ${textMain}`}>Methodes de Paiement</h2>
                    <p className={`text-xs ${textSub}`}>Repartition des transactions par canal</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {byPayment.map((p: any, i: number) => {
                    const totalPay = byPayment.reduce((s: number, x: any) => s + x.amount, 0);
                    const pct = totalPay ? ((p.amount / totalPay) * 100).toFixed(0) : "0";
                    return (
                      <div key={i} className={`p-4 rounded-xl border relative overflow-hidden ${dark ? "bg-slate-700/30 border-slate-600" : "bg-gray-50 border-gray-200"}`}>
                        <div className="absolute bottom-0 left-0 h-1 rounded-b-xl" style={{ width: pct + "%", background: COLORS[i % COLORS.length] }} />
                        <div className="w-8 h-8 rounded-xl mb-3 flex items-center justify-center" style={{ background: COLORS[i % COLORS.length] + "20" }}>
                          <CreditCard size={14} style={{ color: COLORS[i % COLORS.length] }} />
                        </div>
                        <p className={`text-xs capitalize font-semibold ${textMain} mb-1`}>{p.payment_method || "Inconnu"}</p>
                        <p className={`text-xl font-bold ${textMain}`}>{p.count}</p>
                        <p className="text-xs font-medium" style={{ color: COLORS[i % COLORS.length] }}>{fmt(p.amount, currency)}</p>
                        <p className={`text-xs ${textSub} mt-0.5`}>{pct}% du total</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Summary Banner */}
            <div className="rounded-2xl p-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-blue-100">Resume de la periode</p>
                  <p className="text-3xl font-bold mt-1">{fmt(totalRevenue, currency)}</p>
                  <p className="text-sm text-blue-100 mt-1">{totalBookings} reservations · {totalPassengers} passagers</p>
                </div>
                <div className="flex gap-6 flex-wrap">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{fmt(avgValue, currency)}</p>
                    <p className="text-xs text-blue-100">Valeur moy./reservation</p>
                  </div>
                  {byRoute[0] && (
                    <div className="text-center">
                      <p className="text-sm font-bold">{byRoute[0].departure} &rarr; {byRoute[0].destination}</p>
                      <p className="text-xs text-blue-100">Route la + rentable</p>
                    </div>
                  )}
                  {growthPct != null && (
                    <div className="text-center">
                      <p className={`text-2xl font-bold ${growthPct >= 0 ? "text-green-300" : "text-red-300"}`}>
                        {growthPct >= 0 ? "+" : ""}{growthPct.toFixed(1)}%
                      </p>
                      <p className="text-xs text-blue-100">Tendance croissance</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
