import { ThemeProvider } from "./contexts/theme-context";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import Layout from "./routes/dashboard/layout";
import LayoutHome from "./routes/layout";
import HomePage from "./routes/home/page";

import TravelInfoPage from "./routes/info/page";
import SupportPage from "./routes/support/page";
import FlightSelection from "./routes/flight/page";
import Passenger from "./routes/passenger/page";
import PaymentPage from "./routes/payment/page";
import ConfirmationPage from "./routes/confirmation/page";
import FlightTable from "./routes/dashboard/allflight/page";
import FlightTableHelico from "./routes/dashboard/allflighthelico/page";
import FaqPage from "./routes/faqs/page";
import "./lib/fontawesome";
import { CharterPage } from "./routes/charter/page";
import ViewBookingPlane from "./routes/dashboard/viewbookingplane/page";
import ViewBookingHelico from "./routes/dashboard/viewbookinghelico/page";
import Terms from "./routes/terms/page";
import Cookies from "./routes/cookies/page";
import Privacy from "./routes/privacy/page";
import Login from "./routes/login/page";

import Users from "./routes/dashboard/user/page";
import PermissionsPage from "./routes/dashboard/permission/page";
import Register from "./routes/dashboard/register/page";
import ViewBookingCharter from "./routes/dashboard/viewbookingcharter/page";
import FlightTableCharter from "./routes/dashboard/charter/page";
import BookingPending from "./routes/confirmationpending/page";
import BookingExpired from "./routes/confirmationexpired/page";
import Unauthorized from "./components/Unauthorized";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardIndexGuard from "./components/DashboardIndexGuard";

// ✅ Nouveaux modules
import LocationsPage from "./routes/dashboard/locations/page";
import ProfilePage from "./routes/dashboard/profile/page";
import ManualBookingPage from "./routes/dashboard/manualbooking/page";
import PassengersPage from "./routes/dashboard/passengers/page";
import RolesPage from "./routes/dashboard/roles/page";
import RefundsPage from "./routes/dashboard/refunds/page";
import AuditLogsPage from "./routes/dashboard/auditlogs/page";
import SettingsPage from "./routes/dashboard/settings/page";
import ReportsPage from "./routes/dashboard/reports/page";
import PromoCodesPage from "./routes/dashboard/promocodes/page";

const router = createBrowserRouter([
    {
        path: "/",
        element: <LayoutHome />,
        children: [
            {
                index: true,
                element: <Navigate to="/en" replace />,
            },
            { path: ":lang", element: <HomePage /> },
            { path: ":lang/info", element: <TravelInfoPage /> },
            { path: ":lang/faqs", element: <FaqPage /> },
            { path: ":lang/charter", element: <CharterPage /> },
            { path: ":lang/terms", element: <Terms /> },
            { path: ":lang/login", element: <Login /> },
            { path: ":lang/cookies", element: <Cookies /> },
            { path: ":lang/privacy", element: <Privacy /> },
            { path: ":lang/support", element: <SupportPage /> },
            { path: ":lang/flights", element: <FlightSelection /> },
            { path: ":lang/passenger", element: <Passenger /> },
            { path: ":lang/pay", element: <PaymentPage /> },
            { path: ":lang/confirmation", element: <ConfirmationPage /> },
            { path: ":lang/booking-pending/:bookingId", element: <BookingPending /> },
            { path: ":lang/booking-expired", element: <BookingExpired /> },
        ],
    },
    {
        path: ":lang/dashboard",
        element: (
            <ProtectedRoute>
                <Layout />
            </ProtectedRoute>
        ),
        children: [
            {
                index: true,
                element: <DashboardIndexGuard />,
            },
            {
                path: "analytics",
                element: (
                    <ProtectedRoute adminOnly>
                        <h1 className="title">Analytics</h1>
                    </ProtectedRoute>
                ),
            },
            {
                path: "flights",
                element: (
                    <ProtectedRoute requiredPermission="listeFlightsPlane">
                        <FlightTable />
                    </ProtectedRoute>
                ),
            },
            {
                path: "flights-helico",
                element: (
                    <ProtectedRoute requiredPermission="listeFlightsHelico">
                        <FlightTableHelico />
                    </ProtectedRoute>
                ),
            },
            {
                path: "bookings-plane",
                element: (
                    <ProtectedRoute requiredPermission="listeBookingsPlane">
                        <ViewBookingPlane />
                    </ProtectedRoute>
                ),
            },
            {
                path: "bookings-helico",
                element: (
                    <ProtectedRoute requiredPermission="listeBookingsHelico">
                        <ViewBookingHelico />
                    </ProtectedRoute>
                ),
            },
            {
                path: "flights-charter",
                element: (
                    <ProtectedRoute requiredPermission="charter">
                        <FlightTableCharter />
                    </ProtectedRoute>
                ),
            },
            {
                path: "bookings-charter",
                element: (
                    <ProtectedRoute requiredAnyPermission={["charter", "listeBookingsCharter"]}>
                        <ViewBookingCharter />
                    </ProtectedRoute>
                ),
            },
            {
                path: "register",
                element: (
                    <ProtectedRoute adminOnly>
                        <Register />
                    </ProtectedRoute>
                ),
            },
            {
                path: "airport",
                element: (
                    <ProtectedRoute requiredPermission="listeAirportsPlane">
                        <h1 className="title">Airport Airplane</h1>
                    </ProtectedRoute>
                ),
            },
            {
                path: "airport-helico",
                element: (
                    <ProtectedRoute requiredPermission="listeAirportsHelico">
                        <h1 className="title">Airport Helico</h1>
                    </ProtectedRoute>
                ),
            },
            {
                path: "user",
                element: (
                    <ProtectedRoute adminOnly>
                        <Users />
                    </ProtectedRoute>
                ),
            },
            {
                path: "permissions/:userId",
                element: (
                    <ProtectedRoute adminOnly>
                        <PermissionsPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: "roleUser",
                element: (
                    <ProtectedRoute adminOnly>
                        <RolesPage />
                    </ProtectedRoute>
                ),
            },

            // ✅ Nouveaux modules
            {
                path: "settings",
                element: (
                    <ProtectedRoute adminOnly>
                        <SettingsPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: "locations",
                element: (
                    <ProtectedRoute requiredPermission="locations">
                        <LocationsPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: "profile",
                element: (
                    <ProtectedRoute>
                        <ProfilePage />
                    </ProtectedRoute>
                ),
            },
            {
                path: "manual-booking",
                element: (
                    <ProtectedRoute requiredPermission="manualBooking">
                        <ManualBookingPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: "passengers",
                element: (
                    <ProtectedRoute requiredPermission="listePassagers">
                        <PassengersPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: "roles",
                element: (
                    <ProtectedRoute adminOnly>
                        <RolesPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: "refunds",
                element: (
                    <ProtectedRoute requiredPermission="refunds">
                        <RefundsPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: "audit-logs",
                element: (
                    <ProtectedRoute adminOnly>
                        <AuditLogsPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: "reports",
                element: (
                    <ProtectedRoute requiredPermission="rapport">
                        <ReportsPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: "promo-codes",
                element: (
                    <ProtectedRoute requiredPermission="promoCodes">
                        <PromoCodesPage />
                    </ProtectedRoute>
                ),
            },
        ],
    },
    {
        path: ":lang/unauthorized",
        element: <Unauthorized />,
    },
]);

export default function App() {
    return (
        <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
            <RouterProvider router={router} />
        </ThemeProvider>
    );
}
