import 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {  Calendar, Award, Tag, DollarSign } from 'lucide-react';

export default function AdminConfigurationsLayout() {
  const location = useLocation();

  const tabs = [
    { path: '/admin/configurations/sessions', label: 'Sessions', icon: Calendar },
    { path: '/admin/configurations/positions', label: 'Positions', icon: Award },
    { path: '/admin/configurations/categories', label: 'Categories', icon: Tag },
    { path: '/admin/configurations/bidding-tiers', label: 'Bidding Tiers', icon: DollarSign },
  ];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex border-b border-slate-800 space-x-2 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = location.pathname.includes(tab.path);
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition whitespace-nowrap ${
                isActive
                  ? 'border-blue-500 text-blue-400 bg-blue-600/10 rounded-t-xl'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </NavLink>
          );
        })}
      </div>

      <Outlet />
    </div>
  );
}
