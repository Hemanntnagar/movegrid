'use client'

import React, { useState, useEffect } from 'react'
import {
  Bell,
  Camera,
  Compass,
  Flame,
  Footprints,
  Gift,
  Grid3X3,
  HelpCircle,
  Info,
  Layers,
  LayoutDashboard,
  Lock,
  MapPin,
  Menu,
  MessageSquare,
  Moon,
  Play,
  Plus,
  Puzzle,
  Rocket,
  Sailboat,
  Settings,
  Shield,
  Sparkles,
  Sun,
  Target,
  Trophy,
  User,
  Users,
  Zap,
} from 'lucide-react'
import { DashboardPath } from '../components/DashboardPath'

export default function Page() {
  const [activeNav, setActiveNav] = useState('Home')
  const [points, setPoints] = useState(2480)
  const [steps, setSteps] = useState(6420)
  const targetSteps = 10000
  const stepPercent = Math.min(100, Math.round((steps / targetSteps) * 100))

  // Countdown timer for daily banner
  const [secondsLeft, setSecondsLeft] = useState(83789) // 23h 16m 29s
  useEffect(() => {
    const timer = setInterval(() => setSecondsLeft((prev) => Math.max(0, prev - 1)), 1000)
    return () => clearInterval(timer)
  }, [])

  const formatTime = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600)
    const m = Math.floor((totalSec % 3600) / 60)
    const s = totalSec % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-[#38bdf8] via-[#7dd3fc] to-[#60a5fa] font-sans text-slate-900 overflow-x-hidden pb-28">
      {/* Background Animated Clouds */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
        <div className="absolute top-10 left-[5%] w-32 h-12 bg-white/40 rounded-full blur-[1px]" />
        <div className="absolute top-16 left-[8%] w-24 h-10 bg-white/50 rounded-full blur-[1px]" />
        <div className="absolute top-20 right-[10%] w-44 h-16 bg-white/40 rounded-full blur-[1px]" />
        <div className="absolute top-28 right-[14%] w-32 h-12 bg-white/50 rounded-full blur-[1px]" />
      </div>

      {/* Main Container Container Shell */}
      <div className="relative z-10 mx-auto max-w-[1280px] px-3 sm:px-6 pt-4">
        {/* ==================== TOP HEADER BAR ==================== */}
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {/* Logo Badge */}
          <div className="flex items-center gap-2 rounded-2xl border-[3px] border-[#1e293b] bg-[#fef08a] px-4 py-2 shadow-[0_5px_0_#1e293b] transition-transform hover:scale-105 cursor-pointer">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f59e0b] border-[2px] border-[#1e293b]">
              <Trophy size={18} className="text-white fill-white" />
            </div>
            <span className="text-xl font-black tracking-tight text-[#1e293b]">MOVEGRID</span>
          </div>

          {/* Center Header Pill Widgets */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* User Level Badge */}
            <div className="flex items-center gap-2.5 rounded-full border-[3px] border-[#1e293b] bg-[#f472b6]/90 px-3.5 py-1.5 shadow-[0_4px_0_#1e293b] text-white">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-800 font-bold border-[2px] border-[#1e293b]">
                <span className="text-sm">🐧</span>
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white border border-[#1e293b]">
                  5
                </span>
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-xs font-black tracking-tight text-white drop-shadow">
                  Demo <span className="text-amber-300">74</span> ⚡
                </span>
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-pink-100 mt-0.5">
                  STEP EXPLORER
                </span>
              </div>
            </div>

            {/* MOVE PTS Capsule */}
            <div className="flex items-center gap-2 rounded-full border-[3px] border-[#1e293b] bg-[#fde047] px-3.5 py-1.5 shadow-[0_4px_0_#1e293b]">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 border border-[#1e293b] text-white font-black text-xs shadow-inner">
                ★
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-xs font-black text-[#1e293b]">
                  {points.toLocaleString()}
                </span>
                <span className="text-[9px] font-black tracking-wider text-amber-900 uppercase">
                  MOVE PTS
                </span>
              </div>
              <button
                type="button"
                className="ml-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white border border-[#1e293b] font-black transition-transform hover:scale-110 active:scale-95"
                title="Add MOVE PTS"
              >
                <Plus size={14} strokeWidth={3} />
              </button>
            </div>

            {/* Daily Steps Tracker Capsule */}
            <div className="flex items-center gap-3 rounded-full border-[3px] border-[#1e293b] bg-[#c084fc]/90 px-3.5 py-1.5 shadow-[0_4px_0_#1e293b] text-white">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-400 border border-[#1e293b] text-[#1e293b]">
                <Footprints size={15} strokeWidth={2.5} />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-200">
                  TODAY&apos;S STEPS
                </span>
                <span className="text-xs font-black text-white">
                  {steps.toLocaleString()} <span className="text-purple-200 font-normal">/ 10k</span>
                </span>
              </div>
              <div className="rounded-full bg-emerald-400 px-2 py-0.5 border border-[#1e293b] text-[10px] font-black text-[#1e293b]">
                {stepPercent}%
              </div>
            </div>
          </div>

          {/* Right Header Action Icons */}
          <div className="flex items-center gap-2">
            {/* Notification Bell */}
            <button
              type="button"
              className="relative flex h-10 w-10 items-center justify-center rounded-2xl border-[3px] border-[#1e293b] bg-[#38bdf8] shadow-[0_4px_0_#1e293b] transition-transform hover:scale-105 active:scale-95"
              aria-label="Notifications"
            >
              <Bell size={20} className="text-slate-900 fill-amber-300" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white border border-[#1e293b]">
                1
              </span>
            </button>

            {/* Settings Button */}
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-2xl border-[3px] border-[#1e293b] bg-[#a855f7] shadow-[0_4px_0_#1e293b] text-white transition-transform hover:scale-105 active:scale-95"
              aria-label="Settings"
            >
              <Settings size={20} strokeWidth={2.5} />
            </button>
          </div>
        </header>

        {/* ==================== DAILY EXPIRY BANNER CARD ==================== */}
        <section className="mb-4 overflow-hidden rounded-3xl border-[4px] border-[#1e293b] bg-white p-3.5 sm:p-4 shadow-[0_8px_0_rgba(30,41,59,0.18)]">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Left Info */}
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-[3px] border-[#1e293b] bg-amber-400 text-[#1e293b]">
                <Target size={24} strokeWidth={2.5} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 m-0">
                    Keep moving, Demo!
                  </h2>
                  <span className="rounded-full bg-orange-500 px-2.5 py-0.5 text-[10px] font-black text-white uppercase border border-[#1e293b]">
                    DAILY 24H
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-600 m-0 mt-0.5">
                  Finish today&apos;s path level before window closes • Expires in{' '}
                  <span className="font-extrabold text-red-600">{formatTime(secondsLeft)}</span>
                </p>
              </div>
            </div>

            {/* Right Action Button */}
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('dashboard-path-container')
                el?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="flex shrink-0 items-center gap-2 rounded-2xl border-[3px] border-[#1e293b] bg-[#fde047] px-5 py-2.5 text-xs font-black uppercase tracking-wider text-[#1e293b] shadow-[0_5px_0_#1e293b] transition-transform hover:scale-105 active:scale-95"
            >
              <span>START STEPPING 👟</span>
            </button>
          </div>
        </section>

        {/* ==================== MAIN GAME BOARD CONTAINER ==================== */}
        <div id="dashboard-path-container" className="relative grid grid-cols-1 lg:grid-cols-[80px_1fr_80px] gap-4 items-start">
          {/* LEFT FLOATING GAME TOOLBAR */}
          <aside className="hidden lg:flex flex-col gap-4 z-20">
            {/* Rocket Action */}
            <div className="flex flex-col items-center">
              <button
                type="button"
                className="flex h-14 w-14 items-center justify-center rounded-2xl border-[3px] border-[#1e293b] bg-[#ec4899] shadow-[0_5px_0_#1e293b] text-white transition-transform hover:scale-105 active:scale-95"
                title="Rocket Booster"
              >
                <Rocket size={26} strokeWidth={2.5} />
              </button>
              <span className="mt-1 rounded-full bg-[#1e293b] px-2 py-0.5 text-[9px] font-black text-white">
                2d 40m
              </span>
            </div>

            {/* Camera Snap Path Action */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <button
                  type="button"
                  className="flex h-14 w-14 items-center justify-center rounded-2xl border-[3px] border-[#1e293b] bg-[#f43f5e] shadow-[0_5px_0_#1e293b] text-white transition-transform hover:scale-105 active:scale-95"
                  title="Snap Path"
                >
                  <Camera size={26} strokeWidth={2.5} />
                </button>
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400 text-[10px] font-black text-[#1e293b] border border-[#1e293b]">
                  12
                </span>
              </div>
              <span className="mt-1 text-[10px] font-black text-white drop-shadow">
                Snap Path
              </span>
            </div>

            {/* Puzzle Action */}
            <div className="flex flex-col items-center">
              <button
                type="button"
                className="flex h-14 w-14 items-center justify-center rounded-2xl border-[3px] border-[#1e293b] bg-[#f59e0b] shadow-[0_5px_0_#1e293b] text-white transition-transform hover:scale-105 active:scale-95"
                title="Puzzle Quests"
              >
                <Puzzle size={26} strokeWidth={2.5} />
              </button>
              <span className="mt-1 rounded-full bg-[#1e293b] px-2 py-0.5 text-[9px] font-black text-white">
                1d 21m
              </span>
            </div>
          </aside>

          {/* CENTER WINDING PATH MAP CONTAINER */}
          <main className="w-full">
            <DashboardPath onPointsChange={(pts) => setPoints(pts)} />
          </main>

          {/* RIGHT FLOATING GAME TOOLBAR */}
          <aside className="hidden lg:flex flex-col gap-4 z-20">
            {/* Sailboat Event Action */}
            <div className="flex flex-col items-center">
              <button
                type="button"
                className="flex h-14 w-14 items-center justify-center rounded-2xl border-[3px] border-[#1e293b] bg-[#0284c7] shadow-[0_5px_0_#1e293b] text-white transition-transform hover:scale-105 active:scale-95"
                title="Sailing Event"
              >
                <Sailboat size={26} strokeWidth={2.5} />
              </button>
              <span className="mt-1 rounded-full bg-[#1e293b] px-2 py-0.5 text-[9px] font-black text-white">
                2h 21m
              </span>
            </div>

            {/* Rank Card Badge */}
            <div className="flex flex-col items-center">
              <div className="flex flex-col items-center justify-center h-14 w-14 rounded-2xl border-[3px] border-[#1e293b] bg-[#ec4899] shadow-[0_5px_0_#1e293b] text-white">
                <span className="text-[9px] font-black uppercase tracking-wider">RANK</span>
                <span className="text-sm font-black">#3</span>
              </div>
              <span className="mt-1 text-[9px] font-extrabold text-white bg-[#1e293b] px-1.5 py-0.5 rounded-full">
                ↑ 6 places
              </span>
            </div>

            {/* Buddies Card Action */}
            <div className="flex flex-col items-center">
              <button
                type="button"
                className="flex h-14 w-14 items-center justify-center rounded-2xl border-[3px] border-[#1e293b] bg-[#10b981] shadow-[0_5px_0_#1e293b] text-white transition-transform hover:scale-105 active:scale-95"
                title="Buddies"
              >
                <Users size={26} strokeWidth={2.5} />
              </button>
              <span className="mt-1 text-[10px] font-black text-white drop-shadow">
                Buddies
              </span>
            </div>
          </aside>
        </div>
      </div>

      {/* ==================== BOTTOM FLOATING NAVIGATION DOCK ==================== */}
      <footer className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-[720px]">
        <nav className="flex items-center justify-between gap-2 rounded-full border-[4px] border-[#1e293b] bg-[#581c87] px-3 sm:px-6 py-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.35)] text-white">
          {/* Challenges */}
          <button
            type="button"
            className="flex flex-col items-center gap-0.5 text-purple-200 transition-colors hover:text-white"
          >
            <Target size={20} strokeWidth={2.5} />
            <span className="text-[10px] font-black">Challenges</span>
          </button>

          {/* Tournaments */}
          <button
            type="button"
            className="flex flex-col items-center gap-0.5 text-purple-200 transition-colors hover:text-white"
          >
            <Trophy size={20} strokeWidth={2.5} />
            <span className="text-[10px] font-black">Tournaments</span>
          </button>

          {/* CENTER PROMINENT ACTION BUTTON */}
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('dashboard-path-container')
              el?.scrollIntoView({ behavior: 'smooth' })
            }}
            className="-mt-5 flex items-center gap-2 rounded-full border-[3px] border-[#1e293b] bg-[#22c55e] px-5 sm:px-6 py-2.5 shadow-[0_6px_0_#1e293b] transition-transform hover:scale-105 active:scale-95 text-white"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
              <Footprints size={18} strokeWidth={3} />
            </div>
            <div className="flex flex-col text-left leading-none">
              <span className="text-[9px] font-black tracking-widest text-emerald-100 uppercase">
                LEVEL 9 • TODAY
              </span>
              <span className="text-xs sm:text-sm font-black text-white uppercase tracking-tight">
                START STEPPING →
              </span>
            </div>
          </button>

          {/* My Goal */}
          <button
            type="button"
            className="flex flex-col items-center gap-0.5 text-purple-200 transition-colors hover:text-white"
          >
            <Settings size={20} strokeWidth={2.5} />
            <span className="text-[10px] font-black">My Goal</span>
          </button>

          {/* Buddies */}
          <button
            type="button"
            className="flex flex-col items-center gap-0.5 text-purple-200 transition-colors hover:text-white"
          >
            <Users size={20} strokeWidth={2.5} />
            <span className="text-[10px] font-black">Buddies</span>
          </button>
        </nav>
      </footer>
    </div>
  )
}
