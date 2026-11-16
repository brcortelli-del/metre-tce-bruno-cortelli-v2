import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
export function Modal({ title, subtitle, onClose, children, wide = false, drawer = false, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current,
      prev = document.activeElement;
    d.showModal();
    return () => {
      d.close();
      if (prev?.isConnected) prev.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      className={"ux-modal " + (wide ? "ux-modal-wide " : "") + (drawer ? "ux-modal-drawer " : "") + className}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="ux-modal-heading">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <button
          className="ux-icon-button"
          aria-label="Fermer la fenêtre"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      <div className="ux-modal-body">{children}</div>
    </dialog>
  );
}
export const LotBadge = ({ lot, palette }) => (
  <span
    className="ux-lot-badge"
    style={{ "--lot-color": palette.color, "--lot-tint": palette.tint }}
  >
    <i />
    {lot}
  </span>
);
