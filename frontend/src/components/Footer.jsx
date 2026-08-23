import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Mail, Globe, Phone } from 'lucide-react';
import { usePhase } from '../context/PhaseContext';
import { useAuction } from '../context/AuctionContext';

const FacebookIcon = (props) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" {...props}>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const TwitterIcon = (props) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" {...props}>
    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.936 9.936 0 0024 4.59z" />
  </svg>
);

const InstagramIcon = (props) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" {...props}>
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

const YoutubeIcon = (props) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" {...props}>
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

export default function Footer() {
  const { isRegistrationFrozen } = useAuction();
  const { phase } = usePhase();

  return (
    <footer className="bg-[#07080a] border-t border-white/10 text-slate-400 text-xs pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">

          {/* Col 1: Logo & Brand Info */}
          <div className="lg:col-span-1 space-y-4">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 rounded-xl bg-[#0B2B26] border border-[#0B2B26]/50 p-0.5 shadow-lg flex items-center justify-center">
                <span className="text-lg">⚽</span>
              </div>
              <div>
                <span className="font-black text-sm tracking-wider text-white uppercase block">
                  FRANCHISE<span className="text-white">AUCTION</span>
                </span>
                <span className="block text-[9px] tracking-widest text-slate-400 uppercase font-bold">
                  ENTERPRISE PLATFORM
                </span>
              </div>
            </Link>

            <p className="text-slate-400 text-xs leading-relaxed">
              Department of Computer Science &amp; Engineering, GSTU.
            </p>

            <p className="text-[11px] text-slate-400">
              &copy; 2026 All rights reserved.
            </p>
          </div>

          {/* Col 2: Quick Links */}
          <div className="space-y-3">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider">
              QUICK LINKS
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/" className="hover:text-white transition">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/live" className="hover:text-white transition">
                  Live Auction
                </Link>
              </li>
              <li>
                <Link to="/teams" className="hover:text-white transition">
                  Franchise Teams
                </Link>
              </li>
              <li>
                <Link to="/players" className="hover:text-white transition">
                  Player Directory
                </Link>
              </li>
              <li>
                <Link to="/player/register" className="hover:text-white transition">
                  Player Registration
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Contact Us */}
          <div className="space-y-3">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider">
              CONTACT US
            </h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                <span>GSTU Campus, Gopalganj</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-white shrink-0" />
                <a href="mailto:cse@gstu.ac.bd" className="hover:text-white transition">
                  cse@gstu.ac.bd
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-white shrink-0" />
                <a href="https://gstu.ac.bd" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                  gstu.ac.bd
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>+880 2-XXXXXXXX</span>
              </li>
            </ul>
          </div>

          {/* Col 4: Event Info */}
          <div className="space-y-3">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider">
              EVENT INFO
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <span className="text-slate-400 block text-[10px] uppercase">ORGANIZER</span>
                <span className="text-slate-200 font-semibold">Dept. of CSE, GSTU</span>
              </li>
              <li>
                <span className="text-slate-400 block text-[10px] uppercase">EVENT</span>
                <span className="text-slate-200 font-semibold">GSTU Football Tournament 2026</span>
              </li>
              <li>
                <span className="text-slate-400 block text-[10px] uppercase">REGISTRATION STATUS</span>
                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-[#0B2B26] text-white border border-[#0B2B26]/40 text-[10px] font-mono font-bold uppercase">
                  OPEN
                </span>
              </li>
            </ul>
          </div>

          {/* Col 5: Connect With Us */}
          <div className="space-y-3">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider">
              CONNECT WITH US
            </h4>
            <div className="flex items-center gap-3 pt-1">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-[#0B2B26] hover:bg-[#0B2B26] text-white hover:text-white flex items-center justify-center transition border border-[#0B2B26]/30"
              >
                <FacebookIcon />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-[#0B2B26] hover:bg-[#0B2B26] text-white hover:text-white flex items-center justify-center transition border border-[#0B2B26]/30"
              >
                <TwitterIcon />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-[#0B2B26] hover:bg-[#0B2B26] text-white hover:text-white flex items-center justify-center transition border border-[#0B2B26]/30"
              >
                <InstagramIcon />
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-[#0B2B26] hover:bg-[#0B2B26] text-white hover:text-white flex items-center justify-center transition border border-[#0B2B26]/30"
              >
                <YoutubeIcon />
              </a>
            </div>
          </div>

        </div>
      </div>
    </footer>
  );
}
