import { ThemeProvider } from "./contexts/theme-context";
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from "react-router-dom";
import Layout from "./routes/dashboard/layout";
import DashboardPage from "./routes/dashboard/dashboard/page";
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
import "./lib/fontawesome"; // important
import { CharterPage } from "./routes/charter/page";
import ViewBookingPlane from "./routes/dashboard/viewbookingplane/page";
import ViewBookingHelico from "./routes/dashboard/viewbookinghelico/page";

// export default function App() {
//   const router = createBrowserRouter([
//     {
//       path: "/",
//       element: <LayoutHome />,
//       children: [
//         {
//           index: true,
//           element: <Navigate to="/en" replace />,
//         },
//         {
//           path: ":lang",
//           element: <HomePage />,
//         },
//         {
//           path: ":lang/info",
//           element: <TravelInfoPage />,
//         },
//         {
//           path: ":lang/faqs",
//           element: <FaqPage />,
//         },
//         {
//           path: ":lang/charter",
//           element: <CharterPage />,
//         },
//         {
//           path: ":lang/support",
//           element: <SupportPage />,
//         },
//         {
//           path: ":lang/flights",
//           element: <FlightSelection />,
//         },
//         {
//           path: ":lang/passenger",
//           element: <Passenger />,
//         },
//         {
//           path: ":lang/pay",
//           element: <PaymentPage />,
//         },
//         {
//           path: ":lang/confirmation",
//           element: <ConfirmationPage />,
//         },
//       ],
//     },
//     {
//       path: ":lang/dashboard",
//       element: <Layout />,
//       children: [
//         { index: true, element: <DashboardPage /> },
//         { path: "analytics", element: <h1 className="title">Analytics</h1> },
//         { path: "reports", element: <h1 className="title">Reports</h1> },
//         { path: "flights", element: <FlightTable /> },
//         { path: "flights-helico", element: <FlightTableHelico /> },
//         { path: "seat-type", element: <h1 className="title">Seat Type</h1> },
//         {
//           path: "airport",
//           element: <h1 className="title">Airport Airplane</h1>,
//         },
//         {
//           path: "airport-helico",
//           element: <h1 className="title">Airport Helico</h1>,
//         },
//         { path: "user", element: <h1 className="title">All Users</h1> },
//         { path: "roleUser", element: <h1 className="title">Role</h1> },
//         { path: "settings", element: <h1 className="title">Settings</h1> },
//       ],
//     },
//   ]);

//   return (
//     <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
//       <RouterProvider router={router} />
//     </ThemeProvider>
//   );
// }

const router = createBrowserRouter([
  {
    path: "/",
    element: <LayoutHome />,
    children: [
      {
        index: true,
        element: <Navigate to="/en" replace />,
      },
      {
        path: ":lang",
        element: <HomePage />,
      },
      {
        path: ":lang/info",
        element: <TravelInfoPage />,
      },
      {
        path: ":lang/faqs",
        element: <FaqPage />,
      },
      {
        path: ":lang/charter",
        element: <CharterPage />,
      },
      {
        path: ":lang/support",
        element: <SupportPage />,
      },
      {
        path: ":lang/flights",
        element: <FlightSelection />,
      },
      {
        path: ":lang/passenger",
        element: <Passenger />,
      },
      {
        path: ":lang/pay",
        element: <PaymentPage />,
      },
      {
        path: ":lang/confirmation",
        element: <ConfirmationPage />,
      },
    ],
  },
  {
    path: ":lang/dashboard",
    element: <Layout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "analytics", element: <h1 className="title">Analytics</h1> },
      { path: "reports", element: <h1 className="title">Reports</h1> },
      { path: "flights", element: <FlightTable /> },
      { path: "flights-helico", element: <FlightTableHelico /> },
      { path: "bookings-plane", element: <ViewBookingPlane /> },
      { path: "bookings-helico", element: <ViewBookingHelico /> },
      { path: "airport", element: <h1 className="title">Airport Airplane</h1> },
      { path: "airport-helico", element: <h1 className="title">Airport Helico</h1> },
      { path: "user", element: <h1 className="title">All Users</h1> },
      { path: "roleUser", element: <h1 className="title">Role</h1> },
      { path: "settings", element: <h1 className="title">Settings</h1> },
    ],
  },
]);

export default function App() {
return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}
