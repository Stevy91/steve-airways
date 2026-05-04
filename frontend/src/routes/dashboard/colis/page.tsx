import React, { useEffect, useState, useCallback } from "react";
import { Package, Plus, Search, Filter, Printer, ChevronDown, X, Edit2, Trash2, CheckCircle, Plane, AlertCircle, PackageCheck, Loader2, RefreshCw } from "lucide-react";

const API = "https://steve-airways.onrender.com";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Colis {
  id: number;
  tracking_code: string;
  sender_name: string;
  sender_id_type: string;
  sender_id_number: string;
  sender_phone: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  description: string;
  weight: number | null;
  flight_id: number | null;
  flight_number: string | null;
  departure_time: string | null;
  arrival_time: string | null;
  dep_name: string | null;
  arr_name: string | null;
  price: number;
  currency: string;
  payment_method: string;
  status: "en_attente" | "en_vol" | "arrive" | "livre";
  notes: string;
  created_by_name: string;
  created_at: string;
}

interface Flight {
  id: number;
  flight_number: string;
  departure_time: string;
  arrival_time: string;
  type: string;
  dep_name: string;
  arr_name: string;
}

interface Stats {
  en_attente: number;
  en_vol: number;
  arrive: number;
  livre: number;
  total: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  en_attente: { label: "En attente", color: "bg-orange-100 text-orange-700 border-orange-200", dot: "bg-orange-500", icon: "⏳" },
  en_vol:     { label: "En vol",     color: "bg-blue-100 text-blue-700 border-blue-200",     dot: "bg-blue-500",   icon: "✈️" },
  arrive:     { label: "Arrivé",     color: "bg-green-100 text-green-700 border-green-200",  dot: "bg-green-500",  icon: "📦" },
  livre:      { label: "Livré",      color: "bg-purple-100 text-purple-700 border-purple-200", dot: "bg-purple-500", icon: "✅" },
};

const ID_TYPES = [
  { value: "nif", label: "NIF" },
  { value: "cin", label: "CIN" },
  { value: "passeport", label: "Passeport" },
  { value: "permis", label: "Permis de conduire" },
  { value: "nimu", label: "NIMU" },
  { value: "autre", label: "Autre" },
];

const PAY_METHODS = [
  { value: "cash", label: "Espèces" },
  { value: "card", label: "Carte bancaire" },
  { value: "cheque", label: "Chèque" },
  { value: "virement", label: "Virement" },
  { value: "transfert", label: "Dépôt / Transfert" },
];

const CURRENCIES = ["USD", "HTG"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const token = () => localStorage.getItem("token") || localStorage.getItem("authToken") || "";
const authH = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token()}` });

const fmt = (d?: string | null) => {
  if (!d) return "—";
  try { return new Date(d).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }); }
  catch { return d; }
};

const fmtMoney = (n: number, cur: string) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: cur === "HTG" ? "HTG" : "USD", minimumFractionDigits: 2 }).format(n);

// ─── Empty form ───────────────────────────────────────────────────────────────
const emptyForm = () => ({
  sender_name: "", sender_id_type: "nif", sender_id_number: "", sender_phone: "",
  recipient_name: "", recipient_phone: "", recipient_address: "",
  description: "", weight: "", flight_id: "",
  price: "", currency: "USD", payment_method: "cash", notes: "",
});

// ══════════════════════════════════════════════════════════════════════════════
export default function ColisPage() {
  const [colis, setColis]     = useState<Colis[]>([]);
  const [stats, setStats]     = useState<Stats>({ en_attente: 0, en_vol: 0, arrive: 0, livre: 0, total: 0 });
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [showModal, setShowModal]       = useState(false);
  const [showDetail, setShowDetail]     = useState<Colis | null>(null);
  const [editingColis, setEditingColis] = useState<Colis | null>(null);
  const [form, setForm]                 = useState(emptyForm());
  const [saving, setSaving]             = useState(false);
  const [statusLoading, setStatusLoading] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterStatus) params.set("status", filterStatus);

      const [colisRes, statsRes, flightsRes] = await Promise.all([
        fetch(`${API}/api/colis?${params}`, { headers: authH() }),
        fetch(`${API}/api/colis/stats`, { headers: authH() }),
        fetch(`${API}/api/flightstable`, { headers: authH() }),
      ]);

      if (colisRes.ok)   { const d = await colisRes.json();   setColis(d.colis || []); }
      if (statsRes.ok)   { const d = await statsRes.json();   setStats(d.stats); }
      if (flightsRes.ok) { const d = await flightsRes.json(); setFlights(d || []); }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [search, filterStatus]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.sender_name.trim() || !form.recipient_name.trim()) {
      alert("Nom de l'expéditeur et du destinataire sont requis.");
      return;
    }
    setSaving(true);
    try {
      const body = {
        ...form,
        weight: form.weight ? parseFloat(form.weight as string) : null,
        price: parseFloat(form.price as string) || 0,
        flight_id: form.flight_id ? parseInt(form.flight_id as string) : null,
      };
      const url    = editingColis ? `${API}/api/colis/${editingColis.id}` : `${API}/api/colis`;
      const method = editingColis ? "PUT" : "POST";
      const res    = await fetch(url, { method, headers: authH(), body: JSON.stringify(body) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      setShowModal(false);
      setEditingColis(null);
      setForm(emptyForm());
      fetchData();
    } catch (e: any) { alert("Erreur: " + e.message); }
    finally { setSaving(false); }
  };

  // ── Status ────────────────────────────────────────────────────────────────
  const handleStatus = async (id: number, status: string) => {
    setStatusLoading(id);
    try {
      const res = await fetch(`${API}/api/colis/${id}/status`, {
        method: "PUT", headers: authH(), body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Erreur mise à jour statut");
      fetchData();
      if (showDetail?.id === id) setShowDetail(prev => prev ? { ...prev, status: status as any } : null);
    } catch (e: any) { alert(e.message); }
    finally { setStatusLoading(null); }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id: number) => {
    try {
      await fetch(`${API}/api/colis/${id}`, { method: "DELETE", headers: authH() });
      setDeleteConfirm(null);
      fetchData();
    } catch (e: any) { alert(e.message); }
  };

  // ── Open modal ────────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingColis(null);
    setForm(emptyForm());
    setShowModal(true);
  };
  const openEdit = (c: Colis) => {
    setEditingColis(c);
    setForm({
      sender_name: c.sender_name, sender_id_type: c.sender_id_type || "nif",
      sender_id_number: c.sender_id_number || "", sender_phone: c.sender_phone || "",
      recipient_name: c.recipient_name, recipient_phone: c.recipient_phone || "",
      recipient_address: c.recipient_address || "",
      description: c.description || "", weight: c.weight ? String(c.weight) : "",
      flight_id: c.flight_id ? String(c.flight_id) : "",
      price: String(c.price || ""), currency: c.currency || "USD",
      payment_method: c.payment_method || "cash", notes: c.notes || "",
    });
    setShowModal(true);
  };

  const printReceipt = (id: number) => {
    window.open(`${API}/api/colis/${id}/receipt?token=${token()}`, "_blank");
  };

  // ── Stat cards ────────────────────────────────────────────────────────────
  const statCards = [
    { key: "total",      label: "Total colis",  value: stats.total,      icon: Package,      bg: "from-slate-600 to-slate-700" },
    { key: "en_attente", label: "En attente",   value: stats.en_attente, icon: AlertCircle,  bg: "from-orange-500 to-orange-600" },
    { key: "en_vol",     label: "En vol",       value: stats.en_vol,     icon: Plane,        bg: "from-blue-500 to-blue-600" },
    { key: "arrive",     label: "Arrivés",      value: stats.arrive,     icon: PackageCheck, bg: "from-green-500 to-green-600" },
    { key: "livre",      label: "Livrés",       value: stats.livre,      icon: CheckCircle,  bg: "from-purple-500 to-purple-600" },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-800">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg">
              <Package className="h-5 w-5 text-white" />
            </div>
            Gestion des Colis
          </h1>
          <p className="mt-1 text-sm text-slate-500">Enregistrez, suivez et gérez tous les colis transportés</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all">
          <Plus className="h-4 w-4" /> Nouveau colis
        </button>
      </div>

      {/* Stat Cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        {statCards.map(({ key, label, value, icon: Icon, bg }) => (
          <div key={key}
            onClick={() => setFilterStatus(filterStatus === key || key === "total" ? "" : key)}
            className={`cursor-pointer rounded-2xl bg-gradient-to-br ${bg} p-4 text-white shadow-md transition-all hover:scale-105 hover:shadow-lg ${filterStatus === key ? "ring-4 ring-white/60" : ""}`}>
            <Icon className="mb-2 h-5 w-5 opacity-80" />
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-xs font-medium opacity-80">{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par code, nom, pièce..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-blue-400">
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.icon} {v.label}</option>
          ))}
        </select>
        <button onClick={fetchData}
          className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-200 transition-colors">
          <RefreshCw className="h-4 w-4" /> Actualiser
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        {loading ? (
          <div className="flex h-48 items-center justify-center gap-3 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" /> Chargement...
          </div>
        ) : colis.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 text-slate-400">
            <Package className="h-10 w-10 opacity-40" />
            <p className="font-medium">Aucun colis trouvé</p>
            <button onClick={openCreate} className="mt-2 text-sm text-blue-600 hover:underline">Créer le premier colis →</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3 text-left">Code suivi</th>
                  <th className="px-4 py-3 text-left">Expéditeur</th>
                  <th className="px-4 py-3 text-left">Destinataire</th>
                  <th className="px-4 py-3 text-left">Vol</th>
                  <th className="px-4 py-3 text-left">Montant</th>
                  <th className="px-4 py-3 text-left">Statut</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {colis.map(c => {
                  const sc = STATUS_CONFIG[c.status];
                  return (
                    <tr key={c.id} className="group transition-colors hover:bg-blue-50/40">
                      <td className="px-4 py-3">
                        <button onClick={() => setShowDetail(c)} className="font-mono font-bold text-blue-700 hover:underline">
                          {c.tracking_code}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{c.sender_name}</div>
                        {c.sender_id_number && <div className="text-xs text-slate-400">{c.sender_id_type?.toUpperCase()}: {c.sender_id_number}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{c.recipient_name}</div>
                        {c.recipient_phone && <div className="text-xs text-slate-400">{c.recipient_phone}</div>}
                      </td>
                      <td className="px-4 py-3">
                        {c.flight_number ? (
                          <div>
                            <div className="font-medium text-slate-700">{c.flight_number}</div>
                            <div className="text-xs text-slate-400">{c.dep_name} → {c.arr_name}</div>
                          </div>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700">
                        {fmtMoney(c.price, c.currency)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="relative inline-block">
                          <select value={c.status}
                            onChange={e => handleStatus(c.id, e.target.value)}
                            disabled={statusLoading === c.id}
                            className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold appearance-none pr-6 ${sc.color}`}>
                            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                              <option key={k} value={k}>{v.icon} {v.label}</option>
                            ))}
                          </select>
                          {statusLoading === c.id
                            ? <Loader2 className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 animate-spin" />
                            : <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2" />}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{fmt(c.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => printReceipt(c.id)} title="Imprimer reçu"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-100 hover:text-blue-600 transition-colors">
                            <Printer className="h-4 w-4" />
                          </button>
                          <button onClick={() => openEdit(c)} title="Modifier"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-amber-100 hover:text-amber-600 transition-colors">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => setDeleteConfirm(c.id)} title="Supprimer"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-100 hover:text-red-600 transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MODAL CRÉATION / ÉDITION ─────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-white">
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5" />
                <h2 className="text-lg font-bold">{editingColis ? "Modifier le colis" : "Enregistrer un nouveau colis"}</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="rounded-lg p-1 hover:bg-white/20 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Expéditeur */}
              <section>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-orange-600">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-xs">📤</span>
                  Expéditeur
                </h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Nom complet *</label>
                    <input value={form.sender_name} onChange={e => setForm(f => ({ ...f, sender_name: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      placeholder="Jean Pierre Dupont" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Type pièce d'identité</label>
                    <select value={form.sender_id_type} onChange={e => setForm(f => ({ ...f, sender_id_type: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400">
                      {ID_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">N° de pièce</label>
                    <input value={form.sender_id_number} onChange={e => setForm(f => ({ ...f, sender_id_number: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400"
                      placeholder="123-456-789" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Téléphone</label>
                    <input value={form.sender_phone} onChange={e => setForm(f => ({ ...f, sender_phone: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400"
                      placeholder="+509 3XXX-XXXX" />
                  </div>
                </div>
              </section>

              {/* Destinataire */}
              <section>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-blue-600">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs">📥</span>
                  Destinataire
                </h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Nom complet *</label>
                    <input value={form.recipient_name} onChange={e => setForm(f => ({ ...f, recipient_name: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      placeholder="Marie Claire Joseph" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Téléphone</label>
                    <input value={form.recipient_phone} onChange={e => setForm(f => ({ ...f, recipient_phone: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400"
                      placeholder="+509 3XXX-XXXX" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Adresse / Destination</label>
                    <input value={form.recipient_address} onChange={e => setForm(f => ({ ...f, recipient_address: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400"
                      placeholder="Rue principale, Port-au-Prince" />
                  </div>
                </div>
              </section>

              {/* Colis + Vol */}
              <section>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-600">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs">📦</span>
                  Colis & Transport
                </h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Description du colis</label>
                    <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400"
                      placeholder="Ex: Vêtements, médicaments, documents..." />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Poids (kg)</label>
                    <input type="number" step="0.1" min="0" value={form.weight}
                      onChange={e => setForm(f => ({ ...f, weight: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400"
                      placeholder="0.5" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Vol associé</label>
                    <select value={form.flight_id} onChange={e => setForm(f => ({ ...f, flight_id: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400">
                      <option value="">— Sélectionner un vol —</option>
                      {flights.map((fl: any) => (
                        <option key={fl.id} value={fl.id}>
                          {fl.flight_number} — {fl.departure_city || fl.dep_name || "?"} → {fl.arrival_city || fl.arr_name || "?"} ({fl.type})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Notes internes</label>
                    <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400"
                      placeholder="Notes supplémentaires..." />
                  </div>
                </div>
              </section>

              {/* Paiement */}
              <section>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-green-700">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-xs">💰</span>
                  Paiement
                </h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Montant</label>
                    <input type="number" step="0.01" min="0" value={form.price}
                      onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400"
                      placeholder="0.00" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Devise</label>
                    <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400">
                      {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Méthode de paiement</label>
                    <select value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400">
                      {PAY_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                </div>
              </section>

              {/* Boutons */}
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button onClick={() => setShowModal(false)}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                  Annuler
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 transition-all">
                  {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Enregistrement...</> : <><CheckCircle className="h-4 w-4" /> {editingColis ? "Enregistrer" : "Créer le colis"}</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DÉTAIL ────────────────────────────────────────────────────── */}
      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-4 text-white">
              <div>
                <div className="text-xs font-medium opacity-80">Détails du colis</div>
                <div className="font-mono text-lg font-bold tracking-widest">{showDetail.tracking_code}</div>
              </div>
              <button onClick={() => setShowDetail(null)} className="rounded-lg p-1 hover:bg-white/20">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Progress Steps */}
            <div className="flex border-b border-slate-100">
              {Object.entries(STATUS_CONFIG).map(([k, v], i, arr) => {
                const statuses = Object.keys(STATUS_CONFIG);
                const curIdx = statuses.indexOf(showDetail.status);
                const sIdx = i;
                return (
                  <div key={k} className={`flex-1 py-3 text-center text-xs font-semibold transition-colors
                    ${sIdx < curIdx ? "bg-green-50 text-green-600" : sIdx === curIdx ? "bg-blue-50 text-blue-700" : "text-slate-400"}`}>
                    <div className="text-base">{v.icon}</div>
                    <div>{v.label}</div>
                  </div>
                );
              })}
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <InfoCard title="📤 Expéditeur" name={showDetail.sender_name}
                  sub={[showDetail.sender_id_type?.toUpperCase() + ": " + (showDetail.sender_id_number || "—"), showDetail.sender_phone || ""].filter(Boolean).join(" • ")} />
                <InfoCard title="📥 Destinataire" name={showDetail.recipient_name}
                  sub={[showDetail.recipient_phone, showDetail.recipient_address].filter(Boolean).join(" • ")} />
              </div>

              {showDetail.flight_number && (
                <div className="rounded-xl bg-blue-50 p-3 text-sm">
                  <div className="font-semibold text-blue-800">✈ Vol: {showDetail.flight_number}</div>
                  <div className="text-blue-600">{showDetail.dep_name} → {showDetail.arr_name}</div>
                  <div className="text-xs text-blue-500 mt-1">Départ: {fmt(showDetail.departure_time)} • Arrivée: {fmt(showDetail.arrival_time)}</div>
                </div>
              )}

              {showDetail.description && (
                <div className="rounded-xl bg-slate-50 p-3 text-sm">
                  <span className="font-semibold text-slate-600">📦 Description: </span>{showDetail.description}
                  {showDetail.weight && <span className="ml-2 text-slate-400">• {showDetail.weight} kg</span>}
                </div>
              )}

              <div className="rounded-xl bg-amber-50 p-3 flex justify-between items-center">
                <div className="text-xs text-amber-700 font-semibold">Montant</div>
                <div className="text-lg font-bold text-amber-800">{fmtMoney(showDetail.price, showDetail.currency)}</div>
              </div>

              {/* Changer statut */}
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Mettre à jour le statut</div>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <button key={k}
                      onClick={() => handleStatus(showDetail.id, k)}
                      disabled={showDetail.status === k || statusLoading === showDetail.id}
                      className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-all
                        ${showDetail.status === k ? v.color + " opacity-100 cursor-default" : "border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600"}`}>
                      {v.icon} {v.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={() => { printReceipt(showDetail.id); }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
                  <Printer className="h-4 w-4" /> Imprimer le reçu
                </button>
                <button onClick={() => { setShowDetail(null); openEdit(showDetail); }}
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                  <Edit2 className="h-4 w-4" /> Modifier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRM DELETE ──────────────────────────────────────────────────── */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
              <Trash2 className="h-7 w-7 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Supprimer ce colis ?</h3>
            <p className="mt-1 text-sm text-slate-500">Cette action est irréversible.</p>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
                Annuler
              </button>
              <button onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-component ─────────────────────────────────────────────────────────────
function InfoCard({ title, name, sub }: { title: string; name: string; sub: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="text-xs font-bold text-slate-400 mb-1">{title}</div>
      <div className="font-semibold text-slate-800">{name}</div>
      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}
