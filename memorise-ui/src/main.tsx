import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ErrorBoundary } from "./presentation/components/shared/ErrorBoundary";
import { errorHandlingService } from "./infrastructure/services/ErrorHandlingService";
import { reportWebVitals } from "./shared/perf/webVitals";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource/dm-mono/400.css";
import "@fontsource/jacques-francois/400.css";
import "@fontsource/noto-sans/400.css";
import "./index.css";

const handleBoundaryError = (error: Error, errorInfo: React.ErrorInfo) => {
  const appError = errorHandlingService.handleApiError(error, {
    layer: "boundary",
    boundary: "App",
    componentStack: errorInfo.componentStack,
  });
  errorHandlingService.logError(appError, {
    boundary: "App",
    componentStack: errorInfo.componentStack,
  });
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ErrorBoundary onError={handleBoundaryError}>
        <App />
      </ErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>
);

// Report Web Vitals in development mode
if (import.meta.env.DEV) {
  reportWebVitals();
}
