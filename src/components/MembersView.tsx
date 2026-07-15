import React, { useState } from 'react';
import { Member, SubscriptionType } from '../types';
import { translations } from '../lib/translations';
import { realmDB, CURRENT_DATE_STR } from '../lib/realm';
import { Plus, Search, HelpCircle, Edit2, Trash2, Printer, Activity, Check, X, Sliders } from 'lucide-react';
import MemberReport from './MemberReport';
import { motion } from 'motion/react';

interface MembersViewProps {
  role: 'admin' | 'male-trainer' | 'female-trainer';
  lang: 'ar' | 'en';
  members: Member[];
  onRefresh: () => void;
}

export default function MembersView({ role, lang, members, onRefresh }: MembersViewProps) {
  const t = translations[lang];
  const isRtl = lang === 'ar';
  const isAdmin = role === 'admin';

  const settings = realmDB.getSettings();

  const getSubPrice = (type: SubscriptionType, category: 'regular' | 'cardio') => {
    if (category === 'cardio') {
      if (type === 'monthly') return settings.pricingCardioMonthly ?? 350;
      if (type === '3-months') return settings.pricingCardio3Months ?? 900;
      if (type === '6-months') return settings.pricingCardio6Months ?? 1600;
      if (type === '1-year') return settings.pricingCardio1Year ?? 2500;
    } else {
      if (type === 'monthly') return settings.pricingRegularMonthly ?? 250;
      if (type === '3-months') return settings.pricingRegular3Months ?? 650;
      if (type === '6-months') return settings.pricingRegular6Months ?? 1100;
      if (type === '1-year') return settings.pricingRegular1Year ?? 1800;
    }
    return 250;
  };

  // States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [selectedReportMember, setSelectedReportMember] = useState<Member | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const [isManualEnglishDate, setIsManualEnglishDate] = useState(false);
  const [showPriceConfigModal, setShowPriceConfigModal] = useState(false);

  // States for customizing prices
  const [pricingFormData, setPricingFormData] = useState<{
    pricingRegularMonthly: number | '';
    pricingRegular3Months: number | '';
    pricingRegular6Months: number | '';
    pricingRegular1Year: number | '';
    pricingCardioMonthly: number | '';
    pricingCardio3Months: number | '';
    pricingCardio6Months: number | '';
    pricingCardio1Year: number | '';
    pricingSession1: number | '';
    pricingSession4: number | '';
    pricingSession8: number | '';
    pricingSession12: number | '';
    pricingSessionKids: number | '';
    pricingSessionAdults: number | '';
  }>({
    pricingRegularMonthly: settings.pricingRegularMonthly ?? 250,
    pricingRegular3Months: settings.pricingRegular3Months ?? 650,
    pricingRegular6Months: settings.pricingRegular6Months ?? 1100,
    pricingRegular1Year: settings.pricingRegular1Year ?? 1800,
    pricingCardioMonthly: settings.pricingCardioMonthly ?? 350,
    pricingCardio3Months: settings.pricingCardio3Months ?? 900,
    pricingCardio6Months: settings.pricingCardio6Months ?? 1600,
    pricingCardio1Year: settings.pricingCardio1Year ?? 2500,
    pricingSession1: settings.pricingSession1 ?? 50,
    pricingSession4: settings.pricingSession4 ?? 180,
    pricingSession8: settings.pricingSession8 ?? 320,
    pricingSession12: settings.pricingSession12 ?? 450,
    pricingSessionKids: settings.pricingSessionKids ?? 30,
    pricingSessionAdults: settings.pricingSessionAdults ?? 50,
  });

  // Form states
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    gender: 'male' as 'male' | 'female',
    subscriptionType: 'monthly' as SubscriptionType,
    subscriptionPrice: getSubPrice('monthly', 'regular') as number | '',
    paidAmount: getSubPrice('monthly', 'regular') as number | '',
    subscriptionCategory: 'regular' as 'regular' | 'cardio',
    startDate: CURRENT_DATE_STR,
    isActive: true,
  });

  const isMaleSectionOnly = role === 'male-trainer';
  const isFemaleSectionOnly = role === 'female-trainer';

  // Filters based on Trainer permissions & status selection
  const filteredMembers = members.filter(m => {
    // Search filter
    const matchesSearch = 
      m.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      m.phone.includes(searchTerm);

    if (!matchesSearch) return false;

    // Segment filter
    if (isMaleSectionOnly && m.gender !== 'male') return false;
    if (isFemaleSectionOnly && m.gender !== 'female') return false;

    // Status filter
    const isExpired = !m.isActive || (m.endDate && m.endDate < CURRENT_DATE_STR);
    if (statusFilter === 'active' && isExpired) return false;
    if (statusFilter === 'expired' && !isExpired) return false;

    return true;
  });

  // Calculate End Date helper
  const calculateEndDate = (startStr: string, type: SubscriptionType): string => {
    const start = new Date(startStr);
    let daysToAdd = 30;
    if (type === '3-months') daysToAdd = 90;
    else if (type === '6-months') daysToAdd = 180;
    else if (type === '1-year') daysToAdd = 365;

    start.setDate(start.getDate() + daysToAdd);
    
    // format as YYYY-MM-DD
    const yyyy = start.getFullYear();
    const mm = String(start.getMonth() + 1).padStart(2, '0');
    const dd = String(start.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const currentCalculatedEndDate = calculateEndDate(formData.startDate, formData.subscriptionType);

  // Helper functions to parse and handle dropdown selectors for English-only numbers in start date
  const parseDateParts = (dateStr: string) => {
    const parts = (dateStr || '').split('-');
    const y = parts[0] || new Date().getFullYear().toString();
    const m = parts[1] || String(new Date().getMonth() + 1).padStart(2, '0');
    const d = parts[2] || String(new Date().getDate()).padStart(2, '0');
    return { y, m, d };
  };

  const handleDatePartChange = (part: 'y' | 'm' | 'd', val: string) => {
    const { y, m, d } = parseDateParts(formData.startDate);
    let newY = y;
    let newM = m;
    let newD = d;
    if (part === 'y') newY = val;
    if (part === 'm') newM = val;
    if (part === 'd') newD = val;

    const formattedY = newY;
    const formattedM = String(Number(newM)).padStart(2, '0');
    const formattedD = String(Number(newD)).padStart(2, '0');

    setFormData({
      ...formData,
      startDate: `${formattedY}-${formattedM}-${formattedD}`
    });
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent gender mismatch for sectional trainers
    let finalGender = formData.gender;
    if (isMaleSectionOnly) finalGender = 'male';
    if (isFemaleSectionOnly) finalGender = 'female';

    const calcEndDate = calculateEndDate(formData.startDate, formData.subscriptionType);
    const totalSubPrice = Number(formData.subscriptionPrice || 0);
    const paidAmt = formData.paidAmount === '' ? totalSubPrice : Number(formData.paidAmount);
    const remainingAmt = Math.max(0, totalSubPrice - paidAmt);

    if (editingMember) {
      const updated: Member = {
        ...editingMember,
        fullName: formData.fullName,
        phone: formData.phone,
        gender: finalGender,
        subscriptionType: formData.subscriptionType,
        subscriptionPrice: totalSubPrice,
        paidAmount: paidAmt,
        remainingAmount: remainingAmt,
        subscriptionCategory: formData.subscriptionCategory,
        startDate: formData.startDate,
        endDate: calcEndDate,
        isActive: formData.isActive,
      };
      realmDB.saveMember(updated);
      setEditingMember(null);
    } else {
      const created: Member = {
        id: `m-${Date.now()}`,
        fullName: formData.fullName,
        phone: formData.phone,
        gender: finalGender,
        subscriptionType: formData.subscriptionType,
        subscriptionPrice: totalSubPrice,
        paidAmount: paidAmt,
        remainingAmount: remainingAmt,
        subscriptionCategory: formData.subscriptionCategory,
        startDate: formData.startDate,
        endDate: calcEndDate,
        isActive: formData.isActive,
        registrationDate: CURRENT_DATE_STR,
        history: {
          attendedDates: [],
          missedDates: []
        }
      };
      realmDB.saveMember(created);
    }

    // Reset Form
    setFormData({
      fullName: '',
      phone: '',
      gender: isFemaleSectionOnly ? 'female' : 'male',
      subscriptionType: 'monthly',
      subscriptionPrice: getSubPrice('monthly', 'regular'),
      paidAmount: getSubPrice('monthly', 'regular'),
      subscriptionCategory: 'regular',
      startDate: CURRENT_DATE_STR,
      isActive: true,
    });
    setShowAddModal(false);
    onRefresh();
  };

  const handleEdit = (m: Member) => {
    setEditingMember(m);
    const subPrice = m.subscriptionPrice !== undefined ? m.subscriptionPrice : getSubPrice(m.subscriptionType, m.subscriptionCategory || 'regular');
    setFormData({
      fullName: m.fullName,
      phone: m.phone,
      gender: m.gender,
      subscriptionType: m.subscriptionType,
      subscriptionPrice: subPrice,
      paidAmount: m.paidAmount !== undefined ? m.paidAmount : subPrice,
      subscriptionCategory: m.subscriptionCategory || 'regular',
      startDate: m.startDate,
      isActive: m.isActive,
    });
    setShowAddModal(true);
  };

  const handleDelete = (id: string) => {
    if (!isAdmin) return;
    const mem = members.find(m => m.id === id);
    if (mem) {
      setMemberToDelete(mem);
    }
  };

  const confirmDeleteMember = () => {
    if (!isAdmin) return;
    if (memberToDelete) {
      realmDB.deleteMember(memberToDelete.id);
      setMemberToDelete(null);
      onRefresh();
    }
  };

  const toggleMemberActive = (member: Member) => {
    const updated: Member = {
      ...member,
      isActive: !member.isActive
    };
    realmDB.saveMember(updated);
    onRefresh();
  };

  const handleSettleDebt = (member: Member) => {
    const total = member.subscriptionPrice !== undefined ? member.subscriptionPrice : getSubPrice(member.subscriptionType, member.subscriptionCategory || 'regular');
    const prevDebt = member.remainingAmount || 0;
    const updated: Member = {
      ...member,
      paidAmount: total,
      remainingAmount: 0
    };
    realmDB.saveMember(updated);
    realmDB.addLog(
      `تم سداد مديونية العضو "${member.fullName}" بالكامل بقيمة ${prevDebt} ج.م وتصفير حسابه.`,
      `Outstanding debt of ${prevDebt} EGP fully settled and cleared for member: "${member.fullName}".`,
      'subscription'
    );
    onRefresh();
  };

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* Upper desk actions */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-b border-muted-teal/15 pb-6 no-print">
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-wider flex items-center gap-3">
            <span className="w-2.5 h-8 bg-primary rounded-full inline-block"></span>
            {t.navMembers}
          </h2>
          <p className="text-sm text-muted-teal mt-1">{t.tagline}</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {isAdmin && (
            <button
              id="btn-configure-prices"
              onClick={() => {
                const s = realmDB.getSettings();
                setPricingFormData({
                  pricingRegularMonthly: s.pricingRegularMonthly ?? 250,
                  pricingRegular3Months: s.pricingRegular3Months ?? 650,
                  pricingRegular6Months: s.pricingRegular6Months ?? 1100,
                  pricingRegular1Year: s.pricingRegular1Year ?? 1800,
                  pricingCardioMonthly: s.pricingCardioMonthly ?? 350,
                  pricingCardio3Months: s.pricingCardio3Months ?? 900,
                  pricingCardio6Months: s.pricingCardio6Months ?? 1600,
                  pricingCardio1Year: s.pricingCardio1Year ?? 2500,
                  pricingSession1: s.pricingSession1 ?? 50,
                  pricingSession4: s.pricingSession4 ?? 180,
                  pricingSession8: s.pricingSession8 ?? 320,
                  pricingSession12: s.pricingSession12 ?? 450,
                  pricingSessionKids: s.pricingSessionKids ?? 30,
                  pricingSessionAdults: s.pricingSessionAdults ?? 50,
                });
                setShowPriceConfigModal(true);
              }}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-[#202931] border border-muted-teal/20 text-[#C4D600] font-bold uppercase tracking-wider text-xs rounded-xl shadow hover:bg-[#2A3540] transition duration-150 cursor-pointer"
              title={isRtl ? "تعديل أسعار الاشتراكات التلقائية" : "Configure Default Pricing"}
            >
              <Sliders className="w-4 h-4 text-primary" />
              <span>{isRtl ? "تعديل تسعيرات العضوية" : "Set Rates"}</span>
            </button>
          )}

          <button
            id="btn-add-new-member"
            onClick={() => {
              setEditingMember(null);
              const initialPrice = getSubPrice('monthly', 'regular');
              setFormData({
                fullName: '',
                phone: '',
                gender: isFemaleSectionOnly ? 'female' : 'male',
                subscriptionType: 'monthly',
                subscriptionPrice: initialPrice,
                paidAmount: initialPrice,
                subscriptionCategory: 'regular',
                startDate: CURRENT_DATE_STR,
                isActive: true,
              });
              setShowAddModal(true);
            }}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-black font-extrabold uppercase tracking-widest text-xs rounded-xl shadow-lg hover:opacity-90 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-black stroke-[3]" />
            {t.addNew}
          </button>
        </div>
      </div>

      {/* Grid search and Segment alert */}
      <div className="flex flex-col md:flex-row items-center gap-4 bg-slate-gray/15 p-4 rounded-xl border border-muted-teal/10 no-print">
        <div className="relative flex-1 w-full flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-teal w-4 h-4" />
            <input
              id="fld-member-search"
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black/30 border border-muted-teal/25 rounded-xl pl-10 pr-4 py-2 text-white text-sm focus:outline-none focus:border-primary placeholder-muted-teal/65"
            />
          </div>
          
          {/* Status filtering segmented badges */}
          <div className="flex bg-black/45 hover:border-muted-teal/40 transition-colors border border-muted-teal/20 rounded-xl p-1 gap-1 self-start sm:self-auto shrink-0">
            <button
              id="filter-all"
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3.5 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-primary text-black shadow-md'
                  : 'text-muted-teal hover:text-white'
              }`}
            >
              {isRtl ? 'الكل' : 'All'}
            </button>
            <button
              id="filter-active"
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`px-3.5 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                statusFilter === 'active'
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'text-muted-teal hover:text-white'
              }`}
            >
              {isRtl ? 'النشطة' : 'Active'}
            </button>
            <button
              id="filter-expired"
              type="button"
              onClick={() => setStatusFilter('expired')}
              className={`px-3.5 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                statusFilter === 'expired'
                  ? 'bg-red-500 text-white shadow-md font-black ring-1 ring-red-400/40'
                  : 'text-muted-teal hover:text-white'
              }`}
            >
              {isRtl ? 'الاشتراكات المنتهية' : 'Expired'}
            </button>
          </div>
        </div>
        {(isMaleSectionOnly || isFemaleSectionOnly) && (
          <div className="px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-200 text-xs">
            {t.notAuthorized}
          </div>
        )}
      </div>

      {/* Members Data Table */}
      <div className="bg-slate-gray/25 border border-muted-teal/15 rounded-2xl overflow-hidden shadow-xl no-print">
        <div className="overflow-x-auto">
          <table className="w-full text-inner-grid text-sm text-light-gray text-left rtl:text-right">
            <thead className="text-xs uppercase bg-black/25 text-muted-teal border-b border-muted-teal/15">
              <tr>
                <th scope="col" className="px-6 py-4">{t.fullName}</th>
                <th scope="col" className="px-6 py-4">{t.phone}</th>
                <th scope="col" className="px-6 py-4">{t.gender}</th>
                <th scope="col" className="px-6 py-4">{t.subType}</th>
                <th scope="col" className="px-6 py-4">{t.startDate}</th>
                <th scope="col" className="px-6 py-4">{t.endDate}</th>
                <th scope="col" className="px-6 py-4 text-center">{t.activeStatus}</th>
                <th scope="col" className="px-6 py-4 text-center">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-muted-teal/10">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-xs text-muted-teal italic bg-slate-gray/5">
                    {t.noRecords}
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-black/10 transition-colors">
                    <td className="px-6 py-4 font-bold max-w-[200px] truncate">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          {member.remainingAmount !== undefined && member.remainingAmount > 0 && (
                            <span className="relative flex h-2.5 w-2.5 flex-shrink-0" title={isRtl ? 'باقي مديونية لل جيم' : 'Outstanding Debt'}>
                              <span className="animate-ping absolute inline-flex h-[10px] w-[10px] rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                            </span>
                          )}
                          <span className={member.remainingAmount !== undefined && member.remainingAmount > 0 ? "text-red-400 font-extrabold" : "text-white"}>
                            {member.fullName}
                          </span>
                        </div>
                        {member.remainingAmount !== undefined && member.remainingAmount > 0 && (
                          <div className="flex items-center gap-1.5 mt-0.5" onClick={(e) => e.stopPropagation()}>
                            <span className="text-[10px] text-muted-teal/80">
                              {isRtl ? 'تسوية الدفع الكلي:' : 'Settle balance:'}
                            </span>
                            <button
                              id={`btn-settle-switch-${member.id}`}
                              onClick={() => handleSettleDebt(member)}
                              className="relative flex items-center h-4.5 w-9 rounded-full p-0.5 cursor-pointer focus:outline-none bg-black/40 border border-red-500/30 hover:bg-black/80 transition-all shadow"
                              title={isRtl ? 'سداد المديونية بالكامل' : 'Settle outstanding debt fully'}
                            >
                              <div className="bg-red-500 h-3 w-3 rounded-full" />
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold">{member.phone}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${member.gender === 'male' ? 'bg-blue-900/30 text-blue-300' : 'bg-pink-900/30 text-pink-300'}`}>
                        {member.gender === 'male' ? t.male : t.female}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-semibold text-white">
                        {member.subscriptionType === 'monthly' ? t.monthly : 
                         member.subscriptionType === '3-months' ? t['3-months'] : 
                         member.subscriptionType === '6-months' ? t['6-months'] : t['1-year']}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <span className={`inline-block px-1.5 py-0.5 rounded-[5px] text-[9px] font-black border uppercase ${
                          member.subscriptionCategory === 'cardio'
                            ? 'bg-amber-400/15 text-amber-400 border-amber-500/25'
                            : 'bg-emerald-400/15 text-emerald-400 border-emerald-500/25'
                        }`}>
                          {member.subscriptionCategory === 'cardio' ? (isRtl ? 'اشتراك كارديو' : 'Cardio') : (isRtl ? 'اشتراك عادي (جيم)' : 'Regular Gym')}
                        </span>
                      </div>
                      {true && (
                        <div className="text-[10px] font-mono font-bold mt-1.5 space-y-0.5">
                          <div className="text-primary">
                            {isRtl ? 'سعر الاشتراك: ' : 'Price: '}
                            {member.subscriptionPrice !== undefined ? member.subscriptionPrice : getSubPrice(member.subscriptionType, member.subscriptionCategory || 'regular')} {isRtl ? 'ج.م' : 'EGP'}
                          </div>
                          {member.paidAmount !== undefined && (
                            <div className="text-emerald-400">
                              {isRtl ? 'المدفوع: ' : 'Paid: '}
                              {member.paidAmount} {isRtl ? 'ج.م' : 'EGP'}
                            </div>
                          )}
                          {member.remainingAmount !== undefined && member.remainingAmount > 0 && (
                            <div className="flex items-center gap-2 mt-1 border-t border-red-500/10 pt-1">
                              <div className="text-red-400 font-black animate-pulse bg-red-950/20 px-1.5 py-0.5 rounded border border-red-500/25 inline-block">
                                {isRtl ? 'المتبقي لصالحنا (مديونية للجيم): ' : 'Outstanding Gym Debt: '}
                                {member.remainingAmount} {isRtl ? 'ج.م' : 'EGP'}
                              </div>
                              <button
                                id={`btn-settle-switch-sub-${member.id}`}
                                onClick={() => handleSettleDebt(member)}
                                className="relative flex items-center h-4.5 w-9 rounded-full p-0.5 cursor-pointer focus:outline-none bg-black/40 border border-red-500/30 hover:bg-black/80 transition-all shadow"
                                title={isRtl ? 'سداد المديونية بالكامل' : 'Settle outstanding debt fully'}
                              >
                                <div className="bg-red-500 h-3 w-3 rounded-full animate-bounce" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">{member.startDate}</td>
                    <td className="px-6 py-4 font-mono text-xs">{member.endDate}</td>
                    
                    {/* Active Status Animated switch button using motion */}
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center">
                        <button
                          id={`toggle-active-${member.id}`}
                          onClick={() => toggleMemberActive(member)}
                          className="relative flex items-center h-6 w-12 rounded-full p-0.5 cursor-pointer focus:outline-none transition-colors"
                          style={{ backgroundColor: member.isActive ? '#C4D600' : '#333F48' }}
                        >
                          <motion.div
                            layout
                            className="bg-white h-5 w-5 rounded-full shadow-md"
                            animate={{ x: member.isActive ? (isRtl ? -22 : 22) : 0 }}
                          />
                        </button>
                      </div>
                    </td>

                    {/* Actions Panel */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          id={`btn-report-mem-${member.id}`}
                          onClick={() => setSelectedReportMember(member)}
                          title={t.printReport}
                          className="p-1.5 bg-slate-gray/40 border border-muted-teal/20 text-primary hover:bg-primary/20 hover:border-primary/40 rounded transition-all cursor-pointer"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          id={`btn-edit-mem-${member.id}`}
                          onClick={() => handleEdit(member)}
                          title={t.editItem}
                          className="p-1.5 bg-slate-gray/40 border border-muted-teal/20 text-sky-400 hover:bg-sky-500/15 rounded transition-all cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <button
                            id={`btn-del-mem-${member.id}`}
                            onClick={() => handleDelete(member.id)}
                            title={t.deleteItem}
                            className="p-1.5 bg-slate-gray/40 border border-muted-teal/20 text-red-400 hover:bg-red-500/15 rounded transition-all cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Member Report Dialog overlay */}
      {selectedReportMember && (
        <MemberReport
          member={selectedReportMember}
          lang={lang}
          role={role}
          onClose={() => setSelectedReportMember(null)}
        />
      )}

      {/* Add / Edit Member Overlay Form */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 flex items-center justify-center p-4 animate-fadeIn" dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="bg-dark-charcoal border border-muted-teal/30 max-w-md w-full rounded-2xl p-5 shadow-2xl relative">
            <h3 className="text-sm font-black text-white uppercase tracking-wider mb-2.5 border-b border-muted-teal/15 pb-2">
              {editingMember ? t.editMemberTitle : t.addMemberTitle}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-3">
              
              {/* Full Name field */}
              <div>
                <label className="block text-[11px] text-muted-teal uppercase font-mono mb-1 font-bold">{t.fullName}</label>
                <input
                  id="fld-[fullName]"
                  type="text"
                  required
                  placeholder="Youssef Mansour"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full bg-black/40 border border-muted-teal/25 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none focus:border-primary"
                />
              </div>

              {/* Phone Field */}
              <div>
                <label className="block text-[11px] text-muted-teal uppercase font-mono mb-1 font-bold">{t.phone}</label>
                <input
                  id="fld-[phone]"
                  type="tel"
                  required
                  placeholder="+96650XXXXXXX"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-black/40 border border-muted-teal/25 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none focus:border-primary font-mono"
                />
              </div>

              {/* Gender selection buttons */}
              <div>
                <label className="block text-[11px] text-muted-teal uppercase font-mono mb-1.5 font-bold">{t.gender}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    id="btn-gender-select-male"
                    type="button"
                    disabled={isFemaleSectionOnly}
                    onClick={() => setFormData({ ...formData, gender: 'male' })}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-3 border rounded-xl cursor-pointer transition-all duration-150 text-xs ${
                      formData.gender === 'male' 
                        ? 'border-blue-400 text-white bg-blue-500/10 shadow-md border-2 font-black' 
                        : 'border-muted-teal/15 text-light-gray bg-black/25 hover:border-muted-teal/35'
                    } ${isFemaleSectionOnly ? 'opacity-35 cursor-not-allowed' : ''}`}
                  >
                    <span className={`w-2 h-2 rounded-full ${formData.gender === 'male' ? 'bg-blue-400' : 'bg-transparent border border-muted-teal'}`}></span>
                    <span>{t.male}</span>
                  </button>
                  <button
                    id="btn-gender-select-female"
                    type="button"
                    disabled={isMaleSectionOnly}
                    onClick={() => setFormData({ ...formData, gender: 'female' })}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-3 border rounded-xl cursor-pointer transition-all duration-150 text-xs ${
                      formData.gender === 'female' 
                        ? 'border-pink-400 text-white bg-pink-500/10 shadow-md border-2 font-black' 
                        : 'border-muted-teal/15 text-light-gray bg-black/25 hover:border-muted-teal/35'
                    } ${isMaleSectionOnly ? 'opacity-35 cursor-not-allowed' : ''}`}
                  >
                    <span className={`w-2 h-2 rounded-full ${formData.gender === 'female' ? 'bg-pink-400' : 'bg-transparent border border-muted-teal'}`}></span>
                    <span>{t.female}</span>
                  </button>
                </div>
              </div>

              {/* Subscription Category: Regular vs Cardio */}
              <div>
                <label className="block text-[11px] text-muted-teal uppercase font-mono mb-1.5 font-bold">
                  {isRtl ? 'نوع الاشتراك الرياضي' : 'Subscription Category'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    id="btn-category-select-regular"
                    type="button"
                    onClick={() => {
                      const p = getSubPrice(formData.subscriptionType, 'regular');
                      setFormData({ 
                        ...formData, 
                        subscriptionCategory: 'regular',
                        subscriptionPrice: p,
                        paidAmount: p
                      });
                    }}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2 border rounded-xl cursor-pointer transition-all duration-150 text-xs ${
                      formData.subscriptionCategory === 'regular' 
                        ? 'border-emerald-500 text-white bg-emerald-500/10 shadow-md border-2 font-black' 
                        : 'border-[#3E4E5B]/40 text-light-gray bg-black/25 hover:border-muted-teal/35'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${formData.subscriptionCategory === 'regular' ? 'bg-emerald-400' : 'bg-transparent border border-[#3E4E5B]'}`}></span>
                    <span>{isRtl ? 'عادي (جيم)' : 'Regular Gym'}</span>
                  </button>
                  <button
                    id="btn-category-select-cardio"
                    type="button"
                    onClick={() => {
                      const p = getSubPrice(formData.subscriptionType, 'cardio');
                      setFormData({ 
                        ...formData, 
                        subscriptionCategory: 'cardio',
                        subscriptionPrice: p,
                        paidAmount: p
                      });
                    }}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2 border rounded-xl cursor-pointer transition-all duration-155 text-xs ${
                      formData.subscriptionCategory === 'cardio' 
                        ? 'border-amber-400 text-white bg-amber-500/10 shadow-md border-2 font-black' 
                        : 'border-[#3E4E5B]/40 text-light-gray bg-black/25 hover:border-muted-teal/35'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${formData.subscriptionCategory === 'cardio' ? 'bg-amber-400' : 'bg-transparent border border-[#3E4E5B]'}`}></span>
                    <span>{isRtl ? 'كارديو' : 'Cardio'}</span>
                  </button>
                </div>
              </div>

              {/* Subscription Tiers Select in a single row */}
              <div>
                <label className="block text-[11px] text-muted-teal uppercase font-mono mb-1.5 font-bold">{t.subType}</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['monthly', '3-months', '6-months', '1-year'] as SubscriptionType[]).map((st) => (
                    <button
                      id={`tier-select-${st}`}
                      key={st}
                      type="button"
                      onClick={() => {
                        const p = getSubPrice(st, formData.subscriptionCategory);
                        setFormData({ 
                          ...formData, 
                          subscriptionType: st,
                          subscriptionPrice: p,
                          paidAmount: p
                        });
                      }}
                      className={`py-1.5 px-1.5 text-[10px] sm:text-[11px] font-bold border rounded-xl transition-all cursor-pointer text-center ${
                        formData.subscriptionType === st 
                          ? 'border-primary bg-primary/10 text-primary font-bold' 
                          : 'border-muted-teal/15 bg-black/20 text-light-gray hover:border-muted-teal/35'
                      }`}
                    >
                      {st === 'monthly' ? (isRtl ? 'شهري' : '1M') : 
                       st === '3-months' ? (isRtl ? '٣ أشهر' : '3M') : 
                       st === '6-months' ? (isRtl ? '٦ أشهر' : '6M') : (isRtl ? 'سنة' : '1Y')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subscription Price Input */}
              <div>
                <label className="block text-[11px] text-muted-teal uppercase font-mono mb-1 font-bold">
                  {t.subscriptionPriceLabel}
                </label>
                <input
                  id="fld-[subscriptionPrice]"
                  type="number"
                  min="0"
                  required
                  translate="no"
                  dir="ltr"
                  disabled={!isAdmin}
                  value={formData.subscriptionPrice}
                  onChange={(e) => {
                    const val = e.target.value === '' ? '' : Number(e.target.value);
                    setFormData({ ...formData, subscriptionPrice: val, paidAmount: val });
                  }}
                  onFocus={(e) => e.target.select()}
                  className={`w-full bg-black/40 border border-muted-teal/25 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none focus:border-primary font-mono text-center notranslate dir-ltr ${!isAdmin ? 'opacity-50 cursor-not-allowed bg-black/60' : ''}`}
                />
              </div>

              {/* Paid Amount and Remaining Debt */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-muted-teal uppercase font-mono mb-1 font-bold">
                    {isRtl ? 'المبلغ المدفوع' : 'Paid Amount'}
                  </label>
                  <input
                    id="fld-[paidAmount]"
                    type="number"
                    min="0"
                    required
                    translate="no"
                    dir="ltr"
                    value={formData.paidAmount}
                    onChange={(e) => {
                      const val = e.target.value === '' ? '' : Number(e.target.value);
                      setFormData({ ...formData, paidAmount: val });
                    }}
                    onFocus={(e) => e.target.select()}
                    className="w-full bg-black/40 border border-muted-teal/25 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none focus:border-primary font-mono text-center notranslate dir-ltr"
                    placeholder={String(formData.subscriptionPrice)}
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#FF4D4D] uppercase font-mono mb-1 font-bold">
                    {isRtl ? 'المبلغ المتبقي (المديونية)' : 'Remaining Debt'}
                  </label>
                  <div className="w-full bg-red-950/20 border border-red-500/20 rounded-xl px-3 py-1.5 text-red-400 text-xs font-mono text-center font-bold flex items-center justify-center min-h-[32px]">
                    {Math.max(0, Number(formData.subscriptionPrice || 0) - Number(formData.paidAmount || 0))} {isRtl ? 'ج.م' : 'EGP'}
                  </div>
                </div>
              </div>

              {/* Start Date & End Date side-by-side in Fixed English inputs */}
              <div className="grid grid-cols-2 gap-3" dir={isRtl ? 'rtl' : 'ltr'}>
                {/* Start Date */}
                <div className="text-start">
                  <label className="block text-[11px] text-muted-teal uppercase font-mono mb-1 font-bold text-start">
                    {isRtl ? 'تاريخ البدء (Start Date)' : 'Start Date'}
                  </label>
                  <input
                    id="fld-[startDate]"
                    type="text"
                    translate="no"
                    placeholder="YYYY-MM-DD"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full bg-black/40 border border-muted-teal/25 rounded-xl px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-primary font-mono text-center font-bold notranslate"
                  />
                </div>

                {/* End Date */}
                <div className="text-start">
                  <label className="block text-[11px] text-muted-teal uppercase font-mono mb-1 font-bold text-start">
                    {isRtl ? 'تاريخ الانتهاء (End Date)' : 'End Date'}
                  </label>
                  <input
                    id="fld-[endDate]"
                    type="text"
                    readOnly
                    translate="no"
                    value={currentCalculatedEndDate}
                    className="w-full bg-black/60 border border-muted-teal/25 rounded-xl px-2.5 py-1.5 text-slate-300 text-xs focus:outline-none focus:border-primary font-mono text-center font-bold cursor-not-allowed notranslate"
                  />
                </div>
              </div>

              {/* Form buttons actions */}
              <div className="flex justify-end gap-3.5 pt-3 border-t border-muted-teal/15 mt-3">
                <button
                  id="btn-cancel-form"
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4.5 py-1.5 bg-slate-gray text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-slate-gray/80 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4 inline-block mr-1 align-text-bottom" />
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  id="btn-save-member-form"
                  type="submit"
                  className="px-5 py-1.5 bg-primary text-black font-extrabold text-xs uppercase tracking-widest rounded-xl hover:opacity-95 transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4 inline-block mr-1 align-text-bottom stroke-[3]" />
                  {t.saveChange}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {memberToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 flex items-center justify-center p-4">
          <div className="bg-dark-charcoal border border-red-500/30 max-w-md w-full rounded-2xl p-6 shadow-2xl relative">
            <h3 className="text-lg font-black text-red-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="w-2.5 h-6 bg-red-500 rounded-full inline-block"></span>
              {isRtl ? 'تأكيد الحذف النهائي' : 'Confirm Permanent Deletion'}
            </h3>
            <p className="text-sm text-light-gray mb-6 leading-relaxed">
              {isRtl 
                ? `هل أنت متأكد تماماً من حذف العضو "${memberToDelete.fullName}" بشكل نهائي؟ هذا الإجراء لا يمكن التراجع عنه وسوف يؤثر على كامل المدفوعات والتقارير المرتبطة به.`
                : `Are you sure you want to permanently delete user "${memberToDelete.fullName}"? All historic check-ins, logs, and billing reports associated with this member will be permanently customized or dropped.`}
            </p>
            <div className="flex justify-end gap-3 pt-4 border-t border-muted-teal/15">
              <button
                id="btn-cancel-delete"
                onClick={() => setMemberToDelete(null)}
                className="px-4 py-2 bg-slate-gray text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-slate-gray/80 transition-all cursor-pointer"
              >
                {isRtl ? 'تراجع وإلغاء' : 'Cancel'}
              </button>
              <button
                id="btn-confirm-delete"
                onClick={confirmDeleteMember}
                className="px-4 py-2 bg-red-600 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl hover:bg-red-500 transition-all cursor-pointer"
              >
                {isRtl ? 'تأكيد الحذف' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Price Configuration Modal for Admin of the gym */}
      {showPriceConfigModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 flex items-center justify-center p-4">
          <div className="bg-dark-charcoal border border-primary/20 max-w-4xl w-full rounded-2xl p-6 shadow-2xl relative animate-in fade-in zoom-in duration-150">
            <button
              onClick={() => setShowPriceConfigModal(false)}
              className="absolute top-4 right-4 text-muted-teal hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <h3 className="text-xl font-black text-[#C4D600] uppercase tracking-wide mb-2 flex items-center gap-3">
              <span className="w-2.5 h-6 bg-primary rounded-full inline-block"></span>
              {isRtl ? 'إعداد تسعيرات الاشتراك والحصص الافتراضية' : 'Default Program & Ticket Rates'}
            </h3>
            <p className="text-xs text-muted-teal mb-6 font-mono">
              {isRtl 
                ? 'قم بتعيين الرسوم التلقائية للاشتراكات في صالة الجيم، باقات الكارديو وباقات الحصص لتسهيل التسجيل وحفظ سلامة السجلات.' 
                : 'Define default pricing tables for standard memberships, cardio passes, and single/package sessions.'}
            </p>

            <form onSubmit={(e) => {
              e.preventDefault();
              const s = realmDB.getSettings();
              const updated = {
                ...s,
                pricingRegularMonthly: Number(pricingFormData.pricingRegularMonthly),
                pricingRegular3Months: Number(pricingFormData.pricingRegular3Months),
                pricingRegular6Months: Number(pricingFormData.pricingRegular6Months),
                pricingRegular1Year: Number(pricingFormData.pricingRegular1Year),
                pricingCardioMonthly: Number(pricingFormData.pricingCardioMonthly),
                pricingCardio3Months: Number(pricingFormData.pricingCardio3Months),
                pricingCardio6Months: Number(pricingFormData.pricingCardio6Months),
                pricingCardio1Year: Number(pricingFormData.pricingCardio1Year),
                pricingSession1: Number(pricingFormData.pricingSession1),
                pricingSession4: Number(pricingFormData.pricingSession4),
                pricingSession8: Number(pricingFormData.pricingSession8),
                pricingSession12: Number(pricingFormData.pricingSession12),
                pricingSessionKids: Number(pricingFormData.pricingSessionKids),
                pricingSessionAdults: Number(pricingFormData.pricingSessionAdults),
              };
              realmDB.saveSettings(updated);
              
              realmDB.addLog(
                `تم تحديث قائمة الأسعار الافتراضية للاشتراكات وباقات الحصص.`,
                `Default membership and session pricing strategy updated.`,
                'settings'
              );

              setShowPriceConfigModal(false);
              onRefresh();
            }} className="space-y-6">

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Regular Gym Column */}
                <div className="bg-slate-gray/10 p-4 rounded-xl border border-emerald-500/10 space-y-4">
                  <h4 className="text-sm font-bold text-emerald-400 border-b border-emerald-500/20 pb-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    {isRtl ? 'باقات الجيم العادي (Regular Gym)' : 'Regular Gym Subscription Tiers'}
                  </h4>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-mono text-muted-teal mb-1">{isRtl ? 'اشتراك شهر واحد' : 'Monthly Tier (1 Month)'}</label>
                      <input
                        type="number"
                        min="0"
                        required
                        translate="no"
                        dir="ltr"
                        value={pricingFormData.pricingRegularMonthly}
                        onChange={(e) => setPricingFormData({...pricingFormData, pricingRegularMonthly: e.target.value === '' ? '' : Number(e.target.value)})}
                        onFocus={(e) => e.target.select()}
                        className="w-full bg-black/40 border border-muted-teal/15 rounded-lg px-3 py-1.5 text-white text-sm font-mono focus:outline-none focus:border-primary text-center notranslate dir-ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-muted-teal mb-1">{isRtl ? 'باقة 3 أشهر' : 'Quarterly Tier (3 Months)'}</label>
                      <input
                        type="number"
                        min="0"
                        required
                        translate="no"
                        dir="ltr"
                        value={pricingFormData.pricingRegular3Months}
                        onChange={(e) => setPricingFormData({...pricingFormData, pricingRegular3Months: e.target.value === '' ? '' : Number(e.target.value)})}
                        onFocus={(e) => e.target.select()}
                        className="w-full bg-black/40 border border-muted-teal/15 rounded-lg px-3 py-1.5 text-white text-sm font-mono focus:outline-none focus:border-primary text-center notranslate dir-ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-muted-teal mb-1">{isRtl ? 'باقة 6 أشهر' : 'Semi-Annual Tier (6 Months)'}</label>
                      <input
                        type="number"
                        min="0"
                        required
                        translate="no"
                        dir="ltr"
                        value={pricingFormData.pricingRegular6Months}
                        onChange={(e) => setPricingFormData({...pricingFormData, pricingRegular6Months: e.target.value === '' ? '' : Number(e.target.value)})}
                        onFocus={(e) => e.target.select()}
                        className="w-full bg-black/40 border border-muted-teal/15 rounded-lg px-3 py-1.5 text-white text-sm font-mono focus:outline-none focus:border-primary text-center notranslate dir-ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-muted-teal mb-1">{isRtl ? 'باقة سنة كاملة' : 'Annual Tier (1 Year)'}</label>
                      <input
                        type="number"
                        min="0"
                        required
                        translate="no"
                        dir="ltr"
                        value={pricingFormData.pricingRegular1Year}
                        onChange={(e) => setPricingFormData({...pricingFormData, pricingRegular1Year: e.target.value === '' ? '' : Number(e.target.value)})}
                        onFocus={(e) => e.target.select()}
                        className="w-full bg-black/40 border border-muted-teal/15 rounded-lg px-3 py-1.5 text-white text-sm font-mono focus:outline-none focus:border-primary text-center notranslate dir-ltr"
                      />
                    </div>
                  </div>
                </div>

                {/* Cardio Section Column */}
                <div className="bg-slate-gray/10 p-4 rounded-xl border border-amber-500/10 space-y-4">
                  <h4 className="text-sm font-bold text-amber-400 border-b border-amber-500/20 pb-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    {isRtl ? 'باقات الكارديو واللياقة (Cardio)' : 'Cardio Fitness Tiers'}
                  </h4>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-mono text-muted-teal mb-1">{isRtl ? 'اشتراك شهر واحد' : 'Monthly Tier (1 Month)'}</label>
                      <input
                        type="number"
                        min="0"
                        required
                        translate="no"
                        dir="ltr"
                        value={pricingFormData.pricingCardioMonthly}
                        onChange={(e) => setPricingFormData({...pricingFormData, pricingCardioMonthly: e.target.value === '' ? '' : Number(e.target.value)})}
                        onFocus={(e) => e.target.select()}
                        className="w-full bg-black/40 border border-muted-teal/15 rounded-lg px-3 py-1.5 text-white text-sm font-mono focus:outline-none focus:border-primary text-center notranslate dir-ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-muted-teal mb-1">{isRtl ? 'باقة 3 أشهر' : 'Quarterly Tier (3 Months)'}</label>
                      <input
                        type="number"
                        min="0"
                        required
                        translate="no"
                        dir="ltr"
                        value={pricingFormData.pricingCardio3Months}
                        onChange={(e) => setPricingFormData({...pricingFormData, pricingCardio3Months: e.target.value === '' ? '' : Number(e.target.value)})}
                        onFocus={(e) => e.target.select()}
                        className="w-full bg-black/40 border border-muted-teal/15 rounded-lg px-3 py-1.5 text-white text-sm font-mono focus:outline-none focus:border-primary text-center notranslate dir-ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-muted-teal mb-1">{isRtl ? 'باقة 6 أشهر' : 'Semi-Annual Tier (6 Months)'}</label>
                      <input
                        type="number"
                        min="0"
                        required
                        translate="no"
                        dir="ltr"
                        value={pricingFormData.pricingCardio6Months}
                        onChange={(e) => setPricingFormData({...pricingFormData, pricingCardio6Months: e.target.value === '' ? '' : Number(e.target.value)})}
                        onFocus={(e) => e.target.select()}
                        className="w-full bg-black/40 border border-muted-teal/15 rounded-lg px-3 py-1.5 text-white text-sm font-mono focus:outline-none focus:border-primary text-center notranslate dir-ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-muted-teal mb-1">{isRtl ? 'باقة سنة كاملة' : 'Annual Tier (1 Year)'}</label>
                      <input
                        type="number"
                        min="0"
                        required
                        translate="no"
                        dir="ltr"
                        value={pricingFormData.pricingCardio1Year}
                        onChange={(e) => setPricingFormData({...pricingFormData, pricingCardio1Year: e.target.value === '' ? '' : Number(e.target.value)})}
                        onFocus={(e) => e.target.select()}
                        className="w-full bg-black/40 border border-muted-teal/15 rounded-lg px-3 py-1.5 text-white text-sm font-mono focus:outline-none focus:border-primary text-center notranslate dir-ltr"
                      />
                    </div>
                  </div>
                </div>

                {/* Session Packages Column */}
                <div className="bg-slate-gray/10 p-4 rounded-xl border border-primary/10 space-y-4">
                  <h4 className="text-sm font-bold text-primary border-b border-primary/20 pb-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                    {isRtl ? 'تسعير تذاكر وباقات الحصص الرياضية' : 'Session Ticket Prices'}
                  </h4>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-mono text-muted-teal mb-1">{isRtl ? 'حصة للبالغين (Adults)' : 'Adults Session'}</label>
                      <input
                        type="number"
                        min="0"
                        required
                        translate="no"
                        dir="ltr"
                        value={pricingFormData.pricingSessionAdults}
                        onChange={(e) => setPricingFormData({...pricingFormData, pricingSessionAdults: e.target.value === '' ? '' : Number(e.target.value)})}
                        onFocus={(e) => e.target.select()}
                        className="w-full bg-black/40 border border-muted-teal/15 rounded-lg px-3 py-1.5 text-white text-sm font-mono focus:outline-none focus:border-primary text-center notranslate dir-ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-muted-teal mb-1">{isRtl ? 'حصة للأطفال (Kids)' : 'Kids Session'}</label>
                      <input
                        type="number"
                        min="0"
                        required
                        translate="no"
                        dir="ltr"
                        value={pricingFormData.pricingSessionKids}
                        onChange={(e) => setPricingFormData({...pricingFormData, pricingSessionKids: e.target.value === '' ? '' : Number(e.target.value)})}
                        onFocus={(e) => e.target.select()}
                        className="w-full bg-black/40 border border-[#3E4E5B] rounded-lg px-3 py-1.5 text-white text-sm font-mono focus:outline-none focus:border-primary text-center notranslate dir-ltr"
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-muted-teal/15 mt-2">
                <button
                  id="btn-close-pricing-modal"
                  type="button"
                  onClick={() => setShowPriceConfigModal(false)}
                  className="px-4 py-2 bg-slate-gray text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-slate-gray/80 transition-all cursor-pointer"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  id="btn-save-pricing-modal"
                  type="submit"
                  className="px-5 py-2 bg-primary text-black font-extrabold text-xs uppercase tracking-widest rounded-xl hover:opacity-95 transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4 inline-block mr-1 align-text-bottom stroke-[3]" />
                  {isRtl ? 'حفظ السياسة السعرية' : 'Save Rates'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
