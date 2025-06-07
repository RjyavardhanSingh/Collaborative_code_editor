import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthProvider";
import { routes } from "./routes";
import SharedDocumentHandler from "./pages/shared/SharedDocumentHandler";

const renderRoutes = (routesArray) => {
  return routesArray.map((route) => {
    if (route.children) {
      return (
        <Route
          key={route.path || "nested"}
          path={route.path}
          element={route.element}
        >
          {renderRoutes(route.children)}
        </Route>
      );
    }
    return (
      <Route
        key={route.path || "*"}
        path={route.path}
        element={route.element}
      />
    );
  });
};

const App = () => {
  return (
    <AuthProvider>
      <Routes>
        {renderRoutes(routes)}
        <Route path="/shared/:token" element={<SharedDocumentHandler />} />
      </Routes>
    </AuthProvider>
  );
};

export default App;
