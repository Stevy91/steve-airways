import { useState, useEffect, useCallback } from "react";
import { Users, Search, ChevronLeft, ChevronRight, Plane,  ExternalLink } from "lucide-react";
import { useTheme } from "../../../contexts/theme-context";
import { useAuth } from "../../../hooks/useAuth";
import toast from "react-hot-toast";

const API = "https://steve-airways.onrender.com";

type Passenger = {
  id: number;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  passport_number: string;
  nationality: string;
  seat_number: string;
  booking_reference: string;
  booking_status: string;
  type_vol: string;
  flight_number: string;
  departure_time: string;
  from: string;
  to: string;
};

export default function PassengersPage() {
  const { theme } = useTheme();
  const { isAdmin } = useAuth();
  const dark = theme === "dark";

  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const token = localStorage.getItem("token");

  const fetchPassengers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("q", search);
      const res = await fetch(`${API}/api/passengers?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setPassengers(data.passengers || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch { toast.error("Erreur de chargement"); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchPassengers(); }, [fetchPassengers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const statusColor = (s: string) => {
    if (s === "confirmed") return "bg-green-500/10 text-green-500";
    if (s === "cancelled" || s === "refunded") return "bg-red-500/10 text-red-500";
    if (s === "pending") return "bg-yellow-500/10 text-yellow-500";
    return "bg-gray-500/10 text-gray-500";
  };

  const cardBg = dark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200";
  const textMain = dark ? "text-white" : "text-gray-900";
  const textSub = dark ? "text-slate-400" : "text-gray-500";
  const inputCls = `rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${dark ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400" : "bg-gray-50 border-gray-300 text-gray-900"}`;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500">
            <Users className="text-white" size={22} />
          </div>
          <div>
            <h1 className={`text-2xl font-bold ${textMain}`}>Gestion des Passagers</h1>
            <p className={`text-sm ${textSub}`}>{total} passager(s) au total</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className={`flex items-center gap-3 rounded-xl border px-4 py-2 ${cardBg}`}>
        <Search size={18} className={textSub} />
        <input type="text" placeholder="Nom, passeport, nationalité, référence..."
          value={searchInput} onChange={e => setSearchInput(e.target.value)}
          className={`flex-1 bg-transparent outline-none text-sm ${textMain}`} />
        <button type="submit" className="px-4 py-1.5 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600">Rechercher</button>
        {search && <button type="button" onClick={() => { setSearch(""); setSearchInput(""); setPage(1); }} className={`text-xs ${textSub} hover:text-red-400`}>Effacer</button>}
      </form>

      {/* Table */}
      <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={dark ? "bg-slate-700/50" : "bg-gray-50"}>
                  {["Passager", "Passeport", "Nationalité", "Réservation", "Vol", "Statut", "Siège"].map(h => (
                    <th key={h} className={`px-4 py-3 text-left font-semibold text-xs ${textSub}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {passengers.length === 0 ? (
                  <tr><td colSpan={7} className={`text-center py-12 ${textSub}`}>Aucun passager trouvé</td></tr>
                ) : passengers.map((p) => (
                  <tr key={p.id} className={`border-t transition-colors ${dark ? "border-slate-700 hover:bg-slate-700/30" : "border-gray-100 hover:bg-gray-50"}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                          {(p.first_name?.[0] || "?").toUpperCase()}
                        </div>
                        <div>
                          <p className={`font-medium ${textMain}`}>{p.first_name} {p.last_name}</p>
                          {p.date_of_birth && <p className={`text-xs ${textSub}`}>{new Date(p.date_of_birth).toLocaleDateString('fr-FR')}</p>}
                        </div>
                      </div>
                    </td>
                    <td className={`px-4 py-3 font-mono text-xs ${textMain}`}>{p.passport_number || "—"}</td>
                    <td className={`px-4 py-3 ${textSub}`}>{p.nationality || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="text-blue-500 font-mono text-xs">{p.booking_reference}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {p.type_vol === "helicopter" ? <Plane size={12} className="text-purple-500" /> : <Plane size={12} className="text-blue-500" />}
                        <span className={`text-xs ${textSub}`}>{p.from} → {p.to}</span>
                      </div>
                      {p.flight_number && <p className={`text-xs font-mono ${textSub}`}>{p.flight_number}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor(p.booking_status)}`}>
                        {p.booking_status || "—"}
                      </span>
                    </td>
                    <td className={`px-4 py-3 font-semibold ${textMain}`}>{p.seat_number || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={`flex items-center justify-between px-4 py-3 border-t ${dark ? "border-slate-700" : "border-gray-100"}`}>
            <p className={`text-xs ${textSub}`}>Page {page} / {totalPages} — {total} passager(s)</p>
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
