import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import AppLayout from "./AppLayout";

import { DevTools } from 'jotai-devtools'
import 'jotai-devtools/styles.css'
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'; 
ModuleRegistry.registerModules([AllCommunityModule]);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AppLayout>
      <DevTools/>
      <App />
    </AppLayout>
  </React.StrictMode>,
);
