import { ThemeProvider } from "./contexts/theme-context";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
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





export default function App() {
      const router = createBrowserRouter([
        {
            path: "/",
            element: <LayoutHome />,
            children: [
                {
                    index: true,
                    element: <HomePage />,
                },
               
                {
                    path: "info",
                    element: <TravelInfoPage/>,
                },
                {
                    path: "support",
                    element: <SupportPage/>,
                },
                {
                    path: "flights",
                    element: <FlightSelection/>,
                },

                {
                    path: "passenger",
                    element: <Passenger/>,
                },
                {
                    path: "pay",
                    element: <PaymentPage/>,
                },
                
                {
                    path: "confirmation",
                    element: <ConfirmationPage/>,
                },
               
              
               
            ],
        },
        {
            path: "/dashboard",
            element: <Layout />,
            children: [
                {
                    index: true,
                    element: <DashboardPage />,
                },
                {
                    path: "analytics",
                    element: <h1 className="title">Analytics</h1>,
                },
                {
                    path: "reports",
                    element: <h1 className="title">Reports</h1>,
                },
                 {
                    path: "flights",
                    element: <FlightTable/>,
                },
               
               
                {
                    path: "seat-type",
                    element: <h1 className="title">Seat Type</h1>,
                },
                {
                    path: "airport",
                    element: <h1 className="title">Airport Airplane</h1>,
                },
                {
                    path: "flights-helico",
                    element: <FlightTableHelico/>,
                },
               
                {
                    path: "airport-helico",
                    element: <h1 className="title">Airport Helico</h1>,
                },
                {
                    path: "user",
                    element: <h1 className="title">All Users</h1>,
                },
                {
                    path: "roleUser",
                    element: <h1 className="title">Role</h1>,
                },
                {
                    path: "settings",
                    element: <h1 className="title">Settings</h1>,
                },
            ],
        },
    ]);

    return (
        <ThemeProvider
            defaultTheme="light"
            storageKey="vite-ui-theme"
        >
            <RouterProvider router={router} />
        </ThemeProvider>
    );
}
