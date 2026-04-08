import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

// ── Members ──────────────────────────────────────
export function useMembers() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMembers()
  }, [])

  async function fetchMembers() {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id, username, full_name, phone, role, status,
        balance, created_at,
        agent:agent_id (username)
      `)
      .order('created_at', { ascending: false })

    if (!error) setMembers(data)
    setLoading(false)
  }

  async function addMember({ username, full_name, password, role = 'player' }) {
    // สร้าง auth user ก่อน
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      phone: username,
      password,
      phone_confirm: true,
    })
    if (authErr) return { error: authErr }

    // สร้าง profile
    const { error } = await supabase.from('profiles').insert({
      id: authData.user.id,
      username,
      full_name,
      role,
    })
    if (!error) fetchMembers()
    return { error }
  }

  return { members, loading, fetchMembers, addMember }
}

// ── Lottery Draws ─────────────────────────────────
export function useLotteryDraws() {
  const [draws, setDraws] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDraws()
  }, [])

  async function fetchDraws() {
    setLoading(true)
    const { data, error } = await supabase
      .from('lottery_draws')
      .select(`
        *,
        lottery_group:lottery_group_id (name, slug, type)
      `)
      .order('draw_date', { ascending: false })
      .limit(50)

    if (!error) setDraws(data)
    setLoading(false)
  }

  async function updateDrawStatus(drawId, status) {
    const { error } = await supabase
      .from('lottery_draws')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', drawId)
    if (!error) fetchDraws()
    return { error }
  }

  return { draws, loading, fetchDraws, updateDrawStatus }
}

// ── Lottery Groups ────────────────────────────────
export function useLotteryGroups() {
  const [groups, setGroups] = useState([])

  useEffect(() => {
    supabase
      .from('lottery_groups')
      .select('*')
      .order('sort_order')
      .then(({ data }) => { if (data) setGroups(data) })
  }, [])

  return { groups }
}

// ── Rate Settings ─────────────────────────────────
export function useRateSettings(lotteryGroupId) {
  const [rates, setRates] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRates()
  }, [lotteryGroupId])

  async function fetchRates() {
    setLoading(true)
    const { data, error } = await supabase
      .from('rate_settings')
      .select('*')
      .order('bet_type')

    if (!error) setRates(data)
    setLoading(false)
  }

  async function updateRate(id, payout_rate) {
    const { error } = await supabase
      .from('rate_settings')
      .update({ payout_rate, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (!error) fetchRates()
    return { error }
  }

  return { rates, loading, fetchRates, updateRate }
}

// ── Number Limits ─────────────────────────────────
export function useNumberLimits(drawId) {
  const [limits, setLimits] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (drawId) fetchLimits()
  }, [drawId])

  async function fetchLimits() {
    setLoading(true)
    const { data, error } = await supabase
      .from('number_limits')
      .select('*')
      .eq('lottery_draw_id', drawId)
      .order('created_at', { ascending: false })

    if (!error) setLimits(data)
    setLoading(false)
  }

  async function addLimit({ bet_type, number, original_limit, payout_rate_override, is_closed }) {
    const { error } = await supabase
      .from('number_limits')
      .upsert({
        lottery_draw_id: drawId,
        bet_type,
        number,
        original_limit,
        remaining_limit: original_limit,
        payout_rate_override,
        is_closed,
        updated_at: new Date().toISOString()
      }, { onConflict: 'lottery_draw_id,bet_type,number' })

    if (!error) fetchLimits()
    return { error }
  }

  async function removeLimit(id) {
    const { error } = await supabase
      .from('number_limits')
      .delete()
      .eq('id', id)
    if (!error) fetchLimits()
    return { error }
  }

  return { limits, loading, fetchLimits, addLimit, removeLimit }
}

// ── Bet Slips ─────────────────────────────────────
export function useBetSlips() {
  const [slips, setSlips] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSlips()

    // Realtime subscription
    const channel = supabase
      .channel('bet_slips_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bet_slips' }, fetchSlips)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  async function fetchSlips() {
    setLoading(true)
    const { data, error } = await supabase
      .from('bet_slips')
      .select(`
        *,
        user:user_id (username, phone),
        draw:lottery_draw_id (
          draw_date,
          lottery_group:lottery_group_id (name)
        ),
        bet_items (*)
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (!error) setSlips(data)
    setLoading(false)
  }

  return { slips, loading, fetchSlips }
}

// ── Transactions ──────────────────────────────────
export function useTransactions(type = null) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTransactions()

    const channel = supabase
      .channel('transactions_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, fetchTransactions)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [type])

  async function fetchTransactions() {
    setLoading(true)
    let query = supabase
      .from('transactions')
      .select(`
        *,
        user:user_id (username, phone, full_name),
        bank_account:bank_account_id (bank_name, account_number)
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (type) query = query.eq('type', type)

    const { data, error } = await query
    if (!error) setTransactions(data)
    setLoading(false)
  }

  async function approveTransaction(id, userId) {
    const { error } = await supabase
      .from('transactions')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (!error) fetchTransactions()
    return { error }
  }

  async function rejectTransaction(id) {
    const { error } = await supabase
      .from('transactions')
      .update({ status: 'rejected' })
      .eq('id', id)

    if (!error) fetchTransactions()
    return { error }
  }

  return { transactions, loading, fetchTransactions, approveTransaction, rejectTransaction }
}

// ── Dashboard Stats ───────────────────────────────
export function useDashboardStats() {
  const [stats, setStats] = useState({
    totalBetToday: 0,
    totalWinToday: 0,
    totalMembers: 0,
    pendingWithdraw: 0,
    pendingWithdrawAmount: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]

    const [membersRes, betRes, withdrawRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'player'),
      supabase.from('bet_slips').select('total_amount, total_win').gte('created_at', today),
      supabase.from('transactions').select('amount', { count: 'exact' }).eq('type', 'withdraw').eq('status', 'pending'),
    ])

    const totalBet = betRes.data?.reduce((s, r) => s + (r.total_amount || 0), 0) || 0
    const totalWin = betRes.data?.reduce((s, r) => s + (r.total_win || 0), 0) || 0
    const pendingAmt = withdrawRes.data?.reduce((s, r) => s + (r.amount || 0), 0) || 0

    setStats({
      totalBetToday: totalBet,
      totalWinToday: totalWin,
      totalMembers: membersRes.count || 0,
      pendingWithdraw: withdrawRes.count || 0,
      pendingWithdrawAmount: pendingAmt,
    })
    setLoading(false)
  }

  return { stats, loading, fetchStats }
}

// ── Daily Summary (Report) ────────────────────────
export function useDailySummary(date = null) {
  const [summary, setSummary] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSummary()
  }, [date])

  async function fetchSummary() {
    setLoading(true)
    let query = supabase
      .from('daily_summary')
      .select(`
        *,
        lottery_group:lottery_group_id (name)
      `)
      .order('summary_date', { ascending: false })
      .limit(30)

    if (date) query = query.eq('summary_date', date)

    const { data, error } = await query
    if (!error) setSummary(data)
    setLoading(false)
  }

  return { summary, loading, fetchSummary }
}
