import React, { useState, useEffect } from 'react';
import { AttendanceRecord, Member, Trainer } from '../types';
import { translations } from '../lib/translations';
import { realmDB, CURRENT_DATE_STR } from '../lib/realm';
import { 
  Calendar, 
  Search, 
  Smartphone, 
  UserCheck, 
  Clock, 
  AlertCircle, 
  CalendarCheck, 
  RefreshCcw, 
  ChevronLeft, 
  ChevronRight, 
  User, 
  Lock, 
  CalendarDays,
  Check,
  X,
  UserX
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AttendanceViewProps {
  role: 'admin' | 'male-trainer' | 'female-trainer';
  lang: 'ar' | 'en';
  attendance: AttendanceRecord[];
  members: Member[];
  trainers: Trainer[];
  onRefresh: () => void;
  type: 'member' | 'trainer';
  authenticatedTrainerId?: string | null;
}

export default function AttendanceView({
  role,
  lang,
  attendance,
  members,
  trainers,
  onRefresh,
  type,
  authenticatedTrainerId
}: AttendanceViewProps) {
  const t = translations[lang];
  const isRtl = lang === 'ar';

  const [dateFilter, setDateFilter] = useState(CURRENT_DATE_STR);
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [selectedTrainerId, setSelectedTrainerId] = useState(authenticatedTrainerId || '');
  const [trainerCheckInTime, setTrainerCheckInTime] = useState(() => {
    const d = new Date();
    const hrs = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${hrs}:${mins}`;
  });
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const isMaleSectionOnly = role === 'male-trainer';
  const isFemaleSectionOnly = role === 'female-trainer';

  useEffect(() => {
    if (authenticatedTrainerId) {
      setSelectedTrainerId(authenticatedTrainerId);
    }
  }, [authenticatedTrainerId]);

  // Securely update the clock-in time to the live clock every second for trainers/coaches (non-admin)
  useEffect(() => {
    if (role !== 'admin') {
      const updateNowTime = () => {
        const d = new Date();
        const hrs = String(d.getHours()).padStart(2, '0');
        const mins = String(d.getMinutes()).padStart(2, '0');
        setTrainerCheckInTime(`${hrs}:${mins}`);
      };
      updateNowTime();
      const intv = setInterval(updateNowTime, 5000);
      return () => clearInterval(intv);
    }
  }, [role]);

  // -------------------------------------------------------------
  // WEEK CALENDAR STATE & CALCULATIONS
  // -------------------------------------------------------------
  
  // Helper to parse "YYYY-MM-DD" safely without offset issues
  const parseDateStr = (str: string): Date => {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  // Helper to format Date into "YYYY-MM-DD"
  const formatDateStr = (date: Date): string => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Find start of week (Sunday)
  const getStartOfWeek = (date: Date): Date => {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = d.getDay(); // 0 is Sunday, 1 is Monday...
    d.setDate(d.getDate() - day);
    return d;
  };

  const [weekStartDate, setWeekStartDate] = useState(() => 
    getStartOfWeek(parseDateStr(CURRENT_DATE_STR))
  );

  // Sync week tracker if user changes full date filter input
  const handleDateFilterChange = (newDateStr: string) => {
    if (!newDateStr) return;
    setDateFilter(newDateStr);
    try {
      const parsed = parseDateStr(newDateStr);
      setWeekStartDate(getStartOfWeek(parsed));
    } catch (e) {
      console.error(e);
    }
  };

  // Generate 7 days for the currently tracked week
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStartDate);
    d.setDate(weekStartDate.getDate() + i);
    return d;
  });

  const handlePrevWeek = () => {
    const d = new Date(weekStartDate);
    d.setDate(d.getDate() - 7);
    setWeekStartDate(d);
    
    // Auto shift selected day of the week
    const currentSelected = parseDateStr(dateFilter);
    const dayIdx = currentSelected.getDay();
    const newSelected = new Date(d);
    newSelected.setDate(d.getDate() + dayIdx);
    setDateFilter(formatDateStr(newSelected));
  };

  const handleNextWeek = () => {
    const d = new Date(weekStartDate);
    d.setDate(d.getDate() + 7);
    setWeekStartDate(d);

    // Auto shift selected day of the week
    const currentSelected = parseDateStr(dateFilter);
    const dayIdx = currentSelected.getDay();
    const newSelected = new Date(d);
    newSelected.setDate(d.getDate() + dayIdx);
    setDateFilter(formatDateStr(newSelected));
  };

  // Week description like "May 2026"
  const getWeekLabel = () => {
    const monthsAr = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const monthsEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const month = isRtl ? monthsAr[weekStartDate.getMonth()] : monthsEn[weekStartDate.getMonth()];
    return `${month} ${weekStartDate.getFullYear()}`;
  };

  const getDayName = (date: Date): string => {
    const daysAr = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const daysEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return isRtl ? daysAr[date.getDay()] : daysEn[date.getDay()];
  };

  // -------------------------------------------------------------
  // ATTENDANCE FILTERING & SELECTIONS
  // -------------------------------------------------------------
  const filteredAttendance = attendance.filter(log => {
    const isSameDate = log.date === dateFilter;
    if (!isSameDate) return false;

    if (type === 'member' && log.targetType !== 'member') return false;
    if (type === 'trainer' && log.targetType !== 'trainer') return false;

    // If logged in as specific trainer and view is trainer view, only show logs of that specific trainer
    if (type === 'trainer' && authenticatedTrainerId && log.targetId !== authenticatedTrainerId) {
      return false;
    }

    if (isMaleSectionOnly) return log.genderSection === 'male' || log.targetType === 'trainer';
    if (isFemaleSectionOnly) return log.genderSection === 'female' || log.targetType === 'trainer';
    return true;
  });

  // Available members list filtered by gender/coach restrictions
  const allAvailableMembers = members.filter(m => {
    if (isMaleSectionOnly) return m.gender === 'male';
    if (isFemaleSectionOnly) return m.gender === 'female';
    return true;
  });

  // Active searched/filtered members for the interactive attendance grid
  const searchedMembersForAttendance = allAvailableMembers.filter(m => {
    const cleanSearch = memberSearchTerm.toLowerCase();
    const matchesName = m.fullName.toLowerCase().includes(cleanSearch);
    const matchesPhone = m.phone.includes(cleanSearch);
    return matchesName || matchesPhone;
  });

  const availableTrainers = trainers.filter(tr => {
    // If logged in as specific trainer, restrict to only themselves
    if (authenticatedTrainerId) {
      return tr.id === authenticatedTrainerId;
    }

    if (isMaleSectionOnly) return tr.gender === 'male';
    if (isFemaleSectionOnly) return tr.gender === 'female';
    return true;
  });

  // Calculate tardiness delays
  const parseMinutes = (timeStr: string): number => {
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  // -------------------------------------------------------------
  // DYNAMIC ATTENDANCE INTERACTION (PRESENT / ABSENT SWITCH)
  // -------------------------------------------------------------
  
  // Handles toggling a member between 'present' and 'absent'
  const handleToggleAttendance = (member: Member) => {
    const isCurrentlyPresent = member.history.attendedDates.includes(dateFilter);
    const nextStatus = isCurrentlyPresent ? 'absent' : 'present';
    
    realmDB.setMemberAttendance(member.id, dateFilter, nextStatus);
    
    const plainName = member.fullName.split('|')[isRtl ? 1 : 0]?.trim() || member.fullName;
    setSuccessMsg(
      isRtl 
        ? `تم تحديث حالة العضو ${plainName}: ${nextStatus === 'present' ? 'حاضر ✓' : 'غائب ✗'}` 
        : `Updated status for ${plainName}: ${nextStatus === 'present' ? 'Present ✓' : 'Absent ✗'}`
    );
    
    setTimeout(() => setSuccessMsg(''), 3000);
    onRefresh();
  };

  // Stamp Trainer Attendance card clock-in
  const handleTrainerPunch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrainerId) return;

    const matchedTrainer = trainers.find(t => t.id === selectedTrainerId);
    if (!matchedTrainer) return;

    // Check for duplicate clock-in today
    const duplicate = attendance.find(a => a.targetId === selectedTrainerId && a.date === dateFilter && a.targetType === 'trainer');
    if (duplicate) {
      setErrorMsg(isRtl ? 'حضور المدرب مسجل لليوم مسبقاً.' : 'This coach is already stamped in for today.');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }

    // Determine Tardiness
    const shiftStartMin = parseMinutes(matchedTrainer.shiftStart);
    
    // Secure actual current time for trainers (non-admin) to prevent tamper/fraud
    let actualPunchInTime = trainerCheckInTime;
    if (role !== 'admin') {
      const d = new Date();
      const hrs = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      actualPunchInTime = `${hrs}:${mins}`;
    }

    const checkInMin = parseMinutes(actualPunchInTime);
    const diff = checkInMin - shiftStartMin;
    const isLate = diff > 0;

    const record: AttendanceRecord = {
      id: `att-${Date.now()}`,
      targetId: matchedTrainer.id,
      targetType: 'trainer',
      targetName: matchedTrainer.name,
      date: dateFilter,
      checkInTime: actualPunchInTime,
      isLate: isLate,
      lateMinutes: isLate ? diff : 0
    };

    realmDB.addAttendance(record);

    setSuccessMsg(isRtl ? `تم توثيق حضور ${matchedTrainer.name}` : `Trainer ${matchedTrainer.name} stamped successfully.`);
    setTimeout(() => setSuccessMsg(''), 4000);
    setSelectedTrainerId('');
    onRefresh();
  };

  const renderLogsArchive = () => (
    <div className="bg-slate-gray/25 border border-muted-teal/15 rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between h-full">
      <div>
        <div className="p-5 border-b border-muted-teal/10 bg-black/15 flex justify-between items-center">
          <h3 className="font-bold text-white text-base uppercase tracking-wider flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-primary" />
            {isRtl ? `سجلات وحضور يوم (${dateFilter})` : `Attendance Records for (${dateFilter})`}
          </h3>
          <span className="text-[10px] bg-primary/20 text-primary font-mono font-bold px-2.5 py-0.5 rounded-full uppercase tracking-widest">
            {filteredAttendance.length} {isRtl ? 'مسجلين' : 'logged'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-light-gray text-left rtl:text-right">
            <thead className="text-xs uppercase bg-black/25 text-muted-teal border-b border-muted-teal/15">
              <tr>
                <th scope="col" className="px-5 py-3">{isRtl ? 'الاسم' : 'Name'}</th>
                <th scope="col" className="px-5 py-3">{t.type}</th>
                <th scope="col" className="px-5 py-3">{t.time}</th>
                <th scope="col" className="px-5 py-3">{isRtl ? 'الحالة' : 'Metrics'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-muted-teal/10">
              {filteredAttendance.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-xs text-muted-teal italic bg-slate-gray/5">
                    {t.noRecords}
                  </td>
                </tr>
              ) : (
                filteredAttendance.map((record) => (
                  <tr key={record.id} className="hover:bg-black/10 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-white">{record.targetName}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                        record.targetType === 'member' ? 'bg-indigo-900/30 text-indigo-300' : 'bg-amber-900/35 text-amber-300'
                      }`}>
                        {record.targetType === 'member' ? (isRtl ? 'عضو' : 'Member') : (isRtl ? 'مدرب' : 'Trainer')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono font-bold text-white">{record.checkInTime}</td>
                    <td className="px-5 py-3.5">
                      {record.targetType === 'trainer' ? (
                        record.isLate ? (
                          <span className="inline-flex items-center gap-1 text-red-400 text-xs font-bold">
                            <AlertCircle className="w-3.5 h-3.5" />
                            {isRtl ? `متأخر بـ ${record.lateMinutes} دقيقة` : `Late ${record.lateMinutes} mins`}
                          </span>
                        ) : (
                          <span className="text-primary text-xs font-bold">
                            {isRtl ? 'حضور منضبط' : '✓ Punctual'}
                          </span>
                        )
                      ) : (
                        <span className="text-primary text-xs font-mono font-bold">
                          {isRtl ? '✓ كبس حضور مقبول' : '✓ Switch Checked'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* Header element */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-muted-teal/15 pb-6">
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-wider flex items-center gap-3">
            <span className="w-2.5 h-8 bg-primary rounded-full inline-block animate-pulse"></span>
            {type === 'member'
              ? (isRtl ? 'تسجيل حضور الأعضاء' : 'Members Attendance Check')
              : (isRtl ? 'تسجيل حضور المدربين' : 'Coaches Shift Punch')}
          </h2>
          <p className="text-sm text-muted-teal mt-1">
            {type === 'member'
              ? (isRtl ? 'كشف حضور وغياب الأعضاء اليومي بمفاتيح التبديل لحقظ حضورهم' : 'Interactive daily check-in logs and toggle switches for gym membership.')
              : (isRtl ? 'تسجيل حضور ونظام البصمة للكباتن ومدربي صالة الجيم' : 'Staff shift clock-in timesheets and tardiness audit board.')}
          </p>
        </div>

        {/* Date Filter Input (Backup / Manual Picker) */}
        <div className="flex items-center gap-3 bg-slate-gray/35 px-4 py-2 border border-muted-teal/20 rounded-xl shadow-inner shadow-black/40">
          <Calendar className="w-4 h-4 text-primary" />
          <span className="text-xs text-muted-teal font-mono uppercase">{t.dailyFilters}</span>
          <input
            id="fld-attendance-date-filter"
            type="date"
            value={dateFilter}
            onChange={(e) => handleDateFilterChange(e.target.value)}
            className="bg-black/40 border border-muted-teal/15 rounded px-2.5 py-1 text-white text-xs focus:outline-none focus:border-primary font-mono cursor-pointer"
          />
        </div>
      </div>

      {/* Success Notification Alert */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-primary/15 border border-primary/40 p-4 rounded-xl flex items-center gap-3 text-primary text-sm font-bold shadow-md shadow-[#C4D600]/5"
          >
            <CalendarCheck className="w-5 h-5 animate-pulse shrink-0" />
            <p>{successMsg}</p>
          </motion.div>
        )}
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-red-500/15 border border-red-500/40 p-4 rounded-xl flex items-center gap-3 text-red-100 text-sm font-bold shadow-md shadow-red-500/5"
          >
            <AlertCircle className="w-5 h-5 animate-bounce shrink-0" />
            <p>{errorMsg}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================================= */}
      {/* HIGH-END WEEK CALENDAR ACCORDION */}
      {/* ============================================================= */}
      <div className="bg-slate-gray/15 border border-muted-teal/15 p-5 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            <span className="text-sm font-black text-white uppercase tracking-wider font-mono">
              {getWeekLabel()}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevWeek}
              className="p-2 rounded-xl bg-black/40 hover:bg-black/70 border border-muted-teal/10 hover:border-primary/40 text-white transition-all cursor-pointer"
              title={isRtl ? 'الأسبوع السابق' : 'Previous Week'}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextWeek}
              className="p-2 rounded-xl bg-black/40 hover:bg-black/70 border border-muted-teal/10 hover:border-primary/40 text-white transition-all cursor-pointer"
              title={isRtl ? 'الأسبوع التالي' : 'Next Week'}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 7-Days Calendar Track */}
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day, i) => {
            const dateStr = formatDateStr(day);
            const isSelected = dateFilter === dateStr;
            const isToday = formatDateStr(new Date()) === dateStr;
            const parsedDay = day.getDate();

            return (
              <button
                key={i}
                onClick={() => setDateFilter(dateStr)}
                className={`py-3.5 px-1 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer border relative select-none ${
                  isSelected
                    ? 'bg-primary text-black font-black border-transparent scale-[1.03] shadow-[0_4px_20px_rgba(196,214,0,0.35)]'
                    : 'bg-black/25 text-white hover:bg-black/50 border-muted-teal/10 hover:border-muted-teal/25'
                }`}
              >
                <span className={`text-[10px] uppercase font-mono tracking-tight ${isSelected ? 'text-black/80 font-black' : 'text-muted-teal/80'}`}>
                  {getDayName(day)}
                </span>
                <span className="text-lg font-black font-mono mt-1.5 leading-none">
                  {parsedDay}
                </span>

                {/* Little dot marker for today */}
                {isToday && (
                  <span className={`absolute bottom-1.5 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-black' : 'bg-primary'}`}></span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ============================================================= */}
      {/* SEPARATED ATTENDANCE VIEWS BASED ON PROP TYPE */}
      {/* ============================================================= */}
      
      {type === 'member' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Members Attendance List (Takes up 2 cols on large screen) */}
          <div className="lg:col-span-2">
            <div className="bg-slate-gray/25 border border-muted-teal/15 p-6 rounded-2xl shadow-xl flex flex-col relative">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-muted-teal/15 pb-4 mb-5">
                <div>
                  <h3 className="text-xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-primary" />
                    {isRtl ? 'كشف حضور الأعضاء بمفاتيح التبديل' : 'Interactive Members Attendance Sheet'}
                  </h3>
                  <p className="text-xs text-muted-teal mt-1">
                    {isRtl 
                      ? `قم بتبديل المفتاح لحضور أو غياب الأعضاء ليوم: (${dateFilter})`
                      : `Toggle the switches to mark members present or absent for date: (${dateFilter})`}
                  </p>
                </div>

                {/* Table Search Filter */}
                <div className="relative w-full md:w-72">
                  <Search className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-teal w-4 h-4" />
                  <input
                    id="attendance-members-sheet-search"
                    type="text"
                    placeholder={isRtl ? 'البحث بالاسم أو الهاتف...' : 'Filter by name or phone...'}
                    value={memberSearchTerm}
                    onChange={(e) => setMemberSearchTerm(e.target.value)}
                    className="w-full bg-black/40 border border-muted-teal/20 rounded-xl pl-9 pr-4 py-2 text-white text-xs focus:outline-none focus:border-primary placeholder-muted-teal/60"
                  />
                </div>
              </div>

              {/* Member Grid Checklist */}
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {searchedMembersForAttendance.length === 0 ? (
                  <div className="text-center py-12 bg-black/10 border border-dashed border-muted-teal/15 rounded-xl">
                    <UserX className="w-12 h-12 text-muted-teal/40 mx-auto mb-3" />
                    <p className="text-xs text-muted-teal italic">{t.noRecords}</p>
                  </div>
                ) : (
                  searchedMembersForAttendance.map(mem => {
                    const subscriptionNotStarted = dateFilter < mem.startDate;
                    const isPresent = mem.history.attendedDates.includes(dateFilter);
                    
                    return (
                      <div
                        key={mem.id}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-all ${
                          subscriptionNotStarted
                            ? 'bg-black/10 border-amber-500/10 opacity-60'
                            : isPresent
                            ? 'bg-primary/5 border-primary/20 shadow-inner'
                            : 'bg-black/15 border-muted-teal/10 hover:border-muted-teal/20'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs uppercase ${
                            isPresent ? 'bg-primary text-black' : 'bg-slate-gray/30 text-white'
                          }`}>
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-extrabold text-white">
                                {mem.fullName}
                              </p>
                              <span className={`text-[9px] font-mono px-2 py-0.5 rounded ${
                                mem.isActive ? 'bg-primary/10 text-primary' : 'bg-red-900/20 text-red-400'
                              }`}>
                                {mem.isActive ? t.activeStatus : t.inactiveStatus}
                              </span>
                            </div>
                            <p className="text-xs text-muted-teal font-mono mt-0.5 flex flex-wrap items-center gap-2">
                              <span>{mem.phone}</span>
                              <span className="text-white/40">•</span>
                              <span className="text-primary font-bold">
                                {t[mem.subscriptionType] || mem.subscriptionType}
                              </span>
                              <span className="text-white/40">•</span>
                              <span>{isRtl ? 'البدء:' : 'Starts:'} {mem.startDate}</span>
                            </p>
                          </div>
                        </div>

                        {/* Right hand layout: Toggle or pending lock */}
                        <div className="mt-4 sm:mt-0 flex items-center gap-4 border-t sm:border-t-0 border-muted-teal/10 pt-3 sm:pt-0 justify-between sm:justify-end">
                          {subscriptionNotStarted ? (
                            <div className="flex items-center gap-1.5 text-amber-500 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-lg text-xs font-bold font-mono">
                              <Lock className="w-3.5 h-3.5 animate-pulse" />
                              <span>
                                {isRtl 
                                  ? `الاشتراك لم يبدأ بعد (يبدأ ${mem.startDate})` 
                                  : `Pending subscription (Starts ${mem.startDate})`}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <span className={`text-xs font-mono font-bold ${isPresent ? 'text-primary' : 'text-muted-teal'}`}>
                                {isPresent 
                                  ? (isRtl ? 'حضور ✓' : 'Present ✓') 
                                  : (isRtl ? 'غياب ✗' : 'Absent ✗')}
                              </span>
                              
                              {/* Custom high-end toggle switch */}
                              <button
                                id={`switch-attendance-${mem.id}`}
                                onClick={() => handleToggleAttendance(mem)}
                                className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                  isPresent ? 'bg-primary' : 'bg-slate-gray/70 border-muted-teal/20'
                                }`}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                    isPresent 
                                      ? (isRtl ? '-translate-x-7' : 'translate-x-7') 
                                      : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
          
          {/* Member Attendance Stamp Archives */}
          <div className="lg:col-span-1">
            {renderLogsArchive()}
          </div>
        </div>
      )}

      {type === 'trainer' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Trainer Punch Portal */}
          <div className="bg-slate-gray/25 border border-muted-teal/15 p-6 rounded-2xl flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-white uppercase tracking-wider mb-2 border-b border-muted-teal/15 pb-2 flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-primary animate-pulse" />
                {t.trainerPunch}
              </h3>
              <p className="text-xs text-muted-teal mb-4">{t.selectTrainerToPunch}</p>

              <form onSubmit={handleTrainerPunch} className="space-y-4">
                {/* Trainer list selection */}
                <div>
                  <label className="block text-xs text-muted-teal uppercase font-mono mb-1 font-bold">{isRtl ? 'اسم مدرب الطاقم' : 'Trainer Name'}</label>
                  <select
                    id="fld-trainer-punch-select"
                    required
                    value={selectedTrainerId}
                    onChange={(e) => setSelectedTrainerId(e.target.value)}
                    className="w-full bg-black/40 border border-muted-teal/25 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary"
                  >
                    <option value="" className="bg-dark-charcoal text-muted-teal">
                      {isRtl ? '-- اختر مدرب لتسجيل الحضور --' : '-- Choose Staff Coach --'}
                    </option>
                    {availableTrainers.map(tr => (
                      <option key={tr.id} value={tr.id} className="bg-dark-charcoal text-white">
                        {tr.name} ({isRtl ? 'الوردية تبدأ:' : 'Shift starts:'} {tr.shiftStart})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Time stamp */}
                <div>
                  <label className="block text-xs text-muted-teal uppercase font-mono mb-1 font-bold">
                    {isRtl ? 'وقت تسجيل الحضور' : 'Check-In Clock Point'}
                  </label>
                  {role === 'admin' ? (
                    <input
                      id="fld-trainer-clock-time"
                      type="time"
                      required
                      value={trainerCheckInTime}
                      onChange={(e) => setTrainerCheckInTime(e.target.value)}
                      className="w-full bg-black/40 border border-muted-teal/25 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary font-mono"
                    />
                  ) : (
                    <div className="w-full bg-black/60 border border-primary/20 rounded-xl px-4 py-3 text-white text-sm font-mono flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
                        <span className="font-extrabold text-primary text-base">{trainerCheckInTime}</span>
                      </div>
                      <span className="text-[10px] bg-primary/10 text-primary border border-primary/25 px-2.5 py-1 rounded font-bold uppercase tracking-wider">
                        🔒 {isRtl ? 'بصمة تلقائية مؤمّنة' : 'Locked Live Stamp'}
                      </span>
                    </div>
                  )}
                  {role !== 'admin' && (
                    <p className="text-[10px] text-[#C4D600]/80 mt-2 leading-relaxed">
                      {isRtl 
                        ? '💡 نظام الحضور مؤمن: يتم تسجيل توقيت حضور الوردية تلقائياً من ساعة النظام والشبكة لتسجيل التأخير بدقة.' 
                        : '💡 Secure Tamper-Proof Loop: Check-in stamp is locked to the live system clock to log punctuality metrics cleanly.'}
                    </p>
                  )}
                </div>

                <button
                  id="btn-stamp-trainer-clockin"
                  type="submit"
                  disabled={!selectedTrainerId}
                  className="w-full px-4 py-3 bg-primary text-black font-extrabold text-xs uppercase tracking-widest rounded-xl hover:opacity-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Clock className="w-4 h-4 stroke-[2.5]" />
                  {t.clockIn}
                </button>
              </form>
            </div>
          </div>

          {/* Trainer Attendance Stamp Archives */}
          <div>
            {renderLogsArchive()}
          </div>
        </div>
      )}

    </div>
  );
}
