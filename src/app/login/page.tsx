"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/lib/actions/auth";
import { IconLeaf } from "@/components/icons";

const initial: LoginState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initial);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div className="card" style={{ width: 360, maxWidth: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: "var(--radius-md)",
              background: "var(--success-bg)",
              color: "var(--success-text)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconLeaf size={20} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 500 }}>Pampa</p>
            <p style={{ margin: 0, fontSize: 12, color: "var(--text-tertiary)" }}>Ingresá a tu campo</p>
          </div>
        </div>

        <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Email">
            <input name="email" type="email" autoComplete="username" placeholder="juan@laesperanza.ar" style={inputStyle} />
          </Field>
          <Field label="Contraseña">
            <input name="password" type="password" autoComplete="current-password" placeholder="••••••••" style={inputStyle} />
          </Field>

          {state.error && (
            <p style={{ margin: 0, fontSize: 12, color: "var(--warning-text)" }}>{state.error}</p>
          )}

          <button type="submit" className="btn" disabled={pending} style={{ justifyContent: "center", marginTop: 4 }}>
            {pending ? "Ingresando…" : "Ingresar"}
          </button>
        </form>

        <div style={{ marginTop: 16, paddingTop: 14, borderTop: "0.5px solid var(--border)", fontSize: 11, color: "var(--text-tertiary)", lineHeight: 1.6 }}>
          <strong style={{ color: "var(--text-secondary)" }}>Usuarios de demo</strong> (contraseña <code>campo1234</code>):<br />
          juan@laesperanza.ar · dueño<br />
          marcos@laesperanza.ar · encargado<br />
          luis@laesperanza.ar · peón
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, color: "var(--text-secondary)" }}>
      {label}
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  height: 38,
  padding: "0 12px",
  borderRadius: "var(--radius-md)",
  border: "0.5px solid var(--border-strong)",
  background: "var(--bg-primary)",
  color: "var(--text-primary)",
  fontSize: 14,
};
