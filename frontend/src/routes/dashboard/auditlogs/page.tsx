import { useState, useEffect, useCallback } from "react";
import { ClipboardList, Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { useTheme } from "../../../contexts/theme-context";
import toast from "react-hot-toast";

const API = "https://steve-airways.onrender.com";

type Log = {
  id: number;
  user_id: number;
  user_name: string;
  agent_name: string;   // nom résolu via JOIN users
  action: string;
  entity_type: string;
  entity_id: string;
  details: string;
  ip_address: string;
  created_at: string;
};

const ACTION_COLORS: Record<string, string> = {
  CREATE_LOCATION: "bg-green-500/10 text-green-500",
  UPDATE_LOCATION: "bg-blue-500/10 text-blue-500",
  DELETE_LOCATION: "bg-red-500/10 text-red-500",
  MANUAL_BOOKING: "bg-purple-500/10 text-purple-500",
  REFUND: "bg-orange-500/10 text-orange-500",
  UPDATE_PROFILE: "bg-cyan-500/10 text-cyan-500",
  UPDATE_SETTINGS: "bg-yellow-500/10 text-yellow-500",
  UPDATE_ROLE: "bg-pink-500/10 text-pink-500",
  CREATE_PROMO: "bg-emerald-500/10 text-emerald-500",
  UPDATE_PROMO: "bg-teal-500/10 text-teal-500",
  DELETE_PROMO: "bg-rose-500/10 text-rose-500",
};

export default function AuditLogsPage() {
  const { theme } = useTheme();
  const dark = theme === "dark";

  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ action: "", entity_type: "", start_date: "", end_date: "" });
  const [showFilters, setShowFilters] = useState(false);

  const token = localStorage.getItem("token");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "30" });
      if (filters.action) params.set("action", filters.action);
      if (filters.entity_type) params.set("entity_type", filters.entity_type);
      if (filters.start_date) params.set("start_date", filters.start_date);
      if (filters.end_date) params.set("end_date", filters.end_date);
      const res = await fetch(`${API}/api/audit-logs?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch { toast.error("Impossible de charger les logs"); }
    finally { setLoading(false); }
  }, [page, filters]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const cardBg = dark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200";
  const textMain = dark ? "text-white" : "text-gray-900";
  const textSub = dark ? "text-slate-400" : "text-gray-500";
  const inputCls = `rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${dark ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400" : "bg-gray-50 border-gray-300 text-gray-900"}`;

  const actionLabel = (a: string) => a.replace(/_/g, " ");
  const actionColor = (a: string) => ACTION_COLORS[a] || "bg-gray-500/10 text-gray-500";

  const entityTypes = ["location", "booking", "user", "settings", "promo_code"];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-r from-slate-500 to-slate-700">
            <ClipboardList className="text-white" size={22} />
          </div>
          <div>
            <h1 className={`text-2xl font-bold ${textMain}`}>Journal d'Audit</h1>
            <p className={`text-sm ${textSub}`}>{total} événement(s) enregistré(s)</p>
          </div>
        </div>
        <button onClick={() => setShowFilters(s => !s)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium ${dark ? "border-slate-600 text-slate-300 hover:bg-slate-700" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}>
          <Filter size={16} /> Filtres
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className={`rounded-2xl border p-4 grid grid-cols-2 md:grid-cols-4 gap-3 ${cardBg}`}>
          <div>
            <label className={`block text-xs font-semibold mb-1 ${textSub}`}>Action</label>
            <input className={inputCls} placeholder="Ex: REFUND" value={filters.action} onChange={e => setFilters(f => ({ ...f, action: e.target.value }))} />
          </div>
          <div>
            <label className={`block text-xs font-semibold mb-1 ${textSub}`}>Type d'entité</label>
            <select className={inputCls} value={filters.entity_type} onChange={e => setFilters(f => ({ ...f, entity_type: e.target.value }))}>
              <option value="">Tous</option>
              {entityTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className={`block text-xs font-semibold mb-1 ${textSub}`}>Début</label>
            <input type="date" className={inputCls} value={filters.start_date} onChange={e => setFilters(f => ({ ...f, start_date: e.target.value }))} />
          </div>
          <div>
            <label className={`block text-xs font-semibold mb-1 ${textSub}`}>Fin</label>
            <input type="date" className={inputCls} value={filters.end_date} onChange={e => setFilters(f => ({ ...f, end_date: e.target.value }))} />
          </div>
          <div className="col-span-2 md:col-span-4 flex gap-2">
            <button onClick={() => { setPage(1); fetchLogs(); }} className="px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600">Appliquer</button>
            <button onClick={() => { setFilters({ action: "", entity_type: "", start_date: "", end_date: "" }); setPage(1); }} className={`px-4 py-2 rounded-xl border text-sm font-medium ${dark ? "border-slate-600 text-slate-300" : "border-gray-300 text-gray-600"}`}>Réinitialiser</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={dark ? "bg-slate-700/50" : "bg-gray-50"}>
                  {["Date/Heure", "Utilisateur", "Action", "Entité", "ID Entité", "Détails", "IP"].map(h => (
                    <th key={h} className={`px-4 py-3 text-left font-semibold text-xs ${textSub}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr><td colSpan={7} className={`text-center py-12 ${textSub}`}>Aucun log trouvé</td></tr>
                ) : logs.map((log) => (
                  <tr key={log.id} className={`border-t ${dark ? "border-slate-700 hover:bg-slate-700/30" : "border-gray-100 hover:bg-gray-50"}`}>
                    <td className={`px-4 py-3 text-xs ${textSub} whitespace-nowrap`}>
                      {new Date(log.created_at).toLocaleString('fr-FR')}
                    </td>
                    <td className="px-4 py-3">
                      <p className={`font-medium text-xs ${textMain}`}>{log.agent_name || log.user_name || "—"}</p>
                      <p className={`text-xs ${textSub}`}>ID: {log.user_id || "—"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${actionColor(log.action)}`}>
                        {actionLabel(log.action)}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-xs capitalize ${textSub}`}>{log.entity_type || "—"}</td>
                    <td className={`px-4 py-3 font-mono text-xs ${textMain}`}>{log.entity_id || "—"}</td>
                    <td className={`px-4 py-3 text-xs ${textSub} max-w-xs truncate`} title={log.details}>{log.details || "—"}</td>
                    <td className={`px-4 py-3 font-mono text-xs ${textSub}`}>{log.ip_address || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={`flex items-center justify-between px-4 py-3 border-t ${dark ? "border-slate-700" : "border-gray-100"}`}>
            <p className={`text-xs ${textSub}`}>Page {page} / {totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className={`p-2 rounded-lg disabled:opacity-40 ${dark ? "hover:bg-slate-700 text-slate-300" : "hover:bg-gray-100 text-gray-600"}`}>
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className={`p-2 rounded-lg disabled:opacity-40 ${dark ? "hover:bg-slate-700 text-slate-300" : "hover:bg-gray-100 text-gray-600"}`}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
