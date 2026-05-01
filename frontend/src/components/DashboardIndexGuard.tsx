import { Navigate, useParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import DashboardPage from "../routes/dashboard/dashboard/page";

/**
 * Garde intelligente pour la page d'accueil du dashboard.
 *
 * — Si l'utilisateur a la permission "dashboard" (ou est admin) → affiche DashboardPage normalement.
 * — Sinon → redirige vers la première page à laquelle il a accès.
 * — Si aucune page accessible → redirige vers son profil (toujours disponible).
 */

// Routes classées par ordre de priorité
const PRIORITY_ROUTES = [
  { permission: "listeFlightsPlane",   path: "flights" },
  { permission: "listeFlightsHelico",  path: "flights-helico" },
  { permission: "charter",             path: "flights-charter" },
  { permission: "listeBookingsPlane",  path: "bookings-plane" },
  { permission: "listeBookingsHelico", path: "bookings-helico" },
  { permission: "manualBooking",       path: "manual-booking" },
  { permission: "listePassagers",      path: "passengers" },
  { permission: "locations",           path: "locations" },
  { permission: "rapport",             path: "reports" },
  { permission: "promoCodes",          path: "promo-codes" },
  { permission: "refunds",             path: "refunds" },
  { permission: "listeUsers",          path: "user" },
];

export default function DashboardIndexGuard() {
  const { hasPermission, loading, isAdmin, user } = useAuth();
  const { lang } = useParams<{ lang: string }>();
  const currentLang = lang || "en";

  // Pendant le chargement de l'auth, afficher un spinner
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  // Pas connecté → login
  if (!user) {
    return <Navigate to={`/${currentLang}/login`} replace />;
  }

  // Admin ou permission dashboard → page d'accueil normale
  if (isAdmin || hasPermission("dashboard")) {
    return <DashboardPage />;
  }

  // Trouver la première page accessible
  for (const route of PRIORITY_ROUTES) {
    if (hasPermission(route.permission)) {
      return <Navigate to={`/${currentLang}/dashboard/${route.path}`} replace />;
    }
  }

  // Aucune permission → profil (toujours accessible)
  return <Navigate to={`/${currentLang}/dashboard/profile`} replace />;
}
