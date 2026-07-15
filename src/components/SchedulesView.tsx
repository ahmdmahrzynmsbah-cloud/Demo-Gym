import React, { useState, useRef } from 'react';
import { ShiftSchedule, Trainer } from '../types';
import { translations } from '../lib/translations';
import { 
  Plus, 
  Upload, 
  Trash2, 
  Eye, 
  Download, 
  X, 
  Check, 
  Image as ImageIcon, 
  CalendarRange, 
  Maximize2, 
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SchedulesViewProps {
  role: 'admin' | 'male-trainer' | 'female-trainer';
  lang: 'ar' | 'en';
  schedules: ShiftSchedule[];
  trainers: Trainer[];
  onRefresh: () => void;
}

export default function SchedulesView({ role, lang, schedules, trainers, onRefresh }: SchedulesViewProps) {
  const t = translations[lang];
  const isRtl = lang === 'ar';

  // Toggle Gender Section isolation tab
  const [selectedGenderTab, setSelectedGenderTab] = useState<'male' | 'female'>('male');
  
  // State for loaded schedule images from localStorage
  const [scheduleImgs, setScheduleImgs] = useState({
    male: localStorage.getItem('gym_schedule_image_male') || '',
    female: localStorage.getItem('gym_schedule_image_female') || ''
  });

  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeImage = selectedGenderTab === 'male' ? scheduleImgs.male : scheduleImgs.female;

  // File Upload Logic
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: 2MB limit to keep localStorage healthy
    if (file.size > 2.0 * 1024 * 1024) {
      alert(
        isRtl 
          ? 'تنبيه: حجم الصورة كبير جداً! اختر صورة أصغر من 2 ميجابايت لضمان سرعة واستقرار النظام.' 
          : 'File size too large! Please select an image under 2 megabytes.'
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      localStorage.setItem(`gym_schedule_image_${selectedGenderTab}`, base64);
      setScheduleImgs(prev => ({ ...prev, [selectedGenderTab]: base64 }));
    };
    reader.readAsDataURL(file);
  };

  // Image Delete Logic
  const handleImageDelete = () => {
    localStorage.setItem(`gym_schedule_image_${selectedGenderTab}`, '');
    setScheduleImgs(prev => ({ ...prev, [selectedGenderTab]: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setIsDeleteModalOpen(false);
  };

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-b border-muted-teal/15 pb-6">
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-wider flex items-center gap-3">
            <span className="w-2.5 h-8 bg-primary rounded-full inline-block"></span>
            {t.navSchedules}
          </h2>
          <p className="text-sm text-muted-teal mt-1">{t.scheduleTitle}</p>
        </div>

        {/* Upload Button for Admin ONLY in header if image exists */}
        {role === 'admin' && activeImage && (
          <button
            id="btn-replace-schedule-image"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-black font-extrabold uppercase tracking-widest text-xs rounded-xl shadow-lg hover:opacity-90 transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4 text-black stroke-[3]" />
            {isRtl ? 'تحديث الصورة' : 'Change Image'}
          </button>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        accept="image/*"
        className="hidden"
      />

      {/* Gender Tab Switching system */}
      <div className="bg-slate-gray/15 p-1.5 rounded-2xl border border-muted-teal/10 flex max-w-md">
        {/* Male section button */}
        <button
          id="tab-segment-male"
          onClick={() => setSelectedGenderTab('male')}
          className={`flex-1 py-3 text-sm font-extrabold uppercase tracking-wider rounded-xl transition-all ${
            selectedGenderTab === 'male' 
              ? 'bg-primary text-black shadow-lg' 
              : 'text-light-gray hover:text-white hover:bg-white/5 opacity-50'
          } cursor-pointer`}
        >
          {t.maleSection}
        </button>

        {/* Female section button */}
        <button
          id="tab-segment-female"
          onClick={() => setSelectedGenderTab('female')}
          className={`flex-1 py-3 text-sm font-extrabold uppercase tracking-wider rounded-xl transition-all ${
            selectedGenderTab === 'female' 
              ? 'bg-primary text-black shadow-lg' 
              : 'text-light-gray hover:text-white hover:bg-white/5 opacity-50'
          } cursor-pointer`}
        >
          {t.femaleSection}
        </button>
      </div>

      {/* Main Schedule Visual Frame */}
      <div className="bg-[#1b232c] border border-primary/10 rounded-3xl p-6 shadow-2xl relative">
        {activeImage ? (
          // Displays the High-Resolution uploaded image in an ultra-premium viewport
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#3E4E5B]/20 pb-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span className="text-xs font-mono text-muted-teal uppercase tracking-widest">
                  {isRtl ? 'صورة جدول المواعيد الرسمي' : 'Official Timetable & Schedules Image'}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {/* Fullscreen Button */}
                <button
                  id="btn-open-lightbox"
                  onClick={() => setIsLightboxOpen(true)}
                  className="p-2.5 bg-black/45 hover:bg-primary hover:text-black border border-muted-teal/15 hover:border-primary text-white rounded-xl transition duration-150 cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                  title={isRtl ? 'عرض بملء الشاشة' : 'View Fullscreen'}
                >
                  <Maximize2 className="w-4 h-4" />
                  <span>{isRtl ? 'عرض ملء الشاشة' : 'Fullscreen'}</span>
                </button>

                {/* Download Button */}
                <a
                  href={activeImage}
                  download={`DemoGym_${selectedGenderTab}_schedule.png`}
                  className="p-2.5 bg-black/45 hover:bg-primary hover:text-black border border-muted-teal/15 hover:border-primary text-white rounded-xl transition duration-150 cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                  title={isRtl ? 'تنزيل جدول المواعيد' : 'Download Schedule'}
                >
                  <Download className="w-4 h-4" />
                  <span>{isRtl ? 'تنزيل' : 'Download'}</span>
                </a>

                {/* Delete button (Admin Only) */}
                {role === 'admin' && (
                  <button
                    id="btn-delete-schedule-img"
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="p-2.5 bg-red-500/10 hover:bg-red-500 hover:text-white border border-red-500/30 text-red-400 rounded-xl transition duration-150 cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                    title={isRtl ? 'حذف الصورة نهائياً' : 'Delete Image'}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{isRtl ? 'احذف الصورة' : 'Delete'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Big Professional Display Canvas with modern glass-morphism backing */}
            <div className="relative group overflow-hidden rounded-2xl border border-muted-teal/15 bg-black/30 p-2 flex items-center justify-center max-h-[750px]">
              <img
                src={activeImage}
                alt={isRtl ? 'جدول مواعيد صالة ديمو جيم' : 'Demo Gym Schedule'}
                className="max-h-[700px] w-auto max-w-full rounded-xl object-contain shadow-2xl transition duration-300 group-hover:scale-[1.01] cursor-pointer"
                onClick={() => setIsLightboxOpen(true)}
              />
              <div 
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition duration-200 flex items-center justify-center cursor-pointer pointer-events-none"
              >
                <div className="bg-primary text-black px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg">
                  <Maximize2 className="w-4 h-4 stroke-[2.5]" />
                  <span>{isRtl ? 'انقر لتكبير الصورة وتصفحها بدقة عالية' : 'Click to View Fullscreen Image'}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Beautiful dropzone or placeholder when no image is uploaded yet
          <div className="flex flex-col items-center justify-center text-center p-12 min-h-[450px]">
            <div className="p-6 bg-primary/5 text-primary border border-primary/10 rounded-full mb-6">
              <CalendarRange className="w-16 h-16 opacity-80" />
            </div>

            <h3 className="text-xl font-bold text-white uppercase tracking-wider mb-2">
              {isRtl 
                ? (selectedGenderTab === 'male' ? 'جدول مواعيد قسم الرجال غير متوفر' : 'جدول مواعيد قسم السيدات غير متوفر')
                : (selectedGenderTab === 'male' ? 'Male Section Schedule Not Available' : 'Female Section Schedule Not Available')}
            </h3>

            <p className="text-sm text-muted-teal max-w-md mx-auto mb-8 leading-relaxed">
              {isRtl 
                ? 'لم يتم رفع صورة المخطط والمواعيد الرسمية لهذا القسم بعد. يمكنك تصفح التحديثات فور قيام الإدارة برفع الجدول المحدث.'
                : 'No official schedule image has been uploaded for this section yet. You can check back once the administration uploads the latest timetable.'}
            </p>

            {role === 'admin' ? (
              // Easy upload CTA for admins
              <div className="space-y-4">
                <button
                  id="btn-upload-schedule-initial"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 px-8 py-3 bg-primary text-black font-black uppercase tracking-widest text-xs rounded-xl shadow-lg hover:opacity-95 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-black stroke-[3]" />
                  {isRtl ? 'رفع صورة جدول المواعيد الآن' : 'Upload Schedule Image Now'}
                </button>
                <p className="text-[10px] text-muted-teal font-mono uppercase tracking-wider">
                  {isRtl ? 'يدعم صيغ PNG, JPG, JPEG (الحد الأقصى 2 ميجابايت بدقة عالية)' : 'Supports PNG, JPG, JPEG (Max 2MB in high resolution)'}
                </p>
              </div>
            ) : (
              // Friendly warning for coach with lock icon
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400 bg-amber-400/10 px-4 py-2 rounded-xl border border-amber-400/20">
                <Lock className="w-4 h-4 shrink-0" />
                <span>
                  {isRtl 
                    ? 'خاصية تعديل ورفع جداول المواعيد مخصصة لمدير النظام والجيم فقط.' 
                    : 'Modifying and uploading timetables is reserved for the Gym Administrator only.'}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lightbox High-Resolution Full-Screen Modal */}
      <AnimatePresence>
        {isLightboxOpen && activeImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4 cursor-zoom-out"
            onClick={() => setIsLightboxOpen(false)}
          >
            {/* Close Button UI */}
            <div className="absolute top-4 right-4 left-4 flex justify-between items-center pointer-events-none">
              <span className="text-white text-xs font-mono font-bold bg-black/60 px-4 py-2 rounded-full uppercase tracking-wider">
                {isRtl 
                  ? `عرض المواعيد: قسم ${selectedGenderTab === 'male' ? 'الرجال' : 'السيدات'}` 
                  : `Schedule View: ${selectedGenderTab === 'male' ? 'Male' : 'Female'}`}
              </span>
              <button
                id="btn-close-lightbox"
                className="p-2.5 bg-black/60 hover:bg-red-600 text-white hover:text-white rounded-full transition duration-150 cursor-pointer pointer-events-auto"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsLightboxOpen(false);
                }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scale Image block */}
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="max-w-[95dvw] max-h-[90dvh] overflow-auto flex items-center justify-center p-2 rounded-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={activeImage}
                alt={isRtl ? 'المواعيد' : 'Schedules'}
                className="max-h-[85dvh] max-w-full w-auto rounded-lg object-contain shadow-2xl-strong bg-dark-charcoal cursor-default"
              />
            </motion.div>

            {/* Quick Helper bottom notice */}
            <p className="text-white/40 text-[11px] font-mono mt-4 pointer-events-none uppercase tracking-wider">
              {isRtl ? 'انقر في أي مكان في الخلفية للعودة للنظام' : 'Click anywhere on the background to return to system'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Confirmation Dialog */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-[#1b232c] border border-red-500/25 max-w-sm w-full rounded-2xl p-6 shadow-2xl space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 text-red-400">
                <Trash2 className="w-5 h-5 shrink-0" />
                <h3 className="text-base font-black uppercase tracking-wider">
                  {isRtl ? 'حذف صورة المواعيد الصالة' : 'Delete Timetable Image'}
                </h3>
              </div>

              <p className="text-xs text-muted-teal leading-relaxed">
                {isRtl 
                  ? 'هل أنت متأكد من رغبتك في حذف وإزالة صورة جدول المواعيد لهذا القسم بالكامل؟ هذا الإجراء لا يمكن إلغاؤه.'
                  : 'Are you sure you want to permanently delete the timetable image for this section? This action cannot be undone.'}
              </p>

              <div className="flex gap-2.5 justify-end">
                <button
                  id="btn-confirm-delete-cancel"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2 bg-black/40 hover:bg-white/5 border border-muted-teal/15 hover:border-muted-teal/25 text-light-gray hover:text-white rounded-xl text-[11px] font-bold uppercase transition duration-150 cursor-pointer"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  id="btn-confirm-delete-ok"
                  onClick={handleImageDelete}
                  className="px-4.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[11px] font-bold uppercase transition duration-150 cursor-pointer"
                >
                  {isRtl ? 'نعم، احذف الصورة' : 'Yes, Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
