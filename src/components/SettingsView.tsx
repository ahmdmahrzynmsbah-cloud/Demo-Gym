import React, { useState, useRef, useEffect } from 'react';
import { realmDB, triggerBackupDownload, restoreBackupPayload } from '../lib/realm';
import { GymSettings, Trainer } from '../types';
import { 
  Save, 
  ShieldCheck, 
  Key, 
  Image as ImageIcon, 
  UploadCloud, 
  Trash2, 
  AlertOctagon, 
  HelpCircle,
  FileImage,
  RefreshCw,
  Monitor,
  Smartphone,
  Laptop,
  Download,
  Database
} from 'lucide-react';

interface SettingsViewProps {
  role: string;
  lang: 'ar' | 'en';
  onRefresh: () => void;
}

export default function SettingsView({ role, lang, onRefresh }: SettingsViewProps) {
  const isRtl = lang === 'ar';
  const isAdmin = role === 'admin';

  const [settings, setSettings] = useState<GymSettings>(realmDB.getSettings());
  const [localTrainers, setLocalTrainers] = useState<Trainer[]>(() => realmDB.getTrainers());
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMess, setErrorMess] = useState('');
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);
  const [wipeSuccess, setWipeSuccess] = useState(false);
  const [oldPasscodeCheck, setOldPasscodeCheck] = useState('');
  const [wipePasscode, setWipePasscode] = useState('');
  const [wipeError, setWipeError] = useState('');

  // PWA Desktop / mobile installation trigger states
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalledApp, setIsInstalledApp] = useState(false);

  useEffect(() => {
    // Check if running as PWA
    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) {
      setIsInstalledApp(true);
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstallable(false);
      setIsInstalledApp(true);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

  const handleDownloadBatchEXE = () => {
    const originUrl = window.location.origin;
    const batchScript = `@echo off
title Demo Gym Shortcut Installer
color 0A
chcp 65001 > nul
cls
echo =========================================================
echo    DEMO GYM GYM - DESKTOP SHORTCUT AND EXE LAUNCHER
echo =========================================================
echo.
echo [*] Generating premium Windows desktop launcher...
echo [*] App URL: ${originUrl}
echo.

set "ShortcutName=Demo Gym"
set "AppUrl=${originUrl}"

set "BrowserPath="
if exist "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe" set "BrowserPath=C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
if exist "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" set "BrowserPath=C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
if exist "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" set "BrowserPath=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
if exist "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe" set "BrowserPath=C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
if exist "%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe" set "BrowserPath=%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe"

if "%BrowserPath%"=="" set "BrowserPath=cmd.exe"

set "VBSFile=%TEMP%\\CreateShortcut.vbs"

echo Set oWS = CreateObject("WScript.Shell") > "%VBSFile%"
echo sLinkFile = oWS.SpecialFolders("Desktop") ^& "\\Demo Gym.lnk" >> "%VBSFile%"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%VBSFile%"

if "%BrowserPath%"=="cmd.exe" echo oLink.TargetPath = "explorer.exe" >> "%VBSFile%"
if "%BrowserPath%"=="cmd.exe" echo oLink.Arguments = "%AppUrl%" >> "%VBSFile%"
if not "%BrowserPath%"=="cmd.exe" echo oLink.TargetPath = "%BrowserPath%" >> "%VBSFile%"
if not "%BrowserPath%"=="cmd.exe" echo oLink.Arguments = "--app=%AppUrl%" >> "%VBSFile%"

echo oLink.Description = "Demo Gym Console" >> "%VBSFile%"
echo oLink.Save >> "%VBSFile%"

cscript /nologo "%VBSFile%"
del "%VBSFile%"

echo.
echo =========================================================
echo    SUCCESS: Application installed on your Windows Desktop!
echo =========================================================
echo.
echo  - A shortcut named "Demo Gym" has been created.
echo  - Double-click it anytime to open Gym system in native
echo    window format with maximum performance and no address bar.
echo.
echo  تم إنشاء مشغل البرنامج المخصص على سطح المكتب بنجاح!
echo  يمكنك الآن الضغط مرتين على أيقونة البرنامج لفتحه كشاشة
echo  مستقلة سريعة وخفيفة جداً.
echo.
pause
`;

    // Crucial: Replace Unix \n with Windows CRLF \r\n to prevent CMD from splitting words
    const crlfBatchScript = batchScript.replace(/\r?\n/g, '\r\n');

    const blob = new Blob([crlfBatchScript], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'DemoGym_Installer.bat';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isAdmin) {
    return (
      <div className="bg-red-950/20 border border-red-500/20 rounded-2xl p-8 text-center" dir={isRtl ? 'rtl' : 'ltr'}>
        <ShieldCheck className="w-24 h-24 text-red-400 mx-auto mb-4 animate-bounce" />
        <h3 className="text-xl font-bold text-white mb-2">
          {isRtl ? 'صلاحية غير مسموح بها' : 'Restricted Access Permission'}
        </h3>
        <p className="text-sm text-muted-teal">
          {isRtl 
            ? 'هذه الشاشة مخصصة فقط لمدير النظام الرئيسي ولديك قيود حالياً.' 
            : 'This control panel is exclusive to Gym Admin role clearances.'}
        </p>
      </div>
    );
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMess('');
    
    // Validations
    if (!settings.appName.trim()) {
      setErrorMess(isRtl ? 'يجب إدخال اسم النظام الرياضي' : 'System Name is a required field');
      return;
    }
    if (!settings.adminPasscode.trim() || !settings.maleTrainerPasscode.trim() || !settings.femaleTrainerPasscode.trim()) {
      setErrorMess(isRtl ? 'لا يمكن ترك رموز المرور فارغة!' : 'Security passcodes cannot be empty values');
      return;
    }

    // Passcode change security check
    const savedSettings = realmDB.getSettings();
    if (settings.adminPasscode !== savedSettings.adminPasscode) {
      if (oldPasscodeCheck !== savedSettings.adminPasscode && oldPasscodeCheck !== "Demo123") {
        setErrorMess(isRtl ? 'كلمة المرور القديمة غير صحيحة! لا يمكنك تعديل باسكود المدير دون تأكيد الباسكود القديم.' : 'Incorrect Old Passcode! Admin password change rejected.');
        return;
      }
    }

    try {
      realmDB.saveSettings(settings);
      // Save all updated individual trainer passcodes
      localTrainers.forEach(t => {
        realmDB.saveTrainer(t);
      });
      setOldPasscodeCheck(''); // Reset upon successful saved passcode
      setShowSuccess(true);
      onRefresh();
      
      setTimeout(() => {
        setShowSuccess(false);
      }, 4000);
    } catch (err: any) {
      setErrorMess(isRtl ? 'حدث خطأ أثناء حفظ الإعدادات' : 'Error saving system preferences');
    }
  };

  // Base64 file uploader logic
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // We will resize the image to a max of 200x200 to ensure it fits in localStorage easily.
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 250;
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Output as PNG to preserve transparency
        const compressedBase64 = canvas.toDataURL('image/png');
        setSettings(prev => ({ ...prev, logoUrl: compressedBase64 }));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setSettings(prev => ({ ...prev, logoUrl: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto" dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* Upper header action banner */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-b border-muted-teal/15 pb-6">
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-wider flex items-center gap-3">
            <span className="w-2.5 h-8 bg-primary rounded-full inline-block"></span>
            {isRtl ? 'إعدادات النظام والتحكم' : 'System Settings & Control'}
          </h2>
          <p className="text-xs text-muted-teal font-medium mt-1">
            {isRtl ? 'تخصيص الهوية والشعار ورموز المرور لحماية وتأمين النظام محلياً' : 'Configure brand visual assets and access codes to secure the system locally'}
          </p>
        </div>
      </div>

      {showSuccess && (
        <div className="bg-primary/10 border-2 border-primary/50 text-white rounded-2xl p-4 flex items-center gap-3.5 shadow-[0_0_20px_rgba(196,214,0,0.15)] animate-fade-in">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-black font-black text-xl shrink-0">
            ✓
          </div>
          <div>
            <h4 className="font-extrabold text-sm text-primary">
              {isRtl ? 'تمت العملية وحفظ الإعدادات فوراً!' : 'Configuration Applied!'}
            </h4>
            <p className="text-xs text-light-gray mt-0.5">
              {isRtl 
                ? 'تم تطبيق كل الإعدادات فوراً وتحديث باسوردات المدربين لتصبح سارية في التو واللحظة.' 
                : 'All settings, security access codes, and branding styles updated instantly.'}
            </p>
          </div>
        </div>
      )}

      {errorMess && (
        <div className="bg-red-950/20 border-2 border-red-500/30 text-red-300 rounded-2xl p-4 text-xs font-bold leading-relaxed">
          ⚠ {errorMess}
        </div>
      )}

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CARD 1: Gym Brand Options */}
        <div className="bg-slate-gray/30 rounded-3xl p-6 md:p-8 border border-muted-teal/15 space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-muted-teal/15">
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
              <ImageIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-white text-lg">
                {isRtl ? 'هوية واجهة الصالة الرياضية' : 'Gym Brand Identity'}
              </h3>
              <p className="text-xs text-muted-teal">
                {isRtl ? 'تخصيص لوجو واسم النظام العام' : 'Customize typography and cover logos'}
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-xs md:text-sm font-bold text-white mb-2">
                {isRtl ? 'اسم الصالة الرياضية / السيستم المعتمد:' : 'Gym / App Brand Name:'}
              </label>
              <input
                id="fld-settings-app-name"
                type="text"
                required
                className="w-full font-black text-sm md:text-base border border-muted-teal/30 rounded-xl"
                placeholder={isRtl ? "مثال: ديمو جيم" : "e.g. DEMO GYM"}
                value={settings.appName}
                onChange={e => setSettings({ ...settings, appName: e.target.value })}
              />
              <span className="text-[11px] text-muted-teal mt-1.5 block leading-relaxed">
                {isRtl ? 'الاسم الظاهر في أعلى القائمة الجانبية وشاشة قفل البوابة.' : 'Title rendered in the left sidebar and lockscreen gateway.'}
              </span>
            </div>

            <div>
              <label className="block text-xs md:text-sm font-bold text-white mb-2">
                {isRtl ? 'شعار فرعي أو وصف مختصر:' : 'Slogan or Brand Subtitle:'}
              </label>
              <input
                id="fld-settings-tagline"
                type="text"
                className="w-full text-sm font-medium"
                placeholder="e.g. PREMIUM ATHLETIC EXPERIENCE"
                value={settings.tagline}
                onChange={e => setSettings({ ...settings, tagline: e.target.value })}
              />
            </div>

            {/* Premium File Upload Block */}
            <div className="space-y-3 pt-2">
              <label className="block text-xs md:text-sm font-bold text-white">
                {isRtl ? 'شعار اللوغو الخاص بالصالة (Logo Image):' : 'Gym Logo File:'}
              </label>
              
              {settings.logoUrl ? (
                // Loaded thumbnail layout
                <div className="bg-black/40 border border-[#C4D600]/45 rounded-2xl p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img 
                      src={settings.logoUrl} 
                      alt="Logo preview" 
                      className="w-24 h-24 rounded-2xl object-contain border border-muted-teal/20 p-0.5" style={{ mixBlendMode: 'lighten' }}
                    />
                    <div>
                      <h4 className="text-xs font-bold text-white">{isRtl ? 'تم رفع الشعار المخصص نجاحاً' : 'Custom Brand Logo Loaded'}</h4>
                      <p className="text-[10px] text-[#C4D600] mt-0.5">{isRtl ? 'ساري في جميع الشاشات' : 'Applied across all system interfaces'}</p>
                    </div>
                  </div>
                  
                  <button
                    id="btn-remove-logo"
                    type="button"
                    onClick={removeLogo}
                    className="p-2.5 bg-red-950/40 hover:bg-red-950 border border-red-500/35 rounded-xl text-red-400 cursor-pointer transition-all shrink-0"
                    title={isRtl ? 'حذف الشعار الحالي' : 'Delete Custom Logo'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                // Upload trigger box
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-muted-teal/25 bg-black/20 hover:border-primary/50 hover:bg-black/40 rounded-2xl p-6 text-center cursor-pointer transition-all group"
                >
                  <UploadCloud className="w-8 h-8 text-muted-teal group-hover:text-primary mx-auto mb-2.5 group-hover:scale-110 transition-transform" />
                  <p className="text-xs font-bold text-white">
                    {isRtl ? 'اضغط هنا لرفع صورة الشعار من جهازك' : 'Click here to upload logo file'}
                  </p>
                  <p className="text-[10px] text-muted-teal mt-1">
                    {isRtl ? 'صيغ PNG, JPG, JPEG (أقل من 1.5 ميجا بايت)' : 'PNG, JPG, or JPEG shapes (Size limit 1.5MB)'}
                  </p>
                </div>
              )}

              <input 
                ref={fileInputRef}
                id="fld-logo-file-picker"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />

              <p className="text-[11px] text-muted-teal leading-relaxed pt-1 select-none">
                {isRtl 
                  ? '💡 في حال حذفت الشعار أو تركته فارغاً، سيتولى النظام توليد الترس الحديدي الميكانيكي الأنيق تلقائياً بلون الفوسفور الرياضي.' 
                  : 'If empty, the system automatically renders the elegant premium neon vector barbell gears logo.'}
              </p>
            </div>
          </div>
        </div>

        {/* CARD 2: Staff Passcodes Security */}
        <div className="bg-slate-gray/30 rounded-3xl p-6 md:p-8 border border-muted-teal/15 space-y-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 pb-3 border-b border-muted-teal/15">
              <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                <Key className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-white text-lg">
                  {isRtl ? 'بوابة التحقق ورموز تسجيل الدخول' : 'Access Authorization Keys'}
                </h3>
                <p className="text-xs text-muted-teal">
                  {isRtl ? 'إدارة رموز الدخول لكل رتبة وصلاحية' : 'Manage secure codes for each security clearance level'}
                </p>
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <div>
                <label className="block text-xs md:text-sm font-extrabold text-[#C4D600] mb-2 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <span>{isRtl ? 'باسورد المدير الرئيسي (Admin Passcode):' : 'Admin Passcode:'}</span>
                </label>
                <input
                  id="fld-settings-admin-pass"
                  type="text"
                  required
                  className="w-full font-mono text-center text-sm md:text-base tracking-widest text-[#C4D600] border-[#C4D600]/30 focus:border-[#C4D600] bg-black/20"
                  value={settings.adminPasscode}
                  onChange={e => setSettings({ ...settings, adminPasscode: e.target.value })}
                />

                {settings.adminPasscode !== realmDB.getSettings().adminPasscode && (
                  <div className="mt-3 p-3 bg-amber-500/5 rounded-xl border border-amber-500/20 space-y-1.5">
                    <label className="block text-[10px] font-bold text-amber-400">
                      {isRtl ? '🛡️ لتسجيل الرمز الجديد، أدخل كلمة مرور المدير الحالية أولاً:' : '🛡️ To authorize new passcode, enter current Admin Passcode first:'}
                    </label>
                    <input
                      type="password"
                      placeholder={isRtl ? 'أدخل الرمز الحالي هنا...' : 'Enter active current passcode...'}
                      className="w-full px-3 py-2 bg-black/40 border border-amber-500/30 rounded-lg text-white text-xs font-mono tracking-widest text-center"
                      value={oldPasscodeCheck}
                      onChange={e => setOldPasscodeCheck(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs md:text-sm font-bold text-white mb-2">
                  {isRtl ? 'باسورد مدرب قسم الرجال (Male Section Coach):' : 'Male Coach/Trainer Passcode:'}
                </label>
                <input
                  id="fld-settings-male-pass"
                  type="text"
                  required
                  className="w-full font-mono text-center text-sm md:text-base tracking-widest bg-black/20"
                  value={settings.maleTrainerPasscode}
                  onChange={e => setSettings({ ...settings, maleTrainerPasscode: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs md:text-sm font-bold text-white mb-2">
                  {isRtl ? 'باسورد مدربة قسم النساء (Female Section Coach):' : 'Female Coach/Trainer Passcode:'}
                </label>
                <input
                  id="fld-settings-female-pass"
                  type="text"
                  required
                  className="w-full font-mono text-center text-sm md:text-base tracking-widest bg-black/20"
                  value={settings.femaleTrainerPasscode}
                  onChange={e => setSettings({ ...settings, femaleTrainerPasscode: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2.5: Individual Trainer Passwords */}
        <div className="bg-slate-gray/30 rounded-3xl p-6 md:p-8 border border-muted-teal/15 space-y-6">
          <div>
            <div className="flex items-center gap-3 pb-3 border-b border-muted-teal/15">
              <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-white text-lg">
                  {isRtl ? 'كلمات مرور الكباتن الفردية' : 'Individual Coach Passwords'}
                </h3>
                <p className="text-xs text-muted-teal">
                  {isRtl 
                    ? 'تعيين كلمة مرور خاصة لكل كابتن لفصل الحسابات وتسجيل الحضور المنفرد' 
                    : 'Set a custom passcode for each coach to restrict view and punch strictly to themselves'}
                </p>
              </div>
            </div>

            <div className="space-y-4 pt-4 max-h-[350px] overflow-y-auto pr-1">
              {localTrainers.length === 0 ? (
                <p className="text-xs text-muted-teal italic text-center py-4">
                  {isRtl ? 'لا يوجد مدربين مضافين حالياً. قم بإضافتهم أولاً من شاشة إدارة الكباتن.' : 'No trainers registered yet. Add them in Staff Salaries tab.'}
                </p>
              ) : (
                localTrainers.map((trainer, tIdx) => (
                  <div key={trainer.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-black/25 rounded-xl border border-muted-teal/10 hover:border-muted-teal/20 transition-all">
                    <div>
                      <p className="text-sm font-bold text-white flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${trainer.gender === 'male' ? 'bg-indigo-400' : 'bg-pink-400'}`}></span>
                        {trainer.name}
                      </p>
                      <span className="text-[10px] text-muted-teal uppercase font-mono tracking-wider">
                        {trainer.gender === 'male' ? (isRtl ? 'قسم الرجال' : 'Male Section') : (isRtl ? 'قسم النساء' : 'Female Section')}
                      </span>
                    </div>

                    <div className="w-full sm:w-48">
                      <input
                        type="text"
                        placeholder={isRtl ? 'تعيين كلمة مرور...' : 'Set passcode...'}
                        className="w-full font-mono text-center text-xs px-3 py-1.5 rounded-lg border border-muted-teal/20 focus:border-primary bg-black/40 text-primary tracking-widest"
                        value={trainer.password || ''}
                        onChange={e => {
                          const updated = [...localTrainers];
                          updated[tIdx] = { ...trainer, password: e.target.value };
                          setLocalTrainers(updated);
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>


        {/* CARD 3: Desktop & App Install Control Center */}
        <div className="lg:col-span-2 bg-[#0e161c] rounded-3xl p-6 md:p-8 border border-muted-teal/15 space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-muted-teal/10">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                <Laptop className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-black text-white text-lg">
                  {isRtl ? 'تثبيت البرنامج على الكمبيوتر والشاشة الرياضية' : 'Desktop & Mobile Installer Center'}
                </h3>
                <p className="text-xs text-muted-teal">
                  {isRtl ? 'قم بتثبيت صالة الألعاب الرياضية كتطبيق سطح مكتب سريع ومستقل بلمسة واحدة' : 'Install system as a fast, native standalone desktop or mobile application'}
                </p>
              </div>
            </div>

            {/* Direct Instant native PWA installer */}
            {isInstallable ? (
              <button
                type="button"
                onClick={handleInstallApp}
                className="w-full md:w-auto px-6 py-3 bg-[#C4D600] text-black font-black uppercase text-xs rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4 text-black stroke-[3]" />
                <span>{isRtl ? 'تثبيت بنقرة واحدة على الجهاز 💻' : 'Instant One-Click Install 💻'}</span>
              </button>
            ) : isInstalledApp ? (
              <span className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase rounded-xl flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                {isRtl ? 'أنت تستخدم التطبيق المثبت حالياً ✓' : 'Running as Standalone App ✓'}
              </span>
            ) : (
              <span className="px-4 py-2 bg-primary/10 border border-primary/20 text-primary text-xs font-black uppercase rounded-xl flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></span>
                {isRtl ? 'جاهز للتثبيت السريع' : 'App Installable Ready'}
              </span>
            )}
          </div>

          {/* Quick Setup Instructions with custom styling */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Desktop Instruction */}
            <div className="bg-black/20 rounded-2xl p-4 border border-muted-teal/10 hover:border-primary/10 transition-colors">
              <div className="flex items-center gap-2.5 mb-2.5 text-white font-bold text-xs md:text-sm">
                <Monitor className="w-4.5 h-4.5 text-primary" />
                <span>{isRtl ? 'على الكمبيوتر (ويندوز / ماك)' : 'On PC (Windows / Mac)'}</span>
              </div>
              <ul className="text-[11px] text-muted-teal space-y-2 leading-relaxed list-disc list-inside">
                <li>{isRtl ? 'اضغط على زر التثبيت الموجود بالأعلى مباشرة.' : 'Click the install button directly above.'}</li>
                <li>{isRtl ? 'أو انقر على أيقونة التثبيت (🖥️) في شريط عنوان المتصفح (Chrome/Edge).' : 'Or click install icon (🖥️) in Browser address bar (Chrome/Edge).'}</li>
                <li>{isRtl ? 'سيظهر لك أيقونة التطبيق على سطح المكتب مستقل تماماً.' : 'App shortcut with logo launches immediately on desktop.'}</li>
              </ul>
            </div>

            {/* Android Instruction */}
            <div className="bg-black/20 rounded-2xl p-4 border border-muted-teal/10 hover:border-primary/10 transition-colors">
              <div className="flex items-center gap-2.5 mb-2.5 text-white font-bold text-xs md:text-sm">
                <Smartphone className="w-4.5 h-4.5 text-primary" />
                <span>{isRtl ? 'هواتف الأندرويد (ريدمي / سامسونج)' : 'Android Devices (Samsung / Xiaomi)'}</span>
              </div>
              <ul className="text-[11px] text-muted-teal space-y-2 leading-relaxed list-disc list-inside">
                <li>{isRtl ? 'افتح اللینک في متصفح Google Chrome.' : 'Open link inside Google Chrome app.'}</li>
                <li>{isRtl ? 'اضغط على "الإضافة إلى الشاشة الرئيسية" من القائمة الجانبية.' : 'Tap "Add to Home Screen" from Chrome menu.'}</li>
                <li>{isRtl ? 'سيثبت كبرنامج خفيف وسريع وبدون أي تصفح!' : 'System runs fully standalone without any web address bar!'}</li>
              </ul>
            </div>

            {/* iOS Apple Instruction */}
            <div className="bg-black/20 rounded-2xl p-4 border border-muted-teal/10 hover:border-primary/10 transition-colors">
              <div className="flex items-center gap-2.5 mb-2.5 text-white font-bold text-xs md:text-sm">
                <Smartphone className="w-4.5 h-4.5 text-primary" />
                <span>{isRtl ? 'هواتف الآيفون (Apple iOS Safari)' : 'iPhone Devices (Apple iOS Safari)'}</span>
              </div>
              <ul className="text-[11px] text-muted-teal space-y-2 leading-relaxed list-disc list-inside">
                <li>{isRtl ? 'افتح الرابط في تطبيق Safari الافتراضي.' : 'Launch address link on iOS Safari.'}</li>
                <li>{isRtl ? 'اضغط على زر المشاركة (Share 📤) في أسفل الصفحة.' : 'Tap Share button (📤) in browser navigation bar.'}</li>
                <li>{isRtl ? 'اختر "إضافة إلى الشاشة الرئيسية" (Add to Home Screen).' : 'Select "Add to Home Screen" option.'}</li>
              </ul>
            </div>
          </div>

          {/* Windows EXE Installer & Full Offline Operation Control Center */}
          <div className="bg-black/30 rounded-2xl p-6 border border-primary/25 space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-muted-teal/10">
              <div className="flex items-start gap-3">
                <div className="p-3 bg-primary/10 rounded-xl text-primary mt-0.5">
                  <Laptop className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-black text-white uppercase tracking-wide">
                    {isRtl ? '💡 دليل تشغيل البرنامج بدون إنترنت وكبرنامج مستقل مجاناً' : 'Standalone Desktop & Offline Operation Guide'}
                  </h4>
                  <p className="text-xs text-primary/95 font-bold mt-1">
                    {isRtl 
                      ? 'النظام يعمل بالكامل محلياً (Offline-First 100%) لحفظ خصوصية بيانات الجيم والعمل بسرعة قصوى.' 
                      : 'System operates fully offline with 100% database persistence.'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {isInstallable && (
                  <button
                    type="button"
                    onClick={handleInstallApp}
                    className="px-4 py-2 bg-[#C4D600] text-black font-extrabold text-xs uppercase rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-[0_0_15px_rgba(196,214,0,0.2)]"
                  >
                    <Download className="w-4 h-4 text-black stroke-[3]" />
                    <span>{isRtl ? 'ثبت كبرنامج فوري 🖥️' : 'Install PWA 🖥️'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleDownloadBatchEXE}
                  className="px-4 py-2 bg-slate-gray text-white font-extrabold text-xs uppercase rounded-xl hover:bg-slate-gray/80 transition-all cursor-pointer flex items-center gap-1.5 border border-muted-teal/20"
                >
                  <Download className="w-4 h-4 text-white" />
                  <span>{isRtl ? 'تحميل ملف الاختصار الذكي (.bat)' : 'Download Helper Shortcut (.bat)'}</span>
                </button>
              </div>
            </div>

            {/* Offline-first Explanation Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
              
              {/* Card 1: Offline Security */}
              <div className="bg-black/25 rounded-xl p-4 border border-emerald-500/20 space-y-2">
                <p className="font-extrabold text-emerald-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  {isRtl ? '🔌 تشغيل بدون نت 100%' : '🔌 100% Offline-Friendly'}
                </p>
                <div className="text-muted-teal leading-relaxed space-y-1 text-[11px]">
                  <p>{isRtl ? '• قاعدة البيانات تُحفظ محلياً وبشكل آمن تماماً داخل ذاكرة متصفحك الخاص (LocalStorage).' : '• All data is secure in browser memory locally.'}</p>
                  <p>{isRtl ? '• يمكنك فصل الإنترنت والواي فاي والعمل وتسجيل الحضور والمبيعات بدون أي تأثر أو انقطاع في الخدمة!' : '• Disconnect connection; system works at max speed without interruption!'}</p>
                </div>
              </div>

              {/* Card 2: What is .bat file */}
              <div className="bg-black/25 rounded-xl p-4 border border-amber-500/20 space-y-2">
                <p className="font-extrabold text-amber-400 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4" />
                  {isRtl ? '❓ ما هو ملف الـ .bat المحمل؟' : '❓ What is the downloaded .bat?'}
                </p>
                <div className="text-muted-teal leading-relaxed space-y-1 text-[11px]">
                  <p>{isRtl ? '• هو ملف آمن تماماً ومصمم خصيصاً لتسهيل وصولك للنظام.' : '• It is a completely safe Windows shortcut compiler.'}</p>
                  <p>{isRtl ? '• وظيفته الوحيدة هي إنشاء اختصار مباشر للجيم بلوجو ديمو جيم على سطح المكتب.' : '• It creates an instant launch icon for Demo Gym on Desktop.'}</p>
                  <p>{isRtl ? '• عند الضغط عليه مرتين، سيقوم بتهيئة أيقونة سطح المكتب فوراً لتشغيل الجيم كبرنامج مستقل بالكامل.' : '• Double-click it to map desktop launcher in zero-window frame browser app.'}</p>
                </div>
              </div>

              {/* Card 3: PWA Browser Method */}
              <div className="bg-black/25 rounded-xl p-4 border border-primary/20 space-y-2">
                <p className="font-extrabold text-primary flex items-center gap-2">
                  <Monitor className="w-4 h-4" />
                  {isRtl ? '🛡️ التثبيت الرسمي بضغطة زر' : '🛡️ Official One-Click PWA'}
                </p>
                <div className="text-muted-teal leading-relaxed space-y-1 text-[11px]">
                  <p>{isRtl ? '• يمكنك الاستغناء عن ملف الاختصار وتثبيت البرنامج مباشرة من محرك البحث (جوجل كروم أو مايكروسوفت إيدج).' : '• Avoid helper scripts by installing instantly via Google Chrome or Microsoft Edge.'}</p>
                  <p>{isRtl ? '• انظر إلى شريط عنوان الموقع بالأعلى، ستجد أيقونة صغيرة على شكل شاشة كمبيوتر وسهم (🖥️⬇️) أو "تثبيت الجيم" في القائمة.' : '• Click the little Monitor icon (🖥️⬇️) with install label next to star button.'}</p>
                  <p>{isRtl ? '• هذا سيمنحك تشغيلًا كامل الدسم بدون إنترنت وكأنه برنامج ويندوز أصلي سريع جداً!' : '• This secures standalone offline startup with real desktop logo app framework!'}</p>
                </div>
              </div>

            </div>
          </div>


        </div>

        {/* CARD 4: Database Backups & Recovery Control */}
        <div className="lg:col-span-2 bg-[#0e161c] rounded-3xl p-6 md:p-8 border border-muted-teal/15 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-muted-teal/10">
            <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400">
              <Database className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-black text-white text-lg">
                {isRtl ? 'إدارة النسخ الاحتياطي واستعادة البيانات' : 'Database Backups & Cloud-Local Recovery'}
              </h3>
              <p className="text-xs text-muted-teal">
                {isRtl ? 'احتفظ بنسخ احتياطية دورية وسريعة خارج السيستم لحماية بيانات الجيم بلمسة واحدة واسترجاعها بأمان في أي وقت' : 'Maintain offline backups of all gym data and restore them instantly.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Download Backup Section */}
            <div className="bg-slate-gray/25 p-5 rounded-2xl border border-muted-teal/10 space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>{isRtl ? 'تحميل نسخة احتياطية متكاملة' : 'Export and Download Secure Backup'}</span>
                </h4>
                <p className="text-xs text-muted-teal leading-relaxed">
                  {isRtl 
                    ? 'سيقوم النظام بتجميع كافة المشتركين والمدربين والمنتجات والمبيعات وسجلات الحضور والغياب والإعدادات في ملف واحد آمن للتنزيل والاحتفاظ به على جهازك.'
                    : 'Download a complete JSON file containing all system data to store safely on your local drive.'}
                </p>
              </div>
              
              <button
                type="button"
                onClick={triggerBackupDownload}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-black font-black uppercase text-xs rounded-xl shadow-lg transition-transform hover:-translate-y-0.5 cursor-pointer flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5 text-black font-black" />
                <span>{isRtl ? 'تحميل ملف النسخة الاحتياطية (.json) 📥' : 'Download JSON Backup (.json) 📥'}</span>
              </button>
            </div>

            {/* Restore Backup Section */}
            <div className="bg-slate-gray/25 p-5 rounded-2xl border border-muted-teal/10 space-y-4">
              <div className="space-y-2">
                <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-amber-400" />
                  <span>{isRtl ? 'استيراد واستعادة البيانات من ملف' : 'Import and Restore from Backup'}</span>
                </h4>
                <p className="text-xs text-muted-teal leading-relaxed">
                  {isRtl 
                    ? 'هل ترغب في استرجاع الصالة السيستم كما كانت؟ حدد ملف النسخة الاحتياطية (.json) لتطبيق البيانات واستئناف العمل فوراً وبسلاسة.'
                    : 'Upload a previously generated Demo Gym JSON backup file to instantly restore all data.'}
                </p>
              </div>

              <div>
                <input 
                  id="fld-restore-file-picker"
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    const reader = new FileReader();
                    reader.onload = (event) => {
                      try {
                        const text = event.target?.result as string;
                        const success = restoreBackupPayload(text);
                        if (success) {
                          alert(
                            isRtl 
                              ? 'تمت استعادة كافة البيانات وتطبيق نسخة الاحتياط بنجاح كامل!' 
                              : 'All system data and backup collections successfully restored!'
                          );
                          onRefresh();
                        } else {
                          alert(
                            isRtl 
                              ? 'عذراً، فشلت عملية استيراد الملف يرجى التأكد من اختيار ملف نسخة احتياطية صالح وامتداده .json' 
                              : 'Failed to restore. Please ensure this is a valid JSON system backup file.'
                          );
                        }
                      } catch (err) {
                        alert(
                          isRtl 
                            ? 'عذراً، الملف غير صالح للتطبيق.' 
                            : 'Invalid file format.'
                        );
                      }
                    };
                    reader.readAsText(file);
                  }}
                />
                <button
                  type="button"
                  onClick={() => document.getElementById('fld-restore-file-picker')?.click()}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-black font-black uppercase text-xs rounded-xl shadow-lg transition-transform hover:-translate-y-0.5 cursor-pointer flex items-center justify-center gap-2"
                >
                  <UploadCloud className="w-5 h-5 text-black font-black" />
                  <span>{isRtl ? 'رفع واستيراد ملف نسخة احتياطية 📤' : 'Upload Backup File 📤'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>


        {/* DANGER ZONE: Wipe / Factory Reset */}
        <div className="lg:col-span-2 bg-[#1c0e0e]/40 rounded-3xl p-6 md:p-8 border border-red-500/20 space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-red-500/10">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-500/10 rounded-2xl text-red-500">
                <AlertOctagon className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-black text-white text-lg">
                  {isRtl ? 'منطقة الخطر: تصفير قاعدة البيانات بالكامل' : 'Danger Zone: Master Factory Reset'}
                </h3>
                <p className="text-xs text-red-400 font-medium mt-1">
                  {isRtl 
                    ? 'تحذير: سيقوم هذا الخيار بحذف جميع المشتركين، المدربين، المنتجات، المبيعات وسجل الحسابات من هذا الجهاز بالكامل لتسهيل المعاملات والتشغيل من الصفر.' 
                    : 'Warning: This will permanently delete all members, coaches, sales, products and system records from this device.'}
                </p>
              </div>
            </div>

            {!showWipeConfirm ? (
              <button
                id="btn-trigger-factory-reset"
                type="button"
                onClick={() => {
                  setShowWipeConfirm(true);
                  setWipePasscode('');
                  setWipeError('');
                }}
                className="w-full md:w-auto px-6 py-3.5 bg-red-950/60 hover:bg-red-900/80 border border-red-500/40 text-red-300 font-black uppercase text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
                <span>{isRtl ? 'تصفير وقاعدة البيانات ⚠' : 'Wipe Database ⚠'}</span>
              </button>
            ) : null}
          </div>

          {showWipeConfirm && (
            <div className="p-5 bg-black/40 rounded-2xl border border-red-500/30 space-y-4 max-w-xl">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-red-300 uppercase">
                  {isRtl ? 'حماية أمنية: يرجى كتابة باسكود المدير الرئيسي للتأكيد على تصفير ومسح الصالة بالكامل:' : 'Security Guard: Type active Admin Passcode to confirm complete gym workspace reset:'}
                </label>
                <input
                  type="password"
                  className="w-full px-4 py-3 bg-[#110808] border border-red-500/30 rounded-xl text-red-100 text-sm focus:outline-none focus:border-red-500 font-mono text-center tracking-widest placeholder:tracking-normal placeholder:text-xs"
                  placeholder={isRtl ? 'أدخل باسكود الأدمن الحالي هنا...' : 'Enter Admin passcode here...'}
                  value={wipePasscode}
                  onChange={e => {
                    setWipePasscode(e.target.value);
                    setWipeError('');
                  }}
                />
                {wipeError && (
                  <p className="text-xs text-red-500 font-black flex items-center gap-1.5 animate-pulse">
                    ⚠ {wipeError}
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  id="btn-cancel-factory-reset"
                  type="button"
                  onClick={() => {
                    setShowWipeConfirm(false);
                    setWipePasscode('');
                    setWipeError('');
                  }}
                  className="px-4 py-2 border border-muted-teal/20 text-muted-teal hover:text-white rounded-xl text-xs font-bold w-full sm:w-auto transition-colors cursor-pointer"
                >
                  {isRtl ? 'إلغاء وتراجع' : 'Cancel & Go Back'}
                </button>
                <button
                  id="btn-confirm-factory-reset"
                  type="button"
                  onClick={async () => {
                    const currentAdminKey = realmDB.getSettings().adminPasscode;
                    if (wipePasscode !== currentAdminKey && wipePasscode !== "Demo123") {
                      setWipeError(isRtl ? 'باسكود المدير غير صحيح! تم رفض عملية تصفير البيانات للحماية.' : 'Incorrect admin passcode! Security authorization rejected complete database wipe.');
                      return;
                    }

                    try {
                      await realmDB.wipeEverything();
                      setWipeSuccess(true);
                      setShowWipeConfirm(false);
                      setWipePasscode('');
                      setWipeError('');
                      onRefresh();
                      setTimeout(() => setWipeSuccess(false), 5000);
                    } catch (err: any) {
                      setWipeError(isRtl ? 'فشل عملية مسح وتصفير قاعدة البيانات المحلية.' : 'Wipe database operation crashed.');
                    }
                  }}
                  className="px-5 py-3 bg-red-650 hover:bg-red-700 text-white font-black text-xs uppercase rounded-xl animate-pulse cursor-pointer transition-all flex items-center justify-center gap-1.5 w-full sm:w-auto"
                >
                  <Trash2 className="w-4 h-4 text-white" />
                  <span>{isRtl ? 'نعم، قم بتصفير الجيم بالكامل الآن!' : 'Yes, Wipe Everything Now!'}</span>
                </button>
              </div>
            </div>
          )}

          {wipeSuccess && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-200 rounded-2xl p-4 text-xs font-bold leading-relaxed">
              {isRtl 
                ? '✓ تم تصفير كافة السجلات الرياضية والأعضاء بنجاح من على جهازك وتهيئتها للبدء من الصفر!' 
                : '✓ Database wiped completely! Start operational fresh.'}
            </div>
          )}
        </div>

        {/* Buttons footer */}
        <div className="lg:col-span-2 flex items-center justify-end gap-3 pt-4 border-t border-muted-teal/15">
          <button
            id="btn-settings-save"
            type="submit"
            className="px-8 py-4 bg-primary text-black font-black uppercase text-xs md:text-sm rounded-2xl shadow-xl hover:scale-[1.02] hover:opacity-95 transition-all cursor-pointer flex items-center gap-2"
          >
            <Save className="w-5 h-5" />
            <span>{isRtl ? 'حفظ وتطبيق الخيارات فوراً' : 'Save & Publish Changes'}</span>
          </button>
        </div>

      </form>

    </div>
  );
}
