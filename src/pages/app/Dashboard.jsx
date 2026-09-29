import ServiceVideoAds from "@/components/ServiceVideoAds";
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
  { to: '/app/services', label: 'More', icon: MoreHorizontal, color: 'bg-gray-900' },
];

const QUICK_SERVICES = [
  { to: '/app/airtime', label: 'Buy Airtime' },
  { to: '/app/data', label: 'Buy Data' },
];

export default function Dashboard(){
  const { user, refreshWallet } = useApp();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    async function fetchTx(){
      try{
        const tx = await base44.entities.Transaction.list('-created_date', 5);
        setTransactions(tx || []);
      }catch(e){
        console.log(e);
      }finally{
        setLoading(false);
      }
    }
    fetchTx();
    refreshWallet();
  },[]);

  const onRefresh = async ()=>{
    await refreshWallet();
    const tx = await base44.entities.Transaction.list('-created_date', 5);
    setTransactions(tx || []);
  };

  return (
    <PullToRefresh onRefresh={onRefresh}>
    <div className="min-h-screen bg-[#F7F8FA] pb-[90px]">
      {/* Header */}
      <div className="bg-white px-4 pt-6 pb-4">
        <h1 className="text-[18px] font-bold leading-tight">Hi {user?.full_name || user?.name || 'User'}, Welcome!</h1>
        <p className="text-[13px] text-gray-500 mt-1">Your trusted digital service partner</p>

        <div className="mt-4 bg-[#111] text-white rounded-[16px] p-4 flex justify-between items-center">
          <div>
            <p className="text-[11px] opacity-70">Wallet Balance</p>
            <p className="text-[22px] font-extrabold mt-1">{formatNaira(user?.wallet_balance || 0)}</p>
          </div>
          <Link to="/app/wallet"><Button size="sm" className="bg-white text-black rounded-full font-bold">Fund Wallet</Button></Link>
        </div>
      </div>

      {/* VIDEO ADVERT - ALL SERVICES */}
      <ServiceVideoAds />

      {/* Service Grid */}
      <div className="px-4 mt-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-[14px]">Our Services</h3>
          <Link to="/app/services" className="text-[12px] text-[#0DBF6A] font-bold">See All</Link>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {SERVICE_GRID.map(s=>(
            <Link key={s.to} to={s.to} className="bg-white rounded-[18px] p-4 flex flex-col items-center shadow-sm border border-gray-100">
              <div className
