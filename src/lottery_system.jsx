import { useState, useEffect } from "react";

// ─── Mock Data ────────────────────────────────────────────────
const LOTTERY_TYPES = [
  { id: 1, name: "หวยรัฐบาลไทย", nameEn: "Thai Lotto", status: "open", nextDraw: "01/05/2569", closeTime: "15:20" },
  { id: 2, name: "หวยออมสิน", nameEn: "GSB Lottery", status: "upcoming", nextDraw: "16/05/2569", closeTime: "15:20" },
  { id: 3, name: "หวยลาว", nameEn: "Laos Lottery", status: "open", nextDraw: "08/04/2569", closeTime: "20:00" },
  { id: 4, name: "หวยฮานอย", nameEn: "Hanoi Lottery", status: "open", nextDraw: "08/04/2569", closeTime: "18:30" },
  { id: 5, name: "ยี่กี", nameEn: "Yeekee", status: "open", nextDraw: "08/04/2569", closeTime: "ทุก 15 นาที" },
  { id: 6, name: "หวยหุ้นไทย เช้า", nameEn: "Thai Stock AM", status: "resulted", nextDraw: "09/04/2569", closeTime: "11:00" },
];

const BET_TYPES = [
  { id: "three_top", label: "3 ตัวบน", rate: 950, maxBet: 20000 },
  { id: "three_front", label: "3 ตัวหน้า", rate: 450, maxBet: 100 },
  { id: "three_bottom", label: "3 ตัวล่าง", rate: 450, maxBet: 100 },
  { id: "three_tod", label: "3 ตัวโต๊ด", rate: 150, maxBet: 500 },
  { id: "two_top", label: "2 ตัวบน", rate: 100, maxBet: 1000 },
  { id: "two_bottom", label: "2 ตัวล่าง", rate: 100, maxBet: 1000 },
  { id: "run_top", label: "วิ่งบน", rate: 32, maxBet: 10000 },
  { id: "run_bottom", label: "วิ่งล่าง", rate: 42, maxBet: 10000 },
];

const MOCK_MEMBERS = [
  { id: 190, phone: "0804950385", name: "กะเด มนายหลี", balance: 1000, status: "Active", agent: "ไม่มีผู้แนะนำ", regDate: "16/08/2025 05:39" },
  { id: 191, phone: "0985140192", name: "อนุรักษ์ จันทร์แก้ว", balance: 1000, status: "Active", agent: "ไม่มีผู้แนะนำ", regDate: "16/08/2025 05:39" },
  { id: 192, phone: "0932347207", name: "กีรพล สอนดี", balance: 1000, status: "Active", agent: "ไม่มีผู้แนะนำ", regDate: "16/08/2025 05:39" },
  { id: 193, phone: "0623540067", name: "เมษนุช ตอมฝุ่ง", balance: 1000, status: "Active", agent: "ไม่มีผู้แนะนำ", regDate: "16/08/2025 05:39" },
  { id: 194, phone: "0809187194", name: "สมชาย โต้งสูงเนิน", balance: 1000, status: "Active", agent: "ไม่มีผู้แนะนำ", regDate: "16/08/2025 05:39" },
  { id: 195, phone: "0886397200", name: "นิรินทร์ วันดี", balance: 1000, status: "Active", agent: "ไม่มีผู้แนะนำ", regDate: "16/08/2025 05:39" },
];

const MOCK_BETS = [
  { id: "SL20250408001", lottery: "หวยรัฐบาลไทย", type: "3 ตัวบน", number: "456", amount: 100, rate: 950, potential: 95000, status: "pending", date: "08/04/2569 09:15" },
  { id: "SL20250408002", lottery: "หวยรัฐบาลไทย", type: "2 ตัวล่าง", number: "56", amount: 200, rate: 100, potential: 20000, status: "won", date: "08/04/2569 09:10" },
  { id: "SL20250407001", lottery: "หวยลาว", type: "2 ตัวบน", number: "12", amount: 50, rate: 90, potential: 4500, status: "lost", date: "07/04/2569 18:00" },
];

const MOCK_TRANSACTIONS = [
  { id: "TX20250408001", type: "deposit", amount: 5000, status: "approved", user: "0804950385", date: "08/04/2569 09:00", bank: "กสิกรไทย" },
  { id: "TX20250408002", type: "withdraw", amount: 2000, status: "pending", user: "0985140192", date: "08/04/2569 10:30", bank: "ไทยพาณิชย์" },
  { id: "TX20250408003", type: "win", amount: 20000, status: "approved", user: "0932347207", date: "08/04/2569 11:00", bank: "-" },
];

const MOCK_REPORT = [
  { game: "หวยรัฐบาลไทย", totalBet: 312, winLoss: 312, playerBet: -95, playerWin: -95, agentBet: 217, agentWin: -217, systemShare: 299.52, systemWin: 95 },
  { game: "หวยออนไลน์", totalBet: 0, winLoss: 0, playerBet: 0, playerWin: 0, agentBet: 0, agentWin: 0, systemShare: 0, systemWin: 0 },
];

// ─── Icons ────────────────────────────────────────────────────
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
    check: "M5 13l4 4L19 7",
    edit: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
    alert: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
    arrow_down: "M19 9l-7 7-7-7",
    refresh: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
    deposit: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
    withdraw: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z",
    win: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z",
  };
  return (
    <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      {(icons[name] || "").split(" M").map((d, i) => <path key={i} d={i === 0 ? d : "M" + d} />)}
    </svg>
  );
};

// ─── Status Badge ─────────────────────────────────────────────
const Badge = ({ status, labels }) => {
  const map = {
    open: { bg: "#0d4f2b", color: "#4ade80", text: "เปิดรับแทง" },
    upcoming: { bg: "#1e3a5f", color: "#60a5fa", text: "เร็วๆนี้" },
    resulted: { bg: "#2d1b4e", color: "#a78bfa", text: "ออกผลแล้ว" },
    closed: { bg: "#4a1414", color: "#f87171", text: "ปิดรับ" },
    Active: { bg: "#0d4f2b", color: "#4ade80", text: "Active" },
    approved: { bg: "#0d4f2b", color: "#4ade80", text: "อนุมัติ" },
    pending: { bg: "#3d2a00", color: "#fbbf24", text: "รอดำเนินการ" },
    rejected: { bg: "#4a1414", color: "#f87171", text: "ปฏิเสธ" },
    won: { bg: "#0d4f2b", color: "#4ade80", text: "ถูกรางวัล" },
    lost: { bg: "#4a1414", color: "#f87171", text: "ไม่ถูก" },
    deposit: { bg: "#0d3d2b", color: "#34d399", text: "ฝากเงิน" },
    withdraw: { bg: "#3d1a00", color: "#fb923c", text: "ถอนเงิน" },
    win: { bg: "#0d4f2b", color: "#4ade80", text: "รางวัล" },
  };
  const cfg = map[status] || { bg: "#1e293b", color: "#94a3b8", text: status };
  return (
    <span style={{ background: cfg.bg, color: cfg.color, padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
      {cfg.text}
    </span>
  );
};

// ─── Stat Card ────────────────────────────────────────────────
const StatCard = ({ label, value, sub, color = "#00d4aa", icon }) => (
  <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: "18px 20px", flex: 1, minWidth: 160 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
      <span style={{ color: color, opacity: 0.7 }}><Icon name={icon} size={16} /></span>
      <span style={{ color: "#64748b", fontSize: 13 }}>{label}</span>
    </div>
    <div style={{ color: color, fontSize: 26, fontWeight: 800, fontFamily: "monospace", letterSpacing: -1 }}>{value}</div>
    {sub && <div style={{ color: "#475569", fontSize: 12, marginTop: 4 }}>{sub}</div>}
  </div>
);

// ─── Table ────────────────────────────────────────────────────
const Table = ({ columns, data, onAction }) => (
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
        {data.length === 0 ? (
          <tr><td colSpan={columns.length} style={{ color: "#475569", textAlign: "center", padding: 32 }}>ไม่มีข้อมูล</td></tr>
        ) : data.map((row, ri) => (
          <tr key={ri} style={{ borderBottom: "1px solid #0f172a" }}
            onMouseEnter={e => e.currentTarget.style.background = "#0f172a"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            {columns.map((col, ci) => (
              <td key={ci} style={{ padding: "10px 12px", color: "#cbd5e1", whiteSpace: "nowrap" }}>
                {col.render ? col.render(row[col.key], row) : row[col.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ─── Dashboard Page ───────────────────────────────────────────
const DashboardPage = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      <StatCard label="ยอดแทงวันนี้" value="฿312.00" sub="2 รายการ" color="#00d4aa" icon="bet" />
      <StatCard label="แพ้/ชนะ" value="฿95.00" sub="กำไรสุทธิ" color="#4ade80" icon="win" />
      <StatCard label="สมาชิกทั้งหมด" value="25" sub="Active ทั้งหมด" color="#60a5fa" icon="members" />
      <StatCard label="รอถอนเงิน" value="฿2,000" sub="1 รายการ" color="#fbbf24" icon="withdraw" />
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      {/* Win/Loss Report */}
      <div style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 12, padding: 16, gridColumn: "1 / -1" }}>
        <div style={{ color: "#94a3b8", fontWeight: 700, marginBottom: 12, fontSize: 14 }}>รายงานแพ้/ชนะ ระบบ — วันนี้</div>
        <Table
          columns={[
            { key: "game", label: "เกมส์" },
            { key: "totalBet", label: "เดิมพันรวม", render: v => <span style={{ color: "#4ade80" }}>฿{v}</span> },
            { key: "winLoss", label: "แพ้/ชนะ", render: v => <span style={{ color: "#4ade80" }}>฿{v}</span> },
            { key: "playerBet", label: "ผู้เล่น เดิมพัน", render: v => <span style={{ color: v < 0 ? "#f87171" : "#4ade80" }}>฿{v}</span> },
            { key: "agentBet", label: "เอเย่นต์ เดิมพัน", render: v => <span style={{ color: "#60a5fa" }}>฿{v}</span> },
            { key: "systemWin", label: "บริษัท ชนะ", render: v => <span style={{ color: "#4ade80" }}>฿{v}</span> },
          ]}
          data={MOCK_REPORT}
        />
      </div>

      {/* Recent Transactions */}
      <div style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 12, padding: 16 }}>
        <div style={{ color: "#94a3b8", fontWeight: 700, marginBottom: 12, fontSize: 14 }}>ธุรกรรมล่าสุด</div>
        {MOCK_TRANSACTIONS.map((tx, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #0f172a" }}>
            <div>
              <div style={{ color: "#cbd5e1", fontSize: 13 }}>{tx.user}</div>
              <div style={{ color: "#475569", fontSize: 11 }}>{tx.date}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: tx.type === "deposit" ? "#4ade80" : tx.type === "win" ? "#a78bfa" : "#fb923c", fontWeight: 700 }}>
                {tx.type === "deposit" ? "+" : tx.type === "win" ? "+" : "-"}฿{tx.amount.toLocaleString()}
              </span>
              <Badge status={tx.status} />
            </div>
          </div>
        ))}
      </div>

      {/* Active Lotteries */}
      <div style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 12, padding: 16 }}>
        <div style={{ color: "#94a3b8", fontWeight: 700, marginBottom: 12, fontSize: 14 }}>หวยที่เปิดรับแทง</div>
        {LOTTERY_TYPES.filter(l => l.status === "open").map((lottery, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #0f172a" }}>
            <div>
              <div style={{ color: "#cbd5e1", fontSize: 13, fontWeight: 600 }}>{lottery.name}</div>
              <div style={{ color: "#475569", fontSize: 11 }}>ปิดรับ {lottery.closeTime} น.</div>
            </div>
            <Badge status="open" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ─── Members Page ─────────────────────────────────────────────
const MembersPage = () => {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const filtered = MOCK_MEMBERS.filter(m => m.name.includes(search) || m.phone.includes(search));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <StatCard label="ผู้เล่นทั้งหมด" value="25" color="#60a5fa" icon="members" />
        <StatCard label="ผู้เล่นออนไลน์" value="-" color="#00d4aa" icon="members" />
        <StatCard label="บัญชีถูกระงับ" value="-" color="#f87171" icon="alert" />
        <StatCard label="จากการแนะนำ" value="-" color="#fbbf24" icon="members" />
      </div>

      <div style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 12, padding: 16 }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "8px 12px" }}>
            <Icon name="search" size={16} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาผู้เล่น..." style={{ background: "none", border: "none", color: "#cbd5e1", outline: "none", flex: 1 }} />
          </div>
          <button onClick={() => setShowModal(true)} style={{ background: "#00d4aa", color: "#000", border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="add" size={16} /> เพิ่มสมาชิก
          </button>
        </div>
        <Table
          columns={[
            { key: "id", label: "ID" },
            { key: "regDate", label: "วันที่สมัคร" },
            { key: "phone", label: "ชื่อผู้ใช้" },
            { key: "name", label: "ชื่อ" },
            { key: "balance", label: "กระเป๋า(หลัก)", render: v => `฿${v.toLocaleString()}` },
            { key: "status", label: "สถานะ", render: v => <Badge status={v} /> },
            { key: "agent", label: "แนะนำโดย" },
            { key: "id", label: "จัดการ", render: (v, row) => (
              <button style={{ background: "#1e293b", color: "#60a5fa", border: "1px solid #334155", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12 }}>จัดการ ▾</button>
            )},
          ]}
          data={filtered}
        />
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 16, padding: 28, width: 420 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <span style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>เพิ่มสมาชิกใหม่</span>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer" }}><Icon name="close" /></button>
            </div>
            {["ชื่อผู้ใช้ (เบอร์โทร)", "ชื่อ-นามสกุล", "รหัสผ่าน", "ยืนยันรหัสผ่าน"].map((label, i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <div style={{ color: "#64748b", fontSize: 12, marginBottom: 6 }}>{label}</div>
                <input type={label.includes("รหัส") ? "password" : "text"} style={{ width: "100%", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "10px 12px", color: "#cbd5e1", outline: "none", boxSizing: "border-box" }} />
              </div>
            ))}
            <button style={{ width: "100%", background: "#00d4aa", color: "#000", border: "none", borderRadius: 8, padding: 12, cursor: "pointer", fontWeight: 700, marginTop: 8 }}>สร้างสมาชิก</button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Lottery Settings Page ────────────────────────────────────
const LotteryPage = () => {
  const [selectedLottery, setSelectedLottery] = useState(LOTTERY_TYPES[0]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {LOTTERY_TYPES.map((l, i) => (
          <button key={i} onClick={() => setSelectedLottery(l)} style={{
            background: selectedLottery.id === l.id ? "#00d4aa" : "#0f172a",
            color: selectedLottery.id === l.id ? "#000" : "#94a3b8",
            border: "1px solid #1e293b", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600
          }}>{l.name}</button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Lottery Info */}
        <div style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 12, padding: 20 }}>
          <div style={{ color: "#94a3b8", fontWeight: 700, marginBottom: 16, fontSize: 14 }}>ข้อมูลหวย: {selectedLottery.name}</div>
          <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
            {[{ label: "ชื่อ-ไทย", val: selectedLottery.name }, { label: "ชื่อ-อังกฤษ", val: selectedLottery.nameEn }].map((f, i) => (
              <div key={i} style={{ flex: 1 }}>
                <div style={{ color: "#64748b", fontSize: 12, marginBottom: 6 }}>{f.label}</div>
                <input defaultValue={f.val} style={{ width: "100%", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "8px 12px", color: "#cbd5e1", outline: "none", boxSizing: "border-box" }} />
              </div>
            ))}
          </div>
          <div style={{ color: "#64748b", fontSize: 12, marginBottom: 6 }}>งวดถัดไป / กำหนดออกผล</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input defaultValue={selectedLottery.nextDraw} style={{ flex: 1, background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "8px 12px", color: "#cbd5e1", outline: "none" }} />
            <input defaultValue={selectedLottery.closeTime} style={{ width: 100, background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "8px 12px", color: "#cbd5e1", outline: "none" }} />
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button style={{ flex: 1, background: "#00d4aa", color: "#000", border: "none", borderRadius: 8, padding: 10, cursor: "pointer", fontWeight: 700 }}>บันทึก</button>
            <button style={{ background: "#1e293b", color: "#94a3b8", border: "1px solid #334155", borderRadius: 8, padding: "10px 16px", cursor: "pointer" }}>สถานะ: <Badge status={selectedLottery.status} /></button>
          </div>
        </div>

        {/* Payout Rates */}
        <div style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 12, padding: 20 }}>
          <div style={{ color: "#94a3b8", fontWeight: 700, marginBottom: 16, fontSize: 14 }}>อัตราจ่าย</div>
          <Table
            columns={[
              { key: "label", label: "ประเภท" },
              { key: "rate", label: "อัตราจ่าย/บาท", render: v => <span style={{ color: "#fbbf24", fontWeight: 700 }}>฿{v}</span> },
              { key: "maxBet", label: "สูงสุด/ครั้ง", render: v => `฿${v.toLocaleString()}` },
              { key: "id", label: "แก้ไข", render: () => (
                <button style={{ background: "none", border: "none", color: "#60a5fa", cursor: "pointer" }}><Icon name="edit" size={14} /></button>
              )},
            ]}
            data={BET_TYPES}
          />
        </div>
      </div>

      {/* Number Limits */}
      <div style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 12, padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <span style={{ color: "#94a3b8", fontWeight: 700, fontSize: 14 }}>เลขอั้น / ปิดเลข</span>
          <button style={{ background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 13 }}>+ เพิ่มเลขอั้น</button>
        </div>
        <div style={{ color: "#475569", textAlign: "center", padding: 24 }}>ยังไม่มีเลขอั้นสำหรับงวดนี้</div>
      </div>
    </div>
  );
};

// ─── Finance Page ─────────────────────────────────────────────
const FinancePage = () => {
  const [tab, setTab] = useState("deposit");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <StatCard label="ฝากรวม" value="฿0.00" sub="0 รายการ" color="#4ade80" icon="deposit" />
        <StatCard label="ฝาก(ออได้)" value="฿0.00" sub="0 รายการ" color="#4ade80" icon="deposit" />
        <StatCard label="ฝากตรง" value="฿0.00" sub="0 รายการ" color="#00d4aa" icon="deposit" />
        <StatCard label="โบนัส" value="฿0.00" sub="0 รายการ" color="#a78bfa" icon="win" />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        {[{ id: "deposit", label: "รายการฝาก" }, { id: "withdraw", label: "รายการถอน" }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: tab === t.id ? "#00d4aa" : "#0f172a",
            color: tab === t.id ? "#000" : "#94a3b8",
            border: "1px solid #1e293b", borderRadius: 8, padding: "8px 20px", cursor: "pointer", fontWeight: 700
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 12, padding: 16 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {["วันนี้", "เมื่อวานนี้", "สัปดาห์นี้", "เดือนนี้"].map(d => (
            <button key={d} style={{ background: d === "วันนี้" ? "#00d4aa" : "#0f172a", color: d === "วันนี้" ? "#000" : "#64748b", border: "1px solid #1e293b", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12 }}>{d}</button>
          ))}
        </div>
        <Table
          columns={[
            { key: "id", label: "#" },
            { key: "date", label: "วันที่" },
            { key: "user", label: "ผู้เล่น" },
            { key: "bank", label: "ธนาคาร" },
            { key: "amount", label: "จำนวน", render: v => <span style={{ color: "#4ade80", fontWeight: 700 }}>฿{v.toLocaleString()}</span> },
            { key: "status", label: "สถานะ", render: v => <Badge status={v} /> },
            { key: "id", label: "จัดการ", render: (v, row) => row.status === "pending" ? (
              <div style={{ display: "flex", gap: 6 }}>
                <button style={{ background: "#0d4f2b", color: "#4ade80", border: "1px solid #166534", borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontSize: 12 }}>อนุมัติ</button>
                <button style={{ background: "#4a1414", color: "#f87171", border: "1px solid #7f1d1d", borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontSize: 12 }}>ปฏิเสธ</button>
              </div>
            ) : <Badge status={row.status} /> },
          ]}
          data={MOCK_TRANSACTIONS.filter(t => t.type === tab)}
        />
      </div>
    </div>
  );
};

// ─── Betting Page ─────────────────────────────────────────────
const BettingPage = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    <div style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 12, padding: 16 }}>
      <div style={{ color: "#94a3b8", fontWeight: 700, marginBottom: 16, fontSize: 14 }}>ประวัติการแทง</div>
      <Table
        columns={[
          { key: "id", label: "เลขบิล" },
          { key: "lottery", label: "หวย" },
          { key: "type", label: "ประเภท" },
          { key: "number", label: "เลข", render: v => <span style={{ color: "#fbbf24", fontWeight: 800, fontSize: 16, letterSpacing: 2 }}>{v}</span> },
          { key: "amount", label: "ยอดแทง", render: v => `฿${v}` },
          { key: "rate", label: "อัตราจ่าย" },
          { key: "potential", label: "รางวัลถ้าถูก", render: v => <span style={{ color: "#00d4aa" }}>฿{v.toLocaleString()}</span> },
          { key: "status", label: "สถานะ", render: v => <Badge status={v} /> },
          { key: "date", label: "วันที่" },
        ]}
        data={MOCK_BETS}
      />
    </div>
  </div>
);

// ─── Report Page ──────────────────────────────────────────────
const ReportPage = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      <StatCard label="ยอดแทงรวม" value="฿624.00" sub="ทุกงวด" color="#00d4aa" icon="report" />
      <StatCard label="กำไรบริษัท" value="฿190.00" sub="รวมทุกงวด" color="#4ade80" icon="win" />
      <StatCard label="จ่ายรางวัล" value="฿434.00" sub="รวมทุกงวด" color="#fbbf24" icon="finance" />
      <StatCard label="คอมมิชชั่น" value="฿0.00" sub="จ่ายให้เอเย่นต์" color="#a78bfa" icon="members" />
    </div>

    <div style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 12, padding: 16 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ color: "#94a3b8", fontWeight: 700, fontSize: 14, flex: 1 }}>รายงานแพ้/ชนะ ระบบ</div>
        {["วันนี้", "เมื่อวานนี้", "สัปดาห์นี้", "สัปดาห์ที่แล้ว", "เดือนนี้", "เดือนที่แล้ว"].map(d => (
          <button key={d} style={{ background: d === "วันนี้" ? "#00d4aa" : "#0f172a", color: d === "วันนี้" ? "#000" : "#64748b", border: "1px solid #1e293b", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 12 }}>{d}</button>
        ))}
      </div>
      <Table
        columns={[
          { key: "game", label: "เกมส์" },
          { key: "totalBet", label: "เดิมพันรวม", render: v => <span style={{ color: "#4ade80" }}>฿{v}</span> },
          { key: "winLoss", label: "แพ้/ชนะ", render: v => <span style={{ color: "#4ade80" }}>฿{v}</span> },
          { key: "playerBet", label: "ผู้เล่น", render: v => <span style={{ color: v < 0 ? "#f87171" : "#4ade80" }}>฿{v}</span> },
          { key: "agentBet", label: "เอเย่นต์", render: v => <span style={{ color: "#60a5fa" }}>฿{v}</span> },
          { key: "systemWin", label: "บริษัท", render: v => <span style={{ color: "#00d4aa", fontWeight: 700 }}>฿{v}</span> },
        ]}
        data={MOCK_REPORT}
      />
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12, gap: 8 }}>
        <button style={{ background: "#1e293b", color: "#94a3b8", border: "1px solid #334155", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 13 }}>📊 Export Excel</button>
        <button style={{ background: "#1e293b", color: "#94a3b8", border: "1px solid #334155", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 13 }}>📄 Export PDF</button>
      </div>
    </div>
  </div>
);

// ─── Settings Page ────────────────────────────────────────────
const SettingsPage = () => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
    <div style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 12, padding: 20 }}>
      <div style={{ color: "#94a3b8", fontWeight: 700, marginBottom: 16, fontSize: 14 }}>ตั้งค่าระบบ</div>
      {[
        { label: "ยอดฝากขั้นต่ำ (บาท)", val: "100" },
        { label: "ยอดถอนขั้นต่ำ (บาท)", val: "100" },
        { label: "ยอดถอนสูงสุด/วัน (บาท)", val: "500000" },
        { label: "ปิดรับแทงก่อนออกผล (นาที)", val: "30" },
        { label: "โบนัสสมาชิกใหม่ (บาท)", val: "0" },
      ].map((f, i) => (
        <div key={i} style={{ marginBottom: 14 }}>
          <div style={{ color: "#64748b", fontSize: 12, marginBottom: 6 }}>{f.label}</div>
          <input defaultValue={f.val} style={{ width: "100%", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "8px 12px", color: "#cbd5e1", outline: "none", boxSizing: "border-box" }} />
        </div>
      ))}
      <button style={{ background: "#00d4aa", color: "#000", border: "none", borderRadius: 8, padding: "10px 20px", cursor: "pointer", fontWeight: 700 }}>บันทึกการตั้งค่า</button>
    </div>

    <div style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 12, padding: 20 }}>
      <div style={{ color: "#94a3b8", fontWeight: 700, marginBottom: 16, fontSize: 14 }}>บัญชีธนาคารรับเงิน</div>
      <button style={{ background: "#1e293b", color: "#60a5fa", border: "1px solid #334155", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 13, marginBottom: 16 }}>+ เพิ่มบัญชีธนาคาร</button>
      <div style={{ color: "#475569", textAlign: "center", padding: 24 }}>ยังไม่มีบัญชีธนาคาร</div>

      <div style={{ color: "#94a3b8", fontWeight: 700, marginBottom: 12, marginTop: 20, fontSize: 14 }}>โหมดการทำงาน</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #1e293b" }}>
        <div>
          <div style={{ color: "#cbd5e1", fontSize: 13 }}>ปิดระบบชั่วคราว (Maintenance)</div>
          <div style={{ color: "#475569", fontSize: 11 }}>ผู้เล่นจะไม่สามารถเข้าถึงระบบได้</div>
        </div>
        <div style={{ width: 44, height: 24, background: "#1e293b", borderRadius: 12, cursor: "pointer", position: "relative" }}>
          <div style={{ position: "absolute", left: 2, top: 2, width: 20, height: 20, background: "#64748b", borderRadius: 10 }} />
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0" }}>
        <div>
          <div style={{ color: "#cbd5e1", fontSize: 13 }}>ดึงผลอัตโนมัติ (Auto Result)</div>
          <div style={{ color: "#475569", fontSize: 11 }}>ดึงผลหวยจาก API อัตโนมัติ</div>
        </div>
        <div style={{ width: 44, height: 24, background: "#0d4f2b", borderRadius: 12, cursor: "pointer", position: "relative" }}>
          <div style={{ position: "absolute", right: 2, top: 2, width: 20, height: 20, background: "#4ade80", borderRadius: 10 }} />
        </div>
      </div>
    </div>
  </div>
);

// ─── Main App ─────────────────────────────────────────────────
export default function LotterySystem() {
  const [page, setPage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: "dashboard" },
    { id: "members", label: "สมาชิก", icon: "members" },
    { id: "lottery", label: "จัดการหวย", icon: "lottery" },
    { id: "betting", label: "บิล / การแทง", icon: "bet" },
    { id: "finance", label: "การเงิน", icon: "finance" },
    { id: "report", label: "รายงาน", icon: "report" },
    { id: "settings", label: "ตั้งค่า", icon: "settings" },
  ];

  const pageComponents = {
    dashboard: <DashboardPage />,
    members: <MembersPage />,
    lottery: <LotteryPage />,
    betting: <BettingPage />,
    finance: <FinancePage />,
    report: <ReportPage />,
    settings: <SettingsPage />,
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "#060c18", fontFamily: "'IBM Plex Sans Thai', 'Sarabun', sans-serif", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #0a0f1e; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 3px; }
        input { font-family: inherit; font-size: 13px; }
        button { font-family: inherit; }
      `}</style>

      {/* Sidebar */}
      <div style={{ width: sidebarOpen ? 220 : 64, background: "#0a0f1e", borderRight: "1px solid #1e293b", display: "flex", flexDirection: "column", transition: "width 0.2s", overflow: "hidden", flexShrink: 0 }}>
        {/* Logo */}
        <div style={{ padding: "20px 16px", borderBottom: "1px solid #1e293b", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: "linear-gradient(135deg, #00d4aa, #0066ff)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>🎰</div>
          {sidebarOpen && <span style={{ color: "#fff", fontWeight: 800, fontSize: 15, whiteSpace: "nowrap" }}>LottoPro Admin</span>}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 8px", overflowY: "auto" }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setPage(item.id)} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px", marginBottom: 4, borderRadius: 8,
              background: page === item.id ? "#00d4aa18" : "none",
              color: page === item.id ? "#00d4aa" : "#64748b",
              border: page === item.id ? "1px solid #00d4aa30" : "1px solid transparent",
              cursor: "pointer", textAlign: "left", fontWeight: page === item.id ? 600 : 400,
              transition: "all 0.15s",
            }}>
              <span style={{ flexShrink: 0 }}><Icon name={item.icon} size={17} /></span>
              {sidebarOpen && <span style={{ fontSize: 13, whiteSpace: "nowrap" }}>{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Collapse Button */}
        <div style={{ padding: "12px 8px", borderTop: "1px solid #1e293b" }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ width: "100%", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "8px", color: "#64748b", cursor: "pointer", display: "flex", justifyContent: "center" }}>
            {sidebarOpen ? "◀" : "▶"}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ background: "#0a0f1e", borderBottom: "1px solid #1e293b", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>
              {navItems.find(n => n.id === page)?.label}
            </div>
            <div style={{ color: "#475569", fontSize: 12 }}>Supabase Lottery System v1.0</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ background: "#0d4f2b", color: "#4ade80", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>● Live</div>
            <div style={{ width: 36, height: 36, background: "linear-gradient(135deg, #00d4aa, #0066ff)", borderRadius: 50, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 14 }}>A</div>
          </div>
        </div>

        {/* Page Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          {pageComponents[page]}
        </div>
      </div>
    </div>
  );
}
