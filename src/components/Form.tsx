import Link from "next/link";
import { IconArrowLeft } from "@/components/icons";

export const fieldStyle: React.CSSProperties = {
  height: 38,
  padding: "0 12px",
  borderRadius: "var(--radius-md)",
  border: "0.5px solid var(--border-strong)",
  background: "var(--bg-primary)",
  color: "var(--text-primary)",
  fontSize: 14,
  width: "100%",
};

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, color: "var(--text-secondary)" }}>
      {label}
      {children}
      {hint && <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{hint}</span>}
    </label>
  );
}

export function FormPage({
  title,
  backHref,
  children,
}: {
  title: string;
  backHref: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ maxWidth: 480 }}>
      <Link href={backHref} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-secondary)", marginBottom: 12 }}>
        <IconArrowLeft size={14} /> Volver
      </Link>
      <h2 className="section-title">{title}</h2>
      <div className="card">{children}</div>
    </div>
  );
}

export function FormActions({ submitLabel }: { submitLabel: string }) {
  return (
    <div style={{ marginTop: 6 }}>
      <button type="submit" className="btn" style={{ justifyContent: "center", width: "100%" }}>
        {submitLabel}
      </button>
    </div>
  );
}
