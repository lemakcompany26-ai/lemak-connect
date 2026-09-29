import ServiceVideoAds from "../components/ServiceVideoAds";
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Smartphone, Wifi, Zap, Tv, Gamepad2, MoreHorizontal } from 'lucide-react';
import { useApp } from '@/lib/AppContext';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { formatNaira, formatDate, TRANSACTION_TYPES } from '@/lib/utils';
import PullToRefresh from '@/components/PullToRefresh';

const SERVICE_GRID = [
  { to: '/app/airtime', label: 'Airtime', icon: Smartphone, color: 'bg-blue-500' },
  { to: '/app/data', label: 'Data', icon: Wifi, color: 'bg-purple-600' },
  { to: '/app/electricity', label: 'Electricity', icon: Zap, color: 'bg-yellow-500' },
  { to: '/app/cable', label: 'Cable TV', icon: Tv, color: 'bg-pink-600' },
  { to: '/app/betting', label: 'Betting', icon: Gamepad2, color: 'bg-green-600' },
  { to: '/app/services', label: 'More Services', icon: MoreHorizontal, color: 'bg-gray-800' },
];

const QUICK_SERVICES = [
  { to: '/app/airtime', label: 'Buy Airtime' },
  { to: '/app/data', label: 'Buy Data' },
];

export default function Dashboard(){
  const { user } = useApp();
  const [transactions, setTransactions] = useState([]);

  useEffect(()=>{
    // your existing fetch logic
  },[]);

  return (
    <div className="min-h-screen bg-[#F7F8FA] pb-[90px]">
      {/* Header */}
      <div className="bg-white p-4">
        <h1 className="text-[18px] font-bold">Hi {user?.name || 'User'}, Welcome!</h1>
        <p className="text-sm text-gray-500">Your trusted digital service partner</p>
      </div>

      {/* VIDEO ADVERT - ALL 12 SERVICES - ADD HERE */}
      <ServiceVideoAds />

      {/* Service Grid */}
      <div className="p-4 grid grid-cols-3 gap-3 mt-2">
        {SERVICE_GRID.map(s=>(
          <Link key={s.to} to={s.to} className="bg-white rounded-[16px] p-4 flex flex-col items-center shadow-sm">
            <div className={`w-10 h-10 rounded-full ${s.color} flex items-center justify-center text-white`}>
              <s.icon size={20} />
            </div>
            <p className="text-[12px] font-bold mt-2">{s.label}</p>
          </Link>
        ))}
      </div>

      {/* Your existing transactions etc... keep below */}
      <div className="px-4 mt-4">
        <h3 className="font-bold">Recent Transactions</h3>
        {/*... rest of your code... */}
      </div>
    </div>
  )
}
