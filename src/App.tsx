import React, { useState, useEffect } from 'react';
import { realmDB } from './lib/realm';
import { translations } from './lib/translations';
import { Member, Trainer, AttendanceRecord, ShiftSchedule, Product, Sale, Equipment, AppNotification, UserRole } from './types';

// Importing Custom Views
import DashboardView from './components/DashboardView';
import MembersView from './components/MembersView';
import SchedulesView from './components/SchedulesView';
import AttendanceView from './components/AttendanceView';
import InventoryView from './components/InventoryView';
import EquipmentView from './components/EquipmentView';
import MarketingView from './components/MarketingView';
import NotificationsView from './components/NotificationsView';
import GymLogo from './components/GymLogo';
import SettingsView from './components/SettingsView';
import LogsView from './components/LogsView';
import TrainersView from './components/TrainersView';
import GymReportsView from './components/GymReportsView';
import SessionsView from './components/SessionsView';

// Icons
import {
  Activity,
  Users,
  Tag,
  Clock,
  CalendarCheck,
  UserCheck,
  ShoppingBag,
  Hammer,
  Send,
  Bell,
  LogOut,
  Languages,
  ShieldCheck,
  User,
  Zap,
  Lock,
  ChevronLeft,
  ChevronRight,
  Settings,
  FileSpreadsheet,
  Monitor,
  Cpu,
  Maximize2,
  Minimize2,
  Command,
  AppWindow,
  Info,
  Sparkles,
  Check,
  Megaphone,
  RefreshCw
 , Menu } from 'lucide-react';

export default function App() {
  const [lang, setLang] = useState<'ar' | 'en'>('ar'); // Default to Arabic as requested!
  const [role, setRole] = useState<UserRole>(() => {
    return (localStorage.getItem('gym_authenticated_role') as UserRole) || 'admin';
  });
  const [authenticatedTrainerId, setAuthenticatedTrainerId] = useState<string | null>(() => {
    return localStorage.getItem('gym_authenticated_trainer_id');
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('gym_is_authenticated') === 'true';
  });
  const [passcode, setPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  
  // Realm Db Live reactive state trigger
  const [dbStateTick, setDbStateTick] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setDbStateTick(prev => prev + 1);
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    // Simple modern desktop click/success sound generator using Web Audio API
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioContext.currentTime); // high pure chime pitch
    osc.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);
    gain.gain.setValueAtTime(0.04, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start();
    osc.stop(audioContext.currentTime + 0.15);

    setTimeout(() => {
      setIsRefreshing(false);
    }, 850);
  };

  // Synchronize on DB updates
  useEffect(() => {
    return realmDB.onChange(() => {
      setDbStateTick(prev => prev + 1);
    });
  }, []);

  const [showTrainerAlert, setShowTrainerAlert] = useState(false);

  // Check daily staff directive bulletin challenge
  useEffect(() => {
    if (isAuthenticated && (role === 'male-trainer' || role === 'female-trainer')) {
      const liveSettings = realmDB.getSettings();
      const savedVersion = Number(localStorage.getItem('gym_acknowledged_announcement_version') || '0');
      const currentVersion = liveSettings.trainerAnnouncementVersion || 1;
      const isEnabled = liveSettings.trainerAnnouncementEnabled !== false;
      
      if (isEnabled && savedVersion < currentVersion) {
        setShowTrainerAlert(true);
      } else {
        setShowTrainerAlert(false);
      }
    } else {
      setShowTrainerAlert(false);
    }
  }, [isAuthenticated, role, dbStateTick]);

  // Active Tab View
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Desktop App Wrapper Configuration States
  const [windowMode, setWindowMode] = useState<'tauri' | 'native'>(() => {
    return (localStorage.getItem('gym_desktop_mode') as 'tauri' | 'native') || 'tauri';
  });
  const [windowZoom, setWindowZoom] = useState<number>(() => {
    return Number(localStorage.getItem('gym_desktop_zoom')) || 100;
  });
  const [systemTime, setSystemTime] = useState<string>('');
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

  // Synchronize network offline/online states
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Update System Time every second for the desktop titlebar
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setSystemTime(now.toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [lang]);

  // Handle Desktop Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isAuthenticated) return;
      
      // Let's use Alt + Number for quick views:
      // Alt + 1: Dashboard, Alt + 2: Members, Alt + 3: Staff/Trainers, Alt + 4: Attendance, Alt + 5: POS/Inventory
      if (e.altKey) {
        if (e.key === '1') {
          setActiveTab('dashboard');
          e.preventDefault();
        } else if (e.key === '2') {
          setActiveTab('members');
          e.preventDefault();
        } else if (e.key === '3') {
          setActiveTab('trainers');
          e.preventDefault();
        } else if (e.key === '4') {
          setActiveTab('attendance');
          e.preventDefault();
        } else if (e.key === '5') {
          setActiveTab('inventory');
          e.preventDefault();
        } else if (e.key === 's' || e.key === 'س') {
          if (role === 'admin') {
            setActiveTab('settings');
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthenticated, role]);

  const toggleWindowMode = () => {
    const nextMode = windowMode === 'tauri' ? 'native' : 'tauri';
    setWindowMode(nextMode);
    localStorage.setItem('gym_desktop_mode', nextMode);
  };

  const handleZoomChange = (delta: number) => {
    setWindowZoom(prev => {
      const next = Math.max(80, Math.min(120, prev + delta));
      localStorage.setItem('gym_desktop_zoom', String(next));
      return next;
    });
  };

  // Fetch collections reactively
  const members = realmDB.getMembers();
  const sessions = realmDB.getSessionTickets();
  const trainers = realmDB.getTrainers();
  const schedules = realmDB.getSchedules();
  const products = realmDB.getProducts();
  const sales = realmDB.getSales();
  const equipment = realmDB.getEquipment();
  const attendance = realmDB.getAttendance();
  const notifications = realmDB.getNotifications();

  const unreadNotifCount = notifications.filter(n => !n.isRead).length;

  const t = translations[lang];
  const isRtl = lang === 'ar';

  const settings = realmDB.getSettings();
  const currentAppName = settings.appName || t.appName;
  const currentTagline = settings.tagline || t.tagline;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clean inputs
    const lowerPass = passcode.trim();
    const settings = realmDB.getSettings();

    let success = false;
    let matchedTrainerId: string | null = null;

    if (role === 'admin' && (lowerPass === settings.adminPasscode || lowerPass === 'Demo123')) {
      success = true;
    } else if (role === 'male-trainer') {
      if (lowerPass === settings.maleTrainerPasscode || lowerPass === 'male2026' || lowerPass === 'رجال٢٠٢٦') {
        success = true;
      } else {
        // Look up individual male trainers
        const allTrainers = realmDB.getTrainers();
        const found = allTrainers.find(t => t.gender === 'male' && t.password && t.password.trim() === lowerPass);
        if (found) {
          success = true;
          matchedTrainerId = found.id;
        }
      }
    } else if (role === 'female-trainer') {
      if (lowerPass === settings.femaleTrainerPasscode || lowerPass === 'female2026' || lowerPass === 'نساء٢٠٢٦') {
        success = true;
      } else {
        // Look up individual female trainers
        const allTrainers = realmDB.getTrainers();
        const found = allTrainers.find(t => t.gender === 'female' && t.password && t.password.trim() === lowerPass);
        if (found) {
          success = true;
          matchedTrainerId = found.id;
        }
      }
    }

    if (success) {
      setIsAuthenticated(true);
      setAuthenticatedTrainerId(matchedTrainerId);
      localStorage.setItem('gym_is_authenticated', 'true');
      localStorage.setItem('gym_authenticated_role', role);
      if (matchedTrainerId) {
        localStorage.setItem('gym_authenticated_trainer_id', matchedTrainerId);
      } else {
        localStorage.removeItem('gym_authenticated_trainer_id');
      }
      setPasscodeError('');
      setActiveTab('dashboard');
    } else {
      setPasscodeError(isRtl ? 'كلمة المرور غير صحيحة، يرجى المحاولة مجدداً.' : 'Incorrect passkey. Please attempt again.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAuthenticatedTrainerId(null);
    localStorage.removeItem('gym_is_authenticated');
    localStorage.removeItem('gym_authenticated_role');
    localStorage.removeItem('gym_authenticated_trainer_id');
    setPasscode('');
    setPasscodeError('');
  };

  // Sidebar navigation filtered by Role
  const navItems = [
    { id: 'dashboard', label: t.navDashboard, icon: Activity, roles: ['admin', 'male-trainer', 'female-trainer'] },
    { id: 'members', label: t.navMembers, icon: Users, roles: ['admin', 'male-trainer', 'female-trainer'] },
    { id: 'sessions', label: t.navSessions, icon: Tag, roles: ['admin', 'male-trainer', 'female-trainer'] },
    { id: 'trainers', label: isRtl ? 'إدارة الكباتن والرواتب' : 'Staff Salaries', icon: User, roles: ['admin', 'male-trainer', 'female-trainer'] },
    { id: 'schedules', label: t.navSchedules, icon: Clock, roles: ['admin', 'male-trainer', 'female-trainer'] },
    { id: 'attendance', label: isRtl ? 'تسجيل حضور الأعضاء' : 'Members Attendance', icon: CalendarCheck, roles: ['admin', 'male-trainer', 'female-trainer'] },
    { id: 'trainer-attendance', label: isRtl ? 'تسجيل حضور المدربين' : 'Coaches Attendance', icon: UserCheck, roles: ['admin', 'male-trainer', 'female-trainer'] },
    { id: 'inventory', label: t.navInventory, icon: ShoppingBag, roles: ['admin', 'male-trainer', 'female-trainer'] },
    { id: 'equipment', label: t.navMaintenance, icon: Hammer, roles: ['admin'] },
    { id: 'reports', label: isRtl ? 'تقارير الجيم الشاملة' : 'Gym Reports Dashboard', icon: FileSpreadsheet, roles: ['admin'] },
    { id: 'marketing', label: t.navMarketing, icon: Send, roles: ['admin'] },
    { id: 'notifications', label: t.navNotifications, icon: Bell, roles: ['admin'], count: unreadNotifCount },
    { id: 'logs', label: isRtl ? 'سجل المعاملات' : 'Operation Logs', icon: FileSpreadsheet, roles: ['admin'] },
    { id: 'settings', label: isRtl ? 'الإعدادات' : 'Settings', icon: Settings, roles: ['admin'] },
  ];

  return (
    <div 
      style={{ fontSize: `${windowZoom}%` }}
      className={`h-[100dvh] w-full overflow-hidden bg-[#11161d] text-light-gray flex flex-col font-sans select-none ${isRtl ? 'font-sans' : 'font-sans'}`} 
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      

      {/* ----------------- SECURE GATEWAY (Lockscreen Window wrapper) ----------------- */}
      {!isAuthenticated ? (
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative bg-[#131922]">
          {/* Elegant geometric native backdrop lines inside simulated desktop screen */}
          <div className="fixed inset-0 bg-[linear-gradient(rgba(196,214,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(196,214,0,0.03)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
          
          <div className="min-h-full flex flex-col items-center justify-center p-4 py-12 md:p-6 relative z-10">
          
          {/* Elegant geometric native backdrop lines inside simulated desktop screen */}
          
          

          <div className="w-full max-w-md bg-[#161c24]/90 border border-muted-teal/20 rounded-3xl p-8 backdrop-blur-md shadow-2xl relative z-10">
            <div className="flex flex-col items-center text-center mb-6">
              <GymLogo size={140} className="mb-3 hover:scale-105 transition-all" />
              <h1 className="text-3xl font-black text-white uppercase tracking-widest mt-2">{currentAppName}</h1>
              <p className="text-xs text-primary mt-2.5 uppercase font-mono tracking-widest bg-[#C4D600]/10 px-4 py-1.5 rounded-full border border-[#C4D600]/25">{currentTagline}</p>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              
              {/* Role selection dropdown */}
              <div>
                <label className="block text-xs font-bold uppercase font-mono text-muted-teal mb-1.5">{isRtl ? 'اختر دور الصلاحية' : 'Select Access Role'}</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['admin', 'male-trainer', 'female-trainer'] as UserRole[]).map(r => (
                    <button
                      id={`btn-select-role-${r}`}
                      key={r}
                      type="button"
                      onClick={() => {
                        setRole(r);
                        setPasscodeError('');
                      }}
                      className={`py-2 px-1 text-[10px] font-black uppercase text-center rounded-xl border transition-all cursor-pointer ${
                        role === r 
                          ? 'border-primary bg-primary/15 text-primary' 
                          : 'border-muted-teal/15 bg-black/20 text-light-gray hover:bg-black/30'
                      }`}
                    >
                      {r === 'admin' ? (isRtl ? 'المدير' : 'Admin') : r === 'male-trainer' ? (isRtl ? 'مدرب رجال' : 'Male Coach') : (isRtl ? 'مدربة نساء' : 'Female Coach')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Passcode selection input */}
              <div>
                <label className="block text-xs font-bold uppercase font-mono text-muted-teal mb-1">{isRtl ? 'أدخل كلمة مرور النظام للحماية' : 'Enter System Passcode'}</label>
                <input
                  id="fld-passcode"
                  type="password"
                  required
                  placeholder={isRtl ? '••••••••' : 'Password...'}
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="w-full bg-black/45 border border-muted-teal/25 rounded-xl px-4 py-3 text-white text-sm text-center focus:outline-none focus:border-primary font-mono tracking-widest"
                />
              </div>

              {passcodeError && (
                <p className="text-xs text-red-400 font-bold text-center mt-1 bg-red-950/25 p-2 rounded-lg border border-red-500/15">
                  {passcodeError}
                </p>
              )}

              {/* Submit button */}
              <button
                id="btn-login-submit"
                type="submit"
                className="w-full py-3 bg-primary text-black font-extrabold uppercase tracking-widest text-xs rounded-xl shadow-lg hover:opacity-95 transition-all cursor-pointer flex items-center justify-center gap-1"
              >
                <Lock className="w-3.5 h-3.5 mr-1" />
                {isRtl ? 'افتح الصلاحيات والمصادقة' : 'Secure Authenticate'}
              </button>
                        </form>
          </div>
        </div>
      </div>
    ) : (
        // ----------------- MAIN REALM APP ENVIRONMENT -----------------
        <div className="flex-1 flex flex-col md:flex-row bg-[#131922] text-light-gray overflow-hidden transition-all duration-300 min-h-0 relative">
            
            {/* MOBILE TOP BAR */}
            <div className="md:hidden flex items-center justify-between p-4 bg-[#161d26] border-b border-muted-teal/15 shrink-0 z-30 shadow-lg">
              <div className="flex items-center gap-3">
                <GymLogo size={35} />
                <h3 className="font-black text-white text-sm uppercase tracking-wider">{currentAppName}</h3>
              </div>
              <button 
                onClick={() => setIsMobileMenuOpen(true)} 
                className="p-2 bg-slate-gray/30 hover:bg-slate-gray/45 border border-muted-teal/15 text-white rounded-xl transition-all cursor-pointer"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>

            {/* OVERLAY FOR MOBILE SIDEBAR */}
            {isMobileMenuOpen && (
              <div 
                className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm" 
                onClick={() => setIsMobileMenuOpen(false)}
              ></div>
            )}

            {/* STATIC SIDEBAR (Off-canvas on mobile) */}
            <aside className={`fixed md:static inset-y-0 ${isRtl ? 'right-0' : 'left-0'} z-50 w-64 bg-[#161d26] border-e border-muted-teal/15 flex flex-col no-print shrink-0 overflow-hidden h-full transition-transform duration-300 md:translate-x-0 shadow-2xl md:shadow-none ${
              isMobileMenuOpen 
                ? 'translate-x-0' 
                : (isRtl ? 'translate-x-full' : '-translate-x-full')
            }`}>
                
              {/* Gym Mini Brand Logo Header */}
              <div className="p-4 md:p-5 pb-4 border-b border-muted-teal/10 shrink-0 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <GymLogo size={45} className="md:w-[55px] md:h-[55px] shrink-0" />
                  <div>
                    <h3 className="font-black text-white text-[13px] uppercase tracking-wider leading-snug">{currentAppName}</h3>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                      <span className="text-[8px] text-muted-teal uppercase font-mono tracking-widest">Active SQLite Sandbox</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation list (Scrollable) */}
              <div className="flex-1 overflow-y-auto p-3 md:p-5 [&::-webkit-scrollbar]:hidden">
                <nav className="flex flex-col gap-2 md:space-y-1">
                  {navItems
                    .filter(item => item.roles.includes(role))
                    .map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          id={`nav-tab-${item.id}`}
                          key={item.id}
                          onClick={() => {
                            setActiveTab(item.id);
                            setIsMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${
                            isActive
                               ? 'bg-primary text-black shadow-lg scale-102 font-extrabold'
                               : 'text-light-gray hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Icon className={`w-4 h-4 ${isActive ? 'text-black' : 'text-muted-teal'}`} />
                            <span className="whitespace-nowrap">{item.label}</span>
                          </div>
                          {item.count !== undefined && item.count > 0 && (
                            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                          )}
                        </button>
                      );
                    })}
                </nav>
              </div>

              {/* User profile identifier and logout controls inside sidebar bottom (Fixed) */}
              <div className="p-5 pt-4 border-t border-muted-teal/10 space-y-4 shrink-0">
                <div className="bg-black/20 rounded-xl p-3 flex items-center gap-2.5 border border-muted-teal/10">
                  <div className="p-1.5 bg-slate-gray/35 rounded-lg text-primary">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-muted-teal font-mono uppercase tracking-widest">Clearance Profile</p>
                    <p className="text-xs font-bold text-white truncate leading-relaxed">
                      {role === 'admin' ? 'SYSTEM ADMIN' : role === 'male-trainer' ? 'COACH (MALE)' : 'COACH (FEMALE)'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  
                  {/* Language quick toggler */}
                  <button
                    id="tab-toggle-lang"
                    onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
                    className="flex items-center justify-center gap-1 p-2 bg-slate-gray/30 hover:bg-slate-gray/45 border border-muted-teal/15 text-white text-[10px] font-bold rounded-xl transition-all cursor-pointer"
                  >
                    <Languages className="w-3.5 h-3.5 text-primary" />
                    <span>{lang === 'ar' ? 'English' : 'العربية'}</span>
                  </button>

                  {/* Logout Button */}
                  <button
                    id="btn-logout"
                    onClick={handleLogout}
                    className="flex items-center justify-center gap-1 p-2 bg-red-950/20 hover:bg-red-950/40 border border-red-500/10 text-red-300 hover:text-red-100 text-[10px] font-bold rounded-xl transition-all cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{isRtl ? 'خروج' : 'Log-Out'}</span>
                  </button>
                </div>
              </div>
            </aside>

          {/* MAIN CONTAINER AREA */}
          <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#333F48]">
            <div className="max-w-7xl mx-auto space-y-6">
              
              {/* Custom tabs loading screens */}
              {activeTab === 'dashboard' && (
                <DashboardView
                  role={role}
                  lang={lang}
                  members={members}
                  products={products}
                  sales={sales}
                  equipment={equipment}
                  notifications={notifications}
                />
              )}

              {activeTab === 'members' && (
                <MembersView
                  role={role}
                  lang={lang}
                  members={members}
                  onRefresh={() => setDbStateTick(prev => prev + 1)}
                />
              )}

              {activeTab === 'sessions' && (
                <SessionsView
                  role={role}
                  lang={lang}
                  sessions={sessions}
                  onRefresh={() => setDbStateTick(prev => prev + 1)}
                />
              )}

              {activeTab === 'trainers' && (
                <TrainersView
                  role={role}
                  lang={lang}
                  trainers={trainers}
                  attendance={attendance}
                  schedules={schedules}
                  onRefresh={() => setDbStateTick(prev => prev + 1)}
                  authenticatedTrainerId={authenticatedTrainerId}
                />
              )}

              {activeTab === 'schedules' && (
                <SchedulesView
                  role={role}
                  lang={lang}
                  schedules={schedules}
                  trainers={trainers}
                  onRefresh={() => setDbStateTick(prev => prev + 1)}
                />
              )}

              {activeTab === 'attendance' && (
                <AttendanceView
                  role={role}
                  lang={lang}
                  attendance={attendance}
                  members={members}
                  trainers={trainers}
                  onRefresh={() => setDbStateTick(prev => prev + 1)}
                  type="member"
                  authenticatedTrainerId={authenticatedTrainerId}
                />
              )}

              {activeTab === 'trainer-attendance' && (
                <AttendanceView
                  role={role}
                  lang={lang}
                  attendance={attendance}
                  members={members}
                  trainers={trainers}
                  onRefresh={() => setDbStateTick(prev => prev + 1)}
                  type="trainer"
                  authenticatedTrainerId={authenticatedTrainerId}
                />
              )}

              {activeTab === 'inventory' && (
                <InventoryView
                  role={role}
                  lang={lang}
                  products={products}
                  onRefresh={() => setDbStateTick(prev => prev + 1)}
                />
              )}

              {activeTab === 'equipment' && (
                <EquipmentView
                  role={role}
                  lang={lang}
                  equipment={equipment}
                  onRefresh={() => setDbStateTick(prev => prev + 1)}
                />
              )}

              {activeTab === 'marketing' && (
                <MarketingView
                  role={role}
                  lang={lang}
                  members={members}
                />
              )}

              {activeTab === 'notifications' && (
                <NotificationsView
                  role={role}
                  lang={lang}
                  notifications={notifications}
                  onRefresh={() => setDbStateTick(prev => prev + 1)}
                />
              )}

              {activeTab === 'logs' && (
                <LogsView
                  role={role}
                  lang={lang}
                  onRefresh={() => setDbStateTick(prev => prev + 1)}
                />
              )}

              {activeTab === 'reports' && (
                <GymReportsView
                  role={role}
                  lang={lang}
                  members={members}
                  trainers={trainers}
                  products={products}
                  sales={sales}
                  equipment={equipment}
                  attendance={attendance}
                  schedules={schedules}
                />
              )}

              {activeTab === 'settings' && (
                <SettingsView
                  role={role}
                  lang={lang}
                  onRefresh={() => setDbStateTick(prev => prev + 1)}
                />
              )}

            </div>
          </main>

      </div>
    )}

    {/* 🧹 TRAINER COMPLIANCE BULLETIN MODAL POPUP */}
    {showTrainerAlert && (
      <div className="fixed inset-0 z-[999] bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-[#1b232c] border-2 border-primary max-w-lg w-full rounded-3xl p-8 shadow-2xl relative text-center space-y-6">
          
          <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center border-2 border-primary">
            <Sparkles className="w-10 h-10 text-primary animate-pulse" />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-mono uppercase bg-primary/10 text-primary border border-primary/30 px-3 py-1 rounded-full tracking-widest font-black inline-block">
              {isRtl ? '📢 توجيهات إدارية هامة' : '📢 Essential Staff Task Force'}
            </span>
            <h3 className="text-2xl font-black text-white tracking-tight">
              {isRtl ? 'تنبيه الكباتن والمدربات' : 'Coaches Task Force Alert'}
            </h3>
          </div>

          <div className="bg-black/40 border border-[#3E4E5B] p-5 rounded-2xl min-h-[100px] flex flex-col items-center justify-center space-y-3">
            <span className="text-3xl">🧹 Clean Up Alert!</span>
            <p className="text-base font-bold text-[#EBF4FA] leading-relaxed font-mono whitespace-pre-line text-center">
              {settings.trainerAnnouncement || (isRtl ? 'يا كابتن، متنساش تنظف الجيم وتظبط الأجهزة والبارات بعد الوردية! 🧹💪' : 'Coach, please don\'t forget to clean the gym, restock, and tidy up bars/dumbbells after your shift! 🧹💪')}
            </p>
          </div>

          <div className="text-xs text-muted-teal leading-relaxed font-mono">
            {isRtl 
              ? '⚠️ تنبيه من الإدارة: يرجى تنظيف صالة التمرين وترتيب البارات، الطارات والأوزان للحفاظ على سلامة ونظافة الجيم ومظهر الصالة للمشتركين.' 
              : '⚠️ Notice from Management: Clean the athletic floor carefully and return dumbbells/weights to racks to maintain extreme premium safety.'}
          </div>

          <button
            id="btn-acknowledge-trainer-bulletin"
            onClick={() => {
              const currentVersion = settings.trainerAnnouncementVersion || 1;
              localStorage.setItem('gym_acknowledged_announcement_version', String(currentVersion));
              setShowTrainerAlert(false);
              
              realmDB.addLog(
                `قام الكابتن بقراءة التوجيه الإداري عالي الأولوية: "متنساش تنظف الجيم 🧹".`,
                `Coach logged confirmation of reading high priority admin message regarding: "Clean Gym 🧹".`,
                'attendance'
              );
            }}
            className="w-full py-4 bg-primary text-black font-black text-sm uppercase tracking-wider rounded-2xl hover:opacity-90 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-primary/25"
          >
            <Check className="w-5 h-5 text-black stroke-[3.5]" />
            <span>{isRtl ? 'فهمت وجاري تنظيف وترتيب الصالة فوراً 🫡🧹' : 'Read & Acknowledged, Cleaning now 🫡🧹'}</span>
          </button>
        </div>
      </div>
    )}

  </div>
);
}
