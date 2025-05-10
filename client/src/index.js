import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const qc = new QueryClient();

const container = document.getElementById("root");
const root = ReactDOM.createRoot(container);
root.render(
  <QueryClientProvider client={qc}>
    <App />
  </QueryClientProvider>
);
