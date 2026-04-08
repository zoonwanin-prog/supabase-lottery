import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ─── THEME ────────────────────────────────────────────────────
const T = {
  bg:        "#070d1f",
  bg2:       "#0b1426",
  card:      "#0e1a35",
  card2:     "#111f3d",
  border:    "#1a2d55",
  border2:   "#243a6e",
  accent:    "#f5c518",
  accentDim: "#c9a014",
  blue:      "#1a56db",
  blueDim:   "#1344b5",
  blueGlow:  "rgba(26,86,219,0.25)",
  text:      "#e2e8f0",
  textDim:   "#94a3b8",
  textFaint: "#4a5d80",
  green:     "#22c55e",
  greenDim:  "#166534",
  red:       "#ef4444",
  redDim:    "#7f1d1d",
  orange:    "#f97316",
  purple:    "#a855f7",
};

const G = {
  header:  "linear-gradient(135deg, #0b1a40 0%, #0a1428 100%)",
  card:    "linear-gradient(145deg, #0e1a35 0%, #0b152c 100%)",
  accent:  "linear-gradient(135deg, #f5c518 0%, #e6a800 100%)",
  blue:    "linear-gradient(135deg, #1a56db 0%, #1344b5 100%)",
  green:   "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
  red:     "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
  sidebar: "linear-gradient(180deg, #070f24 0%, #060c1c 100%)",
};

const SHADOW = {
  card:   "0 4px 24px rgba(0,0,0,0.5), 0 1px 4px rgba(0,0,0,0.3)",
  accent: "0 0 20px rgba(245,197,24,0.3), 0 4px 12px rgba(0,0,0,0.4)",
  blue:   "0 0 20px rgba(26,86,219,0.4), 0 4px 12px rgba(0,0,0,0.4)",
  green:  "0 0 16px rgba(34,197,94,0.3)",
  inset:  "inset 0 1px 0 rgba(255,255,255,0.05)",
};

// ─── GLOBAL CSS ───────────────────────────────────────────────
const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;500;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #root { height: 100%; }
    body {
      font-family: 'Noto Sans Thai', 'Inter', sans-serif;
      font-size: 17px;
      background: ${T.bg};
      color: ${T.text};
      -webkit-font-smoothing: antialiased;
    }
    ::-webkit-scrollbar { width: 5px; height: 5px; }
    ::-webkit-scrollbar-track { background: ${T.bg}; }
    ::-webkit-scrollbar-thumb { background: ${T.border2}; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: ${T.blue}; }
    input, select, button, textarea { font-family: inherit; font-size: 15px; }
    button { cursor: pointer; }
    table { width: 100%; border-collapse: collapse; }
    a { color: ${T.accent}; text-decoration: none; }

    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
    @keyframes glow { 0%,100% { box-shadow: 0 0 8px rgba(245,197,24,0.4); } 50% { box-shadow: 0 0 20px rgba(245,197,24,0.7); } }
    @keyframes slideIn { from { transform: translateX(-10px); opacity: 0; } to { transform: none; opacity: 1; } }
    .fade-in { animation: fadeIn 0.3s ease; }
    .live-dot { animation: pulse 2s infinite; }
    .glow-anim { animation: glow 3s infinite; }

    tr:hover td { background: rgba(26,86,219,0.06) !important; transition: background 0.15s; }
    thead th { position: sticky; top: 0; z-index: 1; }
  `}</style>
);

// ─── HOOKS ────────────────────────────────────────────────────
function useDashboardStats() {
  const [stats, setStats] = useState({ totalBetToday: 0, totalWinToday: 0, totalMembers: 0, pendingWithdrawCount: 0, pendingWithdrawAmount: 0, totalDeposit: 0, totalWithdraw: 0 });
  const [weeklyData, setWeeklyData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const today = new Date().toISOString().split("T")[0];
    const [mRes, bRes, txRes] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact" }).eq("role", "player"),
      supabase.from("bet_slips").select("total_amount,total_win").gte("created_at", today),
      supabase.from("transactions").select("type,amount,status").gte("created_at", today),
    ]);
    const txData = txRes.data || [];
    setStats({
      totalBetToday: bRes.data?.reduce((s, r) => s + (r.total_amount || 0), 0) || 0,
      totalWinToday: bRes.data?.reduce((s, r) => s + (r.total_win || 0), 0) || 0,
      totalMembers: mRes.count || 0,
      pendingWithdrawCount: txData.filter(t => t.type === "withdraw" && t.status === "pending").length,
      pendingWithdrawAmount: txData.filter(t => t.type === "withdraw" && t.status === "pending").reduce((s, t) => s + (t.amount || 0), 0),
      totalDeposit: txData.filter(t => t.type === "deposit" && t.status === "approved").reduce((s, t) => s + (t.amount || 0), 0),
      totalWithdraw: txData.filter(t => t.type === "withdraw" && t.status === "approved").reduce((s, t) => s + (t.amount || 0), 0),
    });

    // Weekly
    const w = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = d.toISOString().split("T")[0];
      w.push({ day: `วัน ${7 - i}`, date: ds, bet: Math.random() * 8000 + 2000, win: Math.random() * 4000 + 1000 });
    }
    setWeeklyData(w);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  return { stats, weeklyData, loading, refresh: fetch };
}

function useTop50() {
  const [top50, setTop50] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("bet_slips")
      .select("user_id,total_amount,total_win,user:user_id(username,phone,full_name)")
      .order("total_amount", { ascending: false })
      .limit(200);

    if (data) {
      const map = {};
      data.forEach(s => {
        const uid = s.user_id;
        if (!map[uid]) map[uid] = { uid, user: s.user, totalBet: 0, totalWin: 0, bills: 0 };
        map[uid].totalBet += (s.total_amount || 0);
        map[uid].totalWin += (s.total_win || 0);
        map[uid].bills += 1;
      });
      const sorted = Object.values(map).sort((a, b) => b.totalBet - a.totalBet).slice(0, 50);
      setTop50(sorted);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  return { top50, loading };
}

function useMembers() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("profiles").select("id,username,full_name,phone,role,status,balance,created_at").order("created_at", { ascending: false });
    if (data) setMembers(data);
    setLoading(false);
  }, []);
  useEffect(() => { fetch(); }, [fetch]);

  async function updateStatus(id, status) {
    await supabase.from("profiles").update({ status }).eq("id", id);
    fetch();
  }
  return { members, loading, refresh: fetch, updateStatus };
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
  const [loading, setLoading] = useState(false);
  const fetch = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    const { data } = await supabase.from("lottery_draws").select("*").eq("lottery_group_id", groupId).order("draw_date", { ascending: false }).limit(10);
    if (data) setDraws(data);
    setLoading(false);
  }, [groupId]);
  useEffect(() => { fetch(); }, [fetch]);

  async function updateStatus(id, status) {
    await supabase.from("lottery_draws").update({ status }).eq("id", id);
    fetch();
  }
  async function setResult(id, result) {
    const { error } = await supabase.rpc("process_lottery_results", { p_draw_id: id, ...Object.fromEntries(Object.entries(result).map(([k, v]) => [`p_result_${k}`, v])) });
    if (!error) fetch();
    return { error };
  }
  return { draws, loading, refresh: fetch, updateStatus, setResult };
}

function useRateSettings(groupId) {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(false);
  const fetch = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("rate_settings").select("*").order("bet_type");
    if (groupId) q = q.eq("lottery_group_id", groupId);
    const { data } = await q;
    if (data) setRates(data);
    setLoading(false);
  }, [groupId]);
  useEffect(() => { fetch(); }, [fetch]);

  async function updateRate(id, payout_rate) {
    await supabase.from("rate_settings").update({ payout_rate }).eq("id", id);
    fetch();
  }
  return { rates, loading, updateRate };
}

function useLadderRates(rateSettingId) {
  const [ladders, setLadders] = useState([]);
  const fetch = useCallback(async () => {
    if (!rateSettingId) { setLadders([]); return; }
    const { data } = await supabase.from("ladder_rates").select("*").eq("rate_setting_id", rateSettingId).order("min_amount");
    if (data) setLadders(data);
  }, [rateSettingId]);
  useEffect(() => { fetch(); }, [fetch]);

  async function saveLadders(rows) {
    await supabase.from("ladder_rates").delete().eq("rate_setting_id", rateSettingId);
    if (rows.length > 0) {
      await supabase.from("ladder_rates").insert(rows.map(r => ({ ...r, rate_setting_id: rateSettingId })));
    }
    fetch();
  }
  return { ladders, saveLadders };
}

function useNumberLimits(drawId) {
  const [limits, setLimits] = useState([]);
  const [loading, setLoading] = useState(false);
  const fetch = useCallback(async () => {
    if (!drawId) { setLimits([]); return; }
    setLoading(true);
    const { data } = await supabase.from("number_limits").select("*").eq("lottery_draw_id", drawId).order("bet_type,number");
    if (data) setLimits(data);
    setLoading(false);
  }, [drawId]);
  useEffect(() => { fetch(); }, [fetch]);

  async function upsertLimit(form) {
    await supabase.from("number_limits").upsert({ lottery_draw_id: drawId, bet_type: form.betType, number: form.number, original_limit: form.limit ? Number(form.limit) : null, remaining_limit: form.limit ? Number(form.limit) : null, payout_rate_override: form.rateOverride ? Number(form.rateOverride) : null, is_closed: form.isClosed }, { onConflict: "lottery_draw_id,bet_type,number" });
    fetch();
  }
  async function remove(id) {
    await supabase.from("number_limits").delete().eq("id", id);
    fetch();
  }
  return { limits, loading, upsertLimit, remove };
}

function useBetSlips() {
  const [slips, setSlips] = useState([]);
  const [loading, setLoading] = useState(true);
  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("bet_slips").select("*,user:user_id(username,phone),draw:lottery_draw_id(draw_date,lottery_group:lottery_group_id(name))").order("created_at", { ascending: false }).limit(100);
    if (data) setSlips(data);
    setLoading(false);
  }, []);
  useEffect(() => {
    fetch();
    const ch = supabase.channel("bet_slips_rt").on("postgres_changes", { event: "*", schema: "public", table: "bet_slips" }, fetch).subscribe();
    return () => supabase.removeChannel(ch);
  }, [fetch]);
  return { slips, loading };
}

function useTransactions(typeFilter) {
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  const fetch = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("transactions").select("*,user:user_id(username,phone,full_name),bank_account:bank_account_id(bank_name,account_number)").order("created_at", { ascending: false }).limit(100);
    if (typeFilter) q = q.eq("type", typeFilter);
    const { data } = await q;
    if (data) setTxs(data);
    setLoading(false);
  }, [typeFilter]);
  useEffect(() => {
    fetch();
    const ch = supabase.channel("tx_rt").on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, fetch).subscribe();
    return () => supabase.removeChannel(ch);
  }, [fetch]);
  async function approve(id) { await supabase.from("transactions").update({ status: "approved", approved_at: new Date().toISOString() }).eq("id", id); fetch(); }
  async function reject(id) { await supabase.from("transactions").update({ status: "rejected" }).eq("id", id); fetch(); }
  return { txs, loading, approve, reject };
}

function useDailySummary() {
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.from("daily_summary").select("*,lottery_group:lottery_group_id(name)").order("summary_date", { ascending: false }).limit(30)
      .then(({ data }) => { if (data) setSummary(data); setLoading(false); });
  }, []);
  return { summary, loading };
}

// ─── UTIL ─────────────────────────────────────────────────────
const fmtDate = d => d ? new Date(d).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" }) : "-";
const fmtMoney = n => `฿${Number(n || 0).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const BET_TYPE_LABELS = {
  three_top: "3 ตัวบน", three_front: "3 ตัวหน้า", three_bottom: "3 ตัวล่าง",
  three_tod: "3 ตัวโต๊ด", two_top: "2 ตัวบน", two_bottom: "2 ตัวล่าง",
  two_tod: "2 ตัวโต๊ด", run_top: "วิ่งบน", run_bottom: "วิ่งล่าง",
};
const BET_TYPES = Object.entries(BET_TYPE_LABELS).map(([id, label]) => ({ id, label }));

// ─── UI COMPONENTS ────────────────────────────────────────────
const Badge = ({ status }) => {
  const map = {
    open:       { bg: "rgba(34,197,94,0.15)",  color: "#22c55e", text: "เปิดรับ" },
    upcoming:   { bg: "rgba(99,179,237,0.15)", color: "#63b3ed", text: "เร็วๆนี้" },
    resulted:   { bg: "rgba(168,85,247,0.15)", color: "#a855f7", text: "ออกผลแล้ว" },
    closed:     { bg: "rgba(239,68,68,0.15)",  color: "#ef4444", text: "ปิดรับ" },
    cancelled:  { bg: "rgba(245,158,11,0.15)", color: "#f59e0b", text: "ยกเลิก" },
    active:     { bg: "rgba(34,197,94,0.15)",  color: "#22c55e", text: "Active" },
    Active:     { bg: "rgba(34,197,94,0.15)",  color: "#22c55e", text: "Active" },
    inactive:   { bg: "rgba(100,116,139,0.2)", color: "#64748b", text: "Inactive" },
    suspended:  { bg: "rgba(239,68,68,0.15)",  color: "#ef4444", text: "ระงับ" },
    approved:   { bg: "rgba(34,197,94,0.15)",  color: "#22c55e", text: "อนุมัติ" },
    pending:    { bg: "rgba(245,197,24,0.15)", color: "#f5c518", text: "รอดำเนินการ" },
    rejected:   { bg: "rgba(239,68,68,0.15)",  color: "#ef4444", text: "ปฏิเสธ" },
    processing: { bg: "rgba(99,179,237,0.15)", color: "#63b3ed", text: "กำลังดำเนินการ" },
    won:        { bg: "rgba(34,197,94,0.15)",  color: "#22c55e", text: "ถูกรางวัล" },
    lost:       { bg: "rgba(239,68,68,0.15)",  color: "#ef4444", text: "ไม่ถูก" },
    deposit:    { bg: "rgba(34,197,94,0.15)",  color: "#22c55e", text: "ฝากเงิน" },
    withdraw:   { bg: "rgba(249,115,22,0.15)", color: "#f97316", text: "ถอนเงิน" },
    win:        { bg: "rgba(245,197,24,0.15)", color: "#f5c518", text: "รางวัล" },
    player:     { bg: "rgba(99,179,237,0.15)", color: "#63b3ed", text: "ผู้เล่น" },
    agent:      { bg: "rgba(168,85,247,0.15)", color: "#a855f7", text: "เอเย่นต์" },
    admin:      { bg: "rgba(245,197,24,0.15)", color: "#f5c518", text: "แอดมิน" },
  };
  const c = map[status] || { bg: "rgba(100,116,139,0.2)", color: "#64748b", text: status };
  return <span style={{ background: c.bg, color: c.color, border: `1px solid ${c.color}30`, padding: "2px 10px", borderRadius: 20, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>{c.text}</span>;
};

const StatCard = ({ label, value, sub, color = T.accent, icon, gradient }) => (
  <div style={{ background: gradient || G.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 20px", flex: 1, minWidth: 150, boxShadow: SHADOW.card, position: "relative", overflow: "hidden" }}>
    <div style={{ position: "absolute", top: 0, right: 0, width: 80, height: 80, background: `radial-gradient(circle at center, ${color}18 0%, transparent 70%)`, borderRadius: "0 14px 0 80px" }} />
    <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
    <div style={{ color: T.textDim, fontSize: 13, marginBottom: 6, fontWeight: 500 }}>{label}</div>
    <div style={{ color, fontSize: 24, fontWeight: 800, letterSpacing: -0.5 }}>{value}</div>
    {sub && <div style={{ color: T.textFaint, fontSize: 12, marginTop: 4 }}>{sub}</div>}
  </div>
);

const Spinner = () => (
  <div style={{ textAlign: "center", padding: 48, color: T.textFaint }}>
    <div style={{ width: 32, height: 32, border: `3px solid ${T.border}`, borderTop: `3px solid ${T.accent}`, borderRadius: "50%", margin: "0 auto 12px", animation: "spin 0.8s linear infinite" }} />
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    กำลังโหลด...
  </div>
);

const TH = ({ children }) => (
  <th style={{ background: T.bg2, color: T.textDim, padding: "11px 14px", textAlign: "left", borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap", fontSize: 13, fontWeight: 600, letterSpacing: 0.3 }}>{children}</th>
);

const TD = ({ children, style: s = {} }) => (
  <td style={{ padding: "10px 14px", color: T.text, borderBottom: `1px solid ${T.border}15`, fontSize: 15, ...s }}>{children}</td>
);

const DataTable = ({ columns, data }) => (
  <div style={{ overflowX: "auto" }}>
    <table>
      <thead><tr>{columns.map((c, i) => <TH key={i}>{c.label}</TH>)}</tr></thead>
      <tbody>
        {data.length === 0
          ? <tr><td colSpan={columns.length} style={{ textAlign: "center", padding: 40, color: T.textFaint, fontSize: 15 }}>ไม่มีข้อมูล</td></tr>
          : data.map((row, ri) => (
            <tr key={ri}>
              {columns.map((col, ci) => (
                <TD key={ci}>{col.render ? col.render(row[col.key], row) : (row[col.key] ?? "-")}</TD>
              ))}
            </tr>
          ))
        }
      </tbody>
    </table>
  </div>
);

const Modal = ({ title, onClose, children, width = 520 }) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
    <div className="fade-in" style={{ background: G.card, border: `1px solid ${T.border2}`, borderRadius: 18, padding: 28, width, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 25px 60px rgba(0,0,0,0.7)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22, borderBottom: `1px solid ${T.border}`, paddingBottom: 16 }}>
        <span style={{ color: T.text, fontWeight: 700, fontSize: 17 }}>{title}</span>
        <button onClick={onClose} style={{ background: `${T.border}`, border: "none", color: T.textDim, width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>✕</button>
      </div>
      {children}
    </div>
  </div>
);

const Inp = ({ label, ...props }) => (
  <div>
    {label && <div style={{ color: T.textDim, fontSize: 13, marginBottom: 6, fontWeight: 500 }}>{label}</div>}
    <input {...props} style={{ width: "100%", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 9, padding: "9px 13px", color: T.text, outline: "none", fontSize: 15, transition: "border 0.2s", ...props.style }}
      onFocus={e => e.target.style.borderColor = T.blue}
      onBlur={e => e.target.style.borderColor = T.border} />
  </div>
);

const Sel = ({ label, children, ...props }) => (
  <div>
    {label && <div style={{ color: T.textDim, fontSize: 13, marginBottom: 6, fontWeight: 500 }}>{label}</div>}
    <select {...props} style={{ width: "100%", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 9, padding: "9px 13px", color: T.text, outline: "none", fontSize: 15 }}>
      {children}
    </select>
  </div>
);

const Btn = ({ children, onClick, v = "primary", style: s = {}, disabled = false }) => {
  const vs = {
    primary: { background: G.blue, color: "#fff", border: "none", boxShadow: SHADOW.blue },
    accent:  { background: G.accent, color: "#000", border: "none", boxShadow: SHADOW.accent },
    danger:  { background: G.red, color: "#fff", border: "none" },
    ghost:   { background: "transparent", color: T.textDim, border: `1px solid ${T.border}` },
    ok:      { background: "rgba(34,197,94,0.2)", color: T.green, border: `1px solid ${T.green}40` },
    bad:     { background: "rgba(239,68,68,0.2)", color: T.red, border: `1px solid ${T.red}40` },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{ borderRadius: 9, padding: "8px 18px", fontWeight: 600, fontSize: 15, fontFamily: "inherit", transition: "opacity 0.2s, transform 0.1s", opacity: disabled ? 0.5 : 1, ...vs[v], ...s }}
      onMouseEnter={e => { if (!disabled) e.target.style.opacity = "0.85"; }}
      onMouseLeave={e => { if (!disabled) e.target.style.opacity = "1"; }}>
      {children}
    </button>
  );
};

// ─── MINI CHART ───────────────────────────────────────────────
const MiniChart = ({ data }) => {
  if (!data || data.length < 2) return null;
  const W = 660, H = 200;
  const maxVal = Math.max(...data.map(d => Math.max(d.bet, d.win)));
  const pts = (key, color, fill) => {
    const points = data.map((d, i) => ({ x: (i / (data.length - 1)) * W, y: H - (d[key] / maxVal) * H * 0.85 }));
    const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const fillPath = path + ` L${W},${H} L0,${H} Z`;
    return (
      <g key={key}>
        <defs>
          <linearGradient id={`grad_${key}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={fillPath} fill={`url(#grad_${key})`} />
        <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        {points.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} />)}
      </g>
    );
  };

  const yLabels = [0, 0.25, 0.5, 0.75, 1].map(f => ({ y: H - f * H * 0.85, val: Math.round(maxVal * f) }));

  return (
    <svg viewBox={`0 0 ${W} ${H + 24}`} style={{ width: "100%", overflow: "visible" }}>
      {yLabels.map((l, i) => (
        <g key={i}>
          <line x1={0} y1={l.y} x2={W} y2={l.y} stroke={T.border} strokeDasharray="4,4" strokeWidth={0.8} opacity={0.5} />
          <text x={-4} y={l.y + 4} textAnchor="end" fill={T.textFaint} fontSize={10}>{l.val >= 1000 ? `${(l.val/1000).toFixed(0)}k` : l.val}</text>
        </g>
      ))}
      {pts("bet", "#ef4444")}
      {pts("win", T.green)}
      {data.map((d, i) => (
        <text key={i} x={(i / (data.length - 1)) * W} y={H + 18} textAnchor="middle" fill={T.textFaint} fontSize={11}>{d.day}</text>
      ))}
    </svg>
  );
};

// ─── LOGIN PAGE ───────────────────────────────────────────────
const LoginPage = ({ onLogin }) => {
  const [email, setEmail] = useState(""), [pw, setPw] = useState(""), [err, setErr] = useState(""), [loading, setLoading] = useState(false);
  const handleLogin = async () => {
    setErr(""); setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pw });
    if (error) { setErr(error.message); setLoading(false); return; }
    onLogin(data.user);
  };
  return (
    <div style={{ minHeight: "100vh", background: `radial-gradient(ellipse at 30% 40%, rgba(26,86,219,0.25) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(245,197,24,0.1) 0%, transparent 50%), ${T.bg}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <GlobalStyle />
      <div className="fade-in" style={{ background: G.card, border: `1px solid ${T.border2}`, borderRadius: 22, padding: 44, width: 400, boxShadow: "0 40px 80px rgba(0,0,0,0.7)" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ width: 64, height: 64, background: G.blue, borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 16px", boxShadow: SHADOW.blue }}>🎰</div>
          <div style={{ color: T.text, fontWeight: 800, fontSize: 22 }}>LottoPro <span style={{ color: T.accent }}>Admin</span></div>
          <div style={{ color: T.textDim, fontSize: 14, marginTop: 6 }}>ระบบจัดการหวยออนไลน์</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Inp label="อีเมล" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@example.com" />
          <Inp label="รหัสผ่าน" type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === "Enter" && handleLogin()} />
          {err && <div style={{ color: T.red, fontSize: 13, background: "rgba(239,68,68,0.1)", padding: "8px 12px", borderRadius: 8 }}>{err}</div>}
          <Btn onClick={handleLogin} v="accent" disabled={loading} style={{ width: "100%", padding: 13, fontSize: 16, marginTop: 6 }}>
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </Btn>
        </div>
      </div>
    </div>
  );
};

// ─── DASHBOARD PAGE ───────────────────────────────────────────
const DashboardPage = () => {
  const { stats, weeklyData, loading } = useDashboardStats();
  const { top50, loading: top50Loading } = useTop50();

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Stat Cards Row 1 */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <StatCard label="กำไร / ขาดทุน" value={loading ? "..." : fmtMoney(stats.totalBetToday - stats.totalWinToday)} color={T.accent} icon="💰" />
        <StatCard label="ฝากเงิน" value={loading ? "..." : fmtMoney(stats.totalDeposit)} color={T.green} icon="📥" />
        <StatCard label="ถอนเงิน" value={loading ? "..." : fmtMoney(stats.totalWithdraw)} color={T.red} icon="📤" />
        <StatCard label="เดิมพันรวม" value={loading ? "..." : fmtMoney(stats.totalBetToday)} color={T.blue} icon="🎲" />
      </div>

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        <div style={{ background: G.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20, boxShadow: SHADOW.card }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <div style={{ color: T.text, fontWeight: 700, fontSize: 16 }}>รายได้รวม (7 วันล่าสุด)</div>
              <div style={{ color: T.textDim, fontSize: 13 }}>ภาพรวมรายรับ-รายจ่าย</div>
            </div>
            <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
              <span style={{ color: T.red, display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: T.red, display: "inline-block" }} /> ยอดถอน</span>
              <span style={{ color: T.green, display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: T.green, display: "inline-block" }} /> ยอดฝาก</span>
            </div>
          </div>
          <MiniChart data={weeklyData} />
        </div>

        <div style={{ background: G.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20, boxShadow: SHADOW.card }}>
          <div style={{ color: T.text, fontWeight: 700, fontSize: 16, marginBottom: 16 }}>สถิติวันนี้</div>
          {[
            { label: "สมาชิกทั้งหมด", value: stats.totalMembers, color: T.blue },
            { label: "รอถอนเงิน", value: stats.pendingWithdrawCount + " รายการ", color: T.orange },
            { label: "ยอดรอถอน", value: fmtMoney(stats.pendingWithdrawAmount), color: T.red },
          ].map((s, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${T.border}15` }}>
              <span style={{ color: T.textDim, fontSize: 14 }}>{s.label}</span>
              <span style={{ color: s.color, fontWeight: 700, fontSize: 15 }}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stat Cards Row 2 */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <StatCard label="ฝากตรง" value={fmtMoney(0)} sub="0 รายการ" color={T.green} icon="💳" />
        <StatCard label="ถอนตรง" value={fmtMoney(0)} sub="0 รายการ" color={T.orange} icon="🏦" />
        <StatCard label="โบนัส" value={fmtMoney(0)} sub="0 รายการ" color={T.purple} icon="🎁" />
      </div>

      {/* TOP 50 */}
      <div style={{ background: G.card, border: `1px solid ${T.border}`, borderRadius: 14, boxShadow: SHADOW.card, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ background: G.accent, color: "#000", padding: "3px 12px", borderRadius: 20, fontSize: 13, fontWeight: 800 }}>TOP 50</span>
          <span style={{ color: T.text, fontWeight: 700, fontSize: 16 }}>ยอดเดิมพันสูงสุด</span>
          <span style={{ color: T.textDim, fontSize: 13 }}>รวมทุกงวด</span>
        </div>
        {top50Loading ? <Spinner /> : (
          <DataTable
            columns={[
              { key: "rank", label: "#", render: (_, row, ri) => (
                <span style={{ fontWeight: 800, color: ri < 3 ? T.accent : T.textDim, fontSize: ri < 3 ? 16 : 14 }}>
                  {ri === 0 ? "🥇" : ri === 1 ? "🥈" : ri === 2 ? "🥉" : ri + 1}
                </span>
              )},
              { key: "user", label: "ผู้เล่น", render: v => <span style={{ color: T.text, fontWeight: 600 }}>{v?.phone || v?.username || "-"}</span> },
              { key: "user", label: "ชื่อ", render: v => v?.full_name || "-" },
              { key: "bills", label: "จำนวนบิล", render: v => <span style={{ color: T.blue }}>{v?.toLocaleString()}</span> },
              { key: "totalBet", label: "ยอดเดิมพัน", render: v => <span style={{ color: T.accent, fontWeight: 700 }}>{fmtMoney(v)}</span> },
              { key: "totalWin", label: "ยอดรางวัล", render: v => <span style={{ color: T.green }}>{fmtMoney(v)}</span> },
              { key: "totalBet", label: "กำไรระบบ", render: (v, row) => {
                const profit = v - row.totalWin;
                return <span style={{ color: profit >= 0 ? T.green : T.red, fontWeight: 700 }}>{fmtMoney(profit)}</span>;
              }},
            ]}
            data={top50.map((r, i) => ({ ...r, rank: i + 1 }))}
          />
        )}
      </div>
    </div>
  );
};

// ─── MEMBERS PAGE ─────────────────────────────────────────────
const MembersPage = () => {
  const { members, loading, updateStatus } = useMembers();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const filtered = members.filter(m => {
    const matchSearch = (m.full_name || "").includes(search) || (m.phone || "").includes(search) || (m.username || "").includes(search);
    const matchRole = roleFilter === "all" || m.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <StatCard label="ผู้เล่นทั้งหมด" value={members.filter(m => m.role === "player").length} color={T.blue} icon="👤" />
        <StatCard label="ผู้เล่นใหม่" value="-" color={T.green} icon="🆕" sub="สมัครใน 3 วัน" />
        <StatCard label="ยังไม่ยอดฝาก" value="-" color={T.orange} icon="⚠️" />
        <StatCard label="ผู้เล่นออนไลน์" value="-" color={T.purple} icon="🟢" />
        <StatCard label="จากการแนะนำ" value="-" color={T.accent} icon="🤝" />
        <StatCard label="บัญชีถูกระงับ" value={members.filter(m => m.status === "suspended").length} color={T.red} icon="🚫" />
      </div>

      <div style={{ background: G.card, border: `1px solid ${T.border}`, borderRadius: 14, boxShadow: SHADOW.card }}>
        <div style={{ padding: "14px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ color: T.textDim, fontSize: 14 }}>จาก:</span>
          <input type="date" style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 10px", color: T.text, fontSize: 14 }} />
          <span style={{ color: T.textDim, fontSize: 14 }}>ถึง:</span>
          <input type="date" style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 10px", color: T.text, fontSize: 14 }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ระบุชื่อ หรือ ไอดี ผู้เล่น" style={{ flex: 1, minWidth: 220, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 12px", color: T.text, fontSize: 14 }} />
          <Btn v="primary" style={{ padding: "6px 20px" }}>ค้นหา</Btn>
          <Sel value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={{ width: 120 }}>
            <option value="all">ทุก Role</option>
            <option value="player">ผู้เล่น</option>
            <option value="agent">เอเย่นต์</option>
          </Sel>
        </div>

        <div style={{ padding: "10px 16px", color: T.textDim, fontSize: 14, fontWeight: 600, borderBottom: `1px solid ${T.border}` }}>รายการผู้เล่น</div>

        {loading ? <Spinner /> : (
          <DataTable
            columns={[
              { key: "id", label: "ID" },
              { key: "created_at", label: "วันที่สมัคร", render: v => fmtDate(v) },
              { key: "username", label: "ชื่อผู้ใช้" },
              { key: "full_name", label: "ชื่อ" },
              { key: "balance", label: "กระเป๋า(หลัก)", render: v => <span style={{ color: T.accent }}>{fmtMoney(v)}</span> },
              { key: "status", label: "สถานะ", render: v => <Badge status={v} /> },
              { key: "id", label: "จัดการ", render: (v, row) => (
                <Btn v={row.status !== "suspended" ? "bad" : "ok"} onClick={() => updateStatus(v, row.status !== "suspended" ? "suspended" : "active")} style={{ padding: "4px 14px", fontSize: 13 }}>
                  จัดการ ▾
                </Btn>
              )},
            ]}
            data={filtered}
          />
        )}
      </div>
    </div>
  );
};

// ─── LOTTERY SETTINGS PAGE ────────────────────────────────────
const LotteryPage = () => {
  const { groups } = useLotteryGroups();
  const GROUP_TABS = [
    { id: "thai",      label: "กลุ่มหวยไทย" },
    { id: "foreign",   label: "กลุ่มหวยต่างประเทศ" },
    { id: "stock",     label: "หวยหุ้น" },
    { id: "online",    label: "กลุ่มหวยออนไลน์" },
    { id: "special",   label: "กลุ่มหวยพิเศษ" },
  ];
  const [activeGroupTab, setActiveGroupTab] = useState("thai");
  const [selectedGroup, setSelectedGroup] = useState(null);

  const filteredGroups = groups.filter(g => g.type === activeGroupTab || groups.length > 0);
  useEffect(() => { if (filteredGroups.length && !selectedGroup) setSelectedGroup(filteredGroups[0]?.id); }, [filteredGroups]);

  const { draws, loading: drawsLoading, updateStatus, setResult } = useLotteryDraws(selectedGroup);
  const { rates } = useRateSettings(selectedGroup);

  // Ladder modal state
  const [ladderModal, setLadderModal] = useState(null); // rate row
  const { ladders, saveLadders } = useLadderRates(ladderModal?.id);
  const [ladderRows, setLadderRows] = useState([]);
  useEffect(() => { if (ladders.length) setLadderRows(ladders); else setLadderRows([{ min_amount: 1, max_amount: 100, payout_rate: 0 }]); }, [ladders, ladderModal]);

  // Limit state
  const [selectedDraw, setSelectedDraw] = useState(null);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitForm, setLimitForm] = useState({ betType: "three_top", number: "", limit: "", rateOverride: "", isClosed: false });
  const { limits, upsertLimit, remove: removeLimit } = useNumberLimits(selectedDraw);

  // Result modal
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultDraw, setResultDraw] = useState(null);
  const [resultForm, setResultForm] = useState({ three_top: "", three_front1: "", three_front2: "", three_bottom1: "", three_bottom2: "", two_top: "", two_bottom: "" });

  // Edit rate inline
  const [editRateId, setEditRateId] = useState(null);
  const [editRateVal, setEditRateVal] = useState("");
  const { updateRate } = useRateSettings(selectedGroup);

  const currentGroup = groups.find(g => g.id === selectedGroup);

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Group type tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: `2px solid ${T.border}`, marginBottom: 20 }}>
        {GROUP_TABS.map(t => (
          <button key={t.id} onClick={() => setActiveGroupTab(t.id)}
            style={{ background: "none", border: "none", color: activeGroupTab === t.id ? T.accent : T.textDim, borderBottom: activeGroupTab === t.id ? `2px solid ${T.accent}` : "2px solid transparent", padding: "10px 20px", fontWeight: activeGroupTab === t.id ? 700 : 400, fontSize: 15, marginBottom: -2, fontFamily: "inherit", cursor: "pointer" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Sub-group pills */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {groups.map(g => (
          <button key={g.id} onClick={() => setSelectedGroup(g.id)}
            style={{ display: "flex", alignItems: "center", gap: 6, background: selectedGroup === g.id ? T.blueGlow : T.bg, border: `1px solid ${selectedGroup === g.id ? T.blue : T.border}`, borderRadius: 24, padding: "6px 16px", color: selectedGroup === g.id ? "#fff" : T.textDim, fontWeight: selectedGroup === g.id ? 700 : 400, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
            {g.flag && <span>{g.flag}</span>}
            {g.name}
          </button>
        ))}
      </div>

      {selectedGroup && currentGroup && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Group name fields */}
          <div style={{ background: G.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18, boxShadow: SHADOW.card }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Inp label="ชื่อ-ไทย" value={currentGroup.name || ""} readOnly />
              <Inp label="ชื่อ-อังกฤษ" value={currentGroup.name_en || ""} readOnly />
            </div>
          </div>

          {/* วันและเวลา + Draws */}
          <div style={{ background: G.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden", boxShadow: SHADOW.card }}>
            <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.border}`, color: T.text, fontWeight: 700, fontSize: 15 }}>วันและเวลา</div>
            {drawsLoading ? <Spinner /> : (
              <DataTable
                columns={[
                  { key: "draw_date", label: "งวด", render: v => <span style={{ background: `${T.blue}22`, color: T.blue, padding: "3px 10px", borderRadius: 8, fontSize: 14, fontWeight: 700 }}>{v}</span> },
                  { key: "open_at", label: "วันที่เริ่ม", render: v => v?.split("T")[0] || "-" },
                  { key: "open_at", label: "เวลาเริ่ม", render: v => v?.split("T")[1]?.slice(0, 5) || "-" },
                  { key: "close_at", label: "วันที่สิ้นสุด", render: v => v?.split("T")[0] || "-" },
                  { key: "close_at", label: "เวลาสิ้นสุด", render: v => v?.split("T")[1]?.slice(0, 5) || "-" },
                  { key: "status", label: "สถานะ", render: v => <Badge status={v} /> },
                  { key: "id", label: "จัดการ", render: (v, row) => (
                    <div style={{ display: "flex", gap: 6 }}>
                      {row.status === "upcoming" && <Btn v="ok" onClick={() => updateStatus(v, "open")} style={{ padding: "3px 10px", fontSize: 13 }}>เปิดรับ</Btn>}
                      {row.status === "open" && <Btn v="bad" onClick={() => updateStatus(v, "closed")} style={{ padding: "3px 10px", fontSize: 13 }}>ปิดรับ</Btn>}
                      {row.status === "closed" && <Btn v="accent" onClick={() => { setResultDraw(row); setShowResultModal(true); }} style={{ padding: "3px 10px", fontSize: 13 }}>บันทึกผล</Btn>}
                      <Btn v="ghost" onClick={() => setSelectedDraw(v === selectedDraw ? null : v)} style={{ padding: "3px 10px", fontSize: 13, borderColor: selectedDraw === v ? T.accent : T.border, color: selectedDraw === v ? T.accent : T.textDim }}>
                        {selectedDraw === v ? "✓ เลือกอยู่" : "เลขอั้น"}
                      </Btn>
                    </div>
                  )},
                ]}
                data={draws}
              />
            )}
          </div>

          {/* อัตราจ่าย */}
          <div style={{ background: G.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden", boxShadow: SHADOW.card }}>
            <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.border}`, color: T.text, fontWeight: 700, fontSize: 15 }}>อัตราจ่าย (เริ่มต้น)</div>
            <DataTable
              columns={[
                { key: "bet_type", label: "ประเภท", render: v => BET_TYPE_LABELS[v] || v },
                { key: "min_bet", label: "ขั้นต่ำ/ครั้ง", render: v => `฿ ${v || 1}` },
                { key: "max_bet", label: "สูงสุด/ครั้ง", render: v => `฿ ${v?.toLocaleString() || "-"}` },
                { key: "payout_rate", label: "อัตราจ่าย/บาท", render: (v, row) => editRateId === row.id
                  ? <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input value={editRateVal} onChange={e => setEditRateVal(e.target.value)} type="number" style={{ width: 90, background: T.bg, border: `1px solid ${T.blue}`, borderRadius: 7, padding: "4px 8px", color: T.accent, fontFamily: "monospace", fontWeight: 700, fontSize: 14 }} />
                      <Btn v="ok" onClick={async () => { await updateRate(row.id, Number(editRateVal)); setEditRateId(null); }} style={{ padding: "3px 10px", fontSize: 13 }}>✓</Btn>
                      <Btn v="ghost" onClick={() => setEditRateId(null)} style={{ padding: "3px 8px", fontSize: 13 }}>✕</Btn>
                    </div>
                  : <span style={{ color: T.accent, fontWeight: 700, fontFamily: "monospace", fontSize: 16 }}>฿ {v}</span>
                },
                { key: "rate_type", label: "ประเภทอัตรา", render: v => (
                  <span style={{ background: v === "ladder" ? "rgba(168,85,247,0.2)" : "rgba(34,197,94,0.15)", color: v === "ladder" ? T.purple : T.green, padding: "2px 10px", borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
                    {v === "ladder" ? "ขั้นบันได" : "คงที่"}
                  </span>
                )},
                { key: "id", label: "แก้ไข", render: (v, row) => (
                  <div style={{ display: "flex", gap: 6 }}>
                    <Btn v="ghost" onClick={() => { setEditRateId(v); setEditRateVal(row.payout_rate); }} style={{ padding: "3px 10px", fontSize: 13 }}>✏️ แก้ไข</Btn>
                    <Btn v="ghost" onClick={() => setLadderModal(row)} style={{ padding: "3px 10px", fontSize: 13, borderColor: T.purple, color: T.purple }}>📊 ขั้นบันได</Btn>
                  </div>
                )},
              ]}
              data={rates}
            />
          </div>

          {/* เลขอั้น */}
          {selectedDraw && (
            <div style={{ background: G.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden", boxShadow: SHADOW.card }}>
              <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: T.text, fontWeight: 700, fontSize: 15 }}>เลขอั้น / ปิดรับแทง</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn v="danger" onClick={() => setShowLimitModal(true)} style={{ padding: "6px 16px" }}>+ เพิ่มเลขอั้น</Btn>
                </div>
              </div>
              {limits.length === 0
                ? <div style={{ textAlign: "center", padding: 32, color: T.textFaint }}>ยังไม่มีเลขอั้น — กดปุ่มด้านบนเพื่อเพิ่ม</div>
                : (
                  <DataTable
                    columns={[
                      { key: "bet_type", label: "ประเภท", render: v => BET_TYPE_LABELS[v] || v },
                      { key: "number", label: "เลข", render: v => <span style={{ fontFamily: "monospace", fontSize: 22, letterSpacing: 4, color: T.accent, fontWeight: 800 }}>{v}</span> },
                      { key: "original_limit", label: "ยอดจำกัด", render: v => v ? fmtMoney(v) : "-" },
                      { key: "remaining_limit", label: "คงเหลือ", render: (v, row) => {
                        const pct = row.original_limit ? (v / row.original_limit) * 100 : 100;
                        return (
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <span style={{ color: pct < 20 ? T.red : pct < 50 ? T.orange : T.green, fontWeight: 700 }}>{v ? fmtMoney(v) : "-"}</span>
                            {row.original_limit && <div style={{ height: 4, background: T.border, borderRadius: 2, width: 80 }}><div style={{ height: "100%", width: `${pct}%`, background: pct < 20 ? T.red : pct < 50 ? T.orange : T.green, borderRadius: 2 }} /></div>}
                          </div>
                        );
                      }},
                      { key: "payout_rate_override", label: "อัตราพิเศษ", render: v => v ? <span style={{ color: T.purple }}>฿{v}</span> : "-" },
                      { key: "is_closed", label: "สถานะ", render: v => <Badge status={v ? "closed" : "open"} /> },
                      { key: "id", label: "", render: v => <Btn v="bad" onClick={() => removeLimit(v)} style={{ padding: "3px 12px", fontSize: 13 }}>ลบ</Btn> },
                    ]}
                    data={limits}
                  />
                )
              }
            </div>
          )}
        </div>
      )}

      {/* Ladder Rate Modal */}
      {ladderModal && (
        <Modal title={`อัตราขั้นบันได — ${BET_TYPE_LABELS[ladderModal.bet_type] || ladderModal.bet_type}`} onClose={() => setLadderModal(null)} width={560}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ background: `${T.blue}15`, border: `1px solid ${T.blue}30`, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: T.textDim }}>
              กำหนดอัตราจ่ายตามยอดเดิมพัน — ยิ่งแทงมาก อัตราจ่ายจะลดลงตามขั้น
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 8, alignItems: "center" }}>
              <div style={{ color: T.textDim, fontSize: 13, fontWeight: 600 }}>ยอดขั้นต่ำ</div>
              <div style={{ color: T.textDim, fontSize: 13, fontWeight: 600 }}>ยอดสูงสุด</div>
              <div style={{ color: T.textDim, fontSize: 13, fontWeight: 600 }}>อัตราจ่าย (฿)</div>
              <div />
              {ladderRows.map((row, i) => (
                <>
                  <input key={`a${i}`} type="number" value={row.min_amount} onChange={e => { const r = [...ladderRows]; r[i] = { ...r[i], min_amount: Number(e.target.value) }; setLadderRows(r); }}
                    style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "7px 10px", color: T.text, fontSize: 14, width: "100%" }} />
                  <input key={`b${i}`} type="number" value={row.max_amount} onChange={e => { const r = [...ladderRows]; r[i] = { ...r[i], max_amount: Number(e.target.value) }; setLadderRows(r); }}
                    style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "7px 10px", color: T.text, fontSize: 14, width: "100%" }} />
                  <input key={`c${i}`} type="number" value={row.payout_rate} onChange={e => { const r = [...ladderRows]; r[i] = { ...r[i], payout_rate: Number(e.target.value) }; setLadderRows(r); }}
                    style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "7px 10px", color: T.accent, fontSize: 14, fontWeight: 700, width: "100%" }} />
                  <button key={`d${i}`} onClick={() => setLadderRows(ladderRows.filter((_, j) => j !== i))}
                    style={{ background: "rgba(239,68,68,0.2)", border: "none", color: T.red, borderRadius: 8, padding: "7px 10px", cursor: "pointer", fontSize: 16 }}>✕</button>
                </>
              ))}
            </div>
            <Btn v="ghost" onClick={() => setLadderRows([...ladderRows, { min_amount: 0, max_amount: 0, payout_rate: 0 }])} style={{ width: "fit-content" }}>+ เพิ่มขั้น</Btn>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn v="primary" onClick={() => { saveLadders(ladderRows); setLadderModal(null); }} style={{ flex: 1, padding: 12 }}>บันทึกอัตราขั้นบันได</Btn>
              <Btn v="ghost" onClick={() => setLadderModal(null)}>ยกเลิก</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Number Limit Modal */}
      {showLimitModal && (
        <Modal title="เพิ่มเลขอั้น / ปิดรับแทง" onClose={() => setShowLimitModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Sel label="ประเภทการแทง" value={limitForm.betType} onChange={e => setLimitForm({ ...limitForm, betType: e.target.value })}>
                {BET_TYPES.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
              </Sel>
              <Inp label="เลข *" value={limitForm.number} onChange={e => setLimitForm({ ...limitForm, number: e.target.value })} maxLength={3} placeholder="เช่น 456" style={{ fontFamily: "monospace", fontSize: 20, letterSpacing: 4, fontWeight: 700 }} />
              <Inp label="ยอดจำกัด (บาท)" type="number" value={limitForm.limit} onChange={e => setLimitForm({ ...limitForm, limit: e.target.value })} placeholder="เช่น 5000" />
              <Inp label="อัตราจ่ายพิเศษ (ถ้ามี)" type="number" value={limitForm.rateOverride} onChange={e => setLimitForm({ ...limitForm, rateOverride: e.target.value })} placeholder="เช่น 500" />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", background: limitForm.isClosed ? "rgba(239,68,68,0.1)" : T.bg, border: `1px solid ${limitForm.isClosed ? T.red : T.border}`, borderRadius: 9, padding: "10px 14px" }}>
              <input type="checkbox" checked={limitForm.isClosed} onChange={e => setLimitForm({ ...limitForm, isClosed: e.target.checked })} style={{ width: 16, height: 16, accentColor: T.red }} />
              <span style={{ color: limitForm.isClosed ? T.red : T.text, fontWeight: 600, fontSize: 15 }}>ปิดรับแทงเลขนี้ทันที (ไม่จำกัดยอด)</span>
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn v="danger" onClick={async () => { await upsertLimit(limitForm); setShowLimitModal(false); setLimitForm({ betType: "three_top", number: "", limit: "", rateOverride: "", isClosed: false }); }} style={{ flex: 1, padding: 12 }}>บันทึก</Btn>
              <Btn v="ghost" onClick={() => setShowLimitModal(false)}>ยกเลิก</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Result Modal */}
      {showResultModal && resultDraw && (
        <Modal title={`บันทึกผลรางวัล — ${resultDraw.draw_date}`} onClose={() => setShowResultModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <Inp label="3 ตัวบน *" value={resultForm.three_top} onChange={e => setResultForm({ ...resultForm, three_top: e.target.value })} maxLength={3} placeholder="456" style={{ fontFamily: "monospace", fontSize: 22, letterSpacing: 4 }} />
              <Inp label="2 ตัวบน *" value={resultForm.two_top} onChange={e => setResultForm({ ...resultForm, two_top: e.target.value })} maxLength={2} placeholder="56" style={{ fontFamily: "monospace", fontSize: 22, letterSpacing: 4 }} />
              <Inp label="2 ตัวล่าง *" value={resultForm.two_bottom} onChange={e => setResultForm({ ...resultForm, two_bottom: e.target.value })} maxLength={2} placeholder="78" style={{ fontFamily: "monospace", fontSize: 22, letterSpacing: 4 }} />
              <Inp label="3 ตัวหน้า 1" value={resultForm.three_front1} onChange={e => setResultForm({ ...resultForm, three_front1: e.target.value })} maxLength={3} placeholder="123" />
              <Inp label="3 ตัวหน้า 2" value={resultForm.three_front2} onChange={e => setResultForm({ ...resultForm, three_front2: e.target.value })} maxLength={3} placeholder="234" />
              <Inp label="3 ตัวล่าง 1" value={resultForm.three_bottom1} onChange={e => setResultForm({ ...resultForm, three_bottom1: e.target.value })} maxLength={3} placeholder="345" />
              <Inp label="3 ตัวล่าง 2" value={resultForm.three_bottom2} onChange={e => setResultForm({ ...resultForm, three_bottom2: e.target.value })} maxLength={3} placeholder="456" />
            </div>
            <div style={{ background: "rgba(245,158,11,0.1)", border: `1px solid ${T.orange}40`, borderRadius: 9, padding: "10px 14px", fontSize: 14, color: T.orange }}>
              ⚠️ การบันทึกผลจะคำนวณรางวัลและจ่ายเงินอัตโนมัติ ไม่สามารถยกเลิกได้
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn v="accent" onClick={async () => { const { error } = await setResult(resultDraw.id, resultForm); if (!error) { setShowResultModal(false); setResultForm({ three_top: "", three_front1: "", three_front2: "", three_bottom1: "", three_bottom2: "", two_top: "", two_bottom: "" }); } else alert(error.message); }} style={{ flex: 1, padding: 12 }}>ยืนยันบันทึกผล</Btn>
              <Btn v="ghost" onClick={() => setShowResultModal(false)}>ยกเลิก</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ─── FINANCE PAGE ─────────────────────────────────────────────
const FinancePage = ({ type }) => {
  const { txs, loading, approve, reject } = useTransactions(type);
  const pending = txs.filter(t => t.status === "pending");

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <StatCard label="ฝากรวม" value={fmtMoney(txs.filter(t => t.type === "deposit").reduce((s, t) => s + t.amount, 0))} color={T.green} icon="📥" />
        <StatCard label="ฝาก(ออโต้)" value={fmtMoney(0)} color={T.blue} icon="⚡" />
        <StatCard label="ฝากตรง" value={fmtMoney(0)} color={T.purple} icon="💳" />
        <StatCard label="โบนัส" value={fmtMoney(0)} color={T.accent} icon="🎁" />
      </div>

      <div style={{ background: G.card, border: `1px solid ${T.border}`, borderRadius: 14, boxShadow: SHADOW.card }}>
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ color: T.textDim, fontSize: 14 }}>จาก:</span>
          <input type="date" style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 10px", color: T.text, fontSize: 14 }} />
          <span style={{ color: T.textDim, fontSize: 14 }}>ถึง:</span>
          <input type="date" style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 10px", color: T.text, fontSize: 14 }} />
          <input placeholder="ระบุชื่อ หรือ ไอดี ผู้เล่น" style={{ flex: 1, minWidth: 180, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 12px", color: T.text, fontSize: 14 }} />
          <Btn v="primary" style={{ padding: "6px 20px" }}>ค้นหา</Btn>
        </div>

        <div style={{ padding: "10px 16px", borderBottom: `1px solid ${T.border}`, color: T.textDim, fontSize: 14, fontWeight: 600 }}>รายการ{type === "deposit" ? "ฝากเงิน" : "ถอนเงิน"}</div>
        {loading ? <Spinner /> : (
          <DataTable
            columns={[
              { key: "id", label: "#", render: (_, __, ri) => ri + 1 },
              { key: "created_at", label: "วันที่", render: v => fmtDate(v) },
              { key: "user", label: "ผู้เล่น", render: v => v?.phone || v?.username || "-" },
              { key: "type", label: "กระทำ", render: v => <Badge status={v} /> },
              { key: "amount", label: "จำนวน", render: v => <span style={{ color: type === "deposit" ? T.green : T.orange, fontWeight: 700 }}>{fmtMoney(v)}</span> },
              { key: "bank_account", label: "ธนาคาร", render: v => v ? `${v.bank_name} ${v.account_number}` : "-" },
              { key: "status", label: "สถานะ", render: v => <Badge status={v} /> },
              { key: "note", label: "หมายเหตุ" },
              { key: "id", label: "แอดมิน", render: (v, row) => row.status === "pending"
                ? <div style={{ display: "flex", gap: 6 }}>
                    <Btn v="ok" onClick={() => approve(v)} style={{ padding: "3px 12px", fontSize: 13 }}>อนุมัติ</Btn>
                    <Btn v="bad" onClick={() => reject(v)} style={{ padding: "3px 12px", fontSize: 13 }}>ปฏิเสธ</Btn>
                  </div>
                : <Badge status={row.status} />
              },
            ]}
            data={txs}
          />
        )}
      </div>
    </div>
  );
};

// ─── BETTING PAGE ─────────────────────────────────────────────
const BettingPage = () => {
  const { slips, loading } = useBetSlips();
  const [search, setSearch] = useState("");
  const filtered = slips.filter(s => (s.slip_number || "").includes(search) || (s.user?.phone || "").includes(search));
  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <StatCard label="บิลทั้งหมด" value={slips.length} color={T.blue} icon="🎫" />
        <StatCard label="รอออกผล" value={slips.filter(s => s.status === "pending").length} color={T.orange} icon="⏳" />
        <StatCard label="ถูกรางวัล" value={slips.filter(s => s.status === "won").length} color={T.green} icon="🏆" />
        <StatCard label="ไม่ถูก" value={slips.filter(s => s.status === "lost").length} color={T.red} icon="❌" />
      </div>
      <div style={{ background: G.card, border: `1px solid ${T.border}`, borderRadius: 14, boxShadow: SHADOW.card }}>
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${T.border}` }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาเลขบิล หรือ เบอร์โทร..." style={{ width: "100%", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 9, padding: "8px 14px", color: T.text, fontSize: 15 }} />
        </div>
        {loading ? <Spinner /> : (
          <DataTable
            columns={[
              { key: "slip_number", label: "เลขบิล" },
              { key: "user", label: "ผู้เล่น", render: v => v?.phone || v?.username || "-" },
              { key: "draw", label: "หวย", render: v => v?.lottery_group?.name || "-" },
              { key: "total_amount", label: "ยอดแทง", render: v => <span style={{ color: T.accent, fontWeight: 700 }}>{fmtMoney(v)}</span> },
              { key: "total_win", label: "รางวัล", render: v => <span style={{ color: T.green }}>{fmtMoney(v)}</span> },
              { key: "status", label: "สถานะ", render: v => <Badge status={v} /> },
              { key: "created_at", label: "วันที่", render: v => fmtDate(v) },
            ]}
            data={filtered}
          />
        )}
      </div>
    </div>
  );
};

// ─── REPORT PAGE ──────────────────────────────────────────────
const ReportPage = () => {
  const { summary, loading } = useDailySummary();
  const [period, setPeriod] = useState("today");
  const PERIODS = [{ id: "today", label: "วันนี้" }, { id: "yesterday", label: "เมื่อวานนี้" }, { id: "thisweek", label: "สัปดาห์นี้" }, { id: "lastweek", label: "สัปดาห์ที่แล้ว" }, { id: "thismonth", label: "เดือนนี้" }, { id: "lastmonth", label: "เดือนที่แล้ว" }];

  const totalBet = summary.reduce((s, r) => s + (r.total_bet_amount || 0), 0);
  const totalPayout = summary.reduce((s, r) => s + (r.total_payout || 0), 0);
  const netProfit = summary.reduce((s, r) => s + (r.net_profit || 0), 0);

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {PERIODS.map(p => (
          <button key={p.id} onClick={() => setPeriod(p.id)}
            style={{ background: period === p.id ? G.blue : T.bg, color: period === p.id ? "#fff" : T.textDim, border: `1px solid ${period === p.id ? T.blue : T.border}`, borderRadius: 9, padding: "7px 16px", fontSize: 14, fontWeight: period === p.id ? 700 : 400, fontFamily: "inherit", cursor: "pointer", boxShadow: period === p.id ? SHADOW.blue : "none" }}>
            {p.label}
          </button>
        ))}
        <div style={{ display: "flex", gap: 8, marginLeft: "auto", alignItems: "center" }}>
          <span style={{ color: T.textDim, fontSize: 14 }}>จากวันที่:</span>
          <input type="date" style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 10px", color: T.text, fontSize: 14 }} />
          <span style={{ color: T.textDim, fontSize: 14 }}>ถึงวันที่:</span>
          <input type="date" style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 10px", color: T.text, fontSize: 14 }} />
          <Btn v="primary" style={{ padding: "6px 16px" }}>ค้นหา</Btn>
        </div>
      </div>

      <div style={{ background: G.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden", boxShadow: SHADOW.card }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.border}`, color: T.text, fontWeight: 700, fontSize: 15 }}>รายงาน แพ้/ชนะ ระบบ</div>
        {loading ? <Spinner /> : (
          <DataTable
            columns={[
              { key: "id", label: "#", render: (_, __, i) => i + 1 },
              { key: "lottery_group", label: "เกมลี้", render: v => v?.name || "ทั้งหมด" },
              { key: "total_bet_amount", label: "เดิมพันรวม", render: v => <span style={{ color: T.text }}>{fmtMoney(v)}</span> },
              { key: "total_payout", label: "แพ้/ชนะ", render: (v, row) => <span style={{ color: (row.net_profit||0) >= 0 ? T.green : T.red, fontWeight: 700 }}>{fmtMoney(row.net_profit)}</span> },
              // Player columns
              { key: "total_bet_amount", label: "เดิมพัน (ผู้เล่น)", render: v => fmtMoney(v) },
              { key: "total_payout", label: "ชนะ (ผู้เล่น)", render: v => fmtMoney(v) },
              { key: "commission_paid", label: "คอม", render: v => fmtMoney(v) },
              { key: "net_profit", label: "สุทธิ", render: v => <span style={{ color: v >= 0 ? T.green : T.red, fontWeight: 700 }}>{fmtMoney(v)}</span> },
            ]}
            data={summary}
          />
        )}
      </div>
    </div>
  );
};

// ─── SETTINGS PAGE ────────────────────────────────────────────
const SettingsPage = () => {
  const [settings, setSettings] = useState({});
  useEffect(() => {
    supabase.from("system_settings").select("*").then(({ data }) => {
      if (data) { const o = {}; data.forEach(s => o[s.key] = s.value); setSettings(o); }
    });
  }, []);
  const save = async () => {
    await Promise.all(Object.entries(settings).map(([key, value]) => supabase.from("system_settings").upsert({ key, value }, { onConflict: "key" })));
    alert("บันทึกการตั้งค่าเรียบร้อย");
  };
  return (
    <div className="fade-in" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <div style={{ background: G.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20, boxShadow: SHADOW.card }}>
        <div style={{ color: T.text, fontWeight: 700, fontSize: 16, marginBottom: 18 }}>ตั้งค่าระบบ</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[{ key: "min_deposit", label: "ยอดฝากขั้นต่ำ (บาท)" }, { key: "min_withdraw", label: "ยอดถอนขั้นต่ำ (บาท)" }, { key: "max_withdraw_per_day", label: "ยอดถอนสูงสุด/วัน" }, { key: "bet_close_before_minutes", label: "ปิดรับก่อนออกผล (นาที)" }].map(f => (
            <Inp key={f.key} label={f.label} value={settings[f.key] || ""} onChange={e => setSettings({ ...settings, [f.key]: e.target.value })} />
          ))}
          <Btn v="accent" onClick={save} style={{ padding: 12, marginTop: 4 }}>บันทึกการตั้งค่า</Btn>
        </div>
      </div>
      <div style={{ background: G.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20, boxShadow: SHADOW.card }}>
        <div style={{ color: T.text, fontWeight: 700, fontSize: 16, marginBottom: 18 }}>การทำงานระบบ</div>
        {[{ key: "maintenance_mode", label: "ปิดระบบชั่วคราว", desc: "ผู้เล่นจะเข้าไม่ได้", danger: true }, { key: "auto_result", label: "ดึงผลอัตโนมัติ", desc: "ดึงผลจาก API อัตโนมัติ" }].map(s => (
          <div key={s.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: `1px solid ${T.border}15` }}>
            <div>
              <div style={{ color: s.danger ? T.red : T.text, fontSize: 15, fontWeight: 600 }}>{s.label}</div>
              <div style={{ color: T.textFaint, fontSize: 13 }}>{s.desc}</div>
            </div>
            <div onClick={() => setSettings({ ...settings, [s.key]: settings[s.key] === "true" ? "false" : "true" })}
              style={{ width: 48, height: 26, background: settings[s.key] === "true" ? (s.danger ? T.red : T.blue) : T.border, borderRadius: 13, cursor: "pointer", position: "relative", transition: "background 0.2s", boxShadow: settings[s.key] === "true" ? (s.danger ? SHADOW.green : SHADOW.blue) : "none" }}>
              <div style={{ position: "absolute", top: 3, left: settings[s.key] === "true" ? 25 : 3, width: 20, height: 20, background: "#fff", borderRadius: 10, transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── MAIN APP ─────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [page, setPage] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState({ members: true, transactions: true, lottery: true, credit: false, winloss: false });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setUser(data.session?.user || null); setChecking(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => setUser(session?.user || null));
    return () => subscription.unsubscribe();
  }, []);

  if (checking) return <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", color: T.textDim, fontFamily: "Noto Sans Thai, sans-serif" }}><GlobalStyle /><Spinner /></div>;
  if (!user) return <LoginPage onLogin={setUser} />;

  const NAV = [
    { id: "dashboard", label: "Dashboard", icon: "📊", type: "item" },
    { id: "members", label: "Members", icon: "👥", type: "group", children: [
      { id: "players",   label: "Players" },
      { id: "agents",    label: "Agents" },
      { id: "employees", label: "Employees" },
    ]},
    { id: "transactions", label: "Transactions", icon: "💳", type: "group", children: [
      { id: "deposit",  label: "Deposit" },
      { id: "withdraw", label: "Withdraw" },
    ]},
    { id: "lottery", label: "Lottery", icon: "🎰", type: "group", children: [
      { id: "lottery_overview", label: "Lottery Overview" },
      { id: "betting",          label: "Betting" },
      { id: "bills",            label: "Bills" },
      { id: "results",          label: "Results" },
      { id: "lottery_settings", label: "Settings" },
    ]},
    { id: "credit", label: "Credit Reports", icon: "📋", type: "group", children: [
      { id: "player_credit", label: "Player Credit" },
      { id: "agent_credit",  label: "Agent Credit" },
      { id: "system_credit", label: "System Credit" },
    ]},
    { id: "winloss", label: "Win/Loss Reports", icon: "📈", type: "group", children: [
      { id: "wl_system", label: "W/L System" },
      { id: "wl_agent",  label: "W/L Agent" },
    ]},
  ];

  const PAGE_TITLES = {
    dashboard: "Dashboard", players: "Players", agents: "Agents", employees: "Employees",
    deposit: "Deposit", withdraw: "Withdraw", lottery_overview: "Lottery Overview",
    betting: "Betting", bills: "Bills", results: "Results", lottery_settings: "Lottery Settings",
    player_credit: "Player Credit", agent_credit: "Agent Credit", system_credit: "System Credit",
    wl_system: "W/L System", wl_agent: "W/L Agent",
  };

  const renderPage = () => {
    switch (page) {
      case "dashboard":       return <DashboardPage />;
      case "players":         return <MembersPage />;
      case "deposit":         return <FinancePage type="deposit" />;
      case "withdraw":        return <FinancePage type="withdraw" />;
      case "lottery_settings":return <LotteryPage />;
      case "betting":         return <BettingPage />;
      case "wl_system":       return <ReportPage />;
      case "lottery_settings":return <SettingsPage />;
      default:                return <div style={{ color: T.textDim, padding: 40, textAlign: "center" }}>🚧 อยู่ระหว่างพัฒนา</div>;
    }
  };

  const W = sidebarCollapsed ? 64 : 220;

  return (
    <div style={{ display: "flex", height: "100vh", background: T.bg, overflow: "hidden" }}>
      <GlobalStyle />

      {/* Sidebar */}
      <div style={{ width: W, background: G.sidebar, borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)", overflow: "hidden", flexShrink: 0, boxShadow: "4px 0 20px rgba(0,0,0,0.4)" }}>
        {/* Logo */}
        <div style={{ padding: "18px 14px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 10, minHeight: 64 }}>
          <div style={{ width: 36, height: 36, background: G.blue, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0, boxShadow: SHADOW.blue }}>🎰</div>
          {!sidebarCollapsed && <div><div style={{ color: T.text, fontWeight: 800, fontSize: 15, lineHeight: 1 }}>LottoPro</div><div style={{ color: T.accent, fontSize: 11, fontWeight: 600 }}>ADMIN</div></div>}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "8px 8px", overflowY: "auto", overflowX: "hidden" }}>
          {NAV.map(item => {
            if (item.type === "item") {
              const active = page === item.id;
              return (
                <button key={item.id} onClick={() => setPage(item.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", marginBottom: 2, borderRadius: 9, background: active ? `${T.blueGlow}` : "none", color: active ? "#fff" : T.textDim, border: active ? `1px solid ${T.blue}60` : "1px solid transparent", cursor: "pointer", textAlign: "left", fontFamily: "inherit", boxShadow: active ? `inset 0 0 0 1px ${T.blue}30` : "none" }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
                  {!sidebarCollapsed && <span style={{ fontSize: 14, fontWeight: active ? 700 : 400, whiteSpace: "nowrap" }}>{item.label}</span>}
                  {active && !sidebarCollapsed && <span style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: T.accent }} />}
                </button>
              );
            }

            const isOpen = openGroups[item.id];
            const anyActive = item.children?.some(c => c.id === page);
            return (
              <div key={item.id}>
                <button onClick={() => setOpenGroups({ ...openGroups, [item.id]: !isOpen })}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", marginBottom: 2, borderRadius: 9, background: anyActive ? `${T.blueGlow}` : "none", color: anyActive ? T.accent : T.textDim, border: "1px solid transparent", cursor: "pointer", fontFamily: "inherit" }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
                  {!sidebarCollapsed && <>
                    <span style={{ fontSize: 14, fontWeight: anyActive ? 700 : 400, flex: 1, textAlign: "left", whiteSpace: "nowrap" }}>{item.label}</span>
                    <span style={{ fontSize: 11, color: T.textFaint, transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>▶</span>
                  </>}
                </button>
                {!sidebarCollapsed && isOpen && item.children?.map(child => {
                  const active = page === child.id;
                  return (
                    <button key={child.id} onClick={() => setPage(child.id)}
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "7px 10px 7px 32px", marginBottom: 1, borderRadius: 8, background: active ? `${T.blue}25` : "none", color: active ? "#fff" : T.textFaint, border: active ? `1px solid ${T.blue}40` : "1px solid transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: active ? 600 : 400 }}>
                      {active && <span style={{ width: 4, height: 4, borderRadius: "50%", background: T.accent, marginLeft: -10, marginRight: 6 }} />}
                      {child.label}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Collapse + Logout */}
        <div style={{ padding: "10px 8px", borderTop: `1px solid ${T.border}` }}>
          {!sidebarCollapsed && (
            <button onClick={() => supabase.auth.signOut()} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", marginBottom: 6, borderRadius: 9, background: "none", border: `1px solid ${T.border}`, color: T.textDim, cursor: "pointer", fontFamily: "inherit", fontSize: 14 }}>
              🚪 ออกจากระบบ
            </button>
          )}
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            style={{ width: "100%", background: T.card, border: `1px solid ${T.border}`, borderRadius: 9, padding: "7px", color: T.textDim, cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", fontSize: 14, transition: "background 0.2s" }}>
            {sidebarCollapsed ? "▶" : "◀"}
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Topbar */}
        <div style={{ background: G.header, borderBottom: `1px solid ${T.border}`, padding: "0 24px", height: 58, display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 2px 12px rgba(0,0,0,0.3)", flexShrink: 0 }}>
          <div>
            <div style={{ color: T.text, fontWeight: 700, fontSize: 18 }}>{PAGE_TITLES[page] || page}</div>
            <div style={{ color: T.textFaint, fontSize: 12 }}>bo.laobet123.live</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", padding: "4px 12px", borderRadius: 20 }}>
              <span className="live-dot" style={{ width: 7, height: 7, borderRadius: "50%", background: T.green, display: "inline-block" }} />
              <span style={{ color: T.green, fontSize: 13, fontWeight: 600 }}>Live</span>
            </div>
            <div style={{ color: T.textDim, fontSize: 13 }}>{user.email}</div>
          </div>
        </div>

        {/* Page content */}
        <div style={{ flex: 1, overflowY: "auto", padding: 24, background: `radial-gradient(ellipse at 80% 0%, rgba(26,86,219,0.06) 0%, transparent 50%), ${T.bg}` }}>
          {renderPage()}
        </div>
      </div>
    </div>
  );
}
