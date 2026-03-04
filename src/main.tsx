import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";
import { FirebaseAuthGate } from "@/components/firebase-auth-gate";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <FirebaseAuthGate>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </FirebaseAuthGate>
  </StrictMode>,
);
