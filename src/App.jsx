import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── Supabase Client ──────────────────────────────────────────
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ─── Hooks ────────────────────────────────────────────────────

function useDashboardStats() {
  const [stats, setStats] = useState({ totalBetToday: 0, totalWinToday: 0, totalMembers: 0, pendingWithdrawCount: 0, pendingWithdrawAmount: 0 });
  const [loading, setLoading] = useState(true);
  const fetch = useCallback(async () => {
    setLoading(true);
    const today = new Date().toISOString().split("T")[0];
    const [mRes, bRes, wRes] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact" }).eq("role", "player"),
      supabase.from("bet_slips").select("total_amount,total_win").gte("created_at", today),
      supabase.from("transactions").select("amount", { count: "exact" }).eq("type", "withdraw").eq("status", "pending"),
    ]);
    setStats({
      totalBetToday: bRes.data?.reduce((s, r) => s + (r.total_amount || 0), 0) || 0,
      totalWinToday: bRes.data?.reduce((s, r) => s + (r.total_win || 0), 0) || 0,
      totalMembers: mRes.count || 0,
      pendingWithdrawCount: wRes.count || 0,
      pendingWithdrawAmount: wRes.data?.reduce((s, r) => s + (r.amount || 0), 0) || 0,
    });
    setLoading(false);
  }, []);
  useEffect(() => { fetch(); }, [fetch]);
  return { stats, loading, refresh: fetch };
}

function useMembers() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("id,username,full_name,phone,role,status,balance,created_at,agent:agent_id(username)")
      .order("created_at", { ascending: false });
    if (data) setMembers(data);
    setLoading(false);
  }, []);
  useEffect(() => { fetch(); }, [fetch]);

  async function addMember({ username, full_name, password, phone, role = "player" }) {
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: `${username}@lottery.local`,
      password,
      user_metadata: { username, full_name, phone },
    });
    if (authErr) return { error: authErr };
    const { error } = await supabase.from("profiles").insert({
      id: authData.user.id, username, full_name, phone, role,
    });
    if (!error) fetch();
    return { error };
  }

  async function updateStatus(id, status) {
    const { error } = await supabase.from("profiles").update({ status }).eq("id", id);
    if (!error) fetch();
    return { error };
  }

  return { members, loading, refresh: fetch, addMember, updateStatus };
}

function useLotteryGroups() {
  const [groups, setGroups] = useState([]);
  useEffect(() => {
    supabase.from("lottery_groups").select("*").order("sort_order").then(({ data }) => { if (data) setGroups(data); });
  }, []);
  return { groups };
}

function useLotteryDraws(groupId) {
  const [draws, setDraws] = useState([]);
  const [loading, setLoading] = useState(true);
  const fetch = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("lottery_draws").select("*,lottery_group:lottery_group_id(name,slug)").order("draw_date", { ascending: false }).limit(20);
    if (groupId) q = q.eq("lottery_group_id", groupId);
    const { data } = await q;
    if (data) setDraws(data);
    setLoading(false);
  }, [groupId]);
  useEffect(() => { fetch(); }, [fetch]);

  async function updateStatus(id, status) {
    const { error } = await supabase.from("lottery_draws").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    if (!error) fetch();
    return { error };
  }

  async function setResult(id, result) {
    const { data, error } = await supabase.rpc("process_lottery_results", {
      p_draw_id: id,
      p_result_three_top: result.three_top,
      p_result_three_front1: result.three_front1,
      p_result_three_front2: result.three_front2,
      p_result_three_bottom1: result.three_bottom1,
      p_result_three_bottom2: result.three_bottom2,
      p_result_two_top: result.two_top,
      p_result_two_bottom: result.two_bottom,
    });
    if (!error) fetch();
    return { data, error };
  }

  return { draws, loading, refresh: fetch, updateStatus, setResult };
}

function useRateSettings() {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("rate_settings").select("*").order("bet_type");
    if (data) setRates(data);
    setLoading(false);
  }, []);
  useEffect(() => { fetch(); }, [fetch]);

  async function updateRate(id, payout_rate) {
    const { error } = await supabase.from("rate_settings").update({ payout_rate, updated_at: new Date().toISOString() }).eq("id", id);
    if (!error) fetch();
    return { error };
  }

  return { rates, loading, refresh: fetch, updateRate };
}

function useNumberLimits(drawId) {
  const [limits, setLimits] = useState([]);
  const [loading, setLoading] = useState(true);
  const fetch = useCallback(async () => {
    if (!drawId) { setLimits([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase.from("number_limits").select("*").eq("lottery_draw_id", drawId).order("created_at", { ascending: false });
    if (data) setLimits(data);
    setLoading(false);
  }, [drawId]);
  useEffect(() => { fetch(); }, [fetch]);

  async function addLimit(form) {
    const { error } = await supabase.from("number_limits").upsert({
      lottery_draw_id: drawId,
      bet_type: form.betType,
      number: form.number,
      original_limit: form.limit ? Number(form.limit) : null,
      remaining_limit: form.limit ? Number(form.limit) : null,
      payout_rate_override: form.rateOverride ? Number(form.rateOverride) : null,
      is_closed: form.isClosed,
      updated_at: new Date().toISOString(),
    }, { onConflict: "lottery_draw_id,bet_type,number" });
    if (!error) fetch();
    return { error };
  }

  async function removeLimit(id) {
    const { error } = await supabase.from("number_limits").delete().eq("id", id);
    if (!error) fetch();
    return { error };
  }

  return { limits, loading, refresh: fetch, addLimit, removeLimit };
}

function useBetSlips() {
  const [slips, setSlips] = useState([]);
  const [loading, setLoading] = useState(true);
  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("bet_slips")
      .select("*,user:user_id(username,phone),draw:lottery_draw_id(draw_date,lottery_group:lottery_group_id(name)),bet_items(*)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (data) setSlips(data);
    setLoading(false);
  }, []);
  useEffect(() => {
    fetch();
    const ch = supabase.channel("bet_slips_rt").on("postgres_changes", { event: "*", schema: "public", table: "bet_slips" }, fetch).subscribe();
    return () => supabase.removeChannel(ch);
  }, [fetch]);
  return { slips, loading, refresh: fetch };
}

function useTransactions(typeFilter) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const fetch = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("transactions").select("*,user:user_id(username,phone,full_name),bank_account:bank_account_id(bank_name,account_number)").order("created_at", { ascending: false }).limit(100);
    if (typeFilter) q = q.eq("type", typeFilter);
    const { data } = await q;
    if (data) setTransactions(data);
    setLoading(false);
  }, [typeFilter]);
  useEffect(() => {
    fetch();
    const ch = supabase.channel("transactions_rt").on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, fetch).subscribe();
    return () => supabase.removeChannel(ch);
  }, [fetch]);

  async function approve(id) {
    const { error } = await supabase.from("transactions").update({ status: "approved", approved_at: new Date().toISOString() }).eq("id", id);
    if (!error) fetch();
    return { error };
  }

  async function reject(id) {
    const { error } = await supabase.from("transactions").update({ status: "rejected" }).eq("id", id);
    if (!error) fetch();
    return { error };
  }

  return { transactions, loading, refresh: fetch, approve, reject };
}

function useDailySummary() {
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("daily_summary").select("*,lottery_group:lottery_group_id(name)").order("summary_date", { ascending: false }).limit(30);
    if (data) setSummary(data);
    setLoading(false);
  }, []);
  useEffect(() => { fetch(); }, [fetch]);
  return { summary, loading, refresh: fetch };
}

// ─── UI Helpers ───────────────────────────────────────────────

const BET_TYPE_LABELS = {
  three_top: "3 ตัวบน", three_front: "3 ตัวหน้า", three_bottom: "3 ตัวล่าง",
  three_tod: "3 ตัวโต๊ด", two_top: "2 ตัวบน", two_bottom: "2 ตัวล่าง",
  two_tod: "2 ตัวโต๊ด", run_top: "วิ่งบน", run_bottom: "วิ่งล่าง",
};

const BET_TYPES = Object.entries(BET_TYPE_LABELS).map(([id, label]) => ({ id, label }));

const Icon = ({ name, size = 18 }) => {
  const icons = {
    dashboard: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
    members: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75",
    lottery: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
    bet: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
    finance: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    report: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    settings: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
    add: "M12 4v16m8-8H4",
    search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
    close: "M6 18L18 6M6 6l12 12",
    refresh: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
    edit: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
    logout: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
    win: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z",
    deposit: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
    withdraw: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z",
  };
  return (
    <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      {(icons[name] || "").split(" M").map((d, i) => <path key={i} d={i === 0 ? d : "M" + d} />)}
    </svg>
  );
};

const Badge = ({ status }) => {
  const map = {
    open:      { bg: "#0d4f2b", color: "#4ade80", text: "เปิดรับแทง" },
    upcoming:  { bg: "#1e3a5f", color: "#60a5fa", text: "เร็วๆนี้" },
    resulted:  { bg: "#2d1b4e", color: "#a78bfa", text: "ออกผลแล้ว" },
    closed:    { bg: "#4a1414", color: "#f87171", text: "ปิดรับ" },
    cancelled: { bg: "#3d2a00", color: "#fbbf24", text: "ยกเลิก" },
    active:    { bg: "#0d4f2b", color: "#4ade80", text: "Active" },
    Active:    { bg: "#0d4f2b", color: "#4ade80", text: "Active" },
    inactive:  { bg: "#1e293b", color: "#94a3b8", text: "Inactive" },
    suspended: { bg: "#4a1414", color: "#f87171", text: "ระงับ" },
    approved:  { bg: "#0d4f2b", color: "#4ade80", text: "อนุมัติ" },
    pending:   { bg: "#3d2a00", color: "#fbbf24", text: "รอดำเนินการ" },
    rejected:  { bg: "#4a1414", color: "#f87171", text: "ปฏิเสธ" },
    processing:{ bg: "#1e3a5f", color: "#60a5fa", text: "กำลังดำเนินการ" },
    won:       { bg: "#0d4f2b", color: "#4ade80", text: "ถูกรางวัล" },
    lost:      { bg: "#4a1414", color: "#f87171", text: "ไม่ถูก" },
    deposit:   { bg: "#0d3d2b", color: "#34d399", text: "ฝากเงิน" },
    withdraw:  { bg: "#3d1a00", color: "#fb923c", text: "ถอนเงิน" },
    win:       { bg: "#0d4f2b", color: "#4ade80", text: "รางวัล" },
    player:    { bg: "#1e293b", color: "#94a3b8", text: "ผู้เล่น" },
    agent:     { bg: "#1e3a5f", color: "#60a5fa", text: "เอเย่นต์" },
    admin:     { bg: "#2d1b4e", color: "#a78bfa", text: "แอดมิน" },
  };
  const cfg = map[status] || { bg: "#1e293b", color: "#94a3b8", text: status };
  return (
    <span style={{ background: cfg.bg, color: cfg.color, padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
      {cfg.text}
    </span>
  );
};

const StatCard = ({ label, value, sub, color = "#00d4aa", icon }) => (
  <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: "18px 20px", flex: 1, minWidth: 160 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
      <span style={{ color, opacity: 0.7 }}><Icon name={icon} size={16} /></span>
      <span style={{ color: "#64748b", fontSize: 13 }}>{label}</span>
    </div>
    <div style={{ color, fontSize: 26, fontWeight: 800, fontFamily: "monospace", letterSpacing: -1 }}>{value}</div>
    {sub && <div style={{ color: "#475569", fontSize: 12, marginTop: 4 }}>{sub}</div>}
  </div>
);

const Spinner = () => (
  <div style={{ textAlign: "center", padding: 40, color: "#475569" }}>กำลังโหลด...</div>
);

const Table = ({ columns, data }) => (
  <div style={{ overflowX: "auto" }}>
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <thead>
        <tr>
          {columns.map((col, i) => (
            <th key={i} style={{ background: "#0f172a", color: "#64748b", padding: "10px 12px", textAlign: "left", borderBottom: "1px solid #1e293b", whiteSpace: "nowrap", fontWeight: 600 }}>
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.length === 0
          ? <tr><td colSpan={columns.length} style={{ color: "#475569", textAlign: "center", padding: 32 }}>ไม่มีข้อมูล</td></tr>
          : data.map((row, ri) => (
            <tr key={ri} style={{ borderBottom: "1px solid #0f172a" }}>
              {columns.map((col, ci) => (
                <td key={ci} style={{ padding: "10px 12px", color: "#cbd5e1", whiteSpace: "nowrap" }}>
                  {col.render ? col.render(row[col.key], row) : (row[col.key] ?? "-")}
                </td>
              ))}
            </tr>
          ))}
      </tbody>
    </table>
  </div>
);

const Modal = ({ title, onClose, children }) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
    <div style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 16, padding: 28, width: 480, maxWidth: "90vw", maxHeight: "90vh", overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <span style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>{title}</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer" }}><Icon name="close" /></button>
      </div>
      {children}
    </div>
  </div>
);

const Input = ({ label, ...props }) => (
  <div>
    {label && <div style={{ color: "#64748b", fontSize: 12, marginBottom: 6 }}>{label}</div>}
    <input {...props} style={{ width: "100%", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "9px 12px", color: "#cbd5e1", outline: "none", boxSizing: "border-box", fontFamily: "inherit", fontSize: 13 }} />
  </div>
);

const Select = ({ label, children, ...props }) => (
  <div>
    {label && <div style={{ color: "#64748b", fontSize: 12, marginBottom: 6 }}>{label}</div>}
    <select {...props} style={{ width: "100%", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "9px 12px", color: "#cbd5e1", outline: "none", boxSizing: "border-box", fontFamily: "inherit", fontSize: 13 }}>
      {children}
    </select>
  </div>
);

const Btn = ({ children, onClick, variant = "primary", style: s = {} }) => {
  const variants = {
    primary: { background: "#00d4aa", color: "#000", border: "none" },
    danger:  { background: "#ef4444", color: "#fff", border: "none" },
    ghost:   { background: "#1e293b", color: "#94a3b8", border: "1px solid #334155" },
    approve: { background: "#0d4f2b", color: "#4ade80", border: "1px solid #166534" },
    reject:  { background: "#4a1414", color: "#f87171", border: "1px solid #7f1d1d" },
  };
  return (
    <button onClick={onClick} style={{ borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: "inherit", ...variants[variant], ...s }}>
      {children}
    </button>
  );
};

const fmtDate = (d) => d ? new Date(d).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" }) : "-";
const fmtMoney = (n) => `฿${Number(n || 0).toLocaleString()}`;

// ─── Login Page ───────────────────────────────────────────────
const LoginPage = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) { setError(err.message); setLoading(false); return; }
    onLogin(data.user);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#060c18", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'IBM Plex Sans Thai', 'Sarabun', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;600;700&display=swap');`}</style>
      <div style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 20, padding: 40, width: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎰</div>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: 22 }}>LottoPro Admin</div>
          <div style={{ color: "#475569", fontSize: 13, marginTop: 4 }}>ระบบจัดการหวย</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Input label="อีเมล" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@example.com" />
          <Input label="รหัสผ่าน" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
            onKeyDown={e => e.key === "Enter" && handleLogin()} />
          {error && <div style={{ color: "#f87171", fontSize: 12 }}>{error}</div>}
          <Btn onClick={handleLogin} style={{ width: "100%", padding: 12, fontSize: 15, marginTop: 4 }}>
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </Btn>
        </div>
      </div>
    </div>
  );
};

// ─── Dashboard Page ───────────────────────────────────────────
const DashboardPage = () => {
  const { stats, loading, refresh } = useDashboardStats();
  const { transactions } = useTransactions("withdraw");
  const { slips } = useBetSlips();

  const pendingTx = transactions.filter(t => t.status === "pending").slice(0, 5);
  const recentSlips = slips.slice(0, 5);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <StatCard label="ยอดแทงวันนี้" value={loading ? "..." : fmtMoney(stats.totalBetToday)} color="#00d4aa" icon="bet" />
        <StatCard label="กำไรสุทธิ" value={loading ? "..." : fmtMoney(stats.totalBetToday - stats.totalWinToday)} color="#4ade80" icon="win" />
        <StatCard label="สมาชิกทั้งหมด" value={loading ? "..." : stats.totalMembers} color="#60a5fa" icon="members" />
        <StatCard label="รอถอนเงิน" value={loading ? "..." : fmtMoney(stats.pendingWithdrawAmount)} sub={`${stats.pendingWithdrawCount} รายการ`} color="#fbbf24" icon="withdraw" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 12, padding: 16 }}>
          <div style={{ color: "#94a3b8", fontWeight: 700, marginBottom: 12, fontSize: 14 }}>รอถอนเงิน</div>
          {pendingTx.length === 0
            ? <div style={{ color: "#475569", textAlign: "center", padding: 16, fontSize: 13 }}>ไม่มีรายการรอ</div>
            : pendingTx.map((tx, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #0f172a" }}>
                <div>
                  <div style={{ color: "#cbd5e1", fontSize: 13 }}>{tx.user?.phone || tx.user?.username}</div>
                  <div style={{ color: "#475569", fontSize: 11 }}>{fmtDate(tx.created_at)}</div>
                </div>
                <span style={{ color: "#fb923c", fontWeight: 700 }}>{fmtMoney(tx.amount)}</span>
              </div>
            ))
          }
        </div>

        <div style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 12, padding: 16 }}>
          <div style={{ color: "#94a3b8", fontWeight: 700, marginBottom: 12, fontSize: 14 }}>บิลล่าสุด</div>
          {recentSlips.length === 0
            ? <div style={{ color: "#475569", textAlign: "center", padding: 16, fontSize: 13 }}>ยังไม่มีบิล</div>
            : recentSlips.map((s, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #0f172a" }}>
                <div>
                  <div style={{ color: "#cbd5e1", fontSize: 13 }}>{s.user?.phone} — {s.draw?.lottery_group?.name}</div>
                  <div style={{ color: "#475569", fontSize: 11 }}>{fmtDate(s.created_at)}</div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ color: "#00d4aa", fontWeight: 700 }}>{fmtMoney(s.total_amount)}</span>
                  <Badge status={s.status} />
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
};

// ─── Members Page ─────────────────────────────────────────────
const MembersPage = () => {
  const { members, loading, addMember, updateStatus } = useMembers();
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ username: "", full_name: "", phone: "", password: "", role: "player" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const filtered = members.filter(m =>
    (m.full_name || "").includes(search) ||
    (m.phone || "").includes(search) ||
    (m.username || "").includes(search)
  );

  const handleAdd = async () => {
    if (!form.username || !form.password) { setErr("กรุณากรอก Username และรหัสผ่าน"); return; }
    setSaving(true);
    const { error } = await addMember(form);
    setSaving(false);
    if (error) { setErr(error.message); return; }
    setShowModal(false);
    setForm({ username: "", full_name: "", phone: "", password: "", role: "player" });
    setErr("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <StatCard label="ผู้เล่นทั้งหมด" value={members.filter(m => m.role === "player").length} color="#60a5fa" icon="members" />
        <StatCard label="เอเย่นต์" value={members.filter(m => m.role === "agent").length} color="#a78bfa" icon="members" />
        <StatCard label="บัญชีถูกระงับ" value={members.filter(m => m.status === "suspended").length} color="#f87171" icon="members" />
      </div>

      <div style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 12, padding: 16 }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "8px 12px" }}>
            <Icon name="search" size={16} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาสมาชิก..." style={{ background: "none", border: "none", color: "#cbd5e1", outline: "none", flex: 1, fontFamily: "inherit", fontSize: 13 }} />
          </div>
          <Btn onClick={() => setShowModal(true)}><span style={{ display: "flex", alignItems: "center", gap: 6 }}><Icon name="add" size={15} /> เพิ่มสมาชิก</span></Btn>
        </div>

        {loading ? <Spinner /> : (
          <Table
            columns={[
              { key: "username", label: "Username" },
              { key: "full_name", label: "ชื่อ" },
              { key: "phone", label: "เบอร์โทร" },
              { key: "role", label: "Role", render: v => <Badge status={v} /> },
              { key: "status", label: "สถานะ", render: v => <Badge status={v} /> },
              { key: "balance", label: "ยอดเงิน", render: v => <span style={{ color: "#4ade80" }}>{fmtMoney(v)}</span> },
              { key: "created_at", label: "วันที่สมัคร", render: v => fmtDate(v) },
              { key: "id", label: "จัดการ", render: (v, row) => (
                <div style={{ display: "flex", gap: 6 }}>
                  {row.status !== "suspended"
                    ? <Btn variant="reject" onClick={() => updateStatus(v, "suspended")} style={{ padding: "3px 10px", fontSize: 12 }}>ระงับ</Btn>
                    : <Btn variant="approve" onClick={() => updateStatus(v, "active")} style={{ padding: "3px 10px", fontSize: 12 }}>เปิดใช้</Btn>
                  }
                </div>
              )},
            ]}
            data={filtered}
          />
        )}
      </div>

      {showModal && (
        <Modal title="เพิ่มสมาชิกใหม่" onClose={() => setShowModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Input label="Username *" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="เบอร์โทร หรือ ชื่อผู้ใช้" />
              <Input label="ชื่อ-นามสกุล" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
              <Input label="เบอร์โทร" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              <Select label="Role" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                <option value="player">ผู้เล่น</option>
                <option value="agent">เอเย่นต์</option>
                <option value="admin">แอดมิน</option>
              </Select>
              <Input label="รหัสผ่าน *" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            </div>
            {err && <div style={{ color: "#f87171", fontSize: 12 }}>{err}</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={handleAdd} style={{ flex: 1, padding: 12 }}>{saving ? "กำลังสร้าง..." : "สร้างสมาชิก"}</Btn>
              <Btn variant="ghost" onClick={() => setShowModal(false)}>ยกเลิก</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ─── Lottery Page ─────────────────────────────────────────────
const LotteryPage = () => {
  const { groups } = useLotteryGroups();
  const [selectedGroup, setSelectedGroup] = useState(null);
  const { draws, loading, updateStatus, setResult } = useLotteryDraws(selectedGroup);
  const { rates, updateRate } = useRateSettings();

  // เลือก group แรกอัตโนมัติ
  useEffect(() => { if (groups.length && !selectedGroup) setSelectedGroup(groups[0].id); }, [groups]);

  const [selectedDraw, setSelectedDraw] = useState(null);
  const { limits, addLimit, removeLimit } = useNumberLimits(selectedDraw);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [limitForm, setLimitForm] = useState({ betType: "three_top", number: "", limit: "", rateOverride: "", isClosed: false });
  const [resultForm, setResultForm] = useState({ three_top: "", three_front1: "", three_front2: "", three_bottom1: "", three_bottom2: "", two_top: "", two_bottom: "" });
  const [limitErr, setLimitErr] = useState("");
  const [editRateId, setEditRateId] = useState(null);
  const [editRateVal, setEditRateVal] = useState("");

  const handleSaveLimit = async () => {
    if (!limitForm.number) { setLimitErr("กรุณากรอกเลข"); return; }
    if (!limitForm.isClosed && !limitForm.limit) { setLimitErr("กรุณากรอกยอดจำกัด หรือเลือกปิดรับทันที"); return; }
    const { error } = await addLimit(limitForm);
    if (error) { setLimitErr(error.message); return; }
    setShowLimitModal(false);
    setLimitForm({ betType: "three_top", number: "", limit: "", rateOverride: "", isClosed: false });
    setLimitErr("");
  };

  const handleSetResult = async () => {
    if (!resultForm.three_top || !resultForm.two_top || !resultForm.two_bottom) { alert("กรุณากรอกผลหลักให้ครบ"); return; }
    const { error } = await setResult(selectedDraw, resultForm);
    if (error) { alert("เกิดข้อผิดพลาด: " + error.message); return; }
    setShowResultModal(false);
    setResultForm({ three_top: "", three_front1: "", three_front2: "", three_bottom1: "", three_bottom2: "", two_top: "", two_bottom: "" });
  };

  const currentDraw = draws.find(d => d.id === selectedDraw);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Group Tabs */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {groups.map(g => (
          <button key={g.id} onClick={() => { setSelectedGroup(g.id); setSelectedDraw(null); }}
            style={{ background: selectedGroup === g.id ? "#00d4aa" : "#0f172a", color: selectedGroup === g.id ? "#000" : "#94a3b8", border: "1px solid #1e293b", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit" }}>
            {g.name}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Draws List */}
        <div style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 12, padding: 16 }}>
          <div style={{ color: "#94a3b8", fontWeight: 700, marginBottom: 12, fontSize: 14 }}>งวดที่ผ่านมา</div>
          {loading ? <Spinner /> : draws.length === 0
            ? <div style={{ color: "#475569", textAlign: "center", padding: 24 }}>ไม่มีข้อมูล</div>
            : draws.map(d => (
              <div key={d.id} onClick={() => setSelectedDraw(d.id)}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 8, cursor: "pointer", marginBottom: 4, background: selectedDraw === d.id ? "#0f172a" : "transparent", border: selectedDraw === d.id ? "1px solid #1e293b" : "1px solid transparent" }}>
                <div>
                  <div style={{ color: "#cbd5e1", fontSize: 13, fontWeight: 600 }}>{d.draw_date}</div>
                  <div style={{ color: "#475569", fontSize: 11 }}>ปิด: {fmtDate(d.close_at)}</div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {d.result_three_top && <span style={{ color: "#fbbf24", fontFamily: "monospace", fontWeight: 700 }}>{d.result_three_top}</span>}
                  <Badge status={d.status} />
                </div>
              </div>
            ))
          }
        </div>

        {/* Draw Actions + Rate */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {selectedDraw && currentDraw && (
            <div style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 12, padding: 16 }}>
              <div style={{ color: "#94a3b8", fontWeight: 700, marginBottom: 12, fontSize: 14 }}>จัดการงวด: {currentDraw.draw_date}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {currentDraw.status === "upcoming" && <Btn onClick={() => updateStatus(selectedDraw, "open")}>เปิดรับแทง</Btn>}
                {currentDraw.status === "open" && <Btn variant="danger" onClick={() => updateStatus(selectedDraw, "closed")}>ปิดรับแทง</Btn>}
                {currentDraw.status === "closed" && <Btn onClick={() => setShowResultModal(true)}>บันทึกผลรางวัล</Btn>}
                {currentDraw.status === "resulted" && (
                  <div style={{ color: "#4ade80", fontSize: 13 }}>
                    ✅ ผล: 3บน={currentDraw.result_three_top} | 2บน={currentDraw.result_two_top} | 2ล่าง={currentDraw.result_two_bottom}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Rates */}
          <div style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 12, padding: 16 }}>
            <div style={{ color: "#94a3b8", fontWeight: 700, marginBottom: 12, fontSize: 14 }}>อัตราจ่าย</div>
            <Table
              columns={[
                { key: "bet_type", label: "ประเภท", render: v => BET_TYPE_LABELS[v] || v },
                { key: "payout_rate", label: "อัตราจ่าย", render: (v, row) => editRateId === row.id
                  ? <div style={{ display: "flex", gap: 6 }}>
                      <input value={editRateVal} onChange={e => setEditRateVal(e.target.value)} style={{ width: 70, background: "#0f172a", border: "1px solid #1e293b", borderRadius: 6, padding: "4px 8px", color: "#fbbf24", fontFamily: "monospace", fontSize: 13 }} />
                      <Btn variant="approve" onClick={async () => { await updateRate(row.id, Number(editRateVal)); setEditRateId(null); }} style={{ padding: "3px 8px", fontSize: 12 }}>✓</Btn>
                    </div>
                  : <span style={{ color: "#fbbf24", fontWeight: 700 }}>{v}</span>
                },
                { key: "min_bet", label: "ต่ำสุด", render: v => fmtMoney(v) },
                { key: "max_bet", label: "สูงสุด", render: v => fmtMoney(v) },
                { key: "id", label: "แก้ไข", render: (v, row) => (
                  <button onClick={() => { setEditRateId(v); setEditRateVal(row.payout_rate); }} style={{ background: "none", border: "none", color: "#60a5fa", cursor: "pointer" }}><Icon name="edit" size={14} /></button>
                )},
              ]}
              data={rates}
            />
          </div>
        </div>
      </div>

      {/* Number Limits */}
      {selectedDraw && (
        <div style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 12, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <span style={{ color: "#94a3b8", fontWeight: 700, fontSize: 14 }}>เลขอั้น / ปิดเลข</span>
            <Btn variant="danger" onClick={() => setShowLimitModal(true)}>+ เพิ่มเลขอั้น</Btn>
          </div>
          {limits.length === 0
            ? <div style={{ color: "#475569", textAlign: "center", padding: 24 }}>ยังไม่มีเลขอั้น</div>
            : <Table
                columns={[
                  { key: "bet_type", label: "ประเภท", render: v => BET_TYPE_LABELS[v] || v },
                  { key: "number", label: "เลข", render: v => <span style={{ fontFamily: "monospace", fontSize: 18, letterSpacing: 4, color: "#fbbf24", fontWeight: 700 }}>{v}</span> },
                  { key: "original_limit", label: "ยอดจำกัด", render: v => v ? fmtMoney(v) : "-" },
                  { key: "remaining_limit", label: "คงเหลือ", render: v => v ? fmtMoney(v) : "-" },
                  { key: "payout_rate_override", label: "อัตราพิเศษ", render: v => v ? `฿${v}` : "-" },
                  { key: "is_closed", label: "สถานะ", render: v => <Badge status={v ? "closed" : "open"} /> },
                  { key: "id", label: "", render: v => <Btn variant="reject" onClick={() => removeLimit(v)} style={{ padding: "3px 10px", fontSize: 12 }}>ลบ</Btn> },
                ]}
                data={limits}
              />
          }
        </div>
      )}

      {/* Add Limit Modal */}
      {showLimitModal && (
        <Modal title="เพิ่มเลขอั้น" onClose={() => setShowLimitModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Select label="ประเภทการแทง" value={limitForm.betType} onChange={e => setLimitForm({ ...limitForm, betType: e.target.value })}>
                {BET_TYPES.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
              </Select>
              <Input label="เลข *" value={limitForm.number} onChange={e => setLimitForm({ ...limitForm, number: e.target.value })} maxLength={3} placeholder="เช่น 456" />
              <Input label="ยอดจำกัด (บาท)" type="number" value={limitForm.limit} onChange={e => setLimitForm({ ...limitForm, limit: e.target.value })} placeholder="เช่น 5000" />
              <Input label="อัตราจ่ายพิเศษ" type="number" value={limitForm.rateOverride} onChange={e => setLimitForm({ ...limitForm, rateOverride: e.target.value })} placeholder="เช่น 500" />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={limitForm.isClosed} onChange={e => setLimitForm({ ...limitForm, isClosed: e.target.checked })} />
              <span style={{ color: "#cbd5e1", fontSize: 13 }}>ปิดรับแทงเลขนี้ทันที</span>
            </label>
            {limitErr && <div style={{ color: "#f87171", fontSize: 12 }}>{limitErr}</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <Btn variant="danger" onClick={handleSaveLimit} style={{ flex: 1, padding: 12 }}>บันทึก</Btn>
              <Btn variant="ghost" onClick={() => setShowLimitModal(false)}>ยกเลิก</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Set Result Modal */}
      {showResultModal && (
        <Modal title="บันทึกผลรางวัล" onClose={() => setShowResultModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <Input label="3 ตัวบน *" value={resultForm.three_top} onChange={e => setResultForm({ ...resultForm, three_top: e.target.value })} maxLength={3} placeholder="456" />
              <Input label="2 ตัวบน *" value={resultForm.two_top} onChange={e => setResultForm({ ...resultForm, two_top: e.target.value })} maxLength={2} placeholder="56" />
              <Input label="2 ตัวล่าง *" value={resultForm.two_bottom} onChange={e => setResultForm({ ...resultForm, two_bottom: e.target.value })} maxLength={2} placeholder="78" />
              <Input label="3 ตัวหน้า 1" value={resultForm.three_front1} onChange={e => setResultForm({ ...resultForm, three_front1: e.target.value })} maxLength={3} placeholder="123" />
              <Input label="3 ตัวหน้า 2" value={resultForm.three_front2} onChange={e => setResultForm({ ...resultForm, three_front2: e.target.value })} maxLength={3} placeholder="234" />
              <Input label="3 ตัวล่าง 1" value={resultForm.three_bottom1} onChange={e => setResultForm({ ...resultForm, three_bottom1: e.target.value })} maxLength={3} placeholder="345" />
              <Input label="3 ตัวล่าง 2" value={resultForm.three_bottom2} onChange={e => setResultForm({ ...resultForm, three_bottom2: e.target.value })} maxLength={3} placeholder="456" />
            </div>
            <div style={{ background: "#3d2a00", color: "#fbbf24", borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>
              ⚠️ การบันทึกผลจะคำนวณรางวัลและจ่ายเงินอัตโนมัติ ไม่สามารถยกเลิกได้
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={handleSetResult} style={{ flex: 1, padding: 12 }}>ยืนยันบันทึกผล</Btn>
              <Btn variant="ghost" onClick={() => setShowResultModal(false)}>ยกเลิก</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ─── Finance Page ─────────────────────────────────────────────
const FinancePage = () => {
  const [tab, setTab] = useState("withdraw");
  const { transactions, loading, approve, reject } = useTransactions(tab === "all" ? null : tab);

  const pendingOnly = transactions.filter(t => t.status === "pending");
  const totalPending = pendingOnly.reduce((s, t) => s + (t.amount || 0), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <StatCard label="รอถอน" value={fmtMoney(totalPending)} sub={`${pendingOnly.length} รายการ`} color="#fbbf24" icon="withdraw" />
        <StatCard label="ทั้งหมด" value={transactions.length} color="#60a5fa" icon="finance" />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        {[{ id: "deposit", label: "ฝากเงิน" }, { id: "withdraw", label: "ถอนเงิน" }, { id: "all", label: "ทั้งหมด" }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ background: tab === t.id ? "#00d4aa" : "#0f172a", color: tab === t.id ? "#000" : "#94a3b8", border: "1px solid #1e293b", borderRadius: 8, padding: "8px 20px", cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 12, padding: 16 }}>
        {loading ? <Spinner /> : (
          <Table
            columns={[
              { key: "ref_number", label: "เลขอ้างอิง" },
              { key: "created_at", label: "วันที่", render: v => fmtDate(v) },
              { key: "user", label: "ผู้ใช้", render: v => v?.phone || v?.username || "-" },
              { key: "type", label: "ประเภท", render: v => <Badge status={v} /> },
              { key: "amount", label: "จำนวน", render: (v, row) => (
                <span style={{ color: row.type === "deposit" || row.type === "win" ? "#4ade80" : "#fb923c", fontWeight: 700 }}>
                  {row.type === "deposit" || row.type === "win" ? "+" : "-"}{fmtMoney(v)}
                </span>
              )},
              { key: "bank_account", label: "ธนาคาร", render: v => v ? `${v.bank_name} ${v.account_number}` : "-" },
              { key: "status", label: "สถานะ", render: v => <Badge status={v} /> },
              { key: "id", label: "จัดการ", render: (v, row) => row.status === "pending"
                ? <div style={{ display: "flex", gap: 6 }}>
                    <Btn variant="approve" onClick={() => approve(v)} style={{ padding: "3px 10px", fontSize: 12 }}>อนุมัติ</Btn>
                    <Btn variant="reject" onClick={() => reject(v)} style={{ padding: "3px 10px", fontSize: 12 }}>ปฏิเสธ</Btn>
                  </div>
                : <Badge status={row.status} />
              },
            ]}
            data={transactions}
          />
        )}
      </div>
    </div>
  );
};

// ─── Betting Page ─────────────────────────────────────────────
const BettingPage = () => {
  const { slips, loading } = useBetSlips();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = slips.filter(s => {
    const matchSearch = (s.slip_number || "").includes(search) || (s.user?.phone || "").includes(search);
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <StatCard label="บิลทั้งหมด" value={slips.length} color="#00d4aa" icon="bet" />
        <StatCard label="รอออกผล" value={slips.filter(s => s.status === "pending").length} color="#fbbf24" icon="bet" />
        <StatCard label="ถูกรางวัล" value={slips.filter(s => s.status === "won").length} color="#4ade80" icon="win" />
        <StatCard label="ไม่ถูก" value={slips.filter(s => s.status === "lost").length} color="#f87171" icon="bet" />
      </div>

      <div style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 12, padding: 16 }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "8px 12px" }}>
            <Icon name="search" size={16} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาเลขบิล หรือ เบอร์โทร..." style={{ background: "none", border: "none", color: "#cbd5e1", outline: "none", flex: 1, fontFamily: "inherit", fontSize: 13 }} />
          </div>
          <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">ทุกสถานะ</option>
            <option value="pending">รอออกผล</option>
            <option value="won">ถูกรางวัล</option>
            <option value="lost">ไม่ถูก</option>
          </Select>
        </div>

        {loading ? <Spinner /> : (
          <Table
            columns={[
              { key: "slip_number", label: "เลขบิล" },
              { key: "user", label: "ผู้เล่น", render: v => v?.phone || v?.username || "-" },
              { key: "draw", label: "หวย", render: v => v?.lottery_group?.name || "-" },
              { key: "total_amount", label: "ยอดแทง", render: v => fmtMoney(v) },
              { key: "total_win", label: "รางวัล", render: v => <span style={{ color: "#4ade80" }}>{fmtMoney(v)}</span> },
              { key: "status", label: "สถานะ", render: v => <Badge status={v} /> },
              { key: "created_at", label: "วันที่", render: v => fmtDate(v) },
              { key: "bet_items", label: "รายการ", render: v => (
                <span style={{ color: "#94a3b8" }}>{v?.length || 0} รายการ</span>
              )},
            ]}
            data={filtered}
          />
        )}
      </div>
    </div>
  );
};

// ─── Report Page ──────────────────────────────────────────────
const ReportPage = () => {
  const { summary, loading } = useDailySummary();

  const totalBet = summary.reduce((s, r) => s + (r.total_bet_amount || 0), 0);
  const totalPayout = summary.reduce((s, r) => s + (r.total_payout || 0), 0);
  const netProfit = summary.reduce((s, r) => s + (r.net_profit || 0), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <StatCard label="ยอดแทงรวม" value={fmtMoney(totalBet)} color="#00d4aa" icon="report" />
        <StatCard label="จ่ายรางวัล" value={fmtMoney(totalPayout)} color="#fbbf24" icon="finance" />
        <StatCard label="กำไรสุทธิ" value={fmtMoney(netProfit)} color={netProfit >= 0 ? "#4ade80" : "#f87171"} icon="win" />
      </div>

      <div style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 12, padding: 16 }}>
        <div style={{ color: "#94a3b8", fontWeight: 700, marginBottom: 16, fontSize: 14 }}>รายงานรายวัน</div>
        {loading ? <Spinner /> : (
          <Table
            columns={[
              { key: "summary_date", label: "วันที่" },
              { key: "lottery_group", label: "หวย", render: v => v?.name || "ทั้งหมด" },
              { key: "total_bets", label: "จำนวนบิล" },
              { key: "total_bet_amount", label: "ยอดแทง", render: v => <span style={{ color: "#60a5fa" }}>{fmtMoney(v)}</span> },
              { key: "total_payout", label: "จ่ายรางวัล", render: v => <span style={{ color: "#fbbf24" }}>{fmtMoney(v)}</span> },
              { key: "gross_profit", label: "กำไรขั้นต้น", render: v => <span style={{ color: v >= 0 ? "#4ade80" : "#f87171" }}>{fmtMoney(v)}</span> },
              { key: "commission_paid", label: "คอมมิชชั่น", render: v => fmtMoney(v) },
              { key: "net_profit", label: "กำไรสุทธิ", render: v => <span style={{ color: v >= 0 ? "#4ade80" : "#f87171", fontWeight: 700 }}>{fmtMoney(v)}</span> },
            ]}
            data={summary}
          />
        )}
      </div>
    </div>
  );
};

// ─── Settings Page ────────────────────────────────────────────
const SettingsPage = () => {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("system_settings").select("*").then(({ data }) => {
      if (data) {
        const obj = {};
        data.forEach(s => { obj[s.key] = s.value; });
        setSettings(obj);
      }
      setLoading(false);
    });
  }, []);

  const save = async () => {
    setSaving(true);
    const updates = Object.entries(settings).map(([key, value]) => ({ key, value }));
    await Promise.all(updates.map(u =>
      supabase.from("system_settings").upsert(u, { onConflict: "key" })
    ));
    setSaving(false);
    alert("บันทึกการตั้งค่าเรียบร้อย");
  };

  const FIELDS = [
    { key: "min_deposit", label: "ยอดฝากขั้นต่ำ (บาท)" },
    { key: "min_withdraw", label: "ยอดถอนขั้นต่ำ (บาท)" },
    { key: "max_withdraw_per_day", label: "ยอดถอนสูงสุด/วัน (บาท)" },
    { key: "bet_close_before_minutes", label: "ปิดรับแทงก่อนออกผล (นาที)" },
    { key: "new_member_bonus", label: "โบนัสสมาชิกใหม่ (บาท)" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <div style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 12, padding: 20 }}>
        <div style={{ color: "#94a3b8", fontWeight: 700, marginBottom: 16, fontSize: 14 }}>ตั้งค่าระบบ</div>
        {loading ? <Spinner /> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {FIELDS.map(f => (
              <Input key={f.key} label={f.label} value={settings[f.key] || ""} onChange={e => setSettings({ ...settings, [f.key]: e.target.value })} />
            ))}
            <Btn onClick={save} style={{ marginTop: 8 }}>{saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}</Btn>
          </div>
        )}
      </div>

      <div style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 12, padding: 20 }}>
        <div style={{ color: "#94a3b8", fontWeight: 700, marginBottom: 16, fontSize: 14 }}>การทำงานระบบ</div>
        {[
          { key: "maintenance_mode", label: "ปิดระบบชั่วคราว (Maintenance)", desc: "ผู้เล่นจะเข้าไม่ได้" },
          { key: "auto_result", label: "ดึงผลอัตโนมัติ", desc: "ดึงผลจาก API อัตโนมัติ" },
        ].map(s => (
          <div key={s.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid #1e293b" }}>
            <div>
              <div style={{ color: "#cbd5e1", fontSize: 13 }}>{s.label}</div>
              <div style={{ color: "#475569", fontSize: 11 }}>{s.desc}</div>
            </div>
            <div
              onClick={() => setSettings({ ...settings, [s.key]: settings[s.key] === "true" ? "false" : "true" })}
              style={{ width: 44, height: 24, background: settings[s.key] === "true" ? "#0d4f2b" : "#1e293b", borderRadius: 12, cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
              <div style={{ position: "absolute", top: 2, left: settings[s.key] === "true" ? 22 : 2, width: 20, height: 20, background: settings[s.key] === "true" ? "#4ade80" : "#64748b", borderRadius: 10, transition: "left 0.2s" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Main App ─────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [page, setPage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null);
      setChecking(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (checking) return (
    <div style={{ minHeight: "100vh", background: "#060c18", display: "flex", alignItems: "center", justifyContent: "center", color: "#475569", fontFamily: "inherit" }}>
      กำลังโหลด...
    </div>
  );

  if (!user) return <LoginPage onLogin={setUser} />;

  const navItems = [
    { id: "dashboard", label: "Dashboard",    icon: "dashboard" },
    { id: "members",   label: "สมาชิก",       icon: "members"   },
    { id: "lottery",   label: "จัดการหวย",    icon: "lottery"   },
    { id: "betting",   label: "บิล / การแทง", icon: "bet"       },
    { id: "finance",   label: "การเงิน",       icon: "finance"   },
    { id: "report",    label: "รายงาน",        icon: "report"    },
    { id: "settings",  label: "ตั้งค่า",       icon: "settings"  },
  ];

  const pages = {
    dashboard: <DashboardPage />,
    members:   <MembersPage />,
    lottery:   <LotteryPage />,
    betting:   <BettingPage />,
    finance:   <FinancePage />,
    report:    <ReportPage />,
    settings:  <SettingsPage />,
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "#060c18", fontFamily: "'IBM Plex Sans Thai','Sarabun',sans-serif", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #0a0f1e; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 3px; }
        input, select, button, textarea { font-family: inherit; }
        tr:hover td { background: #0f172a22; }
      `}</style>

      {/* Sidebar */}
      <div style={{ width: sidebarOpen ? 220 : 64, background: "#0a0f1e", borderRight: "1px solid #1e293b", display: "flex", flexDirection: "column", transition: "width 0.2s", overflow: "hidden", flexShrink: 0 }}>
        <div style={{ padding: "20px 16px", borderBottom: "1px solid #1e293b", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: "linear-gradient(135deg,#00d4aa,#0066ff)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>🎰</div>
          {sidebarOpen && <span style={{ color: "#fff", fontWeight: 800, fontSize: 15, whiteSpace: "nowrap" }}>LottoPro Admin</span>}
        </div>

        <nav style={{ flex: 1, padding: "12px 8px", overflowY: "auto" }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setPage(item.id)} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px", marginBottom: 4, borderRadius: 8,
              background: page === item.id ? "#00d4aa18" : "none",
              color: page === item.id ? "#00d4aa" : "#64748b",
              border: page === item.id ? "1px solid #00d4aa30" : "1px solid transparent",
              cursor: "pointer", textAlign: "left", fontWeight: page === item.id ? 600 : 400,
            }}>
              <span style={{ flexShrink: 0 }}><Icon name={item.icon} size={17} /></span>
              {sidebarOpen && <span style={{ fontSize: 13, whiteSpace: "nowrap" }}>{item.label}</span>}
            </button>
          ))}
        </nav>

        <div style={{ padding: "12px 8px", borderTop: "1px solid #1e293b", display: "flex", flexDirection: "column", gap: 8 }}>
          {sidebarOpen && (
            <button onClick={handleLogout} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, background: "none", border: "1px solid #334155", color: "#64748b", cursor: "pointer", fontSize: 13 }}>
              <Icon name="logout" size={15} /> ออกจากระบบ
            </button>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ width: "100%", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: 8, color: "#64748b", cursor: "pointer", display: "flex", justifyContent: "center" }}>
            {sidebarOpen ? "◀" : "▶"}
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ background: "#0a0f1e", borderBottom: "1px solid #1e293b", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>{navItems.find(n => n.id === page)?.label}</div>
            <div style={{ color: "#475569", fontSize: 12 }}>Supabase Lottery System</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ background: "#0d4f2b", color: "#4ade80", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>● Live</div>
            <div style={{ color: "#64748b", fontSize: 12 }}>{user.email}</div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          {pages[page]}
        </div>
      </div>
    </div>
  );
}
