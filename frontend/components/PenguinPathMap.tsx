'use client'

import React from 'react'
import { Check, ChevronLeft, ChevronRight, Lock } from 'lucide-react'
import type { DayLevelStatus } from '../lib/monthProgress'

export type PathLevel = {
  day: number
  status: DayLevelStatus
}

type PenguinPathMapProps = {
  levels?: PathLevel[]
  todayDay?: number
  onSelectDay?: (day: number) => void
  currentSteps?: number
  compact?: boolean
}

export function PenguinPathMap({
  todayDay = 9,
  onSelectDay,
  currentSteps = 6420,
}: PenguinPathMapProps) {
  return (
    <div className="relative w-full overflow-hidden rounded-[24px] border-[4px] border-[#1e293b] bg-gradient-to-b from-[#7dd3fc] via-[#6ee7b7] to-[#4ade80] shadow-[0_12px_0_rgba(15,23,42,0.18)] select-none">
      {/* Top Left Header Badge inside Map */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-1 rounded-2xl bg-[#0f172a]/80 px-4 py-2.5 backdrop-blur-md border border-white/10 shadow-lg text-white">
        <span className="text-[10px] font-black tracking-widest text-sky-400 uppercase">
          MONTHLY PATH • IST
        </span>
        <h3 className="text-sm font-extrabold tracking-tight text-white m-0">
          September 2026 Trail
        </h3>
      </div>

      {/* Top Center Level Badge */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
        <div className="flex items-center gap-1.5 rounded-full bg-[#fbbf24] px-4 py-1.5 border-[3px] border-[#1e293b] shadow-[0_4px_0_#1e293b] text-[#1e293b] font-black text-xs">
          <span>Levels 8-10 • Day {todayDay}</span>
        </div>
      </div>

      {/* SVG Map Canvas */}
      <svg
        viewBox="0 0 800 460"
        className="w-full h-auto block min-h-[340px] sm:min-h-[400px]"
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label="Winding path trail with level nodes and penguin character"
      >
        <defs>
          {/* Gradients */}
          <linearGradient id="hillGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#86efac" />
            <stop offset="100%" stopColor="#4ade80" />
          </linearGradient>
          <linearGradient id="backHill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a7f3d0" />
            <stop offset="100%" stopColor="#6ee7b7" />
          </linearGradient>
          <radialGradient id="pondGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#bae6fd" />
            <stop offset="70%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0284c7" />
          </radialGradient>
          <linearGradient id="node7Grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#7e22ce" />
          </linearGradient>
          <linearGradient id="node8Grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#be185d" />
          </linearGradient>
          <linearGradient id="node9Grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="50%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>
          <filter id="glow9" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Background Sky & Distant Clouds */}
        <g opacity="0.35">
          <ellipse cx="140" cy="50" rx="45" ry="18" fill="#ffffff" />
          <ellipse cx="180" cy="55" rx="30" ry="14" fill="#ffffff" />
          <ellipse cx="640" cy="65" rx="55" ry="20" fill="#ffffff" />
          <ellipse cx="680" cy="70" rx="35" ry="15" fill="#ffffff" />
        </g>

        {/* Background Rolling Green Hills */}
        <path d="M 0,260 Q 200,180 400,240 T 800,200 L 800,460 L 0,460 Z" fill="url(#backHill)" />
        <path d="M 0,310 Q 250,230 500,290 T 800,250 L 800,460 L 0,460 Z" fill="url(#hillGrad)" />

        {/* Pond Water Patch under Node 7 */}
        <g transform="translate(180, 295)">
          <ellipse cx="35" cy="20" rx="65" ry="32" fill="url(#pondGrad)" stroke="#0369a1" strokeWidth="3" />
          <ellipse cx="35" cy="20" rx="48" ry="20" fill="#e0f2fe" opacity="0.5" />
          <ellipse cx="25" cy="15" rx="20" ry="8" fill="#ffffff" opacity="0.4" />
        </g>

        {/* 3D Decorative Trees */}
        {/* Tree Left */}
        <g transform="translate(140, 130)">
          <rect x="-4" y="20" width="8" height="18" rx="2" fill="#78350f" />
          <circle cx="0" cy="12" r="16" fill="#15803d" />
          <circle cx="-6" cy="6" r="12" fill="#22c55e" />
          <circle cx="6" cy="8" r="11" fill="#16a34a" />
        </g>
        {/* Small Tree Center Background */}
        <g transform="translate(380, 150)">
          <rect x="-3" y="15" width="6" height="14" rx="2" fill="#78350f" />
          <polygon points="0,0 -14,18 14,18" fill="#166534" />
          <polygon points="0,-8 -11,10 11,10" fill="#22c55e" />
        </g>
        {/* Tree Right Background */}
        <g transform="translate(620, 120)">
          <rect x="-4" y="20" width="8" height="18" rx="2" fill="#78350f" />
          <circle cx="0" cy="10" r="18" fill="#166534" />
          <circle cx="-6" cy="4" r="13" fill="#4ade80" />
        </g>
        {/* Palm Tree Right */}
        <g transform="translate(710, 150)">
          <path d="M 0,35 Q 12,18 8,0" fill="none" stroke="#78350f" strokeWidth="6" strokeLinecap="round" />
          <path d="M 8,0 C -12,-15 -25,-5 -28,-2" fill="none" stroke="#15803d" strokeWidth="5" strokeLinecap="round" />
          <path d="M 8,0 C 25,-15 35,-2 38,4" fill="none" stroke="#16a34a" strokeWidth="5" strokeLinecap="round" />
          <path d="M 8,0 C 0,-25 15,-30 18,-32" fill="none" stroke="#22c55e" strokeWidth="5" strokeLinecap="round" />
        </g>
        {/* Pink Flower Bottom Right */}
        <g transform="translate(680, 340)">
          <circle cx="-6" cy="0" r="6" fill="#f43f5e" />
          <circle cx="6" cy="0" r="6" fill="#f43f5e" />
          <circle cx="0" cy="-6" r="6" fill="#f43f5e" />
          <circle cx="0" cy="6" r="6" fill="#f43f5e" />
          <circle cx="0" cy="0" r="5" fill="#fde047" />
        </g>

        {/* ==================== THE WINDING S-CURVE DIRT ROAD ==================== */}
        {/* Road Path Coordinates */}
        {/* Outer Dark Border Stroke */}
        <path
          d="M 210,340 C 290,340 300,270 360,260 C 430,250 380,165 470,150 C 530,140 580,115 620,115"
          fill="none"
          stroke="#422006"
          strokeWidth="62"
          strokeLinecap="round"
        />
        {/* Inner Dirt Fill */}
        <path
          d="M 210,340 C 290,340 300,270 360,260 C 430,250 380,165 470,150 C 530,140 580,115 620,115"
          fill="none"
          stroke="#a16207"
          strokeWidth="50"
          strokeLinecap="round"
        />
        {/* Dashed White Center Line */}
        <path
          d="M 210,340 C 290,340 300,270 360,260 C 430,250 380,165 470,150 C 530,140 580,115 620,115"
          fill="none"
          stroke="#fef08a"
          strokeWidth="4"
          strokeDasharray="14 12"
          strokeLinecap="round"
        />

        {/* ==================== LEVEL NODE 7 (DONE) ==================== */}
        <g
          transform="translate(210, 310)"
          className="cursor-pointer transition-transform hover:scale-105"
          onClick={() => onSelectDay?.(7)}
        >
          {/* Shadow */}
          <ellipse cx="0" cy="24" rx="24" ry="8" fill="#0f172a" opacity="0.3" />
          {/* Node Badge Outer Ring */}
          <circle cx="0" cy="0" r="28" fill="#1e293b" />
          <circle cx="0" cy="0" r="24" fill="url(#node7Grad)" />
          <circle cx="0" cy="-2" r="20" fill="none" stroke="#f472b6" strokeWidth="1.5" opacity="0.5" />
          {/* Text */}
          <text
            x="0"
            y="7"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="22"
            fontWeight="900"
            fontFamily="sans-serif"
          >
            7
          </text>
          {/* Status Badge below */}
          <g transform="translate(0, 30)">
            <rect x="-24" y="-8" width="48" height="16" rx="8" fill="#15803d" stroke="#1e293b" strokeWidth="2" />
            <path d="M -12,0 L -8,4 L -2,-4" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
            <text x="4" y="3" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="900">
              DONE
            </text>
          </g>
        </g>

        {/* ==================== LEVEL NODE 8 (DONE) ==================== */}
        <g
          transform="translate(360, 240)"
          className="cursor-pointer transition-transform hover:scale-105"
          onClick={() => onSelectDay?.(8)}
        >
          {/* Shadow */}
          <ellipse cx="0" cy="24" rx="24" ry="8" fill="#0f172a" opacity="0.3" />
          {/* Node Badge Outer Ring */}
          <circle cx="0" cy="0" r="28" fill="#1e293b" />
          <circle cx="0" cy="0" r="24" fill="url(#node8Grad)" />
          <circle cx="0" cy="-2" r="20" fill="none" stroke="#fbcfe8" strokeWidth="1.5" opacity="0.5" />
          {/* Text */}
          <text
            x="0"
            y="7"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="22"
            fontWeight="900"
            fontFamily="sans-serif"
          >
            8
          </text>
          {/* Status Badge below */}
          <g transform="translate(0, 30)">
            <rect x="-24" y="-8" width="48" height="16" rx="8" fill="#15803d" stroke="#1e293b" strokeWidth="2" />
            <path d="M -12,0 L -8,4 L -2,-4" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
            <text x="4" y="3" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="900">
              DONE
            </text>
          </g>
        </g>

        {/* ==================== LEVEL NODE 9 (ACTIVE TODAY) ==================== */}
        <g
          transform="translate(460, 170)"
          className="cursor-pointer transition-transform hover:scale-105"
          onClick={() => onSelectDay?.(9)}
        >
          {/* Glow Shadow */}
          <ellipse cx="0" cy="28" rx="36" ry="12" fill="#f59e0b" opacity="0.4" />
          <ellipse cx="0" cy="28" rx="28" ry="9" fill="#0f172a" opacity="0.35" />

          {/* Large Outer Golden Ring */}
          <circle cx="0" cy="0" r="38" fill="#1e293b" />
          <circle cx="0" cy="0" r="34" fill="#fbbf24" filter="url(#glow9)" />
          <circle cx="0" cy="0" r="30" fill="url(#node9Grad)" />
          <circle cx="0" cy="-3" r="25" fill="none" stroke="#fef08a" strokeWidth="2" opacity="0.7" />

          {/* Node Number */}
          <text
            x="0"
            y="10"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="30"
            fontWeight="900"
            fontFamily="sans-serif"
            className="drop-shadow-md"
          >
            9
          </text>

          {/* Steps Pill Badge Below Node 9 */}
          <g transform="translate(0, 44)">
            <rect x="-38" y="-10" width="76" height="20" rx="10" fill="#0f172a" stroke="#1e293b" strokeWidth="2" />
            <text x="0" y="3" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="900">
              {currentSteps.toLocaleString()} steps
            </text>
          </g>

          {/* ==================== PENGUIN AVATAR CHARACTER PIN ==================== */}
          <g transform="translate(0, -56)">
            {/* Speech Bubble Above Penguin */}
            <g transform="translate(0, -32)">
              {/* Bubble Background */}
              <rect x="-36" y="-12" width="72" height="24" rx="12" fill="#ffffff" stroke="#1e293b" strokeWidth="2.5" />
              {/* Bubble Pointer Tail */}
              <polygon points="-4,12 4,12 0,17" fill="#ffffff" stroke="#1e293b" strokeWidth="2.5" />
              <polygon points="-3,12 3,12 0,15" fill="#ffffff" />
              {/* Bubble Text */}
              <text x="0" y="4" textAnchor="middle" fill="#1e293b" fontSize="11" fontWeight="900">
                LET&apos;S GO! 🔥
              </text>
            </g>

            {/* Penguin Character Body */}
            <rect x="-10" y="-18" width="20" height="4" rx="2" fill="#ef4444" />
            <ellipse cx="0" cy="0" rx="16" ry="18" fill="#1e1b4b" stroke="#0f172a" strokeWidth="2" />
            <ellipse cx="0" cy="2" rx="11" ry="13" fill="#ffffff" />
            <circle cx="-4" cy="-4" r="2.5" fill="#0f172a" />
            <circle cx="4" cy="-4" r="2.5" fill="#0f172a" />
            <circle cx="-3" cy="-5" r="0.8" fill="#ffffff" />
            <circle cx="5" cy="-5" r="0.8" fill="#ffffff" />
            <polygon points="0,-1 -3,3 3,3" fill="#f97316" />
            <ellipse cx="-6" cy="18" rx="4" ry="2" fill="#f97316" />
            <ellipse cx="6" cy="18" rx="4" ry="2" fill="#f97316" />
          </g>
        </g>

        {/* Legend Bar inside Map at Bottom */}
      </svg>

      {/* Map Pan Navigation Arrows */}
      <button
        type="button"
        onClick={() => onSelectDay?.(Math.max(1, todayDay - 1))}
        className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-[#1e293b] bg-white/90 text-[#1e293b] shadow-md transition-transform hover:scale-110 active:scale-95"
        aria-label="Previous level"
      >
        <ChevronLeft size={22} strokeWidth={3} />
      </button>

      <button
        type="button"
        onClick={() => onSelectDay?.(todayDay + 1)}
        className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-[#1e293b] bg-white/90 text-[#1e293b] shadow-md transition-transform hover:scale-110 active:scale-95"
        aria-label="Next level"
      >
        <ChevronRight size={22} strokeWidth={3} />
      </button>

      {/* Bottom Legend Bar inside Map Frame */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 w-[92%] max-w-[560px]">
        <div className="flex flex-wrap items-center justify-center gap-3 rounded-full bg-[#0f172a]/80 px-4 py-2 text-white backdrop-blur-md border border-white/10 text-[11px] font-extrabold shadow-lg">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-amber-500 border border-white" />
            <span>Today</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-emerald-500 border border-white" />
            <span>Done</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-slate-400 border border-white flex items-center justify-center">
              <Lock size={7} className="text-slate-900" />
            </span>
            <span>Locked</span>
          </div>
          <span className="text-slate-300 font-medium hidden sm:inline">
            • Swipe or tap arrows to pan month trail
          </span>
        </div>
      </div>
    </div>
  )
}
