import React from "react";
import { createRoot } from "react-dom/client";
import EditeurCCTP from "./EditeurCCTP.jsx";
export function mountCctp(container, bridge) {
  const root = createRoot(container);
  root.render(<EditeurCCTP bridge={bridge} />);
  return { destroy: () => root.unmount() };
}
