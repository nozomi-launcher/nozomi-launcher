import { init } from "@noriginmedia/norigin-spatial-navigation";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

init({
  // Focus the actual DOM node so CSS :focus styles work
  shouldFocusDOMNode: true,
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
