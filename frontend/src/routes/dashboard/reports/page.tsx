import { useState, useEffect } from "react";
import { BarChart2, TrendingUp, DollarSign, Users, Plane,  Calendar, Download } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { useTheme } from "../../../contexts/theme-context";
import toast from "react-hot-toast";

const API = "https://steve-airways.onrender.com";
const COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"];

export default function ReportsPage() {
  const { theme } = useTheme();
  const dark = theme === "dark";

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 3);
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
    } catch { toast.error("Impossible de charger les rapports"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchReports(); }, []);

  const totals = data?.totals?.find((t: any) => t.currency === currency) || {};
  const byMonth = data?.byMonth?.filter((m: any) => m.currency === currency || !currency) || [];
  const byType = data?.byType?.filter((t: any) => t.currency === currency) || [];
  const byRoute = data?.byRoute?.filter((r: any) => r.currency === currency) || [];
  const byPayment = data?.byPayment?.filter((p: any) => p.currency === currency) || [];
  const byStatus = data?.byStatus || [];

  const cardBg = dark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200";
  const textMain = dark ? "text-white" : "text-gray-900";
  const textSub = dark ? "text-slate-400" : "text-gray-500";
  const gridBg = dark ? "#1e293b" : "#f8fafc";
  const inputCls = `rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${dark ? "bg-slate-700 border-slate-600 text-white" : "bg-gray-50 border-gray-300 text-gray-900"}`;

  const StatCard = ({ icon: Icon, label, value, color }: any) => (
    <div className={`rounded-2xl border p-5 ${cardBg}`}>
      <div className="flex items-center justify-between mb-3">
        <p className={`text-sm ${textSub}`}>{label}</p>
        <div className={`p-2 rounded-xl bg-gradient-to-r ${color}`}>
          <Icon size={16} className="text-white" />
        </div>
      </div>
      <p className={`text-2xl font-bold ${textMain}`}>{value}</p>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500">
            <BarChart2 className="text-white" size={22} />
          </div>
          <div>
            <h1 className={`text-2xl font-bold ${textMain}`}>Rapports Financiers</h1>
            <p className={`text-sm ${textSub}`}>Analyse détaillée des revenus et réservations</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className={`rounded-2xl border p-4 flex flex-wrap gap-3 items-end ${cardBg}`}>
        <div>
          <label className={`block text-xs font-semibold mb-1 ${textSub}`}>Début</label>
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
            <option value="helicopter">Hélicoptère</option>
            <option value="charter">Charter</option>
          </select>
        </div>
        <div>
          <label className={`block text-xs font-semibold mb-1 ${textSub}`}>Devise</label>
          <select className={inputCls} value={currency} onChange={e => setCurrency(e.target.value)}>
            <option value="USD">USD</option>
            <option value="HTG">HTG</option>
          </select>
        </div>
        <button onClick={fetchReports} className="px-5 py-2 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600">
          Générer le rapport
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={DollarSign} label={`Revenus totaux (${currency})`} value={`${Number(totals.total_revenue || 0).toFixed(2)}`} color="from-blue-500 to-blue-600" />
            <StatCard icon={Ticket} label="Réservations" value={totals.total_bookings || 0} color="from-purple-500 to-purple-600" />
            <StatCard icon={Users} label="Passagers" value={totals.total_passengers || 0} color="from-green-500 to-green-600" />
            <StatCard icon={TrendingUp} label={`Valeur moy. (${currency})`} value={`${Number(totals.avg_booking_value || 0).toFixed(2)}`} color="from-orange-500 to-orange-600" />
          </div>

          {/* Revenue by Month */}
          {byMonth.length > 0 && (
            <div className={`rounded-2xl border p-6 ${cardBg}`}>
              <h2 className={`font-semibold mb-4 ${textMain}`}>Revenus par mois ({currency})</h2>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={byMonth}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fill: dark ? "#94a3b8" : "#64748b", fontSize: 11 }} />
                  <YAxis tick={{ fill: dark ? "#94a3b8" : "#64748b", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: dark ? "#1e293b" : "#fff", border: "1px solid #334155", borderRadius: 8 }} />
                  <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="url(#colorRev)" strokeWidth={2} name={`Revenus (${currency})`} />
                  <Area type="monotone" dataKey="bookings" stroke="#8b5cf6" fill="none" strokeDasharray="4 2" strokeWidth={1.5} name="Réservations" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* By Type */}
            {byType.length > 0 && (
              <div className={`rounded-2xl border p-6 ${cardBg}`}>
                <h2 className={`font-semibold mb-4 ${textMain}`}>Revenus par type de vol</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={byType}>
                    <XAxis dataKey="type_vol" tick={{ fill: dark ? "#94a3b8" : "#64748b", fontSize: 11 }} />
                    <YAxis tick={{ fill: dark ? "#94a3b8" : "#64748b", fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: dark ? "#1e293b" : "#fff", border: "1px solid #334155", borderRadius: 8 }} />
                    <Bar dataKey="revenue" radius={[6, 6, 0, 0]} name={`Revenus (${currency})`}>
                      {byType.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* By Status */}
            {byStatus.length > 0 && (
              <div className={`rounded-2xl border p-6 ${cardBg}`}>
                <h2 className={`font-semibold mb-4 ${textMain}`}>Réservations par statut</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={byStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {byStatus.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: dark ? "#1e293b" : "#fff", border: "1px solid #334155", borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Top Routes */}
          {byRoute.length > 0 && (
            <div className={`rounded-2xl border p-6 ${cardBg}`}>
              <h2 className={`font-semibold mb-4 ${textMain}`}>Top 10 Routes (Revenus)</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={dark ? "bg-slate-700/50" : "bg-gray-50"}>
                      {["Route", "Réservations", `Revenus (${currency})`].map(h => (
                        <th key={h} className={`px-4 py-3 text-left font-semibold text-xs ${textSub}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {byRoute.map((r: any, i: number) => (
                      <tr key={i} className={`border-t ${dark ? "border-slate-700" : "border-gray-100"}`}>
                        <td className={`px-4 py-3 font-medium ${textMain}`}>{r.departure} → {r.destination}</td>
                        <td className={`px-4 py-3 ${textSub}`}>{r.bookings}</td>
                        <td className={`px-4 py-3 font-semibold text-blue-500`}>{Number(r.revenue).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* By Payment */}
          {byPayment.length > 0 && (
            <div className={`rounded-2xl border p-6 ${cardBg}`}>
              <h2 className={`font-semibold mb-4 ${textMain}`}>Répartition par méthode de paiement</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {byPayment.map((p: any, i: number) => (
                  <div key={i} className={`p-4 rounded-xl ${dark ? "bg-slate-700/30" : "bg-gray-50"} text-center`}>
                    <p className={`text-xs ${textSub} capitalize mb-1`}>{p.payment_method || "Inconnu"}</p>
                    <p className={`text-lg font-bold ${textMain}`}>{p.count}</p>
                    <p className={`text-xs text-blue-500`}>{Number(p.amount).toFixed(2)} {currency}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Missing import
function Ticket({ size, className }: { size: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
      <path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/>
    </svg>
  );
}
