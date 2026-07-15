import React, { useState } from 'react';
import { realmDB, CURRENT_DATE_STR } from '../lib/realm';
import { ActivityLog } from '../types';
import { 
  FileSpreadsheet, 
  Trash2, 
  Search, 
  Filter, 
  Database, 
  Clock, 
  AlertTriangle,
  User,
  ShoppingBag,
  Bell,
  Sliders,
  CalendarDays
} from 'lucide-react';

interface LogsViewProps {
  role: string;
  lang: 'ar' | 'en';
  onRefresh: () => void;
}

export default function LogsView({ role, lang, onRefresh }: LogsViewProps) {
  const isRtl = lang === 'ar';
  const isAdmin = role === 'admin';

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  // Load logs
  const rawLogs = realmDB.getLogs();

  if (!isAdmin) {
    return (
      <div className="bg-red-950/20 border border-red-500/20 rounded-2xl p-8 text-center" dir={isRtl ? 'rtl' : 'ltr'}>
        <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4 animate-bounce" />
        <h3 className="text-xl font-bold text-white mb-2">
          {isRtl ? 'غير مصرح لك بمشاهدة السجل' : 'Unauthorized Access Level'}
        </h3>
        <p className="text-sm text-muted-teal">
          {isRtl 
            ? 'سجل العمليات التفصيلي يظهر فقط للمدراء للرقابة والمحاسبة والأمان.' 
            : 'Operational system auditing and ledger logs require high administrative access privilege.'}
        </p>
      </div>
    );
  }

  // Categories list
  const categories = [
    { id: 'all', labelAr: 'الكل', labelEn: 'All Logs' },
    { id: 'member', labelAr: 'الأعضاء', labelEn: 'Members' },
    { id: 'subscription', labelAr: 'الاشتراكات', labelEn: 'Subscriptions' },
    { id: 'product', labelAr: 'المخزن والتوريد', labelEn: 'Inventory' },
    { id: 'sale', labelAr: 'المبيعات والـ POS', labelEn: 'Sales Checkouts' },
    { id: 'attendance', labelAr: 'الحضور والانصراف', labelEn: 'Attendance' },
    { id: 'trainer', labelAr: 'المدربين', labelEn: 'Coaches' },
    { id: 'settings', labelAr: 'الإعدادات والأمان', labelEn: 'System Config' },
    { id: 'equipment', labelAr: 'صيانة الأجهزة', labelEn: 'Machinery/Care' },
  ];

  // Filter and search
  const filteredLogs = rawLogs.filter(log => {
    const categoryMatch = activeCategory === 'all' || log.category === activeCategory;
    const term = searchQuery.toLowerCase();
    const actionMatch = 
      log.actionAr.toLowerCase().includes(term) || 
      log.actionEn.toLowerCase().includes(term) ||
      log.timestamp.includes(term) ||
      log.category.includes(term);
    return categoryMatch && actionMatch;
  }).sort((a, b) => {
    const timeA = a.timestamp || '';
    const timeB = b.timestamp || '';
    const cmp = timeB.localeCompare(timeA);
    if (cmp !== 0) return cmp;
    return (b.id || '').localeCompare(a.id || '');
  });

  const handleResetLogs = () => {
    realmDB.clearLogs();
    setShowConfirmReset(false);
    onRefresh();
  };

  const getCategoryTheme = (cat: string) => {
    switch (cat) {
      case 'member':
        return { bg: 'bg-blue-950/40 text-blue-300 border-blue-500/30', labelAr: 'عضوية', labelEn: 'Member' };
      case 'subscription':
        return { bg: 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30', labelAr: 'اشتراك', labelEn: 'Subscription' };
      case 'product':
        return { bg: 'bg-pink-950/40 text-pink-300 border-pink-500/30', labelAr: 'توريد', labelEn: 'Supply' };
      case 'sale':
        return { bg: 'bg-yellow-950/40 text-yellow-300 border-yellow-500/30', labelAr: 'مبيعات', labelEn: 'Sales POS' };
      case 'attendance':
        return { bg: 'bg-orange-950/40 text-orange-300 border-orange-500/30', labelAr: 'حضور', labelEn: 'Attendance' };
      case 'trainer':
        return { bg: 'bg-purple-950/40 text-purple-300 border-purple-500/30', labelAr: 'مدربين', labelEn: 'Coach' };
      case 'settings':
        return { bg: 'bg-[#C4D600]/10 text-[#C4D600] border-[#C4D600]/30', labelAr: 'أمان', labelEn: 'Security' };
      case 'equipment':
        return { bg: 'bg-cyan-950/40 text-cyan-300 border-cyan-500/30', labelAr: 'صيانة', labelEn: 'Repair' };
      default:
        return { bg: 'bg-slate-800/40 text-slate-300 border-slate-700/30', labelAr: 'النظام', labelEn: 'System' };
    }
  };

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* HEADER BANNER */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-b border-muted-teal/15 pb-6">
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-wider flex items-center gap-3">
            <span className="w-2.5 h-8 bg-primary rounded-full inline-block"></span>
            {isRtl ? 'سجل العمليات والمعاملات المالي' : 'Audit Logs & Live Ledger'}
          </h2>
          <p className="text-sm text-muted-teal mt-1">
            {isRtl 
              ? 'مراقبة فورية لأدق الحركات مع توثيق التاريخ واليوم والساعة والمثابرة مع خيارات إعادة التصفير.' 
              : 'Real-time auditing track. Records every single edit, purchase, attendance tick down to the second.'}
          </p>
        </div>

        {/* Action Button: Clear Audit Log */}
        <button
          id="btn-trigger-reset-logs"
          onClick={() => setShowConfirmReset(true)}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-red-950/30 hover:bg-red-950/50 border border-red-500/30 text-red-200 text-xs font-black rounded-xl transition-all cursor-pointer"
        >
          <Trash2 className="w-4 h-4 text-red-400" />
          <span>{isRtl ? 'إعادة تعيين وتصفير السجل' : 'Reset Ledger Logs'}</span>
        </button>
      </div>

      {/* METRICS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-gray/30 p-5 rounded-2xl border border-muted-teal/10 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-muted-teal font-mono uppercase tracking-widest">{isRtl ? 'إجمالي الحركات المحفوظة' : 'Total Captured Logs'}</span>
            <p className="text-2xl font-black text-white mt-1">{rawLogs.length}</p>
          </div>
          <Database className="w-8 h-8 text-primary opacity-60" />
        </div>
        
        <div className="bg-slate-gray/30 p-5 rounded-2xl border border-muted-teal/10 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-muted-teal font-mono uppercase tracking-widest">{isRtl ? 'العمليات المطابقة للفرز' : 'Filtered Logs'}</span>
            <p className="text-2xl font-black text-[#C4D600] mt-1">{filteredLogs.length}</p>
          </div>
          <Filter className="w-8 h-8 text-[#C4D600] opacity-60" />
        </div>

        <div className="bg-slate-gray/30 p-5 rounded-2xl border border-muted-teal/10 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-muted-teal font-mono uppercase tracking-widest">{isRtl ? 'تاريخ اليوم المعتمد' : 'Operational Date'}</span>
            <p className="text-md font-black text-white mt-2 font-mono flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4 text-primary" />
              <span>{CURRENT_DATE_STR}</span>
            </p>
          </div>
          <Clock className="w-8 h-8 text-muted-teal opacity-40" />
        </div>
      </div>

      {/* FILTERS & SEARCH ROW */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 items-center">
        {/* Search */}
        <div className="xl:col-span-1 relative">
          <input
            id="fld-logs-search"
            type="text"
            className="w-full pl-10 pr-4 py-3 bg-black/45 border border-muted-teal/25 rounded-xl text-xs"
            placeholder={isRtl ? 'ابحث عن عملية، مدرب، تاريخ...' : 'Search activity records...'}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <Search className={`w-4 h-4 text-muted-teal absolute top-1/2 -translate-y-1/2 ${isRtl ? 'left-3' : 'left-3'}`} />
        </div>

        {/* Category Horizontal Buttons */}
        <div className="xl:col-span-3 flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1">
          {categories.map(cat => {
            const isSelected = activeCategory === cat.id;
            return (
              <button
                id={`cat-log-filter-${cat.id}`}
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-2 text-[11px] font-bold rounded-xl border transition-all cursor-pointer whitespace-nowrap ${
                  isSelected 
                    ? 'bg-primary border-primary text-black' 
                    : 'bg-black/15 border-muted-teal/10 text-muted-teal hover:border-primary/40 hover:text-white'
                }`}
              >
                {isRtl ? cat.labelAr : cat.labelEn}
              </button>
            );
          })}
        </div>
      </div>

      {/* LEDGER DISPLAY LIST */}
      <div className="bg-slate-gray/25 border border-muted-teal/15 rounded-3xl overflow-hidden shadow-2xl">
        {filteredLogs.length === 0 ? (
          <div className="p-16 text-center">
            <Clock className="w-12 h-12 text-muted-teal mx-auto mb-3 opacity-30 animate-pulse" />
            <p className="text-sm font-bold text-muted-teal">
              {isRtl ? 'لا توجد حركات تسوق مطابقة للبحث أو الفلتر حالياً.' : 'No audit records match the current ledger query.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-muted-teal/10 max-h-[500px] overflow-y-auto">
            {filteredLogs.map(log => {
              const theme = getCategoryTheme(log.category);
              return (
                <div 
                  key={log.id} 
                  className="p-4 hover:bg-black/10 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 font-sans text-xs"
                >
                  <div className="flex items-start md:items-center gap-3">
                    {/* Event Category Tag Badge */}
                    <span className={`px-2.5 py-1 text-[10px] font-extrabold uppercase border rounded-md font-mono shrink-0 select-none ${theme.bg}`}>
                      {isRtl ? theme.labelAr : theme.labelEn}
                    </span>
                    
                    {/* Localized Event Text DESCRIPTION */}
                    <p className="text-white font-medium break-all text-xs leading-relaxed md:break-words">
                      {isRtl ? log.actionAr : log.actionEn}
                    </p>
                  </div>

                  {/* Perfect Dynamic Clock Stamp Down to seconds */}
                  <div className="flex items-center gap-2 shrink-0 md:text-left self-end md:self-auto">
                    <div className="flex items-center gap-1 text-[11px] font-mono text-primary font-bold">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{log.timestamp}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CONFIRM RESET MODAL DIALOGUE */}
      {showConfirmReset && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 animate-fade-in no-print">
          <div className="w-full max-w-md bg-dark-charcoal border border-red-500/30 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-950/50 border border-red-500/50 rounded-2xl text-red-400">
                <Trash2 className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-base">
                  {isRtl ? 'تأكيد تصفير السجل للعمليات' : 'Confirm Complete Logs Purge'}
                </h3>
                <p className="text-xs text-muted-teal mt-0.5">
                  {isRtl ? 'تحذير أمان: هذا الإجراء لا يمكن التراجع عنه!' : 'Security Warning: This operation is permanent.'}
                </p>
              </div>
            </div>

            <p className="text-xs text-red-200 bg-red-950/10 p-4 border border-red-500/20 rounded-xl leading-relaxed">
              {isRtl 
                ? 'عند الضغط على نعم، سيتم محو جميع حركات تسجيل الدخول والبيع والحضور وتحديث الإعدادات الرياضية السابقة نهائياً من قاعدة بيانات المتواجدين محلياً والبدء في سجل حركات فارغ جديد.' 
                : 'All historic logs relating to member transactions, POS checkouts, security updates, and arrival stamp history will be fully erased from system ledger memory.'}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                id="btn-cancel-reset"
                onClick={() => setShowConfirmReset(false)}
                className="px-4 py-2 text-xs font-bold text-muted-teal hover:text-white transition-all cursor-pointer"
              >
                {isRtl ? 'إلغاء وتراجع' : 'Close / Go Back'}
              </button>
              <button
                id="btn-confirm-delete-logs"
                onClick={handleResetLogs}
                className="px-5 py-2.5 bg-red-600 text-white font-black uppercase text-xs rounded-xl shadow-lg hover:bg-red-700 transition-all cursor-pointer"
              >
                {isRtl ? 'نعم، قم بتصفير السجل بالكامل' : 'Yes, reset all logs'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
