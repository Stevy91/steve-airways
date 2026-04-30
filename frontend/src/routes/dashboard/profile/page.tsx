import { useState, useEffect } from "react";
import { UserCircle, Lock, Phone, Mail, Save, Eye, EyeOff } from "lucide-react";
import { useTheme } from "../../../contexts/theme-context";
import toast from "react-hot-toast";

const API = "https://steve-airways.onrender.com";

export default function ProfilePage() {
  const { theme } = useTheme();
  const dark = theme === "dark";

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${API}/api/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setProfile(data);
        setName(data.name || "");
        setPhone(data.phone || "");
      } catch { toast.error("Impossible de charger le profil"); }
      finally { setLoading(false); }
    };
    fetchProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPwd && newPwd !== confirmPwd) return toast.error("Les mots de passe ne correspondent pas");
    if (newPwd && newPwd.length < 6) return toast.error("Le mot de passe doit faire au moins 6 caractères");
    setSaving(true);
    try {
      const body: any = { name, phone };
      if (newPwd) { body.current_password = currentPwd; body.new_password = newPwd; }
      const res = await fetch(`${API}/api/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Profil mis à jour !");
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const cardBg = dark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200";
  const textMain = dark ? "text-white" : "text-gray-900";
  const textSub = dark ? "text-slate-400" : "text-gray-500";
  const inputCls = `w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${dark ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400" : "bg-gray-50 border-gray-300 text-gray-900"}`;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
    </div>
  );

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500">
          <UserCircle className="text-white" size={22} />
        </div>
        <div>
          <h1 className={`text-2xl font-bold ${textMain}`}>Mon Profil</h1>
          <p className={`text-sm ${textSub}`}>Gérez vos informations personnelles</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Infos générales */}
        <div className={`rounded-2xl border p-6 space-y-4 ${cardBg}`}>
          <h2 className={`font-semibold text-base flex items-center gap-2 ${textMain}`}>
            <UserCircle size={18} className="text-blue-500" /> Informations générales
          </h2>

          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
              <span className="text-2xl font-bold text-white">{(name[0] || "U").toUpperCase()}</span>
            </div>
            <div>
              <p className={`font-semibold ${textMain}`}>{name || "Utilisateur"}</p>
              <p className={`text-sm flex items-center gap-1 ${textSub}`}><Mail size={13} />{profile?.email}</p>
              <span className="mt-1 inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-500">{profile?.role}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={`block text-xs font-semibold mb-1 ${textSub}`}>Nom complet</label>
              <input className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder="Votre nom" />
            </div>
            <div>
              <label className={`block text-xs font-semibold mb-1 ${textSub}`}>Téléphone</label>
              <div className="relative">
                <Phone size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textSub}`} />
                <input className={`${inputCls} pl-8`} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+509 xxxx-xxxx" />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className={`block text-xs font-semibold mb-1 ${textSub}`}>Email (non modifiable)</label>
              <div className="relative">
                <Mail size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textSub}`} />
                <input className={`${inputCls} pl-8 opacity-60 cursor-not-allowed`} value={profile?.email || ""} readOnly />
              </div>
            </div>
          </div>
        </div>

        {/* Mot de passe */}
        <div className={`rounded-2xl border p-6 space-y-4 ${cardBg}`}>
          <h2 className={`font-semibold text-base flex items-center gap-2 ${textMain}`}>
            <Lock size={18} className="text-purple-500" /> Changer le mot de passe
          </h2>
          <p className={`text-xs ${textSub}`}>Laissez ces champs vides si vous ne souhaitez pas changer votre mot de passe.</p>
          <div>
            <label className={`block text-xs font-semibold mb-1 ${textSub}`}>Mot de passe actuel</label>
            <div className="relative">
              <input type={showCurrent ? "text" : "password"} className={`${inputCls} pr-10`} value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} placeholder="••••••••" />
              <button type="button" onClick={() => setShowCurrent(s => !s)} className={`absolute right-3 top-1/2 -translate-y-1/2 ${textSub}`}>
                {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={`block text-xs font-semibold mb-1 ${textSub}`}>Nouveau mot de passe</label>
              <div className="relative">
                <input type={showNew ? "text" : "password"} className={`${inputCls} pr-10`} value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="Min. 6 caractères" />
                <button type="button" onClick={() => setShowNew(s => !s)} className={`absolute right-3 top-1/2 -translate-y-1/2 ${textSub}`}>
                  {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div>
              <label className={`block text-xs font-semibold mb-1 ${textSub}`}>Confirmer</label>
              <input type="password" className={inputCls} value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} placeholder="Répétez le mot de passe" />
            </div>
          </div>
        </div>

        <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold hover:opacity-90 disabled:opacity-50 transition-all">
          <Save size={18} /> {saving ? "Sauvegarde en cours..." : "Sauvegarder les modifications"}
        </button>
      </form>
    </div>
  );
}
