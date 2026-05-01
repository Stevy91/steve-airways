import { useState, useEffect, useCallback } from "react";
import {
  Users, Search, Plane, CheckCircle2, Clock, UserCheck,
  Printer, ChevronDown, ChevronUp, Edit2, X, Check,
  AlertCircle, Calendar, Filter
} from "lucide-react";
import { useTheme } from "../../../contexts/theme-context";
import toast from "react-hot-toast";

const API = "https://steve-airways.onrender.com";

type PassengerRow = {
  id: number;
  first_name: string;
  last_name: string;
  passport_number: string;
  nationality: string;
  seat_number: string;
  gender: string;
  title: string;
  checked_in: boolean;
  checked_in_at: string | null;
  checked_in_by: string | null;
  booking_reference: string;
  booking_status: string;
  contact_email: string;
  contact_phone: string;
  total_price: number;
  currency: string;
};

type Flight = {
  flight_id: number;
  flight_number: string;
  departure_time: string;
  arrival_time: string;
  from_city: string;
  from_code: string;
  to_city: string;
  to_code: string;
  type_vol: string;
  total_passengers: number;
  checked_in_count: number;
  passengers: PassengerRow[];
};

export default function PassengersPage() {
  const { theme } = useTheme();
  const dark = theme === "dark";

  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);
  const [seatModal, setSeatModal] = useState<{ open: boolean; passenger: PassengerRow | null }>({ open: false, passenger: null });
  const [seatInput, setSeatInput] = useState("");

  const token = localStorage.getItem("token");

  const fetchFlights = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const params = new URLSearchParams();
      if (dateFilter) params.set("date", dateFilter);
      if (search) params.set("q", search);
      if (typeFilter) params.set("type_vol", typeFilter);
      const res = await fetch(`${API}/api/passengers/by-flight?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        const errMsg = data?.details || data?.error || `Erreur serveur (${res.status})`;
        setApiError(errMsg);
        setFlights([]);
        return;
      }
      setFlights(data.flights || []);
      // Ouvrir tous les vols par défaut si peu de résultats
      if ((data.flights || []).length <= 3) {
        setExpanded(new Set((data.flights || []).map((f: Flight) => f.flight_id)));
      }
    } catch (err: any) {
      const msg = err?.message || "Erreur de chargement";
      setApiError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [dateFilter, search, typeFilter]);

  useEffect(() => { fetchFlights(); }, [fetchFlights]);

  const toggleExpand = (id: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleCheckin = async (passenger: PassengerRow, value: boolean) => {
    setSavingId(passenger.id);
    try {
      const res = await fetch(`${API}/api/passengers/${passenger.id}/checkin`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ checked_in: value }),
      });
      if (!res.ok) throw new Error();
      toast.success(value ? `✅ ${passenger.first_name} ${passenger.last_name} enregistré` : `↩️ Enregistrement annulé`);
      fetchFlights();
    } catch {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSavingId(null);
    }
  };

  const handleAssignSeat = async () => {
    if (!seatModal.passenger || !seatInput.trim()) return;
    setSavingId(seatModal.passenger.id);
    try {
      const res = await fetch(`${API}/api/passengers/${seatModal.passenger.id}/seat`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ seat_number: seatInput }),
      });
      if (!res.ok) throw new Error();
      toast.success(`✅ Siège ${seatInput.toUpperCase()} assigné`);
      setSeatModal({ open: false, passenger: null });
      setSeatInput("");
      fetchFlights();
    } catch {
      toast.error("Erreur lors de l'assignation du siège");
    } finally {
      setSavingId(null);
    }
  };

  const handlePrintTicket = (p: PassengerRow, flight: Flight) => {
    const dep = new Date(flight.departure_time);
    const arr = new Date(flight.arrival_time);
    const fmt = (d: Date) => d.toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<title>Billet — ${p.first_name} ${p.last_name}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Segoe UI', sans-serif; background:#f0f4f8; display:flex; justify-content:center; padding:30px; }
  .ticket { background:white; border-radius:16px; overflow:hidden; width:680px; box-shadow:0 8px 40px rgba(0,0,0,0.15); }
  .header { background:linear-gradient(135deg,#1e40af,#3b82f6); color:white; padding:24px 28px; display:flex; justify-content:space-between; align-items:center; }
  .airline { font-size:22px; font-weight:800; letter-spacing:1px; }
  .ticket-label { font-size:11px; opacity:.7; text-transform:uppercase; letter-spacing:2px; }
  .route { padding:24px 28px; display:flex; align-items:center; gap:12px; border-bottom:1px dashed #e2e8f0; }
  .city { flex:1; }
  .city-code { font-size:36px; font-weight:800; color:#1e293b; }
  .city-name { font-size:13px; color:#64748b; margin-top:2px; }
  .city-time { font-size:15px; font-weight:600; color:#1e293b; margin-top:6px; }
  .arrow { display:flex; flex-direction:column; align-items:center; gap:4px; padding:0 12px; }
  .arrow-line { width:80px; height:2px; background:linear-gradient(90deg,#3b82f6,#8b5cf6); border-radius:2px; }
  .plane-icon { font-size:20px; }
  .info-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:0; border-bottom:1px dashed #e2e8f0; }
  .info-cell { padding:16px 20px; border-right:1px dashed #e2e8f0; }
  .info-cell:last-child { border-right:none; }
  .info-label { font-size:10px; color:#94a3b8; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px; }
  .info-value { font-size:14px; font-weight:700; color:#1e293b; }
  .passenger-section { padding:20px 28px; display:flex; justify-content:space-between; align-items:center; }
  .passenger-name { font-size:20px; font-weight:800; color:#1e293b; }
  .passenger-sub { font-size:13px; color:#64748b; margin-top:3px; }
  .status-badge { padding:6px 14px; border-radius:20px; font-size:12px; font-weight:700; }
  .status-ok { background:#dcfce7; color:#16a34a; }
  .status-pending { background:#fef9c3; color:#ca8a04; }
  .footer { background:#f8fafc; padding:16px 28px; display:flex; justify-content:space-between; align-items:center; font-size:11px; color:#94a3b8; }
  .ref { font-family:monospace; font-size:13px; color:#3b82f6; font-weight:700; }
  @media print { body { background:white; padding:0; } .ticket { box-shadow:none; width:100%; } }
</style>
</head>
<body>
<div class="ticket">
  <div class="header">
    <div>
      <div class="airline">✈ TROGON AIRWAYS</div>
      <div class="ticket-label">Carte d'embarquement / Boarding Pass</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:11px;opacity:.7;">Vol / Flight</div>
      <div style="font-size:22px;font-weight:800;">${flight.flight_number || "—"}</div>
    </div>
  </div>

  <div class="route">
    <div class="city">
      <div class="city-code">${flight.from_code || "—"}</div>
      <div class="city-name">${flight.from_city || "—"}</div>
      <div class="city-time">${fmt(dep)}</div>
    </div>
    <div class="arrow">
      <div class="plane-icon">✈</div>
      <div class="arrow-line"></div>
    </div>
    <div class="city" style="text-align:right;">
      <div class="city-code">${flight.to_code || "—"}</div>
      <div class="city-name">${flight.to_city || "—"}</div>
      <div class="city-time">${fmt(arr)}</div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-cell">
      <div class="info-label">Siège</div>
      <div class="info-value">${p.seat_number || "À assigner"}</div>
    </div>
    <div class="info-cell">
      <div class="info-label">Classe</div>
      <div class="info-value">Économique</div>
    </div>
    <div class="info-cell">
      <div class="info-label">Passeport / ID</div>
      <div class="info-value" style="font-size:12px;">${p.passport_number || "—"}</div>
    </div>
    <div class="info-cell">
      <div class="info-label">Check-in</div>
      <div class="info-value">${p.checked_in ? "✅ Effectué" : "⏳ En attente"}</div>
    </div>
  </div>

  <div class="passenger-section">
    <div>
      <div class="passenger-name">${p.title ? p.title + " " : ""}${p.first_name} ${p.last_name}</div>
      <div class="passenger-sub">${p.nationality || ""} ${p.passport_number ? "· " + p.passport_number : ""}</div>
    </div>
    <div class="status-badge ${p.checked_in ? "status-ok" : "status-pending"}">
      ${p.checked_in ? "✅ Enregistré" : "⏳ Non enregistré"}
    </div>
  </div>

  <div class="footer">
    <div>Réf: <span class="ref">${p.booking_reference}</span></div>
    <div>Trogon Airways · Ce billet doit être présenté à l'embarquement</div>
    <button onclick="window.print()" style="background:#3b82f6;color:white;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:11px;">🖨 Imprimer</button>
  </div>
</div>
</body>
</html>`;

    const w = window.open("", "_blank", "width=760,height=600");
    if (w) { w.document.write(html); w.document.close(); }
  };

  // Styles réutilisables
  const cardBg = dark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200";
  const textMain = dark ? "text-white" : "text-gray-900";
  const textSub = dark ? "text-slate-400" : "text-gray-500";
  const inputCls = `rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${dark ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400" : "bg-gray-50 border-gray-300 text-gray-900"}`;

  const totalPassengers = flights.reduce((s, f) => s + f.total_passengers, 0);
  const totalCheckedIn = flights.reduce((s, f) => s + f.checked_in_count, 0);

  const typeIcon = (t: string) => t === "helicopter" ? "🚁" : t === "charter" ? "🛩" : "✈️";

  return (
    <div className="p-6 space-y-5">

      {/* En-tête */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600">
            <Users className="text-white" size={22} />
          </div>
          <div>
            <h1 className={`text-2xl font-bold ${textMain}`}>Gestion des Passagers</h1>
            <p className={`text-sm ${textSub}`}>{flights.length} vol(s) · {totalPassengers} passager(s) · {totalCheckedIn} enregistré(s)</p>
          </div>
        </div>

        {/* Stats rapides */}
        <div className="flex gap-3">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium ${cardBg}`}>
            <CheckCircle2 size={15} className="text-green-500" />
            <span className={textMain}>{totalCheckedIn} / {totalPassengers} check-in</span>
          </div>
          {totalPassengers > 0 && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium ${cardBg}`}>
              <div className="w-24 h-2 rounded-full bg-gray-200 dark:bg-slate-600 overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${Math.round((totalCheckedIn / totalPassengers) * 100)}%` }}
                />
              </div>
              <span className={textSub}>{Math.round((totalCheckedIn / totalPassengers) * 100)}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Filtres */}
      <div className={`flex flex-wrap items-center gap-3 rounded-2xl border p-4 ${cardBg}`}>
        <div className="flex items-center gap-2">
          <Calendar size={16} className={textSub} />
          <input
            type="date"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className={inputCls}
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={16} className={textSub} />
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className={inputCls}
          >
            <option value="">Tous les types</option>
            <option value="plane">✈️ Avion</option>
            <option value="helicopter">🚁 Hélicoptère</option>
            <option value="charter">🛩 Charter</option>
          </select>
        </div>

        <form onSubmit={e => { e.preventDefault(); setSearch(searchInput); }} className="flex items-center gap-2 flex-1 min-w-48">
          <Search size={16} className={textSub} />
          <input
            type="text"
            placeholder="Nom, passeport, réservation, vol..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className={`${inputCls} flex-1`}
          />
          <button type="submit" className="px-3 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600">
            Chercher
          </button>
          {search && (
            <button type="button" onClick={() => { setSearch(""); setSearchInput(""); }} className={`text-xs ${textSub} hover:text-red-400`}>
              Effacer
            </button>
          )}
        </form>

        <button
          onClick={fetchFlights}
          className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${dark ? "border-slate-600 text-slate-300 hover:bg-slate-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
        >
          Actualiser
        </button>
      </div>

      {/* Contenu */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
        </div>
      ) : apiError ? (
        <div className={`text-center py-20 rounded-2xl border border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700`}>
          <AlertCircle size={40} className="mx-auto mb-3 text-red-400" />
          <p className="font-medium text-red-600 dark:text-red-400">Erreur de chargement</p>
          <p className="text-sm mt-1 text-red-500 dark:text-red-300 max-w-md mx-auto px-4">{apiError}</p>
          <button onClick={fetchFlights} className="mt-4 px-4 py-2 rounded-lg bg-red-500 text-white text-sm hover:bg-red-600 transition-colors">
            Réessayer
          </button>
        </div>
      ) : flights.length === 0 ? (
        <div className={`text-center py-20 rounded-2xl border ${cardBg}`}>
          <Plane size={40} className={`mx-auto mb-3 ${textSub}`} />
          <p className={`font-medium ${textMain}`}>Aucun vol avec passagers</p>
          <p className={`text-sm mt-1 ${textSub}`}>Essayez une autre date ou effacez les filtres</p>
        </div>
      ) : (
        <div className="space-y-4">
          {flights.map(flight => {
            const isOpen = expanded.has(flight.flight_id);
            const dep = new Date(flight.departure_time);
            const pct = flight.total_passengers > 0
              ? Math.round((flight.checked_in_count / flight.total_passengers) * 100)
              : 0;
            const allChecked = flight.checked_in_count === flight.total_passengers;

            return (
              <div key={flight.flight_id} className={`rounded-2xl border overflow-hidden ${cardBg}`}>

                {/* En-tête du vol */}
                <div
                  className={`flex items-center justify-between p-4 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors`}
                  onClick={() => toggleExpand(flight.flight_id)}
                >
                  <div className="flex items-center gap-4">
                    {/* Icône type */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold flex-shrink-0 ${
                      flight.type_vol === "helicopter" ? "bg-purple-500/10" :
                      flight.type_vol === "charter" ? "bg-amber-500/10" : "bg-blue-500/10"
                    }`}>
                      {typeIcon(flight.type_vol)}
                    </div>

                    <div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className={`font-bold text-lg ${textMain}`}>
                          {flight.from_code || flight.from_city} → {flight.to_code || flight.to_city}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-mono font-semibold ${
                          dark ? "bg-slate-700 text-slate-300" : "bg-gray-100 text-gray-600"
                        }`}>
                          {flight.flight_number || "Vol sans N°"}
                        </span>
                        {allChecked && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 font-semibold">
                            ✅ Complet
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 flex-wrap">
                        <span className={`text-sm ${textSub}`}>
                          {dep.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" })} · {dep.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span className={`text-sm ${textSub}`}>
                          {flight.from_city} → {flight.to_city}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Barre progression check-in */}
                    <div className="text-right hidden sm:block">
                      <p className={`text-xs font-semibold ${textMain}`}>
                        {flight.checked_in_count} / {flight.total_passengers} enregistrés
                      </p>
                      <div className="w-32 h-2 rounded-full bg-gray-200 dark:bg-slate-600 overflow-hidden mt-1">
                        <div
                          className={`h-full rounded-full transition-all ${allChecked ? "bg-green-500" : "bg-blue-500"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className={`text-xs ${textSub} mt-0.5`}>{pct}%</p>
                    </div>
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${
                      dark ? "bg-slate-700 text-slate-300" : "bg-gray-100 text-gray-600"
                    }`}>
                      <Users size={14} />
                      {flight.total_passengers}
                    </div>
                    {isOpen ? <ChevronUp size={18} className={textSub} /> : <ChevronDown size={18} className={textSub} />}
                  </div>
                </div>

                {/* Liste des passagers */}
                {isOpen && (
                  <div className={`border-t ${dark ? "border-slate-700" : "border-gray-100"}`}>

                    {/* Actions groupées */}
                    <div className={`flex items-center justify-between px-4 py-2 text-xs ${dark ? "bg-slate-700/30 text-slate-400" : "bg-gray-50 text-gray-500"}`}>
                      <span>{flight.total_passengers} passager(s) · {flight.checked_in_count} enregistré(s)</span>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          const unchecked = flight.passengers.filter(p => !p.checked_in);
                          if (unchecked.length === 0) { toast("Tous déjà enregistrés"); return; }
                          for (const p of unchecked) {
                            await fetch(`${API}/api/passengers/${p.id}/checkin`, {
                              method: "PUT",
                              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                              body: JSON.stringify({ checked_in: true }),
                            });
                          }
                          toast.success(`✅ ${unchecked.length} passager(s) enregistrés`);
                          fetchFlights();
                        }}
                        className="text-blue-500 hover:text-blue-600 font-medium hover:underline"
                      >
                        Tout enregistrer
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className={dark ? "bg-slate-700/20" : "bg-gray-50/50"}>
                            {["Passager", "Passeport", "Siège", "Réservation", "Check-in", "Actions"].map(h => (
                              <th key={h} className={`px-4 py-2.5 text-left font-semibold text-xs ${textSub}`}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {flight.passengers.map(p => (
                            <tr
                              key={p.id}
                              className={`border-t transition-colors ${
                                dark ? "border-slate-700/50 hover:bg-slate-700/20" : "border-gray-100 hover:bg-gray-50/70"
                              } ${p.checked_in ? (dark ? "bg-green-900/10" : "bg-green-50/50") : ""}`}
                            >
                              {/* Nom */}
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2.5">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${
                                    p.checked_in ? "bg-green-500" : "bg-gradient-to-r from-blue-500 to-indigo-500"
                                  }`}>
                                    {p.checked_in ? <Check size={14} /> : (p.first_name?.[0] || "?").toUpperCase()}
                                  </div>
                                  <div>
                                    <p className={`font-semibold ${textMain}`}>
                                      {p.title ? p.title + " " : ""}{p.first_name} {p.last_name}
                                    </p>
                                    <p className={`text-xs ${textSub}`}>{p.nationality || "—"}</p>
                                  </div>
                                </div>
                              </td>

                              {/* Passeport */}
                              <td className={`px-4 py-3 font-mono text-xs ${textMain}`}>
                                {p.passport_number || "—"}
                              </td>

                              {/* Siège */}
                              <td className="px-4 py-3">
                                {p.seat_number ? (
                                  <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                                    dark ? "bg-blue-900/40 text-blue-300" : "bg-blue-50 text-blue-700"
                                  }`}>
                                    {p.seat_number}
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => { setSeatModal({ open: true, passenger: p }); setSeatInput(""); }}
                                    className="flex items-center gap-1 text-xs text-amber-500 hover:text-amber-600 font-medium"
                                  >
                                    <AlertCircle size={12} /> Assigner
                                  </button>
                                )}
                              </td>

                              {/* Réservation */}
                              <td className="px-4 py-3">
                                <span className="text-blue-500 font-mono text-xs">{p.booking_reference}</span>
                              </td>

                              {/* Check-in status */}
                              <td className="px-4 py-3">
                                {p.checked_in ? (
                                  <div>
                                    <span className="flex items-center gap-1 text-xs text-green-500 font-semibold">
                                      <CheckCircle2 size={13} /> Enregistré
                                    </span>
                                    {p.checked_in_by && (
                                      <p className={`text-xs ${textSub} mt-0.5`}>par {p.checked_in_by}</p>
                                    )}
                                  </div>
                                ) : (
                                  <span className="flex items-center gap-1 text-xs text-amber-500 font-medium">
                                    <Clock size={13} /> En attente
                                  </span>
                                )}
                              </td>

                              {/* Actions */}
                              <td className="px-4 py-3">
                                {(() => {
                                  const isConfirmed = p.booking_status === "confirmed";
                                  return (
                                    <div className="flex items-center gap-1.5">
                                      {!isConfirmed && (
                                        <span className={`text-xs px-2 py-1 rounded-lg font-medium ${dark ? "bg-yellow-900/40 text-yellow-400" : "bg-yellow-50 text-yellow-600"}`}>
                                          Non confirmé
                                        </span>
                                      )}
                                      {/* Check-in / Undo */}
                                      <button
                                        onClick={() => handleCheckin(p, !p.checked_in)}
                                        disabled={savingId === p.id || !isConfirmed}
                                        title={!isConfirmed ? "Réservation non confirmée" : p.checked_in ? "Annuler l'enregistrement" : "Enregistrer le passager"}
                                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                                          p.checked_in
                                            ? dark ? "bg-slate-700 text-slate-300 hover:bg-red-900/30 hover:text-red-400" : "bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-500"
                                            : "bg-green-500 text-white hover:bg-green-600"
                                        }`}
                                      >
                                        {savingId === p.id ? (
                                          <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                        ) : p.checked_in ? (
                                          <><X size={12} /> Annuler</>
                                        ) : (
                                          <><UserCheck size={12} /> Check-in</>
                                        )}
                                      </button>

                                      {/* Assigner siège */}
                                      <button
                                        onClick={() => { setSeatModal({ open: true, passenger: p }); setSeatInput(p.seat_number || ""); }}
                                        disabled={!isConfirmed}
                                        title={!isConfirmed ? "Réservation non confirmée" : "Modifier le siège"}
                                        className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${dark ? "hover:bg-slate-700 text-slate-400" : "hover:bg-gray-100 text-gray-500"}`}
                                      >
                                        <Edit2 size={13} />
                                      </button>

                                      {/* Imprimer billet */}
                                      <button
                                        onClick={() => handlePrintTicket(p, flight)}
                                        disabled={!isConfirmed}
                                        title={!isConfirmed ? "Réservation non confirmée" : "Imprimer le billet"}
                                        className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${dark ? "hover:bg-slate-700 text-slate-400" : "hover:bg-gray-100 text-gray-500"}`}
                                      >
                                        <Printer size={13} />
                                      </button>
                                    </div>
                                  );
                                })()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal assignation siège */}
      {seatModal.open && seatModal.passenger && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`rounded-2xl shadow-2xl w-full max-w-sm border ${cardBg}`}>
            <div className={`flex items-center justify-between p-5 border-b ${dark ? "border-slate-700" : "border-gray-200"}`}>
              <div>
                <h2 className={`font-bold ${textMain}`}>Assigner un siège</h2>
                <p className={`text-xs ${textSub} mt-0.5`}>
                  {seatModal.passenger.first_name} {seatModal.passenger.last_name}
                </p>
              </div>
              <button onClick={() => setSeatModal({ open: false, passenger: null })}
                className={`p-1.5 rounded-lg ${dark ? "hover:bg-slate-700 text-slate-400" : "hover:bg-gray-100 text-gray-500"}`}>
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${dark ? "text-slate-300" : "text-gray-700"}`}>
                  Numéro de siège
                </label>
                <input
                  type="text"
                  value={seatInput}
                  onChange={e => setSeatInput(e.target.value.toUpperCase())}
                  placeholder="Ex: 12A, 3B, 22C..."
                  autoFocus
                  onKeyDown={e => e.key === "Enter" && handleAssignSeat()}
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold text-lg tracking-widest ${
                    dark ? "bg-slate-700 border-slate-600 text-white placeholder-slate-500" : "bg-gray-50 border-gray-300 text-gray-900"
                  }`}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setSeatModal({ open: false, passenger: null })}
                  className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-colors ${dark ? "border-slate-600 text-slate-300 hover:bg-slate-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                >
                  Annuler
                </button>
                <button
                  onClick={handleAssignSeat}
                  disabled={!seatInput.trim() || savingId !== null}
                  className="flex-1 py-2 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors"
                >
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
