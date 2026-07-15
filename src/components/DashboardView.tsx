import React, { useState } from 'react';
import { Member, Product, Sale, Equipment, AppNotification } from '../types';
import { translations } from '../lib/translations';
import { realmDB, CURRENT_DATE_STR } from '../lib/realm';
import { TrendingUp, Users, ShoppingBag, AlertTriangle, Hammer, DollarSign, Activity, Coins } from 'lucide-react';
import { motion } from 'motion/react';

interface DashboardViewProps {
  role: 'admin' | 'male-trainer' | 'female-trainer';
  lang: 'ar' | 'en';
  members: Member[];
  products: Product[];
  sales: Sale[];
  equipment: Equipment[];
  notifications: AppNotification[];
}

export default function DashboardView({
  role,
  lang,
  members,
  products,
  sales,
  equipment,
  notifications
}: DashboardViewProps) {
  const t = translations[lang];
  const isRtl = lang === 'ar';

  const unreadNotifs = notifications.filter(n => !n.isRead);

  // Toggle chart metrics: 'gross' (all revenue), 'shop' (retail sales), 'subs' (subscriptions)
  const [chartMetric, setChartMetric] = useState<'gross' | 'shop' | 'subs'>('gross');

  // Filters based on Trainer role
  const isMaleSectionOnly = role === 'male-trainer';
  const isFemaleSectionOnly = role === 'female-trainer';

  // Filter members according to role
  const filteredMembers = members.filter(m => {
    if (isMaleSectionOnly) return m.gender === 'male';
    if (isFemaleSectionOnly) return m.gender === 'female';
    return true;
  });

  const totalMembersCount = filteredMembers.length;
  const activeMembersCount = filteredMembers.filter(m => m.isActive).length;
  const inactiveMembersCount = totalMembersCount - activeMembersCount;

  // Filter Sales according to role
  const filteredSales = sales.filter(s => {
    if (isMaleSectionOnly) return s.genderSection === 'male';
    if (isFemaleSectionOnly) return s.genderSection === 'female';
    return true;
  });

  // Financial Statistics
  // Revenue from members subscriptions (estimates for simulation):
  // Monthly = 150, 3-months = 399, 6-months = 699, 1-year = 1199
  const DEFAULT_PRICES: Record<string, number> = {
    'monthly': 250,
    '3-months': 650,
    '6-months': 1100,
    '1-year': 1800,
  };

  const memberSubscriptionRevenue = members.reduce((acc, mem) => {
    // Only count active members for current month's gross revenue metrics
    if (!mem.isActive) return acc;
    
    // Filter by gender section if trainer
    if (isMaleSectionOnly && mem.gender !== 'male') return acc;
    if (isFemaleSectionOnly && mem.gender !== 'female') return acc;

    const price = mem.subscriptionPrice !== undefined 
      ? mem.subscriptionPrice 
      : (DEFAULT_PRICES[mem.subscriptionType] || 250);
    const paidAmt = mem.paidAmount !== undefined ? mem.paidAmount : (price - (mem.remainingAmount || 0));
    return acc + paidAmt;
  }, 0);

  // Shop item sales gross revenue
  const retailSalesRevenue = filteredSales.reduce((acc, s) => acc + s.totalRetailPrice, 0);

  // Casual session ticket revenues
  const sessionTickets = realmDB.getSessionTickets();
  const sessionRevenue = sessionTickets.reduce((acc, ticket) => {
    if (isMaleSectionOnly && ticket.genderSection !== 'male') return acc;
    if (isFemaleSectionOnly && ticket.genderSection !== 'female') return acc;
    return acc + (ticket.price || 0);
  }, 0);

  // Total gross revenue includes subscriptions, sales and casual sessions
  const totalGrossRevenue = memberSubscriptionRevenue + retailSalesRevenue + sessionRevenue;

  // Costs only accessible to Admin
  const totalCostOfGoodsSold = sales.reduce((acc, s) => acc + s.totalCostPrice, 0);
  const totalMaintenanceCosts = equipment.reduce((acc, eq) => acc + eq.repairCost, 0);
  
  // Trainer Salaries calculations
  const trainersList = realmDB.getTrainers();
  const totalSalariesPaid = trainersList.filter(t => t.salaryPaid).reduce((acc, t) => acc + (t.salary ?? 3000), 0);
  const totalSalariesDue = trainersList.reduce((acc, t) => acc + (t.salary ?? 3000), 0);

  // Expenses = Cost of goods sold + maintenance costs + paid salaries
  const totalExpenses = totalCostOfGoodsSold + totalMaintenanceCosts + totalSalariesPaid;
  const netProfit = totalGrossRevenue - totalExpenses;

  // Low stock alert items count
  const lowStockCount = products.filter(p => p.stockQty <= p.thresholdQty).length;

  // Top Products calculations
  const productSalesMap: Record<string, { name: string; qty: number; revenue: number }> = {};
  filteredSales.forEach(s => {
    if (!productSalesMap[s.productId]) {
      productSalesMap[s.productId] = { name: s.productName, qty: 0, revenue: 0 };
    }
    productSalesMap[s.productId].qty += s.qty;
    productSalesMap[s.productId].revenue += s.totalRetailPrice;
  });

  const sortedTopProducts = Object.values(productSalesMap).sort((a, b) => b.qty - a.qty).slice(0, 3);

  // Dynamic dynamic chart calculations based on real-time datastore
  const subsWeekly = [0, 0, 0, 0];
  members.forEach(mem => {
    if (!mem.isActive) return;
    if (isMaleSectionOnly && mem.gender !== 'male') return;
    if (isFemaleSectionOnly && mem.gender !== 'female') return;

    let price = mem.subscriptionPrice !== undefined 
      ? mem.subscriptionPrice 
      : (DEFAULT_PRICES[mem.subscriptionType] || 250);
    const value = mem.paidAmount !== undefined ? mem.paidAmount : (price - (mem.remainingAmount || 0));
    
    const parts = mem.startDate.split('-');
    const day = parseInt(parts[2]) || 1;
    if (day <= 7) subsWeekly[0] += value;
    else if (day <= 14) subsWeekly[1] += value;
    else if (day <= 21) subsWeekly[2] += value;
    else subsWeekly[3] += value;
  });

  const shopWeekly = [0, 0, 0, 0];
  filteredSales.forEach(s => {
    const parts = s.date.split('-');
    const day = parseInt(parts[2]) || 1;
    if (day <= 7) shopWeekly[0] += s.totalRetailPrice;
    else if (day <= 14) shopWeekly[1] += s.totalRetailPrice;
    else if (day <= 21) shopWeekly[2] += s.totalRetailPrice;
    else shopWeekly[3] += s.totalRetailPrice;
  });

  const grossWeekly = [
    subsWeekly[0] + shopWeekly[0],
    subsWeekly[1] + shopWeekly[1],
    subsWeekly[2] + shopWeekly[2],
    subsWeekly[3] + shopWeekly[3],
  ];

  const baseWeekly = chartMetric === 'gross' ? grossWeekly : chartMetric === 'subs' ? subsWeekly : shopWeekly;
  
  // Cumulative totals for beautiful continuous slope lines
  const cumulativeWeekly = [
    baseWeekly[0],
    baseWeekly[0] + baseWeekly[1],
    baseWeekly[0] + baseWeekly[1] + baseWeekly[2],
    baseWeekly[0] + baseWeekly[1] + baseWeekly[2] + baseWeekly[3],
  ];

  const chartPointsWeek = [
    { label: lang === 'ar' ? 'الأسبوع ١' : 'Week 1', val: cumulativeWeekly[0] },
    { label: lang === 'ar' ? 'الأسبوع ٢' : 'Week 2', val: cumulativeWeekly[1] },
    { label: lang === 'ar' ? 'الأسبوع ٣' : 'Week 3', val: cumulativeWeekly[2] },
    { label: lang === 'ar' ? 'الأسبوع ٤' : 'Week 4', val: cumulativeWeekly[3] }
  ];

  const maxChartVal = Math.max(...chartPointsWeek.map(p => p.val), 100);

  return (
    <div className="space-y-8" dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* Welcome Title */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-muted-teal/15 pb-6">
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-wider flex items-center gap-3">
            <span className="w-2.5 h-8 bg-primary rounded-full inline-block"></span>
            {t.navDashboard}
          </h2>
          <p className="text-sm text-muted-teal mt-1">
            {role === 'admin' ? t.roleAdmin : role === 'male-trainer' ? t.roleMaleTrainer : t.roleFemaleTrainer}
          </p>
        </div>
        <div className="bg-slate-gray/45 border border-muted-teal/30 px-4 py-2 rounded-xl text-center">
          <p className="text-[10px] text-muted-teal uppercase font-mono tracking-widest">
            {isRtl ? 'تاريخ اليوم بالنظام' : 'System Calendar Date'}
          </p>
          <p className="text-sm font-bold text-primary font-mono">{CURRENT_DATE_STR}</p>
        </div>
      </div>

      {/* Unread Alert Banner Ticker */}
      {role === 'admin' && unreadNotifs.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-red-950/40 border border-red-500/35 p-4 rounded-xl flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <p className="text-sm text-red-200">
              {isRtl 
                ? `تنبيه أمان وخطورة: يوجد حالياً ${unreadNotifs.length} تنبيهات لم يتم قرائتها في مركز التنبيهات.`
                : `Security notice: There are ${unreadNotifs.length} unread alerts awaiting administrator review.`}
            </p>
          </div>
          <button 
            id="btn-dismiss-banner"
            onClick={() => realmDB.clearAllNotifications()}
            className="text-xs text-red-300 hover:text-red-100 underline decoration-dotted font-mono cursor-pointer"
          >
            {t.dismiss}
          </button>
        </motion.div>
      )}

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Metric 1: Total Registered */}
        <div className="bg-slate-gray/30 border border-muted-teal/15 p-6 rounded-2xl flex items-center gap-5 relative overflow-hidden group hover:border-primary/20 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full rotate-45 transform translate-x-12 -translate-y-12"></div>
          <div className="p-3.5 bg-slate-gray/50 rounded-xl text-primary">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-muted-teal uppercase font-mono font-medium tracking-wider">{t.totalMembers}</p>
            <h3 className="text-3xl font-black text-white font-mono mt-1">{totalMembersCount}</h3>
          </div>
        </div>

        {/* Metric 2: Active Tiers */}
        <div className="bg-slate-gray/30 border border-muted-teal/15 p-6 rounded-2xl flex items-center gap-5 relative overflow-hidden group hover:border-primary/20 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full rotate-12 transform translate-x-12 -translate-y-12"></div>
          <div className="p-3.5 bg-primary/10 rounded-xl text-primary">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <p className="text-xs text-muted-teal uppercase font-mono font-medium tracking-wider">{t.activeMembers}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="text-3xl font-black text-white font-mono">{activeMembersCount}</h3>
              <span className="text-xs text-primary font-bold">({Math.round(totalMembersCount > 0 ? (activeMembersCount / totalMembersCount) * 100 : 0)}%)</span>
            </div>
          </div>
        </div>

        {/* Metric 3: Expired Tiers */}
        <div className="bg-slate-gray/30 border border-muted-teal/15 p-6 rounded-2xl flex items-center gap-5 relative overflow-hidden group hover:border-primary/20 transition-all">
          <div className="p-3.5 bg-slate-gray/50 rounded-xl text-red-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-muted-teal uppercase font-mono font-medium tracking-wider">{t.inactiveMembers}</p>
            <h3 className="text-3xl font-black text-white font-mono mt-1">{inactiveMembersCount}</h3>
          </div>
        </div>

        {/* Metric 4: Low Stock Items */}
        <div className="bg-slate-gray/30 border border-muted-teal/15 p-6 rounded-2xl flex items-center gap-5 relative overflow-hidden group hover:border-primary/20 transition-all">
          <div className="p-3.5 bg-slate-gray/50 rounded-xl text-amber-400">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-muted-teal uppercase font-mono font-medium tracking-wider">{t.lowStockWarn}</p>
            <h3 className={`text-3xl font-black font-mono mt-1 ${lowStockCount > 0 ? 'text-amber-400' : 'text-white'}`}>{lowStockCount}</h3>
          </div>
        </div>

      </div>

      {/* Financial ledger for Administrator, customized restricted view for Trainer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Financial Column (Visible to Admin only) */}
        {role === 'admin' && (
          <div className="bg-slate-gray/25 border border-muted-teal/15 p-6 rounded-2xl lg:col-span-3 flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-wider mb-5 border-b border-muted-teal/10 pb-3 flex items-center gap-2">
                <DollarSign className="w-5.5 h-5.5 text-primary" />
                {t.financialLedger}
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
                
                {/* 1. Subscription & Session Revenues */}
                <div className="bg-[#181f25]/50 p-6 rounded-2xl border-l-4 border-emerald-400 relative overflow-hidden group hover:border-emerald-300 transition-all shadow-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[11px] text-muted-teal font-mono uppercase font-black tracking-wider">
                        {isRtl ? 'إيرادات الاشتراكات الكلية' : 'Subscription Revenues'}
                      </p>
                      <h4 className="text-3xl font-black text-white font-mono mt-3">
                        {memberSubscriptionRevenue + sessionRevenue} <span className="text-sm text-emerald-400 font-black">{isRtl ? 'ج.م' : 'EGP'}</span>
                      </h4>
                    </div>
                    <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
                      <Users className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-teal font-mono mt-4 pt-3 border-t border-muted-teal/10 flex flex-col gap-0.5">
                    <span className="leading-relaxed">
                      {isRtl ? 'إجمالي المحصل من اشتراكات صالة الجيم وباقات الحصص' : 'Total membership billing and session packages combined'}
                    </span>
                  </div>
                </div>

                {/* 2. Shop Merchandise Revenue (Net Profit Only) */}
                <div className="bg-[#181f25]/50 p-6 rounded-2xl border-l-4 border-cyan-500 relative overflow-hidden group hover:border-cyan-400 transition-all shadow-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[11px] text-muted-teal font-mono uppercase font-black tracking-wider">
                        {isRtl ? 'صافي أرباح مبيعات المتجر' : 'Shop Net Profit'}
                      </p>
                      <h4 className="text-3xl font-black text-cyan-400 font-mono mt-3">
                        {retailSalesRevenue - totalCostOfGoodsSold} <span className="text-sm font-black">{isRtl ? 'ج.م' : 'EGP'}</span>
                      </h4>
                    </div>
                    <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-teal font-mono mt-4 pt-3 border-t border-muted-teal/10 flex flex-col gap-0.5">
                    <span className="leading-relaxed">
                      {isRtl 
                        ? `مبيعات بقيمة ${retailSalesRevenue} ج.م مطروحاً منها تكلفة السلع ${totalCostOfGoodsSold} ج.م`
                        : `Sales of ${retailSalesRevenue} EGP minus stock costs of ${totalCostOfGoodsSold} EGP`}
                    </span>
                  </div>
                </div>

                {/* 3. Expenses & Purchases */}
                <div className="bg-[#181f25]/50 p-6 rounded-2xl border-l-4 border-amber-500 relative overflow-hidden group hover:border-amber-400 transition-all shadow-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[11px] text-muted-teal font-mono uppercase font-black tracking-wider">
                        {isRtl ? 'المصروفات والمشتريات' : 'Expenses & Purchases'}
                      </p>
                      <h4 className="text-3xl font-black text-amber-500 font-mono mt-3">
                        -{totalMaintenanceCosts} <span className="text-sm font-black">{isRtl ? 'ج.م' : 'EGP'}</span>
                      </h4>
                    </div>
                    <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400">
                      <Coins className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-teal font-mono mt-4 pt-3 border-t border-muted-teal/10 flex flex-col gap-0.5">
                    <span className="leading-relaxed">
                      {isRtl ? 'إجمالي صيانة ومشتريات الجيم المسجلة (منظفات، كراسي، مكنسة...)' : 'Total recorded gym repairs, purchases, furniture, and tools'}
                    </span>
                  </div>
                </div>

                {/* 4. Staff & Trainer Salaries */}
                <div className="bg-[#181f25]/50 p-6 rounded-2xl border-l-4 border-rose-500 relative overflow-hidden group hover:border-rose-400 transition-all shadow-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[11px] text-muted-teal font-mono uppercase font-black tracking-wider">
                        {isRtl ? 'مصاريف الرواتب والأجور' : 'Staff Salaries'}
                      </p>
                      <h4 className="text-3xl font-black text-rose-400 font-mono mt-3">
                        -{totalSalariesPaid} <span className="text-sm font-black">{isRtl ? 'ج.م' : 'EGP'}</span>
                      </h4>
                    </div>
                    <div className="p-3 bg-rose-500/10 rounded-xl text-rose-400">
                      <Coins className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-teal font-mono mt-4 pt-3 border-t border-muted-teal/10 flex flex-col gap-0.5">
                    <span className="leading-relaxed">
                      {isRtl 
                        ? `تم تسليم ${totalSalariesPaid} ج.م من أصل ${totalSalariesDue} ج.م مستحقة للمدربين`
                        : `Disbursed ${totalSalariesPaid} EGP out of ${totalSalariesDue} EGP due to trainers`}
                    </span>
                  </div>
                </div>

                {/* 5. General Net profit */}
                <div className="bg-primary/5 p-6 rounded-2xl border-2 border-primary/25 relative overflow-hidden group hover:border-primary/40 transition-all shadow-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[11px] text-[#C4D600] font-mono uppercase font-black tracking-wider">
                        {isRtl ? 'صافي الأرباح العام' : 'Consolidated Net Profit'}
                      </p>
                      <h4 className="text-3xl font-black text-primary font-mono mt-3">
                        {netProfit >= 0 ? '+' : ''}{netProfit} <span className="text-sm text-white font-black">{isRtl ? 'ج.م' : 'EGP'}</span>
                      </h4>
                    </div>
                    <div className="p-3 bg-primary/20 rounded-xl text-primary">
                      <DollarSign className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-teal font-mono mt-4 pt-3 border-t border-muted-teal/10 flex flex-col gap-0.5">
                    <span className="leading-relaxed">
                      {isRtl ? 'صافي الحصيلة والأرباح المتبقية بالكامل بالخصم' : 'Total net surplus margins after all operational costs'}
                    </span>
                  </div>
                </div>

              </div>
            </div>

            {/* Premium Vector Chart Area */}
            <div className="bg-black/20 border border-muted-teal/10 rounded-xl p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-3 border-b border-muted-teal/10">
                <p className="text-xs text-muted-teal font-mono uppercase flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  {isRtl ? 'أداء نمو المؤشرات التفاعلية بالمنحنيات' : 'INTERACTIVE GRAPH PERFORMANCE ANALYSIS'}
                </p>
                
                <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-muted-teal/15 w-full md:w-auto overflow-x-auto">
                  <button
                    id="tab-chart-gross"
                    onClick={() => setChartMetric('gross')}
                    className={`flex-1 md:flex-initial text-center px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer whitespace-nowrap ${
                      chartMetric === 'gross'
                        ? 'bg-primary text-black font-extrabold shadow-md'
                        : 'text-light-gray hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {isRtl ? 'الإيرادات الإجمالية' : 'Total Revenue'}
                  </button>
                  <button
                    id="tab-chart-subs"
                    onClick={() => setChartMetric('subs')}
                    className={`flex-1 md:flex-initial text-center px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer whitespace-nowrap ${
                      chartMetric === 'subs'
                        ? 'bg-primary text-black font-extrabold shadow-md'
                        : 'text-light-gray hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {isRtl ? 'الأعضاء والاشتراكات' : 'Subscriptions'}
                  </button>
                  <button
                    id="tab-chart-shop"
                    onClick={() => setChartMetric('shop')}
                    className={`flex-1 md:flex-initial text-center px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer whitespace-nowrap ${
                      chartMetric === 'shop'
                        ? 'bg-primary text-black font-extrabold shadow-md'
                        : 'text-light-gray hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {isRtl ? 'مبيعات المتجر' : 'Shop Sales'}
                  </button>
                </div>
              </div>

              {/* Custom SVG Line Chart */}
              <div className="relative h-48 w-full mt-2">
                <svg className="w-full h-full" viewBox="0 0 500 150" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#C4D600" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#C4D600" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {/* Grid Lines */}
                  <line x1="0" y1="37" x2="500" y2="37" stroke="#ABC7CA" strokeOpacity="0.1" />
                  <line x1="0" y1="75" x2="500" y2="75" stroke="#ABC7CA" strokeOpacity="0.1" />
                  <line x1="0" y1="112" x2="500" y2="112" stroke="#ABC7CA" strokeOpacity="0.1" />

                  {/* Growth Curve */}
                  <path
                    d={`M 15 140 
                       L 125 ${140 - (chartPointsWeek[0].val / maxChartVal) * 120} 
                       L 250 ${140 - (chartPointsWeek[1].val / maxChartVal) * 120} 
                       L 375 ${140 - (chartPointsWeek[2].val / maxChartVal) * 120} 
                       L 485 ${140 - (chartPointsWeek[3].val / maxChartVal) * 120}`}
                    fill="none"
                    stroke="#C4D600"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />

                  {/* Shaded Area under Curve */}
                  <path
                    d={`M 15 140 
                       L 125 ${140 - (chartPointsWeek[0].val / maxChartVal) * 120} 
                       L 250 ${140 - (chartPointsWeek[1].val / maxChartVal) * 120} 
                       L 375 ${140 - (chartPointsWeek[2].val / maxChartVal) * 120} 
                       L 485 ${140 - (chartPointsWeek[3].val / maxChartVal) * 120}
                       L 485 140 Z`}
                    fill="url(#chart-grad)"
                  />

                  {/* Interactive Dot checkpoints */}
                  {chartPointsWeek.map((pt, index) => {
                    const x = 15 + index * 115;
                    const y = 140 - (pt.val / maxChartVal) * 120;
                    return (
                      <g key={index} className="group cursor-pointer">
                        <circle cx={x} cy={y} r="5" fill="#333F48" stroke="#C4D600" strokeWidth="2.5" />
                        <circle cx={x} cy={y} r="8" fill="#C4D600" fillOpacity="0.2" className="hidden group-hover:block" />
                      </g>
                    );
                  })}
                </svg>

                {/* Chart point labels */}
                <div className="flex justify-between items-center text-[10px] text-muted-teal font-mono mt-2 px-2">
                  {chartPointsWeek.map((pt, idx) => (
                    <div key={idx} className="text-center">
                      <p>{pt.label}</p>
                      <p className="text-white font-bold">{pt.val} {isRtl ? 'ج.م' : 'EGP'}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        )}



      </div>

    </div>
  );
}
