import { Member, SubscriptionType } from '../types';
import { translations } from '../lib/translations';
import { X, Printer, Calendar, CheckCircle2, AlertTriangle, Activity } from 'lucide-react';
import GymLogo from './GymLogo';
import { realmDB } from '../lib/realm';

interface MemberReportProps {
  member: Member;
  lang: 'ar' | 'en';
  role?: 'admin' | 'male-trainer' | 'female-trainer';
  onClose: () => void;
}

export default function MemberReport({ member, lang, role, onClose }: MemberReportProps) {
  const t = translations[lang];

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

  const totalAttended = member.history.attendedDates.length;
  const totalMissed = member.history.missedDates.length;
  const totalDays = totalAttended + totalMissed;
  const presenceRate = totalDays > 0 ? Math.round((totalAttended / totalDays) * 100) : 100;

  const handlePrint = () => {
    window.print();
  };

  const isRtl = lang === 'ar';

  const getDayName = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const date = new Date(year, month, day);
        
        const weekdaysAr = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        const weekdaysEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        const dayIndex = date.getDay();
        return isRtl ? weekdaysAr[dayIndex] : weekdaysEn[dayIndex];
      }
      return '';
    } catch (e) {
      return '';
    }
  };

  return (
    <div className={`fixed inset-0 z-50 overflow-y-auto bg-black/80 flex items-center justify-center p-4 ${isRtl ? 'font-sans' : 'font-sans'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="relative bg-dark-charcoal max-w-4xl w-full rounded-2xl border border-muted-teal overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header (No print) */}
        <div className="flex items-center justify-between p-6 bg-slate-gray border-b border-muted-teal/30 no-print">
          <div className="flex items-center gap-3">
            <Activity className="text-primary w-6 h-6 animate-pulse" />
            <h2 className="text-xl font-bold text-white uppercase tracking-wider">{t.memberReportTitle}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              id="btn-print-report"
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-semibold rounded-lg hover:opacity-90 transition-all cursor-pointer shadow-md"
            >
              <Printer className="w-4 h-4" />
              {t.printReportBtn}
            </button>
            <button
              id="btn-close-report"
              onClick={onClose}
              className="p-2 text-light-gray hover:text-white hover:bg-white/10 rounded-lg transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div id="member-printable-report-card" className="p-8 overflow-y-auto flex-1 bg-dark-charcoal text-light-gray printable-content">
          
          {/* Iframe sandbox printing instruction badge */}
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3 no-print text-xs text-amber-200">
            <span className="text-base select-none shrink-0">💡</span>
            <div>
              <p className="font-bold mb-1">
                {isRtl 
                  ? 'ملاحظة هامة للطباعة في المعاينة:' 
                  : 'Important Note for Printing:'}
              </p>
              <p className="leading-relaxed">
                {isRtl 
                  ? 'يرجى النقر على زر "الفتح في علامة تبويب جديدة" (Open in New Tab) في الشريط العلوي للمنصة أولاً لتتمكن من تشغيل أمر الطباعة بنجاح، حيث تحظر متصفحات الإنترنت فظ كشف الطباعة من داخل الأطر الفرعية (iFrames).' 
                  : 'Please click the "Open in New Tab" icon at the top-right of the preview bar first to run the print dialogue, as browsers prevent printing directly inside iframe preview boxes.'}
              </p>
            </div>
          </div>

          {/* Gym Hub Branding header */}
          <div className="text-center mb-8 border-b border-muted-teal/40 pb-6 flex flex-col items-center justify-center">
            <GymLogo size={85} className="mb-3 drop-shadow-[0_4px_12px_rgba(196,214,0,0.25)] border-2 border-primary/20 rounded-2xl p-1 bg-black/10 print-logo-img" />
            <div className="flex justify-center items-center gap-2 mb-2">
              <span className="w-3 h-3 rounded-full bg-primary inline-block"></span>
              <h1 className="text-3xl font-black text-white uppercase tracking-widest">{lang === 'ar' ? 'ديمو جيم للياقة البدنية' : 'DEMO GYM GYM'}</h1>
              <span className="w-3 h-3 rounded-full bg-primary inline-block"></span>
            </div>
            <p className="text-xs text-muted-teal tracking-widest uppercase mb-4">{t.tagline} | {isRtl ? 'منذ عام ٢٠٢٦' : 'Since 2026'}</p>
            <span className="inline-block px-3 py-1 bg-black/40 text-primary border border-primary/35 rounded-full text-xs font-mono font-bold uppercase tracking-widest">
              {lang === 'ar' ? 'تقرير الحضور والغياب المعتمد' : 'VERIFIED ATTENDANCE REPORT'}
            </span>
          </div>

          {/* Member Identity Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-gray/40 border border-muted-teal/20 rounded-xl p-6 mb-8">
            <div>
              <p className="text-xs text-muted-teal uppercase mb-1 font-mono">{t.fullName}</p>
              <p className="text-lg font-bold text-white">{member.fullName}</p>
              <p className="text-sm mt-1">{t.phone}: <span className="font-mono text-white/90">{member.phone}</span></p>
              <p className="text-sm mt-1">
                {t.gender}: <span className="font-semibold text-white">{member.gender === 'male' ? t.male : t.female}</span>
              </p>
            </div>
            <div className={`md:border-l border-muted-teal/25 md:pl-6 ${isRtl ? 'md:border-l-0 md:border-r md:pr-6 md:pl-0' : ''}`}>
              <p className="text-xs text-muted-teal uppercase mb-1 font-mono">{t.subType}</p>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="inline-block px-3 py-1 bg-primary/20 text-primary border border-primary/30 rounded-full text-xs font-semibold uppercase">
                  {member.subscriptionType === 'monthly' ? t.monthly : 
                   member.subscriptionType === '3-months' ? t['3-months'] : 
                   member.subscriptionType === '6-months' ? t['6-months'] : t['1-year']}
                </span>
                <span className={`inline-block px-3 py-1 border rounded-full text-xs font-semibold uppercase ${
                  member.subscriptionCategory === 'cardio'
                    ? 'bg-amber-400/15 text-amber-400 border-amber-500/20'
                    : 'bg-emerald-400/15 text-emerald-400 border-emerald-500/20'
                }`}>
                  {member.subscriptionCategory === 'cardio' ? (isRtl ? 'اشتراك كارديو' : 'Cardio') : (isRtl ? 'اشتراك عادي (جيم)' : 'Regular Gym')}
                </span>
                {role === 'admin' && (
                  <span className="inline-block px-3 py-1 bg-amber-400/10 text-amber-300 border border-amber-400/20 rounded-full text-xs font-mono font-bold">
                    {member.subscriptionPrice !== undefined ? member.subscriptionPrice : getSubPrice(member.subscriptionType, member.subscriptionCategory || 'regular')} {isRtl ? 'ج.م' : 'EGP'}
                  </span>
                )}
              </div>
              <p className="text-sm text-light-gray">{t.startDate}: <span className="font-mono text-white">{member.startDate}</span></p>
              <p className="text-sm text-light-gray">{t.endDate}: <span className="font-mono text-white">{member.endDate}</span></p>
              <p className="text-xs text-muted-teal mt-2">{t.registeredSince}: <span className="font-mono">{member.registrationDate}</span></p>
            </div>
          </div>

          {/* Interactive Statistics Grid */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-slate-gray/30 border border-muted-teal/15 p-4 rounded-xl text-center">
              <p className="text-xs text-muted-teal uppercase mb-1 font-mono">{t.totalDaysAttended}</p>
              <div className="flex justify-center items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <span className="text-2xl font-extrabold text-white font-mono">{totalAttended}</span>
              </div>
            </div>
            <div className="bg-slate-gray/30 border border-muted-teal/15 p-4 rounded-xl text-center">
              <p className="text-xs text-muted-teal uppercase mb-1 font-mono">{t.totalDaysMissed}</p>
              <div className="flex justify-center items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <span className="text-2xl font-extrabold text-white font-mono">{totalMissed}</span>
              </div>
            </div>
            <div className="bg-slate-gray/30 border border-muted-teal/15 p-4 rounded-xl text-center">
              <p className="text-xs text-muted-teal uppercase mb-1 font-mono">{t.presenceRate}</p>
              <div className="text-2xl font-extrabold text-primary font-mono">{presenceRate}%</div>
            </div>
          </div>

          {/* Timelines list */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Checked-in days */}
            <div className="border border-muted-teal/20 rounded-xl p-5 bg-black/10">
              <div className="flex items-center gap-2 mb-4 border-b border-muted-teal/15 pb-2 text-primary">
                <CheckCircle2 className="w-4 h-4" />
                <h3 className="font-semibold text-white text-sm uppercase tracking-wider">{t.attendanceTimeline}</h3>
              </div>
              {member.history.attendedDates.length === 0 ? (
                <p className="text-xs text-muted-teal italic">{t.noRecords}</p>
              ) : (
                <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                  {member.history.attendedDates.map((dt, i) => (
                    <div key={i} className="flex justify-between items-center text-xs bg-slate-gray/20 rounded px-3 py-1.5 border-l-2 border-primary">
                      <span className="font-mono text-light-gray">
                        {dt} {getDayName(dt) ? ` (${getDayName(dt)})` : ''}
                      </span>
                      <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">{t.attendedDate}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Missed scheduled days */}
            <div className="border border-muted-teal/20 rounded-xl p-5 bg-black/10">
              <div className="flex items-center gap-2 mb-4 border-b border-muted-teal/15 pb-2 text-red-400">
                <AlertTriangle className="w-4 h-4" />
                <h3 className="font-semibold text-white text-sm uppercase tracking-wider">{t.missedTimeline}</h3>
              </div>
              {member.history.missedDates.length === 0 ? (
                <p className="text-xs text-muted-teal italic">{t.noRecords}</p>
              ) : (
                <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                  {member.history.missedDates.map((dt, i) => (
                    <div key={i} className="flex justify-between items-center text-xs bg-slate-gray/20 rounded px-3 py-1.5 border-l-2 border-red-500">
                      <span className="font-mono text-light-gray">
                        {dt} {getDayName(dt) ? ` (${getDayName(dt)})` : ''}
                      </span>
                      <span className="text-[10px] bg-red-950 text-red-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">{t.missedDate}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Footer Receipt Disclaimer */}
          <div className="mt-12 text-center pt-8 border-t border-muted-teal/20">
            <div className="flex justify-center items-center gap-4 mb-4">
              <div className="border border-muted-teal/30 p-2 rounded bg-black/30 font-mono text-[10px]">
                {lang === 'ar' ? 'مستند رقمي معتمد' : 'VERIFIED AUDIT ID: '}{member.id}
              </div>
              <div className="border border-muted-teal/30 p-2 rounded bg-black/30 font-mono text-[10px]">
                {lang === 'ar' ? 'بوابة ريلم دي بي النشطة' : 'STAMP SECURED BY REALM'}
              </div>
            </div>
            <p className="text-[10px] text-muted-teal uppercase font-mono">
              {lang === 'ar' 
                ? 'مستند رسمي صادر عن نظام إدارة ديمو جيم جيم - جميع الحقوق محفوظة لعام ٢٠٢٦' 
                : 'OFFICIAL DOCUMENT GENERATED FROM DEMO GYM GYM SYSTEM © 2026'}
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
