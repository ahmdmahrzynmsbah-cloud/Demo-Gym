import React from 'react';
import { Member, Trainer, Product, Sale, Equipment, AttendanceRecord, ShiftSchedule } from '../types';
import { 
  Printer, 
  TrendingUp, 
  Users, 
  DollarSign, 
  CalendarCheck, 
  ShoppingBag, 
  Hammer, 
  Clock, 
  Award,
  BookOpen,
  PieChart,
  FileCheck2,
  Lock,
  Calendar
} from 'lucide-react';
import { GymSettings } from '../types';
import { realmDB } from '../lib/realm';
import GymLogo from './GymLogo';

interface GymReportsViewProps {
  role: string;
  lang: 'ar' | 'en';
  members: Member[];
  trainers: Trainer[];
  products: Product[];
  sales: Sale[];
  equipment: Equipment[];
  attendance: AttendanceRecord[];
  schedules: ShiftSchedule[];
}

export default function GymReportsView({ 
  role, 
  lang, 
  members, 
  trainers, 
  products, 
  sales, 
  equipment, 
  attendance, 
  schedules 
}: GymReportsViewProps) {
  const isRtl = lang === 'ar';
  const settings = realmDB.getSettings();

  // Generate initial dates for the current month
  const getInitialDates = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const day = d.getDate();
      return `${year}-${month < 10 ? '0' + month : month}-${day < 10 ? '0' + day : day}`;
    };
    return {
      start: formatDate(firstDay),
      end: formatDate(lastDay)
    };
  };

  const initialDates = getInitialDates();

  // Date range filter states - default to All Time to showcase loaded records
  const [filterStartDate, setFilterStartDate] = React.useState<string>('');
  const [filterEndDate, setFilterEndDate] = React.useState<string>('');
  const [preset, setPreset] = React.useState<string>('all');

  // Custom English Date Picker helpers that avoid Arabic browser translations automatically
  const getYearsList = () => {
    const currentYear = new Date().getFullYear();
    const list = [];
    for (let y = currentYear - 6; y <= currentYear + 1; y++) {
      list.push(y.toString());
    }
    return list;
  };

  const getMonthsList = () => {
    return [
      { val: '01', label: '01 - Jan' },
      { val: '02', label: '02 - Feb' },
      { val: '03', label: '03 - Mar' },
      { val: '04', label: '04 - Apr' },
      { val: '05', label: '05 - May' },
      { val: '06', label: '06 - Jun' },
      { val: '07', label: '07 - Jul' },
      { val: '08', label: '08 - Aug' },
      { val: '09', label: '09 - Sep' },
      { val: '10', label: '10 - Oct' },
      { val: '11', label: '11 - Nov' },
      { val: '12', label: '12 - Dec' },
    ];
  };

  const getDaysList = () => {
    const list = [];
    for (let d = 1; d <= 31; d++) {
      list.push(d < 10 ? `0${d}` : d.toString());
    }
    return list;
  };

  const parseDateString = (dateStr: string) => {
    if (!dateStr || dateStr.length < 10) return { year: '', month: '', day: '' };
    const parts = dateStr.split('-');
    return {
      year: parts[0] || '',
      month: parts[1] || '',
      day: parts[2] || '',
    };
  };

  const handleDropdownChange = (
    field: 'year' | 'month' | 'day',
    val: string,
    currentStr: string,
    setter: (newVal: string) => void
  ) => {
    const parts = currentStr.split('-');
    let newYear = parts[0] || '';
    let newMonth = parts[1] || '';
    let newDay = parts[2] || '';

    if (field === 'year') newYear = val;
    if (field === 'month') newMonth = val;
    if (field === 'day') newDay = val;

    if (!newYear) {
      setter('');
    } else {
      const finalMonth = newMonth || '01';
      const finalDay = newDay || '01';
      setter(`${newYear}-${finalMonth}-${finalDay}`);
    }
    setPreset('custom');
  };

  // Check if a date string is in active range
  const isDateInRange = (dateStr?: string) => {
    if (!filterStartDate && !filterEndDate) return true;
    if (!dateStr) return false;
    const normalizedDate = dateStr.slice(0, 10);
    if (filterStartDate && normalizedDate < filterStartDate) return false;
    if (filterEndDate && normalizedDate > filterEndDate) return false;
    return true;
  };

  const applyPreset = (presetType: string) => {
    setPreset(presetType);
    const today = new Date();
    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const day = d.getDate();
      return `${year}-${month < 10 ? '0' + month : month}-${day < 10 ? '0' + day : day}`;
    };

    if (presetType === 'all') {
      setFilterStartDate('');
      setFilterEndDate('');
    } else if (presetType === 'today') {
      const start = formatDate(today);
      setFilterStartDate(start);
      setFilterEndDate(start);
    } else if (presetType === 'week') {
      const start = new Date(today);
      start.setDate(today.getDate() - today.getDay());
      setFilterStartDate(formatDate(start));
      setFilterEndDate(formatDate(today));
    } else if (presetType === 'month') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setFilterStartDate(formatDate(start));
      setFilterEndDate(formatDate(end));
    } else if (presetType === 'last-month') {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      setFilterStartDate(formatDate(start));
      setFilterEndDate(formatDate(end));
    } else if (presetType === '3-months') {
      const start = new Date(today.getFullYear(), today.getMonth() - 2, 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setFilterStartDate(formatDate(start));
      setFilterEndDate(formatDate(end));
    }
  };

  // -------------------------------------------------------------
  // CRITICAL ANALYTICS ENGINES (MEMBERSHIP, SHOP, CAPITAL, COACHES)
  // -------------------------------------------------------------

  // Filter datasets based on active range
  const filteredMembers = members.filter(m => isDateInRange(m.startDate));
  const filteredSales = sales.filter(s => isDateInRange(s.date));
  const filteredEquipment = equipment.filter(e => isDateInRange(e.lastMaintenanceDate || e.purchaseDate));
  const filteredAttendance = attendance.filter(a => isDateInRange(a.date));
  const sessionTickets = realmDB.getSessionTickets();
  const filteredSessions = sessionTickets.filter(t => isDateInRange(t.registrationDate));

  // 1. Members stats
  const totalMem = filteredMembers.length;
  const activeMem = filteredMembers.filter(m => m.isActive).length;
  const inactiveMem = totalMem - activeMem;
  const maleMemArr = filteredMembers.filter(m => m.gender === 'male');
  const femaleMemArr = filteredMembers.filter(m => m.gender === 'female');
  
  // 2. Subscription Type Estimates to formulate realistic financial flows:
  const subRevenueMap: Record<string, number> = {
    'monthly': 250,
    '3-months': 650,
    '6-months': 1100,
    '1-year': 1800
  };
  
  const totalSubRevenue = filteredMembers.reduce((acc, current) => {
    const price = current.subscriptionPrice !== undefined 
      ? current.subscriptionPrice 
      : (subRevenueMap[current.subscriptionType] || 250);
    const paidAmt = current.paidAmount !== undefined ? current.paidAmount : (price - (current.remainingAmount || 0));
    return acc + paidAmt;
  }, 0);

  // 2b. Session revenue (Casual session tickets)
  const totalSessionRevenue = filteredSessions.reduce((acc, s) => acc + (s.price || 0), 0);

  // 3. Shop retail and cost value
  const shopTotalRetailIncome = filteredSales.reduce((acc, current) => acc + current.totalRetailPrice, 0);
  const shopTotalCostValue = filteredSales.reduce((acc, current) => acc + current.totalCostPrice, 0);
  const shopProfitTotal = filteredSales.reduce((acc, current) => acc + current.profit, 0);

  // 4. Maintenance / Equipment expenses
  const machineryTotalMaintenanceCost = filteredEquipment.reduce((acc, current) => acc + current.repairCost, 0);

  // 5. Training Wage Expenses
  const trainersTotalSalaryPaid = trainers.filter(t => t.salaryPaid).reduce((acc, t) => acc + (t.salary || 0), 0);
  const trainersTotalSalaryDue = trainers.reduce((acc, t) => acc + (t.salary || 0), 0);
  const outstandingSalaries = trainersTotalSalaryDue - trainersTotalSalaryPaid;

  // 6. Net Balance Sheet calculations
  const totalGrossRevenue = totalSubRevenue + shopTotalRetailIncome + totalSessionRevenue;
  const totalOperatingCosts = shopTotalCostValue + machineryTotalMaintenanceCost + trainersTotalSalaryDue;
  const estimatedNetProfit = totalGrossRevenue - totalOperatingCosts;

  // 7. Product stock values
  const totalProductsInInventory = products.length;
  const totalStockVolume = products.reduce((acc, p) => acc + p.stockQty, 0);
  const totalStockRetailValueValue = products.reduce((acc, p) => acc + (p.stockQty * p.retailPrice), 0);

  // 8. Attendance Rate Analyzers
  const memberAttendance = filteredAttendance.filter(a => a.targetType === 'member');
  const trainerAttendance = filteredAttendance.filter(a => a.targetType === 'trainer');
  const lateTrainers = trainerAttendance.filter(a => a.isLate);

  // Trigger Print Command
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto" dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* Premium Integrated Header Control Panel - No Print */}
      <div className="bg-[#1e252b] border-2 border-primary/30 p-6 rounded-3xl space-y-5 no-print shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-6 bg-primary rounded-full inline-block"></span>
              <h2 className="text-xl font-black text-white uppercase tracking-wider">
                {isRtl ? 'مركز تصفية وتقارير الاشتراكات' : 'Master Gym Reports Control Panel'}
              </h2>
            </div>
            <p className="text-xs text-muted-teal mt-1">
              {isRtl 
                ? 'اختر فترة التقرير المطلوبة من المربعات بالأسفل، وسيتم فوراً تصفية وتحديث كامل الحسابات والبيانات لتطابق اختيارك.'
                : 'Filter the complete gym performance data. Select a preset or pick custom start/end dates below to instantly update all financial ledgers.'}
            </p>
          </div>

          <button
            id="btn-print-master-reports"
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-black font-black uppercase tracking-widest text-xs rounded-xl shadow-lg hover:scale-102 hover:opacity-95 transition-all cursor-pointer shrink-0"
          >
            <Printer className="w-4 h-4 text-black stroke-[3]" />
            <span>{isRtl ? 'طباعة التقرير بالتاريخ المحدد 📄' : 'Print Selected Range 📄'}</span>
          </button>
        </div>

        {/* Dynamic Interactive Date Picker Fields */}
        <div className="pt-4 border-t border-muted-teal/15 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Quick presets row */}
          <div className="flex flex-wrap items-center gap-1.5 animate-in fade-in duration-300">
            <span className="text-xs font-bold text-slate-300 mr-2">
              {isRtl ? 'فترات جاهزة:' : 'Quick Presets:'}
            </span>
            <button
              onClick={() => applyPreset('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                preset === 'all' 
                  ? 'bg-primary text-black font-black' 
                  : 'bg-black/35 text-slate-400 hover:text-white'
              }`}
            >
              {isRtl ? 'كل الأوقات' : 'All Time'}
            </button>
            <button
              onClick={() => applyPreset('month')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                preset === 'month' 
                  ? 'bg-primary text-black font-black' 
                  : 'bg-black/35 text-slate-400 hover:text-white'
              }`}
            >
              {isRtl ? 'الشهر الحالي' : 'This Month'}
            </button>
            <button
              onClick={() => applyPreset('last-month')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                preset === 'last-month' 
                  ? 'bg-primary text-black font-black' 
                  : 'bg-black/35 text-slate-400 hover:text-white'
              }`}
            >
              {isRtl ? 'الشهر الماضي' : 'Last Month'}
            </button>
            <button
              onClick={() => applyPreset('today')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                preset === 'today' 
                  ? 'bg-primary text-black font-black' 
                  : 'bg-black/35 text-slate-400 hover:text-white'
              }`}
            >
              {isRtl ? 'اليوم' : 'Today'}
            </button>
            <button
              onClick={() => applyPreset('week')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                preset === 'week' 
                  ? 'bg-primary text-black font-black' 
                  : 'bg-black/35 text-slate-400 hover:text-white'
              }`}
            >
              {isRtl ? 'هذا الأسبوع' : 'This Week'}
            </button>
            <button
              onClick={() => applyPreset('3-months')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                preset === '3-months' 
                  ? 'bg-primary text-black font-black' 
                  : 'bg-black/35 text-slate-400 hover:text-white'
              }`}
            >
              {isRtl ? 'آخر 3 أشهر' : 'Last 3 Months'}
            </button>
          </div>

          {/* Precision custom date dropdown picker */}
          {(() => {
            const startVals = parseDateString(filterStartDate);
            const endVals = parseDateString(filterEndDate);
            return (
              <div className="flex flex-wrap items-center gap-5">
                {/* From Date Selectors */}
                <div className="flex flex-col md:flex-row md:items-center gap-2">
                  <span className="text-xs font-bold text-slate-300">{isRtl ? 'من تاريخ:' : 'From:'}</span>
                  <div className="flex items-center gap-1.5 notranslate" translate="no" lang="en" dir="ltr">
                    <select
                      value={startVals.year}
                      onChange={(e) => handleDropdownChange('year', e.target.value, filterStartDate, setFilterStartDate)}
                      className="bg-black/50 border-2 border-primary/25 text-white px-2.5 py-1.5 rounded-xl text-xs font-mono focus:outline-none focus:border-primary text-center cursor-pointer"
                    >
                      <option value="">YYYY</option>
                      {getYearsList().map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                    <select
                      value={startVals.month}
                      onChange={(e) => handleDropdownChange('month', e.target.value, filterStartDate, setFilterStartDate)}
                      className="bg-black/50 border-2 border-primary/25 text-white px-2.5 py-1.5 rounded-xl text-xs font-mono focus:outline-none focus:border-primary text-center cursor-pointer"
                    >
                      <option value="">MM</option>
                      {getMonthsList().map(m => (
                        <option key={m.val} value={m.val}>{m.label}</option>
                      ))}
                    </select>
                    <select
                      value={startVals.day}
                      onChange={(e) => handleDropdownChange('day', e.target.value, filterStartDate, setFilterStartDate)}
                      className="bg-black/50 border-2 border-primary/25 text-white px-2.5 py-1.5 rounded-xl text-xs font-mono focus:outline-none focus:border-primary text-center cursor-pointer"
                    >
                      <option value="">DD</option>
                      {getDaysList().map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    {filterStartDate && (
                      <button 
                        onClick={() => setFilterStartDate('')}
                        className="text-[10px] text-red-400 hover:text-red-300 px-1 font-sans"
                        title="Clear start date"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* To Date Selectors */}
                <div className="flex flex-col md:flex-row md:items-center gap-2">
                  <span className="text-xs font-bold text-slate-300">{isRtl ? 'إلى تاريخ:' : 'To:'}</span>
                  <div className="flex items-center gap-1.5 notranslate" translate="no" lang="en" dir="ltr">
                    <select
                      value={endVals.year}
                      onChange={(e) => handleDropdownChange('year', e.target.value, filterEndDate, setFilterEndDate)}
                      className="bg-black/50 border-2 border-primary/25 text-white px-2.5 py-1.5 rounded-xl text-xs font-mono focus:outline-none focus:border-primary text-center cursor-pointer"
                    >
                      <option value="">YYYY</option>
                      {getYearsList().map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                    <select
                      value={endVals.month}
                      onChange={(e) => handleDropdownChange('month', e.target.value, filterEndDate, setFilterEndDate)}
                      className="bg-black/50 border-2 border-primary/25 text-white px-2.5 py-1.5 rounded-xl text-xs font-mono focus:outline-none focus:border-primary text-center cursor-pointer"
                    >
                      <option value="">MM</option>
                      {getMonthsList().map(m => (
                        <option key={m.val} value={m.val}>{m.label}</option>
                      ))}
                    </select>
                    <select
                      value={endVals.day}
                      onChange={(e) => handleDropdownChange('day', e.target.value, filterEndDate, setFilterEndDate)}
                      className="bg-black/50 border-2 border-primary/25 text-white px-2.5 py-1.5 rounded-xl text-xs font-mono focus:outline-none focus:border-primary text-center cursor-pointer"
                    >
                      <option value="">DD</option>
                      {getDaysList().map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    {filterEndDate && (
                      <button 
                        onClick={() => setFilterEndDate('')}
                        className="text-[10px] text-red-400 hover:text-red-300 px-1 font-sans"
                        title="Clear end date"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Selected date range status box */}
        <div className="text-[11px] text-primary bg-primary/5 rounded-2xl p-3 flex items-center gap-2 border border-primary/10">
          <span className="inline-block w-2 h-2 bg-primary rounded-full animate-pulse shrink-0"></span>
          <p className="font-semibold">
            {isRtl 
              ? `الكشف المالي نشط حالياً ويعرض البيانات من تاريخ: [ ${filterStartDate || 'أول عملية registrada'} ] إلى تاريخ: [ ${filterEndDate || 'اليوم / غير محدد'} ]`
              : `Active Filter: Displaying all gym data from [ ${filterStartDate || "Beginning"} ] to [ ${filterEndDate || "Today / All Time"} ]`}
          </p>
        </div>
      </div>

      {/* Printing instruction badge - No Print */}
      <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-3 no-print text-xs text-amber-200">
        <span className="text-base select-none shrink-0">💡</span>
        <div>
          <p className="font-bold mb-1">
            {isRtl ? 'تنبيه فني هام لطباعة الـ PDF بنجاح بالتاريخ المحدد:' : 'Technical Printing Guideline:'}
          </p>
          <p className="leading-relaxed">
            {isRtl 
              ? 'نظرًا لأن متصفحات الويب تحظر أوامر الطباعة البرمجية (window.print) داخل الأطر الفرعية (iFrames) لأمانك، يرجى الضغط على زر "الفتح في علامة تبويب جديدة" (Open in New Tab) في الشريط الأزرق أعلى يمين الشاشة، وستتمكن من الطباعة وحفظ كشوف الـ PDF الرائعة بالتاريخ المحدد بضغطة واحدة وبكل سهولة!' 
              : 'Safe sandbox environments prevent software-triggered prints from inside iframes. Please click the "Open in New Tab" icon on the blue top-right toolbar first. Once the application loads, printing and exporting beautiful PDFs for your selected dates will work flawlessly with one tap!'}
          </p>
        </div>
      </div>

      {/* Printable Master Wrapper with identical UI colors and perfect borders */}
      <div id="master-gym-printable-report" className="bg-[#192026] md:p-8 p-6 rounded-3xl border border-muted-teal/15 space-y-8 relative">
        
        {/* Print Brand Stamp */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b-2 border-primary/30">
          <div className="flex flex-col md:flex-row items-center gap-5 text-center md:text-left">
            <GymLogo size={85} className="shrink-0 drop-shadow-[0_4px_12px_rgba(196,214,0,0.25)] border-2 border-primary/20 rounded-2xl p-1 bg-black/10 print-logo-img" />
            <div>
              <h1 className="text-3xl font-black text-white uppercase tracking-wider">{settings.appName || 'DEMO GYM'}</h1>
              <p className="text-xs text-primary font-mono tracking-widest mt-1 uppercase">
                {settings.tagline || 'PREMIUM GYM EXECUTIVE APPLET'}
              </p>
              <p className="text-[10px] text-muted-teal mt-2">
                <span className="font-bold text-gray-400">{isRtl ? 'تاريخ الطباعة:' : 'Printed:'} </span>
                <span className="notranslate font-mono" translate="no" lang="en">
                  {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} at {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </p>
            </div>
          </div>
          <div className="bg-primary/10 border-2 border-primary/30 text-primary px-5 py-2.5 rounded-2xl text-center self-stretch md:self-auto flex flex-col justify-center">
            <span className="text-[9px] uppercase font-mono block text-muted-teal tracking-widest font-black">
              {isRtl ? 'الفترة الزمنية للتقرير' : 'REPORT TIMEFRAME'}
            </span>
            <span className="text-sm font-mono text-white mt-1 uppercase tracking-wider block font-black notranslate" translate="no" lang="en">
              {filterStartDate || "Beginning"} ➔ {filterEndDate || "Today"}
            </span>
            <span className="text-[10px] text-[#C4D600] uppercase font-bold tracking-widest mt-1">
              {isRtl 
                ? (filterStartDate || filterEndDate ? "تقرير أداء مفلتر بالفترة" : "سجل الأداء التاريخي الشامل")
                : (filterStartDate || filterEndDate ? "Filtered Performance Audit" : "Full Historical Ledger")}
            </span>
          </div>
        </div>

        {/* SECTION A: MASTER FINANCIALS (FROM THE ALFS TO THE YIAS) */}
        <div className="space-y-4">
          <h3 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-muted-teal/10 pb-2">
            <DollarSign className="w-5 h-5 text-primary" />
            <span>{isRtl ? 'أولاً: قائمة الأداء والمركز المالي التقديري (A to Z Financials)' : 'I. Corporate General Business Ledger'}</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            
            <div className="bg-slate-gray/15 rounded-xl p-4 border border-muted-teal/5">
              <span className="text-[10px] text-muted-teal uppercase font-mono">{isRtl ? 'إيرادات اشتراكات الأعضاء' : 'Subscriptions Cashflow'}</span>
              <p className="text-lg font-black text-white mt-1">+{totalSubRevenue} <span className="text-[10px] text-primary">{isRtl ? 'ج.م' : 'EGP'}</span></p>
              <span className="text-[9px] text-muted-teal mt-1 block leading-relaxed">{isRtl ? 'تقديري بناء على تصنيفات العضوية' : 'Estimated by active subscription tiers'}</span>
            </div>

            <div className="bg-slate-gray/15 rounded-xl p-4 border border-muted-teal/5">
              <span className="text-[10px] text-muted-teal uppercase font-mono">{isRtl ? 'إيرادات الحصص والتذاكر' : 'Session Tickets Revenue'}</span>
              <p className="text-lg font-black text-white mt-1">+{totalSessionRevenue} <span className="text-[10px] text-primary">{isRtl ? 'ج.م' : 'EGP'}</span></p>
              <span className="text-[9px] text-muted-teal mt-1 block leading-relaxed">{isRtl ? `عدد التذاكر المباعة: ${filteredSessions.length}` : `Tickets count: ${filteredSessions.length}`}</span>
            </div>

            <div className="bg-slate-gray/15 rounded-xl p-4 border border-[#C4D600]/10">
              <span className="text-[10px] text-[#C4D600] uppercase font-mono">{isRtl ? 'إيرادات منتجات المتجر' : 'Shop Sales Income'}</span>
              <p className="text-lg font-black text-white mt-1">+{shopTotalRetailIncome} <span className="text-[10px] text-primary">{isRtl ? 'ج.م' : 'EGP'}</span></p>
              <span className="text-[9px] text-emerald-400 mt-1 block font-bold">✓ {isRtl ? `صافي الربح: ${shopProfitTotal} ج.م` : `Net Margin: ${shopProfitTotal} EGP`}</span>
            </div>

            <div className="bg-slate-gray/15 rounded-xl p-4 border border-muted-teal/5">
              <span className="text-[10px] text-muted-teal uppercase font-mono">{isRtl ? 'المصروفات والمشتريات العامة' : 'General Expenses & Purchases'}</span>
              <p className="text-lg font-black text-red-400 mt-1">-{machineryTotalMaintenanceCost} <span className="text-[10px] text-primary">{isRtl ? 'ج.م' : 'EGP'}</span></p>
              <span className="text-[9px] text-muted-teal mt-1 block">{isRtl ? 'إجمالي فواتير الصيانة والأدوات والمقتنيات' : 'Gym maintenance and daily purchase logs'}</span>
            </div>

            <div className="bg-slate-gray/15 rounded-xl p-4 border border-muted-teal/5">
              <span className="text-[10px] text-muted-teal uppercase font-mono">{isRtl ? 'مرتبات كباتن التدريب' : 'Staff Coaches Payroll'}</span>
              <p className="text-lg font-black text-red-400 mt-1">-{trainersTotalSalaryDue} <span className="text-[10px] text-primary">{isRtl ? 'ج.م' : 'EGP'}</span></p>
              <span className="text-[9px] text-amber-400 mt-1 block font-bold">⏳ {isRtl ? `المعلق: ${outstandingSalaries} ج.م` : `Due: ${outstandingSalaries} EGP`}</span>
            </div>

          </div>

          {/* Master Net Earnings Block Banner */}
          <div className="bg-primary/5 border border-primary/25 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="font-extrabold text-[#C4D600] text-sm flex items-center gap-1.5 uppercase">
                <TrendingUp className="w-4 h-4" />
                <span>{isRtl ? 'صافي الحصيلة والأرباح المالية العامة (Net Income Projection)' : 'Executive Net Surplus Margin Estimation'}</span>
              </h4>
              <p className="text-xs text-light-gray mt-1 leading-relaxed">
                {isRtl 
                  ? 'حاصل جميع اشتراكات الجيم المدخلة ومبيعات منتجات البار والبروتين مخصوماً منها كلفة السلع المعايرة، المرتبات المستحقة وجداول الصيانة.' 
                  : 'Total Membership + Shop Income minus cost of goods, outstanding payroll, and machinery depreciation costs.'}
              </p>
            </div>
            <div className="text-center md:text-right shrink-0">
              <span className="text-[10px] text-muted-teal uppercase font-mono block tracking-wider">{isRtl ? 'صافي أرباح الجيم' : 'Net Operating Balance'}</span>
              <h3 className="text-3xl font-black text-white font-mono mt-0.5">
                {estimatedNetProfit >= 0 ? '+' : ''}{estimatedNetProfit} <span className="text-sm font-bold text-primary">{isRtl ? 'ج.م' : 'EGP'}</span>
              </h3>
            </div>
          </div>
        </div>

        {/* SECTION B: MEMBERSHIP ANALYTICS */}
        <div className="space-y-4 pt-4 border-t border-muted-teal/10">
          <h3 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-muted-teal/10 pb-2">
            <Users className="w-5 h-5 text-primary" />
            <span>{isRtl ? 'ثانياً: سجل العضويات وإحصائيات طاقة الجيم' : 'II. Membership Ledger & Capacities'}</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-black/25 rounded-xl p-4 border border-muted-teal/10 flex justify-between items-center">
              <div>
                <p className="text-xs text-muted-teal font-bold">{isRtl ? 'إجمالي المشتركين المسجلين' : 'Total Registered Roster'}</p>
                <h4 className="text-2xl font-black text-white mt-1">{totalMem} <span className="text-xs text-muted-teal">{isRtl ? 'عضو' : 'members'}</span></h4>
              </div>
              <div className="text-xs text-right">
                <span className="text-primary font-bold block">{activeMem} {isRtl ? 'نشط' : 'Active'}</span>
                <span className="text-red-400 font-bold block mt-0.5">{inactiveMem} {isRtl ? 'متوقف/منتهي' : 'Expired'}</span>
              </div>
            </div>

            <div className="bg-black/25 rounded-xl p-4 border border-muted-teal/10 flex justify-between items-center">
              <div>
                <p className="text-xs text-muted-teal font-bold">{isRtl ? 'توزيع المشتركين حسب الجنس' : 'Gender Demographics'}</p>
                <h4 className="text-2xl font-black text-white mt-1">{totalMem}</h4>
              </div>
              <div className="text-xs text-right text-light-gray font-semibold">
                <span className="text-blue-300 block">♂ {isRtl ? 'رجال' : 'Male'}: {maleMemArr.length}</span>
                <span className="text-pink-300 block mt-0.5">♀ {isRtl ? 'نساء' : 'Female'}: {femaleMemArr.length}</span>
              </div>
            </div>

            <div className="bg-black/25 rounded-xl p-4 border border-muted-teal/10 flex justify-between items-center">
              <div>
                <p className="text-xs text-muted-teal font-bold">{isRtl ? 'متوسط حجم الحصص الرياضية' : 'Schedules Intensity'}</p>
                <h4 className="text-2xl font-black text-white mt-1">{schedules.length} <span className="text-xs text-muted-teal">{isRtl ? 'حصة مبرمجة' : 'classes'}</span></h4>
              </div>
              <div className="text-xs text-right font-mono text-muted-teal">
                <span>{isRtl ? 'سعة مستخدمة مثمرة' : 'Capacities utilized'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION C: SHOP SALES AND INVENTORY */}
        <div className="space-y-4 pt-4 border-t border-muted-teal/10">
          <h3 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-muted-teal/10 pb-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            <span>{isRtl ? 'ثالثاً: مبيعات متجر البروتين والمخزون' : 'III. Supplements Shop & Warehousing Summary'}</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-black/25 rounded-xl p-4 border border-muted-teal/10">
              <p className="text-xs text-muted-teal font-bold">{isRtl ? 'أصناف السلع النشطة بالبار' : 'Active Cataloged Items'}</p>
              <h4 className="text-xl font-bold text-white mt-1">{totalProductsInInventory} <span className="text-xs text-muted-teal font-normal">{isRtl ? 'صنف حقيقي' : 'active SKUs'}</span></h4>
            </div>

            <div className="bg-black/25 rounded-xl p-4 border border-muted-teal/10">
              <p className="text-xs text-muted-teal font-bold">{isRtl ? 'حجم البضائع المتبقية بالمخزن' : 'Current Physical Volume'}</p>
              <h4 className="text-xl font-bold text-white mt-1">{totalStockVolume} <span className="text-xs text-muted-teal font-normal">{isRtl ? 'قطعة وعبوة' : 'physical units'}</span></h4>
            </div>

            <div className="bg-black/25 rounded-xl p-4 border border-muted-teal/10">
              <p className="text-xs text-muted-teal font-bold">{isRtl ? 'القمية الاستثمارية للسلع المتبقية' : 'Asset Liquid Value'}</p>
              <h4 className="text-xl font-bold text-[#C4D600] mt-1">{totalStockRetailValueValue} <span className="text-xs text-muted-teal font-normal">{isRtl ? 'ج.م' : 'EGP'}</span></h4>
            </div>
          </div>

          {/* Low stock notifications inline */}
          {products.filter(p => p.stockQty <= p.thresholdQty).length > 0 && (
            <div className="p-3.5 bg-red-950/15 border border-red-500/25 rounded-xl text-xs text-red-300 flex items-center gap-2.5">
              <span>⚠</span>
              <p>
                {isRtl 
                  ? `تنبيه مراجعة المخزن: هناك عدد (${products.filter(p => p.stockQty <= p.thresholdQty).length}) سلع تجاوزت الحد الأدنى للأمان وتتطلب إعادة طلب فورية.`
                  : `Store log notice: ${products.filter(p => p.stockQty <= p.thresholdQty).length} product files have breached low-stock barriers.`}
              </p>
            </div>
          )}
        </div>

        {/* SECTION D: EXPENSES AND PURCHASES */}
        <div className="space-y-4 pt-4 border-t border-muted-teal/10">
          <h3 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-muted-teal/10 pb-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            <span>{isRtl ? 'رابعاً: كشف تفاصيل المصروفات والمشتريات العامة للجيم' : 'IV. Gym Expenses & Supplies Purchases Records'}</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Category 1: Maintenance Expenses */}
            <div className="bg-black/25 rounded-xl p-4 border border-muted-teal/10">
              <p className="text-xs text-muted-teal font-bold">{isRtl ? 'بند مصروفات الصيانة (الإصلاح والأجهزة)' : 'Maintenance & Repairs Expenses'}</p>
              <h4 className="text-xl font-black text-[#C4D600] mt-1.5">
                {equipment.filter(e => !e.category || e.category === 'maintenance').reduce((sum, e) => sum + e.repairCost, 0)} <span className="text-xs text-muted-teal font-normal">{isRtl ? 'ج.م' : 'EGP'}</span>
              </h4>
              <span className="text-[10px] text-muted-teal block mt-1">
                {equipment.filter(e => !e.category || e.category === 'maintenance').length} {isRtl ? 'سجلات فواتير' : 'invoices logged'}
              </span>
            </div>

            {/* Category 2: Purchases Expenses */}
            <div className="bg-black/25 rounded-xl p-4 border border-muted-teal/10">
              <p className="text-xs text-muted-teal font-bold">{isRtl ? 'بند مصروفات المشتريات (أثاث، كراسي، مكنسة...)' : 'Supplies & Purchase Expenses'}</p>
              <h4 className="text-xl font-black text-sky-400 mt-1.5">
                {equipment.filter(e => e.category === 'purchase').reduce((sum, e) => sum + e.repairCost, 0)} <span className="text-xs text-muted-teal font-normal">{isRtl ? 'ج.م' : 'EGP'}</span>
              </h4>
              <span className="text-[10px] text-muted-teal block mt-1">
                {equipment.filter(e => e.category === 'purchase').length} {isRtl ? 'سجلات مشتريات' : 'items purchased'}
              </span>
            </div>

            {/* Total */}
            <div className="bg-black/25 rounded-xl p-4 border border-[#C4D600]/10">
              <p className="text-xs text-[#C4D600] font-bold">{isRtl ? 'إجمالي المبالغ المصروفة والمدفوعة' : 'Total General Expenses Outflow'}</p>
              <h4 className="text-xl font-black text-red-400 mt-1.5">
                {machineryTotalMaintenanceCost} <span className="text-xs text-muted-teal font-normal">{isRtl ? 'ج.م' : 'EGP'}</span>
              </h4>
              <span className="text-[10px] text-muted-teal block mt-1">
                {equipment.length} {isRtl ? 'بنود مصاريف كلية' : 'total items logged'}
              </span>
            </div>
          </div>
        </div>

        {/* SECTION E: DAILY COMPLIANCE & ATTENDANCE */}
        <div className="space-y-4 pt-4 border-t border-muted-teal/10">
          <h3 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-muted-teal/10 pb-2">
            <CalendarCheck className="w-5 h-5 text-primary" />
            <span>{isRtl ? 'خامساً: كشف التزام الكباتن وسجلات الحضور اليومي' : 'V. Coach Attendance & Employee Tardiness Audits'}</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-black/25 rounded-xl p-4 border border-muted-teal/10">
              <p className="text-xs text-muted-teal font-bold">{isRtl ? 'سجل الحصيلة المسجلة لكافة الكباتن' : 'Coach attendance total items'}</p>
              <h4 className="text-xl font-black text-white mt-1">{trainerAttendance.length} <span className="text-xs text-muted-teal font-normal">{isRtl ? 'مرات حضور' : 'shifts logged'}</span></h4>
              <p className="text-[10px] text-muted-teal mt-1 leading-relaxed">
                {isRtl 
                  ? `منها عدد (${lateTrainers.length}) كشف تأخير مبرهن عن توقيت بداية الدوام الرسمي المعين.` 
                  : `Includes ${lateTrainers.length} noted late compliance entries.`}
              </p>
            </div>

            <div className="bg-black/25 rounded-xl p-4 border border-muted-teal/10">
              <p className="text-xs text-muted-teal font-bold">{isRtl ? 'إجمالي بصمات ودخول البوابات للمشتركين' : 'Member Physical Check-ins'}</p>
              <h4 className="text-xl font-black text-[#C4D600] mt-1">{memberAttendance.length} <span className="text-xs text-muted-teal font-normal">{isRtl ? 'عملية دخول بوابة' : 'check-ins'}</span></h4>
              <p className="text-[10px] text-muted-teal mt-1">
                {isRtl ? 'يتم توثيقه وحفظه تلقائياً لغرض تحليلات الذروة والضغط.' : 'Logged dynamically via lockscreen codes.'}
              </p>
            </div>
          </div>
        </div>

        {/* PRINTABLE LEGAL DOCUMENT FOOTER SIGNATURE SEALS */}
        <div className="pt-20 border-t border-dashed border-muted-teal/30 grid grid-cols-2 gap-10 mt-12 text-center text-xs text-muted-teal">
          <div>
            <p className="border-b border-muted-teal/40 pb-2 font-mono text-white font-bold">{isRtl ? 'المدير المالي المراجع' : 'In-House Financial Auditor'}</p>
            <p className="mt-2 font-extrabold">{isRtl ? 'مستند مالي إداري معتمد للجيم' : 'Verified Treasury Sign'}</p>
          </div>
          <div>
            <p className="border-b border-muted-teal/40 pb-2 font-mono text-white font-bold">{isRtl ? 'المهندس / المدير العام للصالة الرياضية' : 'Head Gym Director Signature'}</p>
            <p className="mt-2 font-extrabold">{isRtl ? 'إمضاء وخاتم المسؤول الأول' : 'Official Gym Seal & Endorsement'}</p>
          </div>
        </div>

      </div>

    </div>
  );
}
