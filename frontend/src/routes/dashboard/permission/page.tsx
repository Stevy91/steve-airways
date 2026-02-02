import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

/* =======================
   DATA PERMISSIONS
======================= */
const permissionsData = [
    {
        id: "dashboard",
        label: "0 - DASHBOARD",
        children: [],
    },
    {
        id: "user",
        label: "1 - USER",
        children: [
            { id: "listeFlightsPlane", label: "1.1 - Listes Flights Plane" },
            { id: "listeBookingsPlane", label: "1.2 - Listes Bookings Plane" },
            { id: "listeFlightsHelico", label: "1.2 - Listes Flights Helico" },
            { id: "charter", label: "1.3 - Listes Charter" },
            { id: "listeBookingsHelico", label: "1.4 - Listes Bookings Helico" },
            { id: "listeUsers", label: "1.4 - Users" },
            { id: "addFlights", label: "1.5 - Add Flights" },
            { id: "deleteFlights", label: "1.6 - Delete Flights" },
            { id: "editFlights", label: "1.7 - Edit Flights" },
            { id: "reschedule", label: "1.7 - Reschedule Flight" },
            { id: "cancelFlight", label: "1.7 - Cancel Flights" },
            { id: "listePassagers", label: "1.8 - Listes Passagers" },
            { id: "editBookings", label: "1.9 - Edit Bookings" },
            { id: "imprimerTicket", label: "2.0 - Imprimer Ticket" },
            { id: "cancelledTicket", label: "2.1 - Cancelled Ticket" },
            { id: "createdTicket", label: "2.2 - Created Ticket" },
            { id: "manifestPdf", label: "2.3 - Manifest PDF" },
            { id: "rapport", label: "2.4 - Bookings Rapport" },
        ],
    },
];

/* =======================
   TYPES
======================= */
type PermissionGroup = {
    id: string;
    label: string;
    children: { id: string; label: string }[];
};

/* =======================
   COMPONENT
======================= */
export default function PermissionsPage() {
    const { userId: paramUserId } = useParams();
    const [userId, setUserId] = useState<string>(paramUserId || "");
    const [checked, setChecked] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [apiError, setApiError] = useState<string | null>(null);
    const [stats, setStats] = useState<any>(null);

    /* ---------- INITIALISATION ---------- */
    useEffect(() => {
        // Initialiser tous les checkboxes à false
        const initialChecked: Record<string, boolean> = {};

        permissionsData.forEach((group) => {
            initialChecked[group.id] = false;
            group.children.forEach((child) => {
                initialChecked[child.id] = false;
            });
        });

        setChecked(initialChecked);

        // Si on a un userId dans l'URL, charger ses permissions
        if (paramUserId) {
            loadUserPermissions();
        }
    }, [paramUserId]);

    /* ---------- TOGGLE ---------- */
    const togglePermission = (id: string, value: boolean) => {
        setChecked((prev) => ({
            ...prev,
            [id]: value,
        }));
    };

    const toggleGroup = (group: PermissionGroup, value: boolean) => {
        const updates: Record<string, boolean> = {};

        if (group.children.length > 0) {
            group.children.forEach((child) => {
                updates[child.id] = value;
            });
        } else {
            updates[group.id] = value;
        }

        setChecked((prev) => ({ ...prev, ...updates }));
    };

    /* ---------- BUILD PAYLOAD ---------- */
    const buildPermissionsPayload = () => {
        const payload: Record<string, boolean> = {};

        // Liste complète des permissions attendues par le backend
        const allPermissions = [
            "listeFlightsPlane",
            "listeBookingsPlane",
            "listeFlightsHelico",
            "listeBookingsHelico",
            "listeUsers",
            "charter",
            "addFlights",
            "rapport",
            "cancelledTicket",
            "editFlights",
            "listePassagers",
            "editBookings",
            "imprimerTicket",
            "createdTicket",
            "manifestPdf",
            "deleteFlights",
            "dashboard",
            "user",
            "reschedule",
            "cancelFlight",
        ];

        // S'assurer que toutes les permissions sont présentes
        allPermissions.forEach((permission) => {
            payload[permission] = checked[permission] === true;
        });

        return payload;
    };

    /* ---------- API CALL ---------- */
    const savePermissions = async () => {
        // Validation
        if (!userId || userId.trim() === "") {
            setError("Veuillez entrer un ID utilisateur");
            return;
        }

        try {
            setLoading(true);
            setSuccess(false);
            setError(null);
            setApiError(null);

            const permissions = buildPermissionsPayload();

            console.log("🚀 Envoi des permissions...");
            console.log("User ID:", userId);
            console.log("Permissions:", permissions);

            // Récupérer le token
            const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

            if (!token) {
                setError("Vous n'êtes pas connecté. Veuillez vous authentifier.");
                return;
            }

            const response = await fetch("https://steve-airways.onrender.com/api/roles/permissions", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    userId: userId.trim(),
                    permissions,
                }),
            });

            const data = await response.json();

            console.log("📥 Réponse:", data);

            if (!response.ok) {
                // Erreur d'authentification
                if (response.status === 401) {
                    localStorage.removeItem("authToken");
                    sessionStorage.removeItem("authToken");
                    setApiError("Session expirée. Veuillez vous reconnecter.");
                } else {
                    setApiError(data.message || `Erreur ${response.status}`);
                }
                return;
            }

            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
            console.error("❌ Erreur:", err);
            setApiError(err.message || "Erreur de connexion au serveur");
        } finally {
            setLoading(false);
        }
    };

    /* ---------- CHARGER LES PERMISSIONS EXISTANTES ---------- */
    const loadUserPermissions = async () => {
        if (!userId || userId.trim() === "") {
            setError("Veuillez entrer un ID utilisateur");
            return;
        }

        try {
            const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

            const response = await fetch(`https://steve-airways.onrender.com/api/users/${userId.trim()}/permissions`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });

            if (response.ok) {
                const data = await response.json();
                setStats(data);
                console.log("📥 Permissions chargées:", data);

                if (data.permissions) {
                    const newChecked = { ...checked };

                    // Si c'est une string CSV
                    if (typeof data.permissions === "string") {
                        const permissionsArray = data.permissions.split(",").map((p: string) => p.trim());

                        permissionsArray.forEach((permission: string) => {
                            if (permission) {
                                newChecked[permission] = true;
                            }
                        });
                    }
                    // Si c'est un objet JSON
                    else if (typeof data.permissions === "object") {
                        Object.entries(data.permissions).forEach(([key, value]) => {
                            newChecked[key] = value === true;
                        });
                    }

                    setChecked(newChecked);
                    setError(null);
                }
            } else if (response.status === 404) {
                setError("Utilisateur non trouvé");
            }
        } catch (error) {
            console.error("Erreur chargement permissions:", error);
            setError("Erreur de chargement");
        }
    };

    /* ---------- CHECKBOX GROUP ---------- */
    const isGroupChecked = (group: PermissionGroup) => {
        if (group.children.length === 0) {
            return checked[group.id] || false;
        }
        return group.children.every((c) => checked[c.id]);
    };

    /* =======================
     RENDER
  ======================= */
    return (
        <div style={{ padding: 20, maxWidth: 800 }}>
            <h2
                style={{
                    marginBottom: 40,
                    fontSize: 30,
                    fontWeight: "bold",
                }}
            >
                Managing permissions for the user <span className="text-red-600">{stats?.name}</span>
            </h2>

            {/* Champ utilisateur */}
            {/* <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <label style={{ minWidth: 100 }}>
            ID Utilisateur:
          </label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Ex: 3"
            style={{ 
              padding: "8px 12px", 
              border: "1px solid #ccc", 
              borderRadius: 4,
              width: 100 
            }}
          />
          <button 
            onClick={loadUserPermissions}
            style={{ 
              padding: "8px 16px", 
              backgroundColor: "#4CAF50", 
              color: "white", 
              border: "none", 
              borderRadius: 4,
              cursor: "pointer"
            }}
          >
            Charger permissions
          </button>
        </div>
        
        {error && (
          <div style={{ 
            color: "#721c24", 
            backgroundColor: "#f8d7da", 
            padding: "10px", 
            borderRadius: 4,
            marginTop: 10
          }}>
            ⚠️ {error}
          </div>
        )}
      </div> */}

            {/* Liste des permissions */}
            {permissionsData.map((group: PermissionGroup) => (
                <div
                    key={group.id}
                    style={{
                        marginBottom: 20,
                        border: "1px solid #e0e0e0",
                        padding: 20,
                        borderRadius: 8,
                        backgroundColor: "#fafafa",
                    }}
                >
                    <label style={{ display: "flex", alignItems: "center", marginBottom: 15 }}>
                        <input
                            type="checkbox"
                            checked={isGroupChecked(group)}
                            onChange={(e) => toggleGroup(group, e.target.checked)}
                            style={{
                                marginRight: 10,
                                width: 18,
                                height: 18,
                            }}
                        />
                        <strong style={{ fontSize: 16 }}>{group.label}</strong>
                    </label>

                    {group.children.length > 0 && (
                        <div
                            style={{
                                marginLeft: 10,
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
                                gap: 12,
                            }}
                        >
                            {group.children.map((child) => (
                                <label
                                    key={child.id}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        padding: "8px",
                                        backgroundColor: "white",
                                        borderRadius: 4,
                                        border: "1px solid #eee",
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={checked[child.id] || false}
                                        onChange={(e) => togglePermission(child.id, e.target.checked)}
                                        style={{
                                            marginRight: 10,
                                            width: 16,
                                            height: 16,
                                        }}
                                    />
                                    <span>{child.label}</span>
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            ))}

            {/* Bouton d'enregistrement */}
            <div style={{ marginTop: 30 }}>
                <button
                    className="rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3 font-bold text-white transition-colors duration-300 hover:from-amber-600 hover:to-amber-700"
                    onClick={savePermissions}
                    disabled={loading || !userId}
                    style={{
                        padding: "12px 24px",
                        backgroundColor: !userId ? "#ccc" : "#f59e0b",

                        cursor: loading || !userId ? "not-allowed" : "pointer",
                        opacity: loading ? 0.7 : 1,
                    }}
                >
                    {loading ? "⏳ Processing..." : "💾 Save permissions"}
                </button>

                {/* Messages */}
                {success && (
                    <div
                        style={{
                            color: "#155724",
                            backgroundColor: "#d4edda",
                            padding: "12px",
                            borderRadius: 4,
                            marginTop: 15,
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                        }}
                    >
                        <span style={{ fontSize: 20 }}>✅</span>
                        <span>Permissions enregistrées avec succès ! {stats.name}</span>
                    </div>
                )}

                {apiError && (
                    <div
                        style={{
                            color: "#721c24",
                            backgroundColor: "#f8d7da",
                            padding: "12px",
                            borderRadius: 4,
                            marginTop: 15,
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                        }}
                    >
                        <span style={{ fontSize: 20 }}>❌</span>
                        <span>Erreur API: {apiError}</span>
                    </div>
                )}
            </div>

            {/* Prévisualisation */}
            {/* <div style={{ 
                marginTop: 30, 
                padding: 20, 
                backgroundColor: "#f8f9fa", 
                borderRadius: 8,
                border: "1px solid #dee2e6"
            }}>
                <h3 style={{ marginTop: 0 }}>📋 Prévisualisation</h3>
                <p style={{ marginBottom: 10, color: "#6c757d" }}>
                Format qui sera enregistré dans la BDD :
                </p>
                <div style={{ 
                padding: 15, 
                backgroundColor: "white", 
                border: "1px solid #ced4da",
                borderRadius: 4,
                fontFamily: "'Courier New', monospace",
                fontSize: 14,
                minHeight: 60,
                wordBreak: "break-all"
                }}>
                {(() => {
                    const permissions = buildPermissionsPayload();
                    const activePermissions: string[] = [];
                    
                    Object.entries(permissions).forEach(([key, value]) => {
                    if (value === true) {
                        activePermissions.push(key);
                    }
                    });
                    
                    return activePermissions.join(', ') || 'Aucune permission activée';
                })()}
                </div>
                
                <div style={{ marginTop: 15, fontSize: 12, color: "#6c757d" }}>
                <strong>Note :</strong> Seules les permissions cochées seront enregistrées sous forme de texte (ex: "listeFlightsPlane, editBookings")
                </div>
            </div> */}

                    {/* Debug - Optionnel */}
                    {/* <details style={{ marginTop: 30 }}>
                            <summary style={{ 
                            cursor: "pointer", 
                            padding: "10px", 
                            backgroundColor: "#e9ecef", 
                            borderRadius: 4 
                            }}>
                            🔧 Mode Debug
                            </summary>
                            <div style={{ 
                                marginTop: 10, 
                                padding: 15, 
                                backgroundColor: "#f8f9fa", 
                                borderRadius: 4 
                                }}>
                                <pre style={{ 
                                    fontSize: 12, 
                                    backgroundColor: "white", 
                                    padding: 10, 
                                    borderRadius: 4,
                                    overflow: "auto"
                                }}>
                                    {JSON.stringify({
                                    userId,
                                    permissions: buildPermissionsPayload(),
                                    checkedState: checked
                                    }, null, 2)}
                                </pre>
                           </div>
                        </details> */}
        </div>
    );
}
