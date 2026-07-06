import React from 'react';
import { 
  Utensils, 
  Car, 
  ShoppingBag, 
  Gamepad2, 
  Heart, 
  GraduationCap, 
  Receipt, 
  Briefcase, 
  TrendingUp, 
  RefreshCw, 
  Box 
} from 'lucide-react';

export default function CategoryIcon({ category, size = 18, className = "", style = {} }) {
  const mergedStyle = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', ...style };
  switch (category) {
    case 'Makanan':
      return <Utensils size={size} className={className} style={mergedStyle} />;
    case 'Transportasi':
      return <Car size={size} className={className} style={mergedStyle} />;
    case 'Belanja':
      return <ShoppingBag size={size} className={className} style={mergedStyle} />;
    case 'Hiburan':
      return <Gamepad2 size={size} className={className} style={mergedStyle} />;
    case 'Kesehatan':
      return <Heart size={size} className={className} style={mergedStyle} />;
    case 'Pendidikan':
      return <GraduationCap size={size} className={className} style={mergedStyle} />;
    case 'Tagihan':
      return <Receipt size={size} className={className} style={mergedStyle} />;
    case 'Gaji':
      return <Briefcase size={size} className={className} style={mergedStyle} />;
    case 'Investasi':
      return <TrendingUp size={size} className={className} style={mergedStyle} />;
    case 'Pindah Dana':
      return <RefreshCw size={size} className={className} style={mergedStyle} />;
    default:
      return <Box size={size} className={className} style={mergedStyle} />;
  }
}
