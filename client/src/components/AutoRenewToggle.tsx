import React from "react";
import { useState, useEffect } from "react";

type Props = { memberId: string };

export default function AutoRenewToggle({ memberId }: Props) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchStatus() {
      const res = await fetch(`/api/admin/members/${memberId}/auto-renew`, { credentials: "include" });
      const json = await res.json();
      setEnabled(json?.member?.auto_renew ?? false);
    }
    fetchStatus().catch(console.error);
  }, [memberId]);

  async function toggle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/members/${memberId}/auto-renew`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ enabled: !enabled }),
      });
      const json = await res.json();
      setEnabled(json.member?.auto_renew ?? null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (enabled === null) return <div>Loading...</div>;

  return (
    <div>
      <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input type="checkbox" checked={enabled} onChange={toggle} disabled={loading} />
        <span>{enabled ? "Auto-renew enabled" : "Auto-renew disabled"}</span>
      </label>
    </div>
  );
}
