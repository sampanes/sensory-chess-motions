import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { LevelCreator } from "./LevelCreator";

const isCreator = new URLSearchParams(window.location.search).has('creator');

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {isCreator ? <LevelCreator /> : <App />}
  </StrictMode>
);
