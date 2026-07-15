import React, { useState } from 'react';
import { Trainer, AttendanceRecord, ShiftSchedule } from '../types';
import { realmDB } from '../lib/realm';
import GymLogo from './GymLogo';
import { 
  UserPlus, 
  Trash2, 
  Edit2, 
  Printer, 
  DollarSign, 
  Clock, 
  UserCheck, 
  X, 
  Check, 
  AlertCircle,
  FileSpreadsheet,
  ToggleLeft,
  ToggleRight,
  Sparkles
} from 'lucide-react';
import { motion } from 'motion/react';

interface TrainersViewProps {
  role: 'admin' | 'male-trainer' | 'female-trainer';
  lang: 'ar' | 'en';
  trainers: Trainer[];
  attendance: AttendanceRecord[];
  schedules: ShiftSchedule[];
  onRefresh: () => void;
  authenticatedTrainerId?: string | null;
}

export default function TrainersView({ role, lang, trainers, attendance, schedules, onRefresh, authenticatedTrainerId }: TrainersViewProps) {
  const isRtl = lang === 'ar';
  const isAdmin = role === 'admin';

  // State Management
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTrainer, setEditingTrainer] = useState<Trainer | null>(null);
  const [selectedReportTrainer, setSelectedReportTrainer] = useState<Trainer | null>(null);
  const [trainerToDelete, setTrainerToDelete] = useState<Trainer | null>(null);

  // Form Field States
  const [formData, setFormData] = useState({
    name: '',
    gender: 'male' as 'male' | 'female',
    shiftStart: '08:00',
    shiftEnd: '16:00',
    salary: 3000 as number | '',
    salaryPaid: false,
    password: ''
  });

  const [searchTerm, setSearchTerm] = useState('');

  // Filtering trainers
  const filteredTrainers = trainers.filter(t => {
    // If logged in as specific trainer, restrict search and visibility to only themselves
    if (authenticatedTrainerId) {
      return t.id === authenticatedTrainerId;
    }

    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    
    // Non-admin trainers can only see themselves or their gender division
    if (role === 'male-trainer') return t.gender === 'male';
    if (role === 'female-trainer') return t.gender === 'female';
    return true;
  });

  // Calculate Financials - use filteredTrainers to only sum visible records
  const totalSalaries = filteredTrainers.reduce((sum, t) => sum + (t.salary || 0), 0);
  const totalPaidSalaries = filteredTrainers.filter(t => t.salaryPaid).reduce((sum, t) => sum + (t.salary || 0), 0);
  const outstandingSalaries = totalSalaries - totalPaidSalaries;

  // Handle Submit (Create / Edit)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const startParts = formData.shiftStart.split(':');
    const startMinutes = parseInt(startParts[0], 10) * 60 + parseInt(startParts[1], 10);

    const target: Trainer = {
      id: editingTrainer ? editingTrainer.id : `t-${Date.now()}`,
      name: formData.name.trim(),
      gender: formData.gender,
      shiftStart: formData.shiftStart,
      shiftEnd: formData.shiftEnd,
      targetShiftStartMinutes: startMinutes,
      salary: Number(formData.salary) || 0,
      salaryPaid: formData.salaryPaid,
      password: formData.password
    };

    realmDB.saveTrainer(target);
    setShowAddModal(false);
    setEditingTrainer(null);
    onRefresh();
  };

  // Trigger Edit Form
  const handleEdit = (trainer: Trainer) => {
    setEditingTrainer(trainer);
    setFormData({
      name: trainer.name,
      gender: trainer.gender,
      shiftStart: trainer.shiftStart,
      shiftEnd: trainer.shiftEnd,
      salary: trainer.salary ?? 3000,
      salaryPaid: !!trainer.salaryPaid,
      password: trainer.password || ''
    });
    setShowAddModal(true);
  };

  // Trigger Delete
  const handleDeleteTrigger = (trainer: Trainer) => {
    setTrainerToDelete(trainer);
  };

  const confirmDelete = () => {
    if (trainerToDelete) {
      realmDB.deleteTrainer(trainerToDelete.id);
      setTrainerToDelete(null);
      onRefresh();
    }
  };

  // Toggle Salary Paid Switch directly from the table
  const handleToggleSalary = (trainer: Trainer) => {
    const updated: Trainer = {
      ...trainer,
      salaryPaid: !trainer.salaryPaid
    };
    realmDB.saveTrainer(updated);
    onRefresh();
  };

  // Filter attendance for a specific trainer
  const getTrainerAttendance = (trainerId: string) => {
    return attendance.filter(a => a.targetId === trainerId && a.targetType === 'trainer');
  };

  // Filter classes/schedules assigned to trainer
  const getTrainerClasses = (trainerId: string) => {
    return schedules.filter(s => s.assignedTrainerId === trainerId);
  };

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-b border-muted-teal/15 pb-6">
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-wider flex items-center gap-3">
            <span className="w-2.5 h-8 bg-primary rounded-full inline-block"></span>
            {isRtl ? 'إدارة الكباتن والمدربين والرواتب' : 'Staff Coaches & Salaries'}
          </h2>
          <p className="text-sm text-muted-teal mt-1">
            {isRtl 
              ? 'شاشة متكاملة لإضافة كباتن الجيم ومتابعة مرتباتهم وحالة صرفها وطباعة مستند تقرير الأداء المالي والالتزام.' 
              : 'Add trainers, set monthly salaries, track payment logs, and print attendance summaries.'}
          </p>
        </div>

        {isAdmin && (
          <button
            id="btn-add-trainer-trigger"
            onClick={() => {
              setEditingTrainer(null);
              setFormData({
                name: '',
                gender: 'male',
                shiftStart: '08:00',
                shiftEnd: '16:00',
                salary: 3000,
                salaryPaid: false,
                password: ''
              });
              setShowAddModal(true);
            }}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-black font-extrabold uppercase tracking-widest text-xs rounded-xl shadow-lg hover:opacity-90 transition-all cursor-pointer shrink-0"
          >
            <UserPlus className="w-4 h-4 text-black stroke-[3]" />
            {isRtl ? 'إضافة مدرب جديد' : 'Register Coach'}
          </button>
        )}
      </div>

      {/* Financial Status Cards / Dashboard Widgets */}
      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-slate-gray/20 border border-muted-teal/10 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-muted-teal uppercase font-mono tracking-wider">{isRtl ? 'إجمالي رواتب الكباتن' : 'Total Staff Wage Budget'}</p>
              <h4 className="text-2xl font-black text-white mt-1">{totalSalaries} <span className="text-xs text-primary font-bold">{isRtl ? 'ج.م' : 'EGP'}</span></h4>
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-gray/20 border border-emerald-500/10 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-muted-teal uppercase font-mono tracking-wider">{isRtl ? 'الرواتب التي تم صرفها' : 'Total Salaries Paid'}</p>
              <h4 className="text-2xl font-black text-emerald-400 mt-1">{totalPaidSalaries} <span className="text-xs font-bold">{isRtl ? 'ج.م' : 'EGP'}</span></h4>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400">
              <Check className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-gray/20 border border-red-500/10 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-muted-teal uppercase font-mono tracking-wider">{isRtl ? 'الرواتب المتبقية والمعلقة' : 'Salaries Pending Dispatch'}</p>
              <h4 className="text-2xl font-black text-red-400 mt-1">{outstandingSalaries} <span className="text-xs font-bold">{isRtl ? 'ج.م' : 'EGP'}</span></h4>
            </div>
            <div className="w-12 h-12 rounded-xl bg-red-500/15 flex items-center justify-center text-red-400">
              <AlertCircle className="w-6 h-6" />
            </div>
          </div>
        </div>
      )}

      {/* Search Input Bar */}
      <div className="flex flex-col md:flex-row items-center gap-4 bg-slate-gray/15 p-4 rounded-xl border border-muted-teal/10">
        <div className="relative flex-1 w-full">
          <input
            id="fld-trainer-search"
            type="text"
            placeholder={isRtl ? "ابحث عن طريق اسم كابتن الدوام..." : "Search staff trainers directory..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/30 border border-muted-teal/25 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-primary placeholder-muted-teal/65"
          />
        </div>
      </div>

      {/* Trainer Data Roster */}
      <div className="bg-slate-gray/25 border border-muted-teal/15 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-inner-grid text-sm text-light-gray text-left rtl:text-right">
            <thead className="text-xs uppercase bg-black/25 text-muted-teal border-b border-muted-teal/15">
              <tr>
                <th scope="col" className="px-6 py-4">{isRtl ? 'اسم المدرب' : 'Coach Name'}</th>
                <th scope="col" className="px-6 py-4">{isRtl ? 'القسم' : 'Division'}</th>
                <th scope="col" className="px-6 py-4">{isRtl ? 'ساعات دوام الوردية' : 'Shift Timing / Slates'}</th>
                {isAdmin && <th scope="col" className="px-6 py-4">{isRtl ? 'المرتب الشهري' : 'Monthly Salary'}</th>}
                {isAdmin && <th scope="col" className="px-6 py-4 text-center">{isRtl ? 'حالة صرف الراتب' : 'Salary Dispatched'}</th>}
                <th scope="col" className="px-6 py-4 text-center">{isRtl ? 'أيام الحضور' : 'Days Attended'}</th>
                <th scope="col" className="px-6 py-4 text-center">{isRtl ? 'الخيارات والتقارير' : 'Actions & Reports'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-muted-teal/10">
              {filteredTrainers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-xs text-muted-teal italic bg-slate-gray/5">
                    {isRtl ? 'لا يوجد مدربين مدخلين حالياً لعمليات السيستم.' : 'No registered coaches found in catalog database.'}
                  </td>
                </tr>
              ) : (
                filteredTrainers.map((trainer) => {
                  const tAttendance = getTrainerAttendance(trainer.id);
                  const isPaid = !!trainer.salaryPaid;
                  return (
                    <tr key={trainer.id} className="hover:bg-black/10 transition-colors">
                      <td className="px-6 py-4 font-bold text-white max-w-[180px] truncate">
                        <span>{trainer.name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${trainer.gender === 'male' ? 'bg-blue-900/30 text-blue-300 border border-blue-500/20' : 'bg-pink-900/30 text-pink-300 border border-pink-500/20'}`}>
                          {trainer.gender === 'male' ? (isRtl ? 'قسم الرجال' : 'Male Sect') : (isRtl ? 'قسم النساء' : 'Female Sect')}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs flex items-center gap-1.5 pt-5">
                        <Clock className="w-3.5 h-3.5 text-muted-teal" />
                        <span>{trainer.shiftStart} - {trainer.shiftEnd}</span>
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4 font-bold text-white font-mono">
                          {trainer.salary ?? 3000} <span className="text-[10px] text-muted-teal">{isRtl ? 'ج.م' : 'EGP'}</span>
                        </td>
                      )}
                      {isAdmin && (
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              id={`toggle-salary-${trainer.id}`}
                              onClick={() => handleToggleSalary(trainer)}
                              className="focus:outline-none transition-transform active:scale-95 cursor-pointer"
                              title={isRtl ? 'اضغط لتغيير حالة صرف الراتب' : 'Click to toggle payment state'}
                            >
                              {isPaid ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-900/30 text-emerald-400 border border-emerald-500/25 text-xs font-extrabold select-none">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                  {isRtl ? 'تم الصرف ✓' : 'Dispatched ✓'}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-900/30 text-amber-400 border border-amber-500/25 text-xs font-extrabold select-none">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                  {isRtl ? 'قيد الانتظار ⏳' : 'Pending ⏳'}
                                </span>
                              )}
                            </button>
                          </div>
                        </td>
                      )}
                      <td className="px-6 py-4 text-center font-mono font-bold text-white">
                        {tAttendance.length}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {/* Trainer's Individual Report Button */}
                          <button
                            id={`btn-trainer-report-${trainer.id}`}
                            onClick={() => setSelectedReportTrainer(trainer)}
                            title={isRtl ? 'كشف حضور وتقرير أداء المدرب' : 'Trainer Stats & Clock Sheets'}
                            className="p-1.5 bg-slate-gray/40 border border-muted-teal/20 text-primary hover:bg-primary/20 hover:border-primary/40 rounded transition-all cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>{isRtl ? 'تقرير' : 'Report'}</span>
                          </button>

                          {isAdmin && (
                            <>
                              <button
                                id={`btn-edit-trainer-${trainer.id}`}
                                onClick={() => handleEdit(trainer)}
                                title={isRtl ? 'تعديل بيانات المدرب والراتب' : 'Edit parameters'}
                                className="p-1.5 bg-slate-gray/40 border border-muted-teal/20 text-sky-400 hover:bg-sky-500/15 rounded transition-all cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                id={`btn-del-trainer-${trainer.id}`}
                                onClick={() => handleDeleteTrigger(trainer)}
                                title={isRtl ? 'حذف المدرب نهائياً' : 'Terminate record'}
                                className="p-1.5 bg-slate-gray/40 border border-muted-teal/20 text-red-400 hover:bg-red-500/15 rounded transition-all cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Trainer Dialogue Overlay */}
      {showAddModal && isAdmin && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 flex items-center justify-center p-4" dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="bg-dark-charcoal border border-muted-teal max-w-lg w-full rounded-2xl p-6 shadow-2xl relative">
            <h3 className="text-lg font-black text-white uppercase tracking-wider mb-2 border-b border-muted-teal/10 pb-2">
              {editingTrainer ? (isRtl ? 'تعديل بيانات المدرب والراتب' : 'Edit Coach Profile') : (isRtl ? 'تسجيل مدرب جديد' : 'Register New Coach')}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs text-muted-teal uppercase font-mono mb-1 font-bold">{isRtl ? 'اسم المدرب الثلاثي:' : 'Coach Full Name:'}</label>
                <input
                  id="fld-trainer-name"
                  type="text"
                  required
                  placeholder={isRtl ? "كابتن أحمد خالد" : "e.g. Coach Ahmed Khaled"}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-black/40 border border-muted-teal/25 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-muted-teal uppercase font-mono mb-1 font-bold">{isRtl ? 'القسم الرياضي:' : 'Sporting Division:'}</label>
                  <select
                    id="fld-trainer-gender"
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'male' | 'female' })}
                    className="w-full bg-black/40 border border-muted-teal/25 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-primary"
                  >
                    <option value="male" className="bg-dark-charcoal">{isRtl ? 'رجال (Male Section)' : 'Male division'}</option>
                    <option value="female" className="bg-dark-charcoal">{isRtl ? 'نساء (Female Section)' : 'Female division'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-muted-teal uppercase font-mono mb-1 font-bold">{isRtl ? 'الراتب الشهري (ج.م):' : 'Monthly Wage (EGP):'}</label>
                  <input
                    id="fld-trainer-salary"
                    type="number"
                    required
                    min={0}
                    translate="no"
                    dir="ltr"
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: e.target.value === '' ? '' : parseInt(e.target.value, 10) })}
                    onFocus={(e) => e.target.select()}
                    className="w-full bg-black/40 border border-muted-teal/25 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none focus:border-primary font-mono text-center notranslate dir-ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-muted-teal uppercase font-mono mb-1 font-bold">{isRtl ? 'كلمة المرور الخاصة بالكابتن للدخول:' : 'Trainer Personal Passcode:'}</label>
                <input
                  id="fld-trainer-password"
                  type="text"
                  placeholder={isRtl ? 'أدخل كلمة مرور مثل 1234...' : 'e.g. 5566'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-black/40 border border-muted-[#C4D600]/25 rounded-xl px-4 py-2 text-white font-mono text-sm tracking-widest text-center focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-muted-teal uppercase font-mono mb-1 font-bold">{isRtl ? 'بداية الدوام الشفت:' : 'Shift Clock Start:'}</label>
                  <input
                    id="fld-trainer-start"
                    type="time"
                    required
                    value={formData.shiftStart}
                    onChange={(e) => setFormData({ ...formData, shiftStart: e.target.value })}
                    className="w-full bg-black/40 border border-muted-teal/25 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none focus:border-primary font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-teal uppercase font-mono mb-1 font-bold">{isRtl ? 'نهاية دوام الشفت:' : 'Shift Clock End:'}</label>
                  <input
                    id="fld-trainer-end"
                    type="time"
                    required
                    value={formData.shiftEnd}
                    onChange={(e) => setFormData({ ...formData, shiftEnd: e.target.value })}
                    className="w-full bg-black/40 border border-[#C4D600]/25 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none focus:border-primary font-mono"
                  />
                </div>
              </div>

              <div className="bg-slate-gray/10 p-3.5 border border-muted-teal/10 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">{isRtl ? 'تم تسليم الراتب لهذا الشهر؟' : 'Has cleared salary this month?'}</h4>
                  <p className="text-[10px] text-muted-teal mt-0.5">{isRtl ? 'سيتحكم في ميزانية الصرف الفوري والأرصدة' : 'Controls real-time budget balances'}</p>
                </div>
                <button
                  id="btn-toggle-salary-modal"
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, salaryPaid: !prev.salaryPaid }))}
                  className="text-primary hover:scale-105 active:scale-95 transition-all text-xs cursor-pointer font-black"
                >
                  {formData.salaryPaid ? (
                    <ToggleRight className="w-12 h-12 text-[#C4D600]" />
                  ) : (
                    <ToggleLeft className="w-12 h-12 text-muted-teal" />
                  )}
                </button>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-muted-teal/15 mt-4">
                <button
                  id="btn-cancel-trainer"
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingTrainer(null);
                  }}
                  className="px-4 py-2 bg-slate-gray text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-slate-gray/80 transition-all cursor-pointer"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  id="btn-save-trainer"
                  type="submit"
                  className="px-4 py-2 bg-primary text-black font-extrabold text-xs uppercase tracking-widest rounded-xl hover:opacity-95 transition-all cursor-pointer"
                >
                  {isRtl ? 'حفظ البيانات' : 'Save Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialogue */}
      {trainerToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 flex items-center justify-center p-4">
          <div className="bg-dark-charcoal border border-red-500/30 max-w-md w-full rounded-2xl p-6 shadow-2xl relative">
            <h3 className="text-lg font-black text-red-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="w-2.5 h-6 bg-red-500 rounded-full inline-block"></span>
              {isRtl ? 'حذف سجل الكابتن نهائياً؟' : 'Decommission Trainer Profile?'}
            </h3>
            <p className="text-sm text-light-gray mb-6 leading-relaxed">
              {isRtl 
                ? `هل أنت متأكد من إلغاء وحذف المدرب "${trainerToDelete.name}" من النظام بشكل نهائي وتحرير الراتب؟ سيتم إلغاء تعيينه من كافة حصة التدريبات كذلك.`
                : `Are you sure you want to permanently delete coach "${trainerToDelete.name}"? This action will remove their payroll entries and dissolve their agenda assignments.`}
            </p>
            <div className="flex justify-end gap-3 pt-4 border-t border-muted-teal/15">
              <button
                id="btn-cancel-del-tr"
                onClick={() => setTrainerToDelete(null)}
                className="px-4 py-2 bg-slate-gray text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-slate-gray/80 transition-all cursor-pointer"
              >
                {isRtl ? 'تراجع' : 'Abort'}
              </button>
              <button
                id="btn-confirm-del-tr"
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl hover:bg-red-500 transition-all cursor-pointer"
              >
                {isRtl ? 'نعم، احذف السجل' : 'Delete Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INDIVIDUAL TRAINER PRINT REPORT MODAL */}
      {selectedReportTrainer && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-3xl bg-dark-charcoal border-2 border-[#C4D600]/40 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto relative text-white">
            
            <button
              id="btn-close-tr-rep"
              onClick={() => setSelectedReportTrainer(null)}
              className="absolute top-5 right-5 hover:scale-110 p-2 text-muted-teal hover:text-white transition-all cursor-pointer bg-black/40 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Iframe sandbox printing instruction badge */}
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-3 no-print text-xs text-amber-200">
              <span className="text-base select-none shrink-0">💡</span>
              <div>
                <p className="font-bold mb-1">
                  {isRtl ? 'تنبيه لطباعة كشف المدرب:' : 'Notice for Printing:'}
                </p>
                <p className="leading-relaxed">
                  {isRtl 
                    ? 'لمحاكاة طباعة الكشف بنجاح، يرجى النقر أولاً على أيقونة "الفتح في علامة تبويب جديدة" (Open in New Tab) في الزاوية العلوية اليمنى من شريط المعاينة. تحظر متصفحات الإنترنت فظ كشف الطباعة من داخل الأطر ومصغرات المعاينة الحالية.' 
                    : 'Please open this application in a new browser tab first (using the "Open in new tab" icon on the top right) to initiate physical or PDF printing safely, as standard embedded viewports forbid window.print().'}
                </p>
              </div>
            </div>

            {/* Print Friendly Template Header */}
            <div id="trainer-printable-report" className="space-y-6 p-4 bg-[#192026] rounded-2xl border border-muted-teal/20">
              
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b-2 border-primary/30 pb-6">
                <div className="flex flex-col md:flex-row items-center gap-5 text-center md:text-left rtl:md:text-right">
                  <GymLogo size={75} className="shrink-0 drop-shadow-[0_4px_12px_rgba(196,214,0,0.25)] border-2 border-primary/20 rounded-2xl p-1 bg-black/10 print-logo-img" />
                  <div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-wider">
                      {isRtl ? 'تقرير الأداء والحضور والسجل المالي للمدرب' : 'Trainer Official Performance Sheet'}
                    </h2>
                    <p className="text-xs text-primary mt-1 font-mono tracking-widest">
                      {isRtl ? 'مستند مالي وإداري معتمد للصالة الرياضية' : 'OFFICIAL CERTIFICATE OF TRAINING STAFF LOGS'}
                    </p>
                  </div>
                </div>
                {/* Visual Indicator of Print Theme compatibility */}
                <div className="w-14 h-14 bg-primary rounded-xl flex items-center justify-center text-black font-black font-mono text-xl shrink-0">
                  {selectedReportTrainer.name.charAt(0).toUpperCase()}
                </div>
              </div>

              {/* Grid overview info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-black/30 p-4 rounded-xl border border-muted-teal/10">
                <div>
                  <p className="text-[10px] text-muted-teal uppercase font-mono">{isRtl ? 'اسم الموظف' : 'Employee Name'}</p>
                  <p className="text-sm font-black text-white mt-0.5">{selectedReportTrainer.name}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-teal uppercase font-mono">{isRtl ? 'قسم العمل' : 'Work Partition'}</p>
                  <p className="text-sm font-bold text-[#C4D600] mt-0.5">
                    {selectedReportTrainer.gender === 'male' ? (isRtl ? 'قسم الرجال' : 'Male Division') : (isRtl ? 'قسم النساء' : 'Female Division')}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-teal uppercase font-mono">{isRtl ? 'شفت الدوام المعتمد' : 'Allocated Shift Hours'}</p>
                  <p className="text-xs font-mono font-bold text-white mt-0.5">{selectedReportTrainer.shiftStart} - {selectedReportTrainer.shiftEnd}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-teal uppercase font-mono">{isRtl ? 'المرتب الشهري' : 'Monthly Wage'}</p>
                  <p className="text-sm font-black text-emerald-400 font-mono mt-0.5">{selectedReportTrainer.salary ?? 3000} {isRtl ? 'ج.م' : 'EGP'}</p>
                </div>
              </div>

              {/* Financial Status Summary */}
              <div className="bg-[#C4D600]/5 border border-[#C4D600]/20 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
                <div>
                  <h4 className="font-extrabold text-[#C4D600] text-sm">{isRtl ? 'تغذية السجل والرواتب لشهر مايو 2026' : 'Payroll dispatch logs for May 2026'}</h4>
                  <p className="text-light-gray/80 mt-0.5">
                    {isRtl ? 'مبني على البصمات الإلكترونية المسجلة والتعهد المادي.' : 'Synthesized automatically through local database audits.'}
                  </p>
                </div>
                <div>
                  {selectedReportTrainer.salaryPaid ? (
                    <span className="inline-block px-4 py-1.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500 font-black text-xs uppercase tracking-wider">
                      {isRtl ? 'تم صرف المستحقات والراتب بالكامل ✓' : 'Salary cleared & paid out ✓'}
                    </span>
                  ) : (
                    <span className="inline-block px-4 py-1.5 rounded-full bg-amber-950 text-amber-300 border border-amber-500 font-black text-xs uppercase tracking-wider">
                      {isRtl ? 'الراتب قيد المعالجة (لم يصرف بعد) ⏳' : 'Pending payment clearance ⏳'}
                    </span>
                  )}
                </div>
              </div>

              {/* Assigned Sessions lists / Schedules */}
              <div>
                <h4 className="font-extrabold text-white text-sm mb-2 border-b border-muted-teal/10 pb-1.5 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>{isRtl ? 'الصفوف الرياضية وجداول الحصص المكلف بها:' : 'Assigned Class / Shifting slots:'}</span>
                </h4>
                {getTrainerClasses(selectedReportTrainer.id).length === 0 ? (
                  <p className="text-xs text-muted-teal italic">{isRtl ? 'لم يتم إسناد جداول كلاسات رياضية لهذا المدرب حالياً.' : 'No sport classes assigned to this trainer yet.'}</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {getTrainerClasses(selectedReportTrainer.id).map(c => (
                      <div key={c.id} className="bg-black/20 p-3 rounded-lg border border-muted-teal/10 text-xs">
                        <p className="font-bold text-white mb-1">{c.className}</p>
                        <p className="text-muted-teal font-mono">
                          {isRtl ? 'كل يوم' : 'Weekly slot:'} {c.dayOfWeek === 6 ? (isRtl ? 'السبت' : 'Sat') : c.dayOfWeek === 0 ? (isRtl ? 'الأحد' : 'Sun') : c.dayOfWeek === 1 ? (isRtl ? 'الاثنين' : 'Mon') : c.dayOfWeek === 2 ? (isRtl ? 'الثلاثاء' : 'Tue') : c.dayOfWeek === 3 ? (isRtl ? 'الأربعاء' : 'Wed') : (isRtl ? 'الخميس' : 'Thu')} | {c.fromTime} - {c.toTime}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Verified Attendance Register */}
              <div className="space-y-2">
                <h4 className="font-extrabold text-white text-sm mb-2 border-b border-muted-teal/10 pb-1.5 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-primary" />
                  <span>{isRtl ? 'سجل وكشف أيام حضور المدرب:' : 'Authorized punch attendance timesheets:'}</span>
                </h4>
                {getTrainerAttendance(selectedReportTrainer.id).length === 0 ? (
                  <p className="text-xs text-muted-teal italic">{isRtl ? 'لا توجد ههناك أي تسجيلات حضور للمدرب في الذاكرة الحالية.' : 'No recorded attendance log entries found.'}</p>
                ) : (
                  <div className="bg-black/20 rounded-xl overflow-hidden border border-muted-teal/10">
                    <div className="max-h-[300px] overflow-y-auto">
                      <table className="w-full text-xs text-light-gray text-left rtl:text-right">
                        <thead className="bg-[#192026] text-muted-teal text-[10px] uppercase font-mono">
                          <tr>
                            <th className="px-4 py-2 border-b border-muted-teal/15">{isRtl ? 'تاريخ اليوم' : 'Date stamp'}</th>
                            <th className="px-4 py-2 border-b border-muted-teal/15">{isRtl ? 'وقت الدخول' : 'Punch In'}</th>
                            <th className="px-4 py-2 border-b border-muted-teal/15">{isRtl ? 'وقت خروج' : 'Punch Out'}</th>
                            <th className="px-4 py-2 border-b border-muted-teal/15">{isRtl ? 'ملاحظة الالتزام' : 'Compliance'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-muted-teal/10">
                          {getTrainerAttendance(selectedReportTrainer.id).map(att => (
                            <tr key={att.id}>
                              <td className="px-4 py-2 font-mono">{att.date}</td>
                              <td className="px-4 py-2 font-mono text-white font-bold">{att.checkInTime}</td>
                              <td className="px-4 py-2 font-mono">{att.checkOutTime || '--:--'}</td>
                              <td className="px-4 py-2">
                                {att.isLate ? (
                                  <span className="text-red-400 font-bold">{isRtl ? `تأخير ${att.lateMinutes} د` : `Late ${att.lateMinutes} m`}</span>
                                ) : (
                                  <span className="text-primary font-bold">{isRtl ? 'منضبط ✓' : 'On-Time'}</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Printable Manager & Coach Sign-off lines */}
              <div className="pt-20 border-t border-dashed border-muted-teal/30 grid grid-cols-2 gap-10 mt-12 text-center text-xs text-muted-teal">
                <div>
                  <p className="border-b border-muted-teal/40 pb-2 font-mono text-white font-bold">{selectedReportTrainer.name}</p>
                  <p className="mt-2 font-extrabold">{isRtl ? 'توقيع الموظف المدرب' : 'Employee Coach Sign-Off'}</p>
                </div>
                <div>
                  <p className="border-b border-muted-teal/40 pb-2 font-mono text-white font-bold">{isRtl ? 'معتمد من إدارة الجيم' : 'General Gym Manager'}</p>
                  <p className="mt-2 font-extrabold">{isRtl ? 'ختم وتوقيع المدير العام' : 'Authorized Signature & Seal'}</p>
                </div>
              </div>

            </div>

            {/* Print and Save Action Controls footer inside layout modal */}
            <div className="flex justify-end gap-3 pt-6 border-t border-muted-teal/10">
              <button
                id="btn-trigger-print-tr-report"
                onClick={() => {
                  window.print();
                }}
                className="px-6 py-3 bg-primary text-black font-black uppercase text-xs md:text-sm rounded-xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all cursor-pointer flex items-center gap-2"
              >
                <Printer className="w-5 h-5 stroke-[2.5]" />
                <span>{isRtl ? 'طباعة التقرير فوراً' : 'Print Hard Copy Reciept'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
