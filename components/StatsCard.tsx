import React from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  color: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, trend, trendUp, color }) => {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start justify-between transition-transform hover:scale-[1.02]">
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <h3 className="text-3xl font-bold text-slate-800 mt-2">{value}</h3>
        {trend && (
          <p className={`text-xs font-medium mt-2 flex items-center ${trendUp ? 'text-green-600' : 'text-red-500'}`}>
            {trendUp ? '↑' : '↓'} {trend}
            <span className="text-slate-400 ml-1">vs mes anterior</span>
          </p>
        )}
      </div>
      <div className={`p-3 rounded-xl ${color} text-white shadow-md`}>
        {icon}
      </div>
    </div>
  );
};