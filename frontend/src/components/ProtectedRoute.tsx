// components/ProtectedRoute.tsx
import { Navigate, useParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredPermission?: string;
    requiredAnyPermission?: string[];
    adminOnly?: boolean;
}

export default function ProtectedRoute({ 
    children, 
    requiredPermission,
    requiredAnyPermission,
    adminOnly = false 
}: ProtectedRouteProps) {
    const { user, loading, isAdmin, hasPermission, hasAnyPermission } = useAuth();
    const { lang } = useParams<{ lang: string }>();
    const currentLang = lang || "en";

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen">Chargement...</div>;
    }

    if (!user) {
        return <Navigate to={`/${currentLang}/login`} replace />;
    }

    if (adminOnly && !isAdmin) {
        return <Navigate to={`/${currentLang}/unauthorized`} replace />;
    }

    if (requiredPermission && !hasPermission(requiredPermission)) {
        return <Navigate to={`/${currentLang}/unauthorized`} replace />;
    }

    if (requiredAnyPermission && !hasAnyPermission(requiredAnyPermission)) {
        return <Navigate to={`/${currentLang}/unauthorized`} replace />;
    }

    return <>{children}</>;
}