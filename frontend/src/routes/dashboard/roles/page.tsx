import { useState, useEffect } from "react";
import { ShieldCheck, Save, Search, ChevronDown, ChevronUp } from "lucide-react";
import { useTheme } from "../../../contexts/theme-context";
import toast from "react-hot-toast";

const API = "https://steve-airways.onrender.com";

const ALL_PERMISSIONS = [
  { id: "dashboard",            label: "Tableau de bord" },
  { id: "listeFlightsPlane",    label: "Vols Avion — Liste" },
  { id: "listeFlightsHelico",   label: "Vols Hélico — Liste" },
  { id: "charter",              label: "Charter — Vols (accès complet)" },
  { id: "listeBookingsCharter",  label: "Charter — Réservations" },
  { id: "listeBookingsPlane",   label: "Réservations Avion" },
  { id: "listeBookingsHelico",  label: "Réservations Hélico" },
  { id: "manualBooking",        label: "Réservation manuelle" },
  { id: "addFlights",           label: "Ajouter des vols" },
  { id: "editFlights",          label: "Modifier des vols" },
  { id: "deleteFlights",        label: "Supprimer des vols" },
  { id: "cancelFlight",         label: "Annuler des vols" },
  { id: "editBookings",         label: "Modifier réservations" },
  { id: "reschedule",           label: "Reprogrammer vols" },
  { id: "listePassagers",       label: "Liste des passagers" },
  { id: "createdTicket",        label: "Créer des tickets" },
  { id: "imprimerTicket",       label: "Imprimer tickets" },
  { id: "cancelledTicket",      label: "Annuler tickets" },
  { id: "manifestPdf",          label: "Manifest PDF" },
  { id: "rapport",              label: "Rapports financiers" },
  { id: "listeUsers",           label: "Gestion utilisateurs" },
  { id: "locations",            label: "Gestion destinations" },
  { id: "refunds",              label: "Remboursements" },
  { id: "promoCodes",           label: "Codes promo" },
];

type User = {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
  phone: string;
  permissions: string | string[];
};

// Convertit les permissions (CSV string ou tableau) en tableau propre
const parsePerms = (raw: string | string[] | undefined | null): string[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === "string") return raw.split(",").map(s => s.trim()).filter(Boolean);
  return [];
};

export default function RolesPage() {
  const { theme } = useTheme();
  const dark = theme === "dark";

  const [users, setUsers] = useState<User[]>([]);
  const [filtered, setFiltered] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [edits, setEdits] = useState<Record<number, { role: string; permissions: string[] }>>({});

  const token = localStorage.getItem("token");

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/roles-list`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      // Normaliser les permissions en tableau dès le chargement
      const normalized = (data.users || []).map((u: User) => ({
        ...u,
        permissions: parsePerms(u.permissions),
      }));
      setUsers(normalized);
      setFiltered(normalized);
    } catch {
      toast.error("Impossible de charger les utilisateurs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  useEffect(() => {
    if (!search) { setFiltered(users); return; }
    const q = search.toLowerCase();
    setFiltered(users.filter((u: User) =>
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    ));
  }, [search, users]);

  const getEdit = (u: User) =>
    edits[u.id] || { role: u.role, permissions: parsePerms(u.permissions) };

  const togglePermission = (userId: number, perm: string, user: User) => {
    const current = getEdit(user);
    const perms = current.permissions.includes(perm)
      ? current.permissions.filter(p => p !== perm)
      : [...current.permissions, perm];
    setEdits(e => ({ ...e, [userId]: { ...current, permissions: perms } }));
  };

  const setRole = (userId: number, role: string, user: User) => {
    const current = getEdit(user);
    setEdits(e => ({ ...e, [userId]: { ...current, role } }));
  };

  const selectAll = (userId: number, user: User) => {
    const current = getEdit(user);
    setEdits(e => ({ ...e, [userId]: { ...current, permissions: ALL_PERMISSIONS.map(p => p.id) } }));
  };

  const clearAll = (userId: number, user: User) => {
    const current = getEdit(user);
    setEdits(e => ({ ...e, [userId]: { ...current, permissions: [] } }));
  };

  const handleSave = async (user: User) => {
    const edit = getEdit(user);
    setSaving(user.id);
    try {
      const res = await fetch(`${API}/api/roles-list/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: edit.role, permissions: edit.permissions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Erreur serveur");
      toast.success(`✅ ${user.name} mis à jour avec succès`);
      // Réinitialiser l'état d'édition local pour ce user
      setEdits(e => { const next = { ...e }; delete next[user.id]; return next; });
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la sauvegarde");
    } finally {
      setSaving(null);
    }
  };

  const cardBg = dark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200";
  const textMain = dark ? "text-white" : "text-gray-900";
  const textSub = dark ? "text-slate-400" : "text-gray-500";

  const roleColor = (r: string) =>
    r === "admin"     ? "bg-purple-500/10 text-purple-500" :
    r === "operateur" ? "bg-blue-500/10 text-blue-500" :
                        "bg-gray-500/10 text-gray-500";

  return (
    <div className="p-6 space-y-6">
      {/* En-tête */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500">
          <ShieldCheck className="text-white" size={22} />
        </div>
        <div>
          <h1 className={`text-2xl font-bold ${textMain}`}>Gestion des Rôles & Permissions</h1>
          <p className={`text-sm ${textSub}`}>
            Configurez les rôles et permissions par utilisateur. Les modifications sont appliquées immédiatement à la prochaine connexion.
          </p>
        </div>
      </div>

      {/* Recherche */}
      <div className={`flex items-center gap-3 rounded-xl border px-4 py-2 ${cardBg}`}>
        <Search size={18} className={textSub} />
        <input
          type="text"
          placeholder="Rechercher par nom, email ou rôle..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className={`flex-1 bg-transparent outline-none text-sm ${textMain}`}
        />
        {search && (
          <button onClick={() => setSearch("")} className={`text-xs ${textSub} hover:text-red-400`}>
            Effacer
          </button>
        )}
      </div>

      {/* Liste des utilisateurs */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className={`text-center py-12 ${textSub}`}>
          Aucun utilisateur trouvé
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((user) => {
            const edit = getEdit(user);
            const isExpanded = expanded === user.id;
            const isModified = !!edits[user.id];

            return (
              <div key={user.id} className={`rounded-2xl border overflow-hidden ${cardBg}`}>
                {/* En-tête de la carte */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  onClick={() => setExpanded(isExpanded ? null : user.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                      {(user.name?.[0] || "U").toUpperCase()}
                    </div>
                    <div>
                      <p className={`font-semibold ${textMain}`}>{user.name}</p>
                      <p className={`text-xs ${textSub}`}>{user.email}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${roleColor(edit.role)}`}>
                      {edit.role}
                    </span>
                    <span className={`text-xs ${textSub}`}>
                      {parsePerms(user.permissions).length} permission(s)
                    </span>
                    {isModified && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-500">
                        Non sauvegardé
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {isModified && (
                      <button
                        onClick={e => { e.stopPropagation(); handleSave(user); }}
                        disabled={saving === user.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500 text-white text-xs font-medium hover:bg-green-600 disabled:opacity-50 transition-colors"
                      >
                        <Save size={13} />
                        {saving === user.id ? "Sauvegarde..." : "Sauvegarder"}
                      </button>
                    )}
                    {isExpanded
                      ? <ChevronUp size={18} className={textSub} />
                      : <ChevronDown size={18} className={textSub} />
                    }
                  </div>
                </div>

                {/* Contenu déplié */}
                {isExpanded && (
                  <div className={`border-t px-4 pb-5 space-y-5 ${dark ? "border-slate-700" : "border-gray-100"}`}>

                    {/* Rôle */}
                    <div className="pt-4">
                      <label className={`block text-xs font-semibold mb-2 uppercase tracking-wide ${textSub}`}>Rôle</label>
                      <div className="flex gap-3">
                        {["admin", "operateur", "agent"].map(r => (
                          <button
                            key={r}
                            onClick={() => setRole(user.id, r, user)}
                            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all capitalize ${
                              edit.role === r
                                ? "border-blue-500 bg-blue-500/10 text-blue-500"
                                : dark
                                  ? "border-slate-600 text-slate-300 hover:border-slate-500"
                                  : "border-gray-200 text-gray-600 hover:border-gray-300"
                            }`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Permissions */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className={`text-xs font-semibold uppercase tracking-wide ${textSub}`}>
                          Permissions ({edit.permissions.length}/{ALL_PERMISSIONS.length})
                        </label>
                        <div className="flex gap-3">
                          <button
                            onClick={() => selectAll(user.id, user)}
                            className="text-xs text-blue-500 hover:underline"
                          >
                            Tout sélectionner
                          </button>
                          <span className={textSub}>·</span>
                          <button
                            onClick={() => clearAll(user.id, user)}
                            className="text-xs text-red-400 hover:underline"
                          >
                            Tout effacer
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {ALL_PERMISSIONS.map(perm => {
                          const active = edit.permissions.includes(perm.id);
                          return (
                            <label
                              key={perm.id}
                              className={`flex items-center gap-2 p-2.5 rounded-lg cursor-pointer border transition-all ${
                                active
                                  ? "bg-blue-500/10 border-blue-500/40 text-blue-600 dark:text-blue-400"
                                  : dark
                                    ? "bg-slate-700/30 border-slate-600/30 text-slate-400"
                                    : "bg-gray-50 border-gray-200 text-gray-600"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={active}
                                onChange={() => togglePermission(user.id, perm.id, user)}
                                className="accent-blue-500 w-3.5 h-3.5 flex-shrink-0"
                              />
                              <span className="text-xs font-medium">{perm.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Bouton sauvegarder en bas */}
                    <button
                      onClick={() => handleSave(user)}
                      disabled={saving === user.id}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                      <Save size={16} />
                      {saving === user.id ? "Sauvegarde en cours..." : "Sauvegarder les modifications"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
