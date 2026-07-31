import React from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy, MapPin, Mail, Globe, Phone, Radio, Activity,
  Shield, Users, User, CheckCircle2, Lock, Clock, ExternalLink,
  Code, Share2, Video, MessageSquare
} from 'lucide-react';
import { useAuction } from '../context/AuctionContext';
import { useSocket } from '../context/SocketContext';

// Custom SVG Icons for social networks to avoid lucide icon version export mismatches
const GithubIcon = (props) => (
  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const LinkedinIcon = (props) => (
  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const FacebookIcon = (props) => (
  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const YoutubeIcon = (props) => (
  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.56 49.56 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
    <polygon points="10 15 15 12 10 9 10 15" fill="currentColor" />
  </svg>
);

export default function Footer() {
  const {
    players,
    teams,
    isRegistrationFrozen,
    timerStatus,
    sessions
  } = useAuction();
  const { isConnected } = useSocket();

  const soldCount = players.filter(p => (p.status || '').toUpperCase() === 'SOLD').length;
  const currentSessionName = sessions?.[0]?.name || '2025-2026';

  return (
    <footer className="relative z-10 bg-slate-950 border-t border-slate-800 text-slate-300 text-xs overflow-hidden">
      
      {/* ── LIVE STATUS BAR (Slim bar above main footer content) ──────────── */}
      <div className="bg-slate-900/90 border-b border-slate-800/80 px-4 sm:px-6 lg:px-8 py-2.5 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 text-[11px] font-mono">
          
          <div className="flex flex-wrap items-center gap-6">
            {/* Registration Status */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 uppercase font-bold text-[10px]">Registration:</span>
              <span className={`font-black uppercase flex items-center gap-1 ${
                isRegistrationFrozen ? 'text-rose-400' : 'text-emerald-400'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isRegistrationFrozen ? 'bg-rose-500' : 'bg-emerald-500 animate-ping'}`} />
                {isRegistrationFrozen ? 'FROZEN' : 'OPEN'}
              </span>
            </div>

            {/* Auction Status */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 uppercase font-bold text-[10px]">Auction Engine:</span>
              <span className={`font-black uppercase flex items-center gap-1 ${
                timerStatus === 'running' ? 'text-emerald-400' :
                timerStatus === 'paused'  ? 'text-amber-400' :
                'text-blue-400'
              }`}>
                <Radio className="w-3 h-3 animate-pulse" />
                {timerStatus === 'running' ? 'LIVE' : timerStatus.toUpperCase()}
              </span>
            </div>

            {/* Franchises */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 uppercase font-bold text-[10px]">Franchises:</span>
              <span className="font-bold text-white">{teams.length} Teams</span>
            </div>

            {/* Registered Players */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 uppercase font-bold text-[10px]">Registered Players:</span>
              <span className="font-bold text-blue-400">{players.length}</span>
            </div>

            {/* Players Sold */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 uppercase font-bold text-[10px]">Players Sold:</span>
              <span className="font-bold text-emerald-400">{soldCount}</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Session */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 uppercase font-bold text-[10px]">Session:</span>
              <span className="font-bold text-purple-400">{currentSessionName}</span>
            </div>

            {/* WebSocket Status */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 uppercase font-bold text-[10px]">Server Status:</span>
              <span className={`font-bold flex items-center gap-1 ${
                isConnected ? 'text-emerald-400' : 'text-slate-400'
              }`}>
                <Activity className="w-3 h-3" />
                {isConnected ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* ── MAIN 5-COLUMN FOOTER ─────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
          
          {/* Column 1: Brand & Logo */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-emerald-400 p-0.5 shadow-lg group-hover:scale-105 transition-transform">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <Trophy className="w-4 h-4 text-emerald-400" />
                </div>
              </div>
              <div>
                <span className="font-heading font-black text-sm tracking-wider bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent uppercase">
                  FRANCHISE<span className="text-emerald-400">AUCTION</span>
                </span>
                <span className="block text-[9px] tracking-widest text-slate-400 uppercase font-semibold">Enterprise Platform</span>
              </div>
            </Link>

            <p className="text-slate-400 text-[11px] leading-relaxed">
              A real-time sports franchise auction platform developed for the Department of Computer Science &amp; Engineering, GSTU.
            </p>

            <div className="pt-1 flex items-center justify-between text-[10px] text-slate-500 font-mono">
              <span>GSTU CSE Hackathon 2026</span>
              <span className="px-2 py-0.5 rounded bg-slate-900 text-emerald-400 border border-slate-800 font-bold">
                Version 1.0.0
              </span>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="space-y-3">
            <h4 className="font-heading font-bold text-white text-xs uppercase tracking-wider">
              Quick Links
            </h4>
            <ul className="space-y-2 text-[11px]">
              <li>
                <Link to="/" className="hover:text-blue-400 transition flex items-center gap-1.5">
                  <span className="text-blue-500">&rsaquo;</span> Home
                </Link>
              </li>
              <li>
                <Link to="/live" className="hover:text-emerald-400 transition flex items-center gap-1.5">
                  <span className="text-emerald-500">&rsaquo;</span> Live Auction
                </Link>
              </li>
              <li>
                <Link to="/teams" className="hover:text-blue-400 transition flex items-center gap-1.5">
                  <span className="text-blue-500">&rsaquo;</span> Franchise Teams
                </Link>
              </li>
              <li>
                <Link to="/players" className="hover:text-purple-400 transition flex items-center gap-1.5">
                  <span className="text-purple-500">&rsaquo;</span> Player Directory
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-amber-400 transition flex items-center gap-1.5">
                  <span className="text-amber-500">&rsaquo;</span> Unified Login
                </Link>
              </li>
              {!isRegistrationFrozen && (
                <li>
                  <Link to="/player/register" className="hover:text-emerald-400 transition flex items-center gap-1.5">
                    <span className="text-emerald-500">&rsaquo;</span> Player Registration
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* Column 3: Contact Information */}
          <div className="space-y-3">
            <h4 className="font-heading font-bold text-white text-xs uppercase tracking-wider">
              Contact Us
            </h4>
            <ul className="space-y-2.5 text-[11px]">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <span>GSTU Campus, Gopalganj</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <a href="mailto:cse@gstu.ac.bd" className="hover:text-blue-300 transition">
                  cse@gstu.ac.bd
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Globe className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <a href="https://gstu.ac.bd" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-300 transition flex items-center gap-1">
                  gstu.ac.bd <ExternalLink className="w-3 h-3 text-slate-500" />
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>+880 2-XXXXXXX</span>
              </li>
            </ul>
          </div>

          {/* Column 4: Event Information */}
          <div className="space-y-3">
            <h4 className="font-heading font-bold text-white text-xs uppercase tracking-wider">
              Event Info
            </h4>
            <ul className="space-y-2 text-[11px] text-slate-400">
              <li>
                <span className="text-slate-500 font-medium block text-[10px] uppercase">Organizer</span>
                <span className="text-slate-200 font-semibold">Dept of CSE, GSTU</span>
              </li>
              <li>
                <span className="text-slate-500 font-medium block text-[10px] uppercase">Event</span>
                <span className="text-slate-200 font-semibold">GSTU Hackathon 2026</span>
              </li>
              <li>
                <span className="text-slate-500 font-medium block text-[10px] uppercase">Session</span>
                <span className="text-slate-200 font-semibold font-mono">{currentSessionName}</span>
              </li>
              <li>
                <span className="text-slate-500 font-medium block text-[10px] uppercase">Registration Status</span>
                <span className={`font-bold inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] uppercase border ${
                  isRegistrationFrozen
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                }`}>
                  {isRegistrationFrozen ? 'FROZEN' : 'OPEN'}
                </span>
              </li>
            </ul>
          </div>

          {/* Column 5: Social Links */}
          <div className="space-y-3">
            <h4 className="font-heading font-bold text-white text-xs uppercase tracking-wider">
              Connect With Us
            </h4>
            <p className="text-slate-400 text-[11px]">
              Follow official GSTU Computer Science &amp; Engineering event updates.
            </p>

            <div className="flex items-center gap-2 pt-2">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:border-blue-500/50 hover:bg-slate-800 transition transform hover:-translate-y-0.5 shadow-md"
                title="GitHub"
              >
                <GithubIcon />
              </a>

              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-blue-400 hover:border-blue-500/50 hover:bg-slate-800 transition transform hover:-translate-y-0.5 shadow-md"
                title="LinkedIn"
              >
                <LinkedinIcon />
              </a>

              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-blue-500 hover:border-blue-500/50 hover:bg-slate-800 transition transform hover:-translate-y-0.5 shadow-md"
                title="Facebook"
              >
                <FacebookIcon />
              </a>

              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:border-rose-500/50 hover:bg-slate-800 transition transform hover:-translate-y-0.5 shadow-md"
                title="YouTube"
              >
                <YoutubeIcon />
              </a>
            </div>
          </div>

        </div>
      </div>

      {/* ── BOTTOM COPYRIGHT ────────────────────────────────────────────── */}
      <div className="bg-slate-950 border-t border-slate-900 px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
          <p>
            &copy; 2026 Enterprise Sports Franchise Auction Platform. All Rights Reserved.
          </p>
          <p className="font-semibold text-slate-400">
            Developed for <span className="text-blue-400">GSTU CSE Hackathon 2026</span>
          </p>
        </div>
      </div>

    </footer>
  );
}
