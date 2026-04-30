import { useState, useEffect } from "react";
import { Tag, Plus, Pencil, Trash2, X, Check, ToggleLeft, ToggleRight, Copy } from "lucide-react";
import { useTheme } from "../../../contexts/theme-context";
import toast from "react-hot-toast";

const API = "https://steve-airways.onrender.com";

type PromoCode = {
  id: number;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_amount: number;
  max_uses: number | null;
  used_count: number;
  valid_from: string | null;
  valid_until: string | null;
  applies_to: string;
  is_active: number;
  description: string;
  created_at: string;
};

type FormState = {
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_amount: number;
  max_uses: string;
  valid_from: string;
  valid_until: string;
  applies_to: string;
  description: string;
  is_active: number;
};

const emptyForm: FormState = {
  code: "",
  discount_type: "percentage",
  discount_value: 10,
  min_amount: 0,
  max_uses: "",
  valid_from: "",
  valid_until: "",
  applies_to: "all",
  description: "",
  is_active: 1,
};

export default function PromoCodesPage() {
  const { theme } = useTheme();
  const dark = theme === "dark";

  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<PromoCode | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const token = localStorage.getItem("token");

  const fetchPromos = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/promo-codes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setPromos(data.promoCodes || []);
    } catch {
      toast.error("Impossible de charger les codes promo");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPromos(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (p: PromoCode) => {
    setEditing(p);
    setForm({
      code: p.code,
      discount_type: p.discount_type,
      discount_value: p.discount_value,
      min_amount: p.min_amount,
      max_uses: p.max_uses ? String(p.max_uses) : "",
      valid_from: p.valid_from ? p.valid_from.split("T")[0] : "",
      valid_until: p.valid_until ? p.valid_until.split("T")[0] : "",
      applies_to: p.applies_to,
      description: p.description || "",
      is_active: p.is_active,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code || !form.discount_value) return toast.error("Code et remise requis");
    setSubmitting(true);
    try {
      const body = { ...form, max_uses: form.max_uses ? Number(form.max_uses) : null };
      const url = editing ? `${API}/api/promo-codes/${editing.id}` : `${API}/api/promo-codes`;
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(editing ? "Code mis a jour" : "Code cree !");
      setShowModal(false);
      fetchPromos();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`${API}/api/promo-codes/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Code supprime");
      setDeleteConfirm(null);
      fetchPromos();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const toggleActive = async (p: PromoCode) => {
    try {
      await fetch(`${API}/api/promo-codes/${p.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...p, is_active: p.is_active ? 0 : 1 }),
      });
      toast.success(p.is_active ? "Code desactive" : "Code active");
      fetchPromos();
    } catch {
      toast.error("Erreur");
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Code "${code}" copie !`);
  };

  const isExpired = (p: PromoCode) => p.valid_until && new Date(p.valid_until) < new Date();
  const isExhausted = (p: PromoCode) => p.max_uses !== null && p.used_count >= (p.max_uses || 0);

  const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const code = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    setForm((f) => ({ ...f, code }));
  };

  const cardBg = dark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200";
  const textMain = dark ? "text-white" : "text-gray-900";
  const textSub = dark ? "text-slate-400" : "text-gray-500";
  const inputCls = `w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${dark ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400" : "bg-gray-50 border-gray-300 text-gray-900"}`;

  const getStatus = (p: PromoCode) => {
    if (!p.is_active) return { label: "Inactif", cls: "bg-gray-500/10 text-gray-500" };
    if (isExpired(p)) return { label: "Expire", cls: "bg-red-500/10 text-red-500" };
    if (isExhausted(p)) return { label: "Epuise", cls: "bg-orange-500/10 text-orange-500" };
    return { label: "Actif", cls: "bg-green-500/10 text-green-500" };
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500">
            <Tag className="text-white" size={22} />
          </div>
          <div>
            <h1 className={`text-2xl font-bold ${textMain}`}>Codes Promo</h1>
            <p className={`text-sm ${textSub}`}>{promos.length} code(s) cree(s)</p>
          </div>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium hover:opacity-90 transition-all"
        >
          <Plus size={18} /> Nouveau code
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
        </div>
      ) : promos.length === 0 ? (
        <div className={`rounded-2xl border p-12 text-center ${cardBg}`}>
          <Tag size={40} className={`mx-auto mb-3 ${textSub}`} />
          <p className={`font-semibold ${textMain}`}>Aucun code promo</p>
          <p className={`text-sm ${textSub} mb-4`}>Creez votre premier code de reduction</p>
          <button
            onClick={openAdd}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium hover:opacity-90"
          >
            <Plus size={16} className="inline mr-1" />
            Creer un code
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {promos.map((p) => {
            const status = getStatus(p);
            return (
              <div key={p.id} className={`rounded-2xl border p-5 space-y-3 ${cardBg}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-lg text-emerald-500">{p.code}</span>
                    <button onClick={() => copyCode(p.code)} className={`p-1 rounded ${textSub} hover:text-emerald-500`}>
                      <Copy size={13} />
                    </button>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${status.cls}`}>{status.label}</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <span className="font-bold text-emerald-500 text-xl">
                      {p.discount_type === "percentage" ? `${p.discount_value}%` : `$${p.discount_value}`}
                    </span>
                    <span className={`text-xs ml-1 ${textSub}`}>de reduction</span>
                  </div>
                  {p.applies_to !== "all" && (
                    <span className={`px-2 py-0.5 rounded-full text-xs capitalize ${dark ? "bg-slate-700 text-slate-300" : "bg-gray-100 text-gray-600"}`}>
                      {p.applies_to}
                    </span>
                  )}
                </div>

                <div className={`text-xs space-y-1 ${textSub}`}>
                  {p.min_amount > 0 && <p>Min. {p.min_amount} $</p>}
                  {p.max_uses && <p>Utilisations: {p.used_count}/{p.max_uses}</p>}
                  {p.valid_from && <p>Du {new Date(p.valid_from).toLocaleDateString("fr-FR")}</p>}
                  {p.valid_until && <p>Au {new Date(p.valid_until).toLocaleDateString("fr-FR")}</p>}
                  {p.description && <p className="italic">{p.description}</p>}
                </div>

                {p.max_uses && (
                  <div>
                    <div className={`h-1.5 rounded-full ${dark ? "bg-slate-700" : "bg-gray-200"}`}>
                      <div
                        className="h-1.5 rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${Math.min(100, (p.used_count / p.max_uses) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => toggleActive(p)}
                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg ${p.is_active ? "text-green-500 hover:bg-green-500/10" : "text-gray-400 hover:bg-gray-500/10"}`}
                  >
                    {p.is_active ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                    {p.is_active ? "Actif" : "Inactif"}
                  </button>
                  <div className="flex-1" />
                  <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-500/10">
                    <Pencil size={14} />
                  </button>
                  {deleteConfirm === p.id ? (
                    <>
                      <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10">
                        <Check size={14} />
                      </button>
                      <button onClick={() => setDeleteConfirm(null)} className={`p-1.5 rounded-lg ${textSub} hover:bg-gray-500/10`}>
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setDeleteConfirm(p.id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className={`w-full max-w-lg rounded-2xl border shadow-2xl p-6 max-h-screen overflow-y-auto ${cardBg}`}>
            <div className="flex items-center justify-between mb-5">
              <h2 className={`text-lg font-bold ${textMain}`}>
                {editing ? "Modifier le code" : "Nouveau code promo"}
              </h2>
              <button onClick={() => setShowModal(false)} className={`p-2 rounded-lg hover:bg-gray-500/10 ${textSub}`}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={`block text-xs font-semibold mb-1 ${textSub}`}>Code *</label>
                <div className="flex gap-2">
                  <input
                    className={`${inputCls} font-mono uppercase`}
                    value={form.code}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder="Ex: SUMMER20"
                    required
                  />
                  <button
                    type="button"
                    onClick={generateCode}
                    className={`px-3 py-2 rounded-lg border text-xs font-medium whitespace-nowrap ${dark ? "border-slate-600 text-slate-300 hover:bg-slate-700" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}
                  >
                    Generer
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${textSub}`}>Type de remise *</label>
                  <select
                    className={inputCls}
                    value={form.discount_type}
                    onChange={(e) => setForm((f) => ({ ...f, discount_type: e.target.value as "percentage" | "fixed" }))}
                  >
                    <option value="percentage">Pourcentage (%)</option>
                    <option value="fixed">Montant fixe ($)</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${textSub}`}>Valeur *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className={inputCls}
                    value={form.discount_value}
                    onChange={(e) => setForm((f) => ({ ...f, discount_value: Number(e.target.value) }))}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${textSub}`}>Montant min. ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className={inputCls}
                    value={form.min_amount}
                    onChange={(e) => setForm((f) => ({ ...f, min_amount: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${textSub}`}>Max. utilisations</label>
                  <input
                    type="number"
                    min="1"
                    className={inputCls}
                    value={form.max_uses}
                    onChange={(e) => setForm((f) => ({ ...f, max_uses: e.target.value }))}
                    placeholder="Illimite"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${textSub}`}>Valide du</label>
                  <input
                    type="date"
                    className={inputCls}
                    value={form.valid_from}
                    onChange={(e) => setForm((f) => ({ ...f, valid_from: e.target.value }))}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${textSub}`}>Valide au</label>
                  <input
                    type="date"
                    className={inputCls}
                    value={form.valid_until}
                    onChange={(e) => setForm((f) => ({ ...f, valid_until: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className={`block text-xs font-semibold mb-1 ${textSub}`}>Applicable a</label>
                <select
                  className={inputCls}
                  value={form.applies_to}
                  onChange={(e) => setForm((f) => ({ ...f, applies_to: e.target.value }))}
                >
                  <option value="all">Tous les vols</option>
                  <option value="plane">Avion uniquement</option>
                  <option value="helicopter">Helicoptere uniquement</option>
                  <option value="charter">Charter uniquement</option>
                </select>
              </div>
              <div>
                <label className={`block text-xs font-semibold mb-1 ${textSub}`}>Description</label>
                <input
                  className={inputCls}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Ex: Reduction ete 2025"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className={`flex-1 py-2 rounded-xl border font-medium text-sm ${dark ? "border-slate-600 text-slate-300" : "border-gray-300 text-gray-600"}`}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium text-sm hover:opacity-90 disabled:opacity-50"
                >
                  {submitting ? "..." : editing ? "Mettre a jour" : "Creer le code"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
