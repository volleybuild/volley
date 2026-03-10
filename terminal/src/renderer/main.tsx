import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "@fontsource/outfit/700.css";
import "./styles.css";
import "@xterm/xterm/css/xterm.css";
import "highlight.js/styles/github-dark.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
