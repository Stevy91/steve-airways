import { useState, useEffect } from "react";
import { MapPin, Plus, Pencil, Trash2, X, Check, Search } from "lucide-react";
import { useTheme } from "../../../contexts/theme-context";
import { useAuth } from "../../../hooks/useAuth";
import toast from "react-hot-toast";

const API = "https://steve-airways.onrender.com";

type Location = {
  id: number;
  name: string;
  code: string;
  city: string;
  country: string;
};

const emptyForm = { name: "", code: "", city: "", country: "" };

export default function LocationsPage() {
  const { theme } = useTheme();
  const { isAdmin } = useAuth();
  const dark = theme === "dark";

  const [locations, setLocations] = useState<Location[]>([]);
  const [filtered, setFiltered] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Location | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const token = localStorage.getItem("token");

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/locationstables`);
      const data = await res.json();
      setLocations(data);
      setFiltered(data);
    } catch { toast.error("Impossible de charger les destinations"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLocations(); }, []);

  useEffect(() => {
    if (!search) { setFiltered(locations); return; }
    const q = search.toLowerCase();
    setFiltered(locations.filter(l =>
      l.name?.toLowerCase().includes(q) || l.code?.toLowerCase().includes(q) ||
      l.city?.toLowerCase().includes(q) || l.country?.toLowerCase().includes(q)
    ));
  }, [search, locations]);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (loc: Location) => { setEditing(loc); setForm({ name: loc.name, code: loc.code, city: loc.city || "", country: loc.country || "" }); setShowModal(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.code) return toast.error("Nom et code requis");
    setSubmitting(true);
    try {
      const url = editing ? `${API}/api/locations/${editing.id}` : `${API}/api/locations`;
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(editing ? "Destination mise à jour" : "Destination créée");
      setShowModal(false);
      fetchLocations();
    } catch (err: any) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`${API}/api/locations/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Destination supprimée");
      setDeleteConfirm(null);
      fetchLocations();
    } catch (err: any) { toast.error(err.message); }
  };

  const cardBg = dark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200";
  const textMain = dark ? "text-white" : "text-gray-900";
  const textSub = dark ? "text-slate-400" : "text-gray-500";
  const inputCls = `w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${dark ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400" : "bg-gray-50 border-gray-300 text-gray-900"}`;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500">
            <MapPin className="text-white" size={22} />
          </div>
          <div>
            <h1 className={`text-2xl font-bold ${textMain}`}>Gestion des Destinations</h1>
            <p className={`text-sm ${textSub}`}>{filtered.length} destination(s) enregistrée(s)</p>
          </div>
        </div>
        {isAdmin && (
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium hover:opacity-90 transition-all">
            <Plus size={18} /> Nouvelle destination
          </button>
        )}
      </div>

      {/* Search */}
      <div className={`flex items-center gap-3 rounded-xl border px-4 py-2 ${cardBg}`}>
        <Search size={18} className={textSub} />
        <input
          type="text" placeholder="Rechercher par nom, code, ville, pays..."
          value={search} onChange={e => setSearch(e.target.value)}
          className={`flex-1 bg-transparent outline-none text-sm ${textMain}`}
        />
      </div>

      {/* Table */}
      <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={dark ? "bg-slate-700/50" : "bg-gray-50"}>
                  {["#", "Code", "Nom", "Ville", "Pays", "Actions"].map(h => (
                    <th key={h} className={`px-4 py-3 text-left font-semibold ${textSub}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className={`text-center py-12 ${textSub}`}>Aucune destination trouvée</td></tr>
                ) : filtered.map((loc, i) => (
                  <tr key={loc.id} className={`border-t transition-colors ${dark ? "border-slate-700 hover:bg-slate-700/30" : "border-gray-100 hover:bg-gray-50"}`}>
                    <td className={`px-4 py-3 ${textSub}`}>{i + 1}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded-lg text-xs font-bold bg-blue-500/10 text-blue-500">{loc.code}</span>
                    </td>
                    <td className={`px-4 py-3 font-medium ${textMain}`}>{loc.name}</td>
                    <td className={`px-4 py-3 ${textSub}`}>{loc.city || "—"}</td>
                    <td className={`px-4 py-3 ${textSub}`}>{loc.country || "—"}</td>
                    <td className="px-4 py-3">
                      {isAdmin && (
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEdit(loc)} className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-500/10 transition-colors"><Pencil size={15} /></button>
                          {deleteConfirm === loc.id ? (
                            <div className="flex items-center gap-1">
                              <button onClick={() => handleDelete(loc.id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10"><Check size={15} /></button>
                              <button onClick={() => setDeleteConfirm(null)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-500/10"><X size={15} /></button>
                            </div>
                          ) : (
                            <button onClick={() => setDeleteConfirm(loc.id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"><Trash2 size={15} /></button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl border shadow-2xl p-6 ${cardBg}`}>
            <div className="flex items-center justify-between mb-5">
              <h2 className={`text-lg font-bold ${textMain}`}>{editing ? "Modifier la destination" : "Nouvelle destination"}</h2>
              <button onClick={() => setShowModal(false)} className={`p-2 rounded-lg hover:bg-gray-500/10 ${textSub}`}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={`block text-xs font-semibold mb-1 ${textSub}`}>Code IATA *</label>
                <input className={inputCls} placeholder="Ex: PAP" value={form.code} maxLength={4} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} required />
              </div>
              <div>
                <label className={`block text-xs font-semibold mb-1 ${textSub}`}>Nom *</label>
                <input className={inputCls} placeholder="Ex: Aéroport International Toussaint Louverture" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div>
                <label className={`block text-xs font-semibold mb-1 ${textSub}`}>Ville</label>
                <input className={inputCls} placeholder="Ex: Port-au-Prince" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
              </div>
              <div>
                <label className={`block text-xs font-semibold mb-1 ${textSub}`}>Pays</label>
                <input className={inputCls} placeholder="Ex: Haiti" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className={`flex-1 py-2 rounded-xl border font-medium text-sm ${dark ? "border-slate-600 text-slate-300 hover:bg-slate-700" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}>Annuler</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium text-sm hover:opacity-90 disabled:opacity-50">
                  {submitting ? "Sauvegarde..." : editing ? "Mettre à jour" : "Créer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
