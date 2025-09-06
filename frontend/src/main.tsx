import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom"; // <-- ajout
import "./lib/fontawesome";
import "./index.css";
import App from "./App";
import "./i18n";
import { Toaster } from "react-hot-toast";


createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Toaster position="bottom-right" reverseOrder={false} />
    <App />
  </StrictMode>
);
