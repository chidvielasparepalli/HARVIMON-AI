import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AgentProvider } from "./context/AgentContext.jsx";
import App from "./App.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AgentProvider>
      <App />
    </AgentProvider>
  </StrictMode>
);