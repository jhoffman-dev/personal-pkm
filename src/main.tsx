import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";
import { store } from "@/store";
import { FirebaseAuthGate } from "@/components/firebase-auth-gate";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <FirebaseAuthGate>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </FirebaseAuthGate>
    </Provider>
  </StrictMode>,
);
