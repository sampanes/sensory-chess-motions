import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { LevelCreator } from "./LevelCreator";
import AdventureApp from "./AdventureApp";

const params = new URLSearchParams(window.location.search);
const isCreator  = params.has('creator');
const isAdventure = params.has('adventure');

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {isCreator ? <LevelCreator /> : isAdventure ? <AdventureApp /> : <App />}
  </StrictMode>
);
