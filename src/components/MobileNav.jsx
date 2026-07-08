import React from 'react';
import { 
  TrendingUp, 
  ArrowRightLeft, 
  PiggyBank, 
  Target, 
  Settings
} from 'lucide-react';

export default function MobileNav({ currentPage, setCurrentPage }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
    { id: 'transactions', label: 'Transaksi', icon: ArrowRightLeft },
    { id: 'savings', label: 'Tabungan', icon: PiggyBank },
    { id: 'budgeting', label: 'Budgeting', icon: Target },
    { id: 'settings', label: 'Pengaturan', icon: Settings },
  ];

  return (
    <nav className="mobile-nav">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentPage === item.id || 
          (item.id === 'settings' && ['accounts', 'memo', 'overview'].includes(currentPage));
        
        return (
          <button
            key={item.id}
            className={`mobile-nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setCurrentPage(item.id)}
          >
            <Icon size={20} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
