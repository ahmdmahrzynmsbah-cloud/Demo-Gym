import { Member, Trainer, AttendanceRecord, ShiftSchedule, Product, Sale, Equipment, AppNotification, GymSettings, ActivityLog, SessionTicket } from '../types';
import { syncLocalToFirestore, isIncomingFirestoreUpdate, syncDocToFirestore, deleteDocFromFirestore, deleteDocsFromFirestoreBatch, setIsWipingDatabase, addPendingMutation, savePendingMutations } from './firebaseSync';

// Dynamically calculate today's date based on current machine local time
const getTodayDateStr = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export const CURRENT_DATE_STR = getTodayDateStr();

const INITIAL_MEMBERS: Member[] = [];

const INITIAL_TRAINERS: Trainer[] = [];

const INITIAL_SCHEDULES: ShiftSchedule[] = [];

const INITIAL_PRODUCTS: Product[] = [];

const INITIAL_SALES: Sale[] = [];

const INITIAL_EQUIPMENT: Equipment[] = [];

const INITIAL_ATTENDANCE: AttendanceRecord[] = [];

// Re-evaluate notification generation based on the state
function generateAutomaticNotifications(
  members: Member[],
  products: Product[],
  attendance: AttendanceRecord[],
  trainers: Trainer[]
): AppNotification[] {
  const list: AppNotification[] = [];
  const currentDate = new Date(CURRENT_DATE_STR);

  // 1. Subscription Expiry within 3 days (or expired)
  members.forEach(member => {
    const end = new Date(member.endDate);
    const diffTime = end.getTime() - currentDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays >= 0 && diffDays <= 3) {
      list.push({
        id: `notif-exp-${member.id}`,
        type: 'subscription_expiry',
        titleEn: `Subscription Expiring Soon`,
        titleAr: `اقتراب انتهاء الاشتراك`,
        messageEn: `Membership of ${member.fullName.split('|')[0].trim()} will expire in ${diffDays} days (${member.endDate}).`,
        messageAr: `اشتراك العضو ${member.fullName.split('|')[1]?.trim() || member.fullName} سينتهي في خلال ${diffDays} أيام (${member.endDate}).`,
        createdAt: new Date().toISOString(),
        isRead: false
      });
    } else if (diffDays < 0 && member.isActive) {
      list.push({
        id: `notif-expd-${member.id}`,
        type: 'subscription_expiry',
        titleEn: `Subscription Expired`,
        titleAr: `انتهاء الاشتراك`,
        messageEn: `Membership of ${member.fullName.split('|')[0].trim()} expired on ${member.endDate}.`,
        messageAr: `انتهى اشتراك العضو ${member.fullName.split('|')[1]?.trim() || member.fullName} في ${member.endDate}.`,
        createdAt: new Date().toISOString(),
        isRead: false
      });
    }
  });

  // 2. Low Stock Alerts
  products.forEach(product => {
    if (product.stockQty <= product.thresholdQty) {
      list.push({
        id: `notif-stock-${product.id}`,
        type: 'low_stock',
        titleEn: `Low Product Stock Level`,
        titleAr: `انخفاض كمية المخزون`,
        messageEn: `${product.nameEn} stock has reached ${product.stockQty} items (Threshold: ${product.thresholdQty}).`,
        messageAr: `وصل مخزون ${product.nameAr} إلى ${product.stockQty} حبات فقط (الحد الأدنى: ${product.thresholdQty}).`,
        createdAt: new Date().toISOString(),
        isRead: false
      });
    }
  });

  // 3. Trainer tardiness alerts from current date records
  attendance.forEach(log => {
    if (log.targetType === 'trainer' && log.isLate && log.lateMinutes && log.lateMinutes > 0) {
      const tr = trainers.find(t => t.id === log.targetId);
      const shiftStart = tr ? tr.shiftStart : "";
      list.push({
        id: `notif-late-${log.id}`,
        type: 'trainer_tardiness',
        titleEn: `Trainer Late Attendance`,
        titleAr: `تأخر المدرب عن الوردية`,
        messageEn: `Trainer ${log.targetName.split('|')[0].trim()} arrived late by ${log.lateMinutes} mins (Shift Start: ${shiftStart}, Clock-in: ${log.checkInTime}).`,
        messageAr: `حضر المدرب ${log.targetName.split('|')[1]?.trim() || log.targetName} متأخراً بـ ${log.lateMinutes} دقيقة عن الوردية (بداية الوردية: ${shiftStart} وتم تسجيل الحضور في: ${log.checkInTime}).`,
        createdAt: new Date().toISOString(),
        isRead: false
      });
    }
  });

  return list;
}

type RealmListener = () => void;

function getLogTimestamp(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

class LocalRealmDB {
  private listeners: Set<RealmListener> = new Set();
  syncStatus: 'connecting' | 'synced' | 'error' = 'connecting';
  syncError: string = '';

  setSyncStatus(status: 'connecting' | 'synced' | 'error', errorMsg: string = '') {
    this.syncStatus = status;
    this.syncError = errorMsg;
    this.notify();
  }
  
  constructor() {
    this.initDatabase();
  }

  private initDatabase() {
    if (!localStorage.getItem('gym_db_initialized') || localStorage.getItem('gym_db_needs_clean_v2') !== 'true') {
      localStorage.setItem('gym_members', JSON.stringify(INITIAL_MEMBERS));
      localStorage.setItem('gym_trainers', JSON.stringify(INITIAL_TRAINERS));
      localStorage.setItem('gym_schedules', JSON.stringify(INITIAL_SCHEDULES));
      localStorage.setItem('gym_products', JSON.stringify(INITIAL_PRODUCTS));
      localStorage.setItem('gym_sales', JSON.stringify(INITIAL_SALES));
      localStorage.setItem('gym_equipment', JSON.stringify(INITIAL_EQUIPMENT));
      localStorage.setItem('gym_attendance', JSON.stringify(INITIAL_ATTENDANCE));
      
      const notifs = generateAutomaticNotifications(INITIAL_MEMBERS, INITIAL_PRODUCTS, INITIAL_ATTENDANCE, INITIAL_TRAINERS);
      localStorage.setItem('gym_notifications', JSON.stringify(notifs));
      
      // Preserve settings if they exist, otherwise write defaults
      const existingSettings = localStorage.getItem('gym_settings');
      if (!existingSettings) {
        const initialSettings: GymSettings = {
          appName: "DEMO GYM",
          tagline: "DEMO GYM PREMIUM",
          adminPasscode: "Demo123",
          maleTrainerPasscode: "male2026",
          femaleTrainerPasscode: "female2026",
          logoUrl: ""
        };
        localStorage.setItem('gym_settings', JSON.stringify(initialSettings));
      }

      // Initial activity logs
      const initialLogs: ActivityLog[] = [
        {
          id: "log-init-1",
          timestamp: getLogTimestamp(),
          actionAr: "تم تهيئة قاعدة بيانات نظام ديمو جيم الرياضي بنسق نظيف ومصفر بالكامل وجاهز للعمل الحقيقي.",
          actionEn: "Demo Gym system database initialized successfully as a pristine empty workspace.",
          category: "system"
        }
      ];
      localStorage.setItem('gym_logs', JSON.stringify(initialLogs));
      
      localStorage.setItem('gym_db_initialized', 'true');
      localStorage.setItem('gym_db_needs_clean_v2', 'true');
    }

    // Clean up legacy default mock equipment with short mock IDs (e.g. eq-1, eq-2)
    const currentRawEq = localStorage.getItem('gym_equipment');
    if (currentRawEq) {
      try {
        const eqList = JSON.parse(currentRawEq) as Equipment[];
        const filteredEq = eqList.filter(e => e.id && e.id.length > 8);
        if (filteredEq.length !== eqList.length) {
          localStorage.setItem('gym_equipment', JSON.stringify(filteredEq));
        }
      } catch (e) {
        // ignore parsing error
      }
    }
  }

  // Reactive listener subscriptions
  onChange(listener: RealmListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  notifyReactOnly() {
    this.recomputeNotifications();
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (err) {
        console.error("Realm notification dispatch error:", err);
      }
    });
  }

  notify() {
    this.notifyReactOnly();
  }

  private getWeekNumber(d: Date): number {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNo;
  }

  private recomputeNotifications() {
    const mems = this.getCollection<Member>('gym_members');
    const prods = this.getCollection<Product>('gym_products');
    const atts = this.getCollection<AttendanceRecord>('gym_attendance');
    const trx = this.getCollection<Trainer>('gym_trainers');
    const computed = generateAutomaticNotifications(mems, prods, atts, trx);
    
    // Merge manually dismissed/read notifications with the new computed ones
    const currentNotifs = this.getCollection<AppNotification>('gym_notifications');
    const backupNotifs = currentNotifs.filter(n => n.type === 'weekly_backup' || n.type === 'daily_backup' || n.type === 'monthly_backup');

    const merged = computed.map(notif => {
      const match = currentNotifs.find(n => n.id === notif.id);
      if (match) {
        return { ...notif, isRead: match.isRead };
      }
      return notif;
    });

    const now = new Date();

    // 1. Daily auto-backup check (Every 24 hours)
    const lastDailyStr = localStorage.getItem('gym_last_daily_backup_time');
    let shouldAddDailyBackup = false;
    const dailyNotifId = `notif-backup-daily-${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    
    if (!lastDailyStr) {
      localStorage.setItem('gym_last_daily_backup_time', now.toISOString());
      shouldAddDailyBackup = false;
    } else {
      const lastDailyDate = new Date(lastDailyStr);
      const diffTime = now.getTime() - lastDailyDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      if (diffDays >= 1) {
        localStorage.setItem('gym_last_daily_backup_time', now.toISOString());
        shouldAddDailyBackup = false;
      }
    }

    // 2. Weekly auto-backup check (Every 7 days)
    const lastWeeklyStr = localStorage.getItem('gym_last_weekly_backup_time') || localStorage.getItem('gym_last_backup_time');
    let shouldAddWeeklyBackup = false;
    const weeklyNotifId = `notif-backup-weekly-${now.getFullYear()}-W${this.getWeekNumber(now)}`;
    
    if (!lastWeeklyStr) {
      localStorage.setItem('gym_last_weekly_backup_time', now.toISOString());
      shouldAddWeeklyBackup = false;
    } else {
      const lastWeeklyDate = new Date(lastWeeklyStr);
      const diffTime = now.getTime() - lastWeeklyDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      if (diffDays >= 7) {
        localStorage.setItem('gym_last_weekly_backup_time', now.toISOString());
        shouldAddWeeklyBackup = false;
      }
    }

    // 3. Monthly auto-backup check (Every 30 days)
    const lastMonthlyStr = localStorage.getItem('gym_last_monthly_backup_time');
    let shouldAddMonthlyBackup = false;
    const monthlyNotifId = `notif-backup-monthly-${now.getFullYear()}-M${now.getMonth() + 1}`;
    
    if (!lastMonthlyStr) {
      localStorage.setItem('gym_last_monthly_backup_time', now.toISOString());
      shouldAddMonthlyBackup = false;
    } else {
      const lastMonthlyDate = new Date(lastMonthlyStr);
      const diffTime = now.getTime() - lastMonthlyDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      if (diffDays >= 30) {
        localStorage.setItem('gym_last_monthly_backup_time', now.toISOString());
        shouldAddMonthlyBackup = false;
      }
    }

    // Add back the backup notifications to merged so they are not deleted by the scheduler
    backupNotifs.forEach(notif => {
      if (!merged.some(n => n.id === notif.id)) {
        merged.push(notif);
      }
    });

    // Handle Daily Backup Execution
    if (shouldAddDailyBackup && !merged.some(n => n.id === dailyNotifId)) {
      const newDailyNotif: AppNotification = {
        id: dailyNotifId,
        type: 'daily_backup',
        titleEn: `Daily Auto-Backup Secure`,
        titleAr: `تم تنزيل النسخة الاحتياطية اليومية بنجاح 📥`,
        messageEn: `An automatic daily backup of all gym workspace data has been compiled and downloaded securely.`,
        messageAr: `تم إنشاء وتنزيل نسخة احتياطية يومية تلقائية متكاملة لكافة بيانات الصالة بنجاح. بمقدورك تنزيلها مجدداً إن دعت الحاجة.`,
        createdAt: now.toISOString(),
        isRead: false
      };
      merged.push(newDailyNotif);
      
      try {
        const logs = this.getLogs();
        const logId = `log-backup-daily-${Date.now()}`;
        const newLog: ActivityLog = {
          id: logId,
          timestamp: getLogTimestamp(),
          actionAr: "تم إنشاء النسخة الاحتياطية التلقائية اليومية وتنزيل الملف آلياً.",
          actionEn: "Daily automatic backup payload compiled and download triggered successfully.",
          category: "system"
        };
        logs.unshift(newLog);
        if (logs.length > 2000) logs.pop();
        localStorage.setItem('gym_logs', JSON.stringify(logs));
        syncDocToFirestore('gym_logs', logId, newLog);
      } catch (err) {
        console.error("Failed to write daily backup trigger log:", err);
      }

      setTimeout(() => {
        // triggerBackupDownload("daily");
      }, 1000);
    }

    // Handle Weekly Backup Execution
    if (shouldAddWeeklyBackup && !merged.some(n => n.id === weeklyNotifId)) {
      const newWeeklyNotif: AppNotification = {
        id: weeklyNotifId,
        type: 'weekly_backup',
        titleEn: `Weekly Auto-Backup Secure`,
        titleAr: `تم تنزيل النسخة الاحتياطية الأسبوعية بنجاح 📥`,
        messageEn: `An automatic weekly backup of all gym workspace data has been compiled and downloaded securely.`,
        messageAr: `تم إنشاء وتنزيل نسخة احتياطية أسبوعية تلقائية متكاملة لكافة بيانات الصالة بنجاح. بمقدورك تنزيلها مجدداً إن دعت الحاجة.`,
        createdAt: now.toISOString(),
        isRead: false
      };
      merged.push(newWeeklyNotif);
      
      try {
        const logs = this.getLogs();
        const logId = `log-backup-weekly-${Date.now()}`;
        const newLog: ActivityLog = {
          id: logId,
          timestamp: getLogTimestamp(),
          actionAr: "تم إنشاء النسخة الاحتياطية التلقائية الأسبوعية وتنزيل الملف آلياً.",
          actionEn: "Weekly automatic backup payload compiled and download triggered successfully.",
          category: "system"
        };
        logs.unshift(newLog);
        if (logs.length > 2000) logs.pop();
        localStorage.setItem('gym_logs', JSON.stringify(logs));
        syncDocToFirestore('gym_logs', logId, newLog);
      } catch (err) {
        console.error("Failed to write weekly backup trigger log:", err);
      }

      setTimeout(() => {
        // triggerBackupDownload("weekly");
      }, 1500);
    }

    // Handle Monthly Backup Execution
    if (shouldAddMonthlyBackup && !merged.some(n => n.id === monthlyNotifId)) {
      const newMonthlyNotif: AppNotification = {
        id: monthlyNotifId,
        type: 'monthly_backup',
        titleEn: `Monthly Auto-Backup Secure`,
        titleAr: `تم تنزيل النسخة الاحتياطية الشهرية بنجاح 📥`,
        messageEn: `An automatic monthly backup of all gym workspace data has been compiled and downloaded securely.`,
        messageAr: `تم إنشاء وتنزيل نسخة احتياطية شهرية تلقائية متكاملة لكافة بيانات الصالة بنجاح. بمقدورك تنزيلها مجدداً إن دعت الحاجة.`,
        createdAt: now.toISOString(),
        isRead: false
      };
      merged.push(newMonthlyNotif);
      
      try {
        const logs = this.getLogs();
        const logId = `log-backup-monthly-${Date.now()}`;
        const newLog: ActivityLog = {
          id: logId,
          timestamp: getLogTimestamp(),
          actionAr: "تم إنشاء النسخة الاحتياطية التلقائية الشهرية وتنزيل الملف آلياً.",
          actionEn: "Monthly automatic backup payload compiled and download triggered successfully.",
          category: "system"
        };
        logs.unshift(newLog);
        if (logs.length > 2000) logs.pop();
        localStorage.setItem('gym_logs', JSON.stringify(logs));
        syncDocToFirestore('gym_logs', logId, newLog);
      } catch (err) {
        console.error("Failed to write monthly backup trigger log:", err);
      }

      setTimeout(() => {
        // triggerBackupDownload("monthly");
      }, 2000);
    }

    localStorage.setItem('gym_notifications', JSON.stringify(merged));
  }

  getCollection<T>(key: string): T[] {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  setCollection<T>(key: string, list: T[]) {
    localStorage.setItem(key, JSON.stringify(list));
    this.notify();
  }

  // Settings API
  getSettings(): GymSettings {
    const defaultSettings: GymSettings = {
      appName: "DEMO GYM",
      tagline: "DEMO GYM PREMIUM",
      adminPasscode: "Demo123",
      maleTrainerPasscode: "male2026",
      femaleTrainerPasscode: "female2026",
      logoUrl: "",
      pricingRegularMonthly: 250,
      pricingRegular3Months: 650,
      pricingRegular6Months: 1100,
      pricingRegular1Year: 1800,
      pricingCardioMonthly: 350,
      pricingCardio3Months: 900,
      pricingCardio6Months: 1600,
      pricingCardio1Year: 2500,
      pricingSession1: 50,
      pricingSession4: 180,
      pricingSession8: 320,
      pricingSession12: 450,
      pricingSessionKids: 30,
      pricingSessionAdults: 50,
      trainerAnnouncement: "يا كابتن، متنساش تنظف الجيم وتظبط الأجهزة والبارات بعد الوردية! 🧹💪",
      trainerAnnouncementEnabled: true,
      trainerAnnouncementVersion: 1,
    };
    const data = localStorage.getItem('gym_settings');
    if (!data) {
      return defaultSettings;
    }
    try {
      const parsed = JSON.parse(data);
      // Force DEMO GYM names for the demo version
      if (
        parsed.appName &&
        (parsed.appName.toUpperCase().includes("POWER") || parsed.appName === "Demo Gym" || parsed.appName === "DEMO GYM")
      ) {
        parsed.appName = "DEMO GYM";
      }
      if (
        parsed.tagline &&
        (parsed.tagline.toUpperCase().includes("POWER") || parsed.tagline === "DEMO GYM PREMIUM" || parsed.tagline === "Demo Gym Premium Management")
      ) {
        parsed.tagline = "DEMO GYM PREMIUM";
      }
      if (!parsed.adminPasscode || parsed.adminPasscode === "admin2026") {
        parsed.adminPasscode = "Demo123";
      }
      return { ...defaultSettings, ...parsed };
    } catch (e) {
      return defaultSettings;
    }
  }

  saveSettings(settings: GymSettings) {
    localStorage.setItem('gym_settings', JSON.stringify(settings));
    this.addLog(
      `تم تحديث إعدادات النظام واسم الصالة (${settings.appName}) وتغيير باسكود الدخول للأدمن والمدرّبين.`,
      `System configuration updated: App name set to ${settings.appName}, brand tagline and secure passcodes updated.`,
      'settings'
    );
    this.notify();
    syncDocToFirestore('gym_settings', 'default', settings);
  }

  // Logs API
  getLogs(): ActivityLog[] {
    const data = localStorage.getItem('gym_logs');
    const logs: ActivityLog[] = data ? JSON.parse(data) : [];
    return logs.sort((a, b) => {
      const timeA = a.timestamp || '';
      const timeB = b.timestamp || '';
      const cmp = timeB.localeCompare(timeA);
      if (cmp !== 0) return cmp;
      return (b.id || '').localeCompare(a.id || '');
    });
  }

  addLog(actionAr: string, actionEn: string, category: 'member' | 'subscription' | 'product' | 'sale' | 'attendance' | 'trainer' | 'system' | 'settings' | 'equipment' | 'session') {
    const logs = this.getLogs();
    const timestamp = getLogTimestamp();
    const logId = `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newLog = {
      id: logId,
      timestamp,
      actionAr,
      actionEn,
      category
    };
    logs.unshift(newLog);
    if (logs.length > 2000) {
      const popped = logs.pop();
      if (popped && popped.id) {
        deleteDocFromFirestore('gym_logs', popped.id);
      }
    }
    localStorage.setItem('gym_logs', JSON.stringify(logs));
    this.notify();
    syncDocToFirestore('gym_logs', logId, newLog);
  }

  clearLogs() {
    const oldLogs = this.getLogs();
    oldLogs.forEach(lg => {
      if (lg.id) {
        deleteDocFromFirestore('gym_logs', lg.id);
      }
    });

    const resetId = `log-reset-${Date.now()}`;
    const cleanLogs: ActivityLog[] = [
      {
        id: resetId,
        timestamp: getLogTimestamp(),
        actionAr: "تمت إعادة تعيين سجل المعاملات والعمليات بالكامل بنجاح وبدء تسلسلي جديد من الصفر.",
        actionEn: "Transactions log history fully reset by Admin authority. Starting fresh logs ledger.",
        category: "system"
      }
    ];
    localStorage.setItem('gym_logs', JSON.stringify(cleanLogs));
    this.notify();
    syncDocToFirestore('gym_logs', resetId, cleanLogs[0]);
  }

  async wipeEverything() {
    setIsWipingDatabase(true);

    // 1. Clear any active pending mutation writes since doing them for deleted items is redundant
    savePendingMutations([]);

    // 2. Capture all collections to wipe along with their current local items BEFORE resetting localStorage
    const collectionsToWipe = [
      'gym_members',
      'gym_trainers',
      'gym_attendance',
      'gym_schedules',
      'gym_products',
      'gym_sales',
      'gym_equipment',
      'gym_notifications',
      'gym_logs',
      'gym_sessions'
    ];

    const itemsToDeleteMap = new Map<string, any[]>();
    collectionsToWipe.forEach(key => {
      itemsToDeleteMap.set(key, this.getCollection<any>(key));
    });

    // 3. Clear localStorage lists
    localStorage.setItem('gym_members', JSON.stringify([]));
    localStorage.setItem('gym_trainers', JSON.stringify([]));
    localStorage.setItem('gym_schedules', JSON.stringify([]));
    localStorage.setItem('gym_products', JSON.stringify([]));
    localStorage.setItem('gym_sales', JSON.stringify([]));
    localStorage.setItem('gym_equipment', JSON.stringify([]));
    localStorage.setItem('gym_attendance', JSON.stringify([]));
    localStorage.setItem('gym_notifications', JSON.stringify([]));
    localStorage.setItem('gym_sessions', JSON.stringify([]));
    
    // 4. Reset to default configurations
    const initialSettings: GymSettings = {
      appName: "DEMO GYM",
      tagline: "DEMO GYM PREMIUM",
      adminPasscode: "Demo123",
      maleTrainerPasscode: "male2026",
      femaleTrainerPasscode: "female2026",
      logoUrl: "",
      pricingRegularMonthly: 250,
      pricingRegular3Months: 650,
      pricingRegular6Months: 1100,
      pricingRegular1Year: 1800,
      pricingCardioMonthly: 350,
      pricingCardio3Months: 900,
      pricingCardio6Months: 1600,
      pricingCardio1Year: 2500,
      pricingSession1: 50,
      pricingSession4: 180,
      pricingSession8: 320,
      pricingSession12: 450,
      pricingSessionKids: 30,
      pricingSessionAdults: 50,
      trainerAnnouncement: "يا كابتن، متنساش تنظف الجيم وتظبط الأجهزة والبارات بعد الوردية! 🧹💪",
      trainerAnnouncementEnabled: true,
      trainerAnnouncementVersion: 1,
    };
    localStorage.setItem('gym_settings', JSON.stringify(initialSettings));
    await syncDocToFirestore('gym_settings', 'default', initialSettings);

    const logId = `log-reset-${Date.now()}`;
    const cleanLogs: ActivityLog[] = [
      {
        id: logId,
        timestamp: getLogTimestamp(),
        actionAr: "تم تهيئة قاعدة بيانات النظام بالكامل بنجاح وبدء تسلسلي جديد من الصفر.",
        actionEn: "Wiped all database successfully. Prepared a pristine workspace for active operational entries.",
        category: "system"
      }
    ];
    localStorage.setItem('gym_logs', JSON.stringify(cleanLogs));
    await syncDocToFirestore('gym_logs', logId, cleanLogs[0]);

    // 5. Delete each document in Firestore with the captured IDs, registering them as pending deletes to instantly update offline filters
    const deletePromises: Promise<any>[] = [];
    itemsToDeleteMap.forEach((items, key) => {
      const ids = items.map(item => item.id).filter(Boolean);
      if (ids.length > 0) {
        // Enqueue as a pending delete mutation so snapshots don't restore them
        ids.forEach(id => {
          addPendingMutation(key, id, 'delete');
        });
        deletePromises.push(deleteDocsFromFirestoreBatch(key, ids));
      }
    });

    try {
      await Promise.all(deletePromises);
    } catch (err) {
      console.warn("Wipe database cloud deletions completed with minor warnings or offline flags:", err);
    }

    setIsWipingDatabase(false);
    this.notify();
  }

  // Session Tickets (الحصص) CRUD
  getSessionTickets() { return this.getCollection<SessionTicket>('gym_sessions'); }
  saveSessionTicket(ticket: SessionTicket) {
    const list = this.getSessionTickets();
    const idx = list.findIndex(t => t.id === ticket.id);
    const isEdit = idx !== -1;
    if (isEdit) {
      list[idx] = ticket;
    } else {
      list.push(ticket);
    }
    this.setCollection('gym_sessions', list);
    syncDocToFirestore('gym_sessions', ticket.id, ticket);

    this.addLog(
      isEdit 
        ? `تم تحديث بيانات ملف حصص المشترك: "${ticket.fullName}" (عضو حصص) ومستويات حضور الحصص.`
        : `تم تسجيل عضو حصص جديد في النظام: "${ticket.fullName}" بحصص مضافة عددها (${ticket.sessionsCount}).`,
      isEdit
        ? `Updated sessions log for member: "${ticket.fullName}".`
        : `Registered brand new session member: "${ticket.fullName}" with (${ticket.sessionsCount}) sessions.`,
      'session'
    );
  }
  deleteSessionTicket(id: string) {
    const target = this.getSessionTickets().find(t => t.id === id);
    const name = target ? target.fullName : id;
    const list = this.getSessionTickets().filter(t => t.id !== id);
    this.setCollection('gym_sessions', list);
    deleteDocFromFirestore('gym_sessions', id);

    this.addLog(
      `تم حذف بطاقة حصص المشترك: "${name}" من النظام بالكامل.`,
      `Deleted session card for: "${name}".`,
      'session'
    );
  }

  // Members CRUD
  getMembers() {
    const list = this.getCollection<Member>('gym_members');
    return list.map(member => {
      if (member.isActive && member.endDate && member.endDate < CURRENT_DATE_STR) {
        return { ...member, isActive: false };
      }
      return member;
    });
  }
  saveMember(member: Member) {
    const list = this.getMembers();
    const idx = list.findIndex(m => m.id === member.id);
    const isEdit = idx !== -1;
    const oldMember = isEdit ? list[idx] : null;

    if (isEdit) {
      list[idx] = member;
    } else {
      list.push(member);
    }
    this.setCollection('gym_members', list);
    syncDocToFirestore('gym_members', member.id, member);

    if (oldMember && oldMember.isActive !== member.isActive) {
      const stateAr = member.isActive ? 'تفعيل وتنشيط الاشتراك' : 'إلغاء تفعيل وتجميد الاشتراك';
      const stateEn = member.isActive ? 'ACTIVATED' : 'CANCELLED/DEACTIVATED';
      this.addLog(
        `🚨 كشف تغيير حالة الاشتراك: تم "${stateAr}" للعضو: "${member.fullName}" بنجاح.`,
        `🚨 Subscription state change: "${stateEn}" for member: "${member.fullName}".`,
        'subscription'
      );
    } else {
      this.addLog(
        isEdit 
          ? `تم تحديث بيانات ملف العضو المشترك: "${member.fullName}" (اشتراك ${member.subscriptionType})`
          : `تم تسجيل عضو جديد في الجيم: "${member.fullName}" ببدء اشتراك (${member.subscriptionType}) حتى تاريخ ${member.endDate}`,
        isEdit
          ? `Updated profile parameters for member: "${member.fullName}" (${member.subscriptionType} plan).`
          : `Registered brand new gym member: "${member.fullName}" on a ${member.subscriptionType} plan ending on ${member.endDate}.`,
        isEdit ? 'member' : 'subscription'
      );
    }
  }
  deleteMember(id: string) {
    const target = this.getMembers().find(m => m.id === id);
    const name = target ? target.fullName : id;
    const list = this.getMembers().filter(m => m.id !== id);
    
    // Cascade-delete associated attendance entries
    const attendanceBefore = this.getAttendance();
    const deletedAttendance = attendanceBefore.filter(a => a.targetId === id);
    const attendanceList = attendanceBefore.filter(a => a.targetId !== id);
    this.setCollection('gym_attendance', attendanceList);
    deletedAttendance.forEach(a => {
      deleteDocFromFirestore('gym_attendance', a.id);
    });

    this.setCollection('gym_members', list);
    deleteDocFromFirestore('gym_members', id);

    this.addLog(
      `تم حذف العضو المشترك: "${name}" وإلغاء بطاقته وسجل حضوره من النظام بالكامل.`,
      `Deleted member: "${name}" and cascade-purged all associated attendance entries.`,
      'member'
    );
  }

  // Trainers CRUD
  getTrainers() { return this.getCollection<Trainer>('gym_trainers'); }
  saveTrainer(trainer: Trainer) {
    const list = this.getTrainers();
    const idx = list.findIndex(t => t.id === trainer.id);
    const isEdit = idx !== -1;
    if (isEdit) {
      list[idx] = trainer;
    } else {
      list.push(trainer);
    }
    this.setCollection('gym_trainers', list);
    syncDocToFirestore('gym_trainers', trainer.id, trainer);

    this.addLog(
      isEdit 
        ? `تعديل جدول وردية المدرب المعتمد: "${trainer.name}" وبداية الدوام في ${trainer.shiftStart}`
        : `إضافة طاقم تدريب جديد للجيم: "${trainer.name}" (${trainer.gender === 'male' ? 'قسم الرجال' : 'قسم النساء'})`,
      isEdit
        ? `Trainer schedule for "${trainer.name}" updated (Shift start modified to ${trainer.shiftStart}).`
        : `Registered brand new trainer: "${trainer.name}" assigned to the ${trainer.gender} division.`,
      'trainer'
    );
  }
  deleteTrainer(id: string) {
    const target = this.getTrainers().find(t => t.id === id);
    const name = target ? target.name : id;
    const list = this.getTrainers().filter(t => t.id !== id);
    this.setCollection('gym_trainers', list);
    deleteDocFromFirestore('gym_trainers', id);

    this.addLog(
      `تم حذف المدرب من السجل: "${name}".`,
      `Deleted coach/trainer from active system catalog: "${name}".`,
      'trainer'
    );
  }

  // Schedules CRUD
  getSchedules() { return this.getCollection<ShiftSchedule>('gym_schedules'); }
  saveSchedule(sched: ShiftSchedule) {
    const list = this.getSchedules();
    const idx = list.findIndex(s => s.id === sched.id);
    const isEdit = idx !== -1;
    if (isEdit) {
      list[idx] = sched;
    } else {
      list.push(sched);
    }
    this.setCollection('gym_schedules', list);
    syncDocToFirestore('gym_schedules', sched.id, sched);

    this.addLog(
      isEdit 
        ? `تم تعديل وتنسيق تفاصيل جدول الحصة: "${sched.className}" (الحد الأقصى ${sched.maxCapacity} شخص)`
        : `تمت جدولة حصة/تدريب رياضي جديد في الأجندة: "${sched.className}" مع المدرب ${sched.assignedTrainerName || 'غير معين'}`,
      isEdit
        ? `Updated Class/Slot "${sched.className}" with maximum capacity of ${sched.maxCapacity} participants.`
        : `Scheduled new exercise class: "${sched.className}" assigned to trainer "${sched.assignedTrainerName || 'None'}".`,
      'system'
    );
  }
  deleteSchedule(id: string) {
    const target = this.getSchedules().find(s => s.id === id);
    const className = target ? target.className : id;
    const list = this.getSchedules().filter(s => s.id !== id);
    this.setCollection('gym_schedules', list);
    deleteDocFromFirestore('gym_schedules', id);

    this.addLog(
      `تم إلغاء وحذف الحصة الرياضية المجدولة: "${className}"`,
      `Decommissioned and deleted scheduled fitness class: "${className}".`,
      'system'
    );
  }

  // Products CRUD
  getProducts() { return this.getCollection<Product>('gym_products'); }
  saveProduct(prod: Product) {
    const list = this.getProducts();
    const idx = list.findIndex(p => p.id === prod.id);
    const isEdit = idx !== -1;
    if (isEdit) {
      list[idx] = prod;
    } else {
      list.push(prod);
    }
    this.setCollection('gym_products', list);
    syncDocToFirestore('gym_products', prod.id, prod);

    this.addLog(
      isEdit 
        ? `تعديل معلومات وتوريد مخزني للمنتج: "${prod.nameAr}" (الكمية الكلية الحالية: ${prod.stockQty})`
        : `إضافة صنف تجاري جديد لمخزن الجيم: "${prod.nameAr}" بسعر بيع ${prod.retailPrice} ج.م`,
      isEdit
        ? `Updated inventory stock parameters for: "${prod.nameEn}" (Current Stock Qty: ${prod.stockQty}).`
        : `Added brand new merchandise asset to storage inventory: "${prod.nameEn}" with retail price set to ${prod.retailPrice} EGP.`,
      'product'
    );
  }
  deleteProduct(id: string) {
    const target = this.getProducts().find(p => p.id === id);
    const name = target ? target.nameAr : id;
    const list = this.getProducts().filter(p => p.id !== id);
    this.setCollection('gym_products', list);
    deleteDocFromFirestore('gym_products', id);

    // Dynamic cleanups: delete any associated sales records so statistics is perfectly pristine
    const salesBefore = this.getSales();
    const deletedSales = salesBefore.filter(sa => sa.productId === id);
    const salesList = salesBefore.filter(sa => sa.productId !== id);
    localStorage.setItem('gym_sales', JSON.stringify(salesList));
    deletedSales.forEach(sa => {
      deleteDocFromFirestore('gym_sales', sa.id);
    });
    
    // Log the product deletion and cascade effects
    this.addLog(
      `حذف المنتج "${name}" وإزالة تحليلات مبيعاته وثائقياً فوراً لإعادة حساب المدخول المالي والأرباح التراكمية بدقة في لوحة التحكم`,
      `Deleted product "${name}" from inventory, and cascadingly purged all associated purchase metrics from active revenues analyzer.`,
      'product'
    );

    // Call notify (by updating Sales collection)
    this.setCollection('gym_sales', salesList);
  }

  // Sales CRUD
  getSales() { return this.getCollection<Sale>('gym_sales'); }
  addSale(sale: Sale) {
    const list = this.getSales();
    list.push(sale);
    
    // Decrement inventory stock on product purchase
    const products = this.getProducts();
    const pIdx = products.findIndex(p => p.id === sale.productId);
    if (pIdx !== -1) {
      products[pIdx].stockQty = Math.max(0, products[pIdx].stockQty - sale.qty);
      this.setCollection('gym_products', products);
      syncDocToFirestore('gym_products', products[pIdx].id, products[pIdx]);
      this.recomputeNotifications(); // Re-trigger low stock alert computes
    }

    this.setCollection('gym_sales', list);
    syncDocToFirestore('gym_sales', sale.id, sale);

    this.addLog(
      `تمت فوترة عملية بيع: ${sale.qty}× "${sale.productName}" بقيمة إجمالية ${sale.totalRetailPrice} ج.م (صافي ربح ${sale.profit} ج.م)`,
      `POS Checkout logged: ${sale.qty}x "${sale.productName}" for a total of ${sale.totalRetailPrice} EGP (Profit margin: ${sale.profit} EGP).`,
      'sale'
    );
  }

  // Equipment CRUD
  getEquipment() { return this.getCollection<Equipment>('gym_equipment'); }
  saveEquipment(equip: Equipment) {
    const list = this.getEquipment();
    const idx = list.findIndex(e => e.id === equip.id);
    const isEdit = idx !== -1;
    if (isEdit) {
      list[idx] = equip;
    } else {
      list.push(equip);
    }
    this.setCollection('gym_equipment', list);
    syncDocToFirestore('gym_equipment', equip.id, equip);

    this.addLog(
      `تحديث سجل صيانة وفحص الأجهزة والمعدات لـ "${equip.name}" (الحالة الحالية: ${equip.status}, التكلفة: ${equip.repairCost} ج.م)`,
      `Fitness machinery maintenance modified for "${equip.name}" (Status: ${equip.status}, Total repair expense charges: ${equip.repairCost} EGP).`,
      'equipment'
    );
  }
  deleteEquipment(id: string) {
    const target = this.getEquipment().find(e => e.id === id);
    const name = target ? target.name : id;
    const list = this.getEquipment().filter(e => e.id !== id);
    this.setCollection('gym_equipment', list);
    deleteDocFromFirestore('gym_equipment', id);

    this.addLog(
      `تم حذف وإلغاء جهاز رياضي من السجل المعتمد: "${name}"`,
      `Deleted fitness machinery item from directory database: "${name}".`,
      'equipment'
    );
  }

  // Attendance CRUD: quick check-in & trainer loggers
  getAttendance() { return this.getCollection<AttendanceRecord>('gym_attendance'); }
  addAttendance(record: AttendanceRecord) {
    const list = this.getAttendance();
    list.push(record);
    
    // If it's a member check-in, update member history
    if (record.targetType === 'member') {
      const members = this.getMembers();
      const mIdx = members.findIndex(m => m.id === record.targetId);
      if (mIdx !== -1) {
        const mem = members[mIdx];
        if (!mem.history.attendedDates.includes(record.date)) {
          mem.history.attendedDates.push(record.date);
          mem.history.missedDates = mem.history.missedDates.filter(d => d !== record.date);
          this.setCollection('gym_members', members);
          syncDocToFirestore('gym_members', mem.id, mem);
        }
      }
    }

    this.setCollection('gym_attendance', list);
    syncDocToFirestore('gym_attendance', record.id, record);

    this.addLog(
      record.targetType === 'trainer'
        ? `تم تسجيل حضور المدرب ${record.targetName} في تمام الساعة ${record.checkInTime} ${record.isLate ? '(متأخر)' : ''}`
        : `تسجيل دخول البوابة للعضو المشترك: "${record.targetName}" في تمام الساعة ${record.checkInTime}`,
      record.targetType === 'trainer'
        ? `Trainer arrival punch recorded for "${record.targetName}" at ${record.checkInTime}${record.isLate ? ' (Late)' : ''}.`
        : `Member gate check-in recorded for "${record.targetName}" at ${record.checkInTime}.`,
      'attendance'
    );
  }

  setMemberAttendance(memberId: string, date: string, status: 'present' | 'absent') {
    const members = this.getMembers();
    const mIdx = members.findIndex(m => m.id === memberId);
    let targetName = "Member";
    if (mIdx !== -1) {
      const mem = members[mIdx];
      targetName = mem.fullName;
      if (status === 'present') {
        if (!mem.history.attendedDates.includes(date)) {
          mem.history.attendedDates.push(date);
        }
        mem.history.missedDates = mem.history.missedDates.filter(d => d !== date);
      } else {
        if (!mem.history.missedDates.includes(date)) {
          mem.history.missedDates.push(date);
        }
        mem.history.attendedDates = mem.history.attendedDates.filter(d => d !== date);
      }
      this.setCollection('gym_members', members);
      syncDocToFirestore('gym_members', mem.id, mem);
    }

    // Sync with gym_attendance records
    let attendanceList = this.getAttendance();
    const existingIdx = attendanceList.findIndex(a => a.targetId === memberId && a.date === date && a.targetType === 'member');

    if (status === 'present') {
      if (existingIdx === -1) {
        const targetMem = members.find(m => m.id === memberId);
        const name = targetMem ? targetMem.fullName : "Member";
        const gender = targetMem ? targetMem.gender : "male";
        const record: AttendanceRecord = {
          id: `att-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          targetId: memberId,
          targetType: 'member',
          targetName: name,
          date: date,
          checkInTime: "09:00",
          genderSection: gender
        };
        attendanceList.push(record);
        syncDocToFirestore('gym_attendance', record.id, record);
      }
    } else {
      if (existingIdx !== -1) {
        const deletedRecord = attendanceList[existingIdx];
        attendanceList = attendanceList.filter((_, i) => i !== existingIdx);
        deleteDocFromFirestore('gym_attendance', deletedRecord.id);
      }
    }

    this.setCollection('gym_attendance', attendanceList);

    this.addLog(
      `تعديل يدوي لدفتر الحضور والغياب: العضو "${targetName}" تم تحديده بـ (${status === 'present' ? 'حاضر' : 'غائب'}) لتاريخ ${date}.`,
      `Manual attendance entry adjustment: "${targetName}" set to ${status} for date ${date}.`,
      'attendance'
    );
  }
  
  updateAttendanceCheckOut(id: string, checkOutTime: string) {
    const list = this.getAttendance();
    const idx = list.findIndex(a => a.id === id);
    if (idx !== -1) {
      list[idx].checkOutTime = checkOutTime;
      this.setCollection('gym_attendance', list);
      syncDocToFirestore('gym_attendance', id, list[idx]);

      this.addLog(
        `تسجيل خروج وانصراف للموظف/المدرب: "${list[idx].targetName}" في تمام الساعة ${checkOutTime}`,
        `Trainer checkout staff punch registered for "${list[idx].targetName}" at ${checkOutTime}.`,
        'attendance'
      );
    }
  }

  // Notifications
  getNotifications() { return this.getCollection<AppNotification>('gym_notifications'); }
  markNotificationAsRead(id: string) {
    const list = this.getNotifications();
    const idx = list.findIndex(n => n.id === id);
    if (idx !== -1) {
      list[idx].isRead = true;
      this.setCollection('gym_notifications', list);
      syncDocToFirestore('gym_notifications', id, list[idx]);
    }
  }
  clearAllNotifications() {
    const list = this.getNotifications().map(n => ({ ...n, isRead: true }));
    this.setCollection('gym_notifications', list);
    list.forEach(notif => {
      syncDocToFirestore('gym_notifications', notif.id, notif);
    });
  }
}

export const realmDB = new LocalRealmDB();

/**
 * Compiles a full JSON backup payload representing the complete system snapshot.
 */
export function generateBackupPayload(): string {
  const payload = {
    version: '2.0',
    timestamp: new Date().toISOString(),
    data: {
      members: realmDB.getCollection<any>('gym_members'),
      trainers: realmDB.getCollection<any>('gym_trainers'),
      schedules: realmDB.getCollection<any>('gym_schedules'),
      products: realmDB.getCollection<any>('gym_products'),
      sales: realmDB.getCollection<any>('gym_sales'),
      equipment: realmDB.getCollection<any>('gym_equipment'),
      attendance: realmDB.getCollection<any>('gym_attendance'),
      notifications: realmDB.getCollection<any>('gym_notifications'),
      settings: realmDB.getSettings(),
      logs: realmDB.getCollection<any>('gym_logs'),
      sessions: realmDB.getCollection<any>('gym_sessions')
    }
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Generates and triggers a browser download of the full secure system backup JSON file.
 */
export function triggerBackupDownload(customLabel?: 'daily' | 'weekly' | 'monthly') {
  if (customLabel) return; // Disable automatic downloads

  try {
    const jsonStr = generateBackupPayload();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const d = new Date();
    const dateStr = d.toISOString().split('T')[0];
    a.href = url;
    
    let label = '';
    let labelAr = '';
    if (customLabel === 'daily') {
      label = 'DAILY_';
      labelAr = 'النسخة الاحتياطية اليومية التلقائية ';
    } else if (customLabel === 'weekly') {
      label = 'WEEKLY_';
      labelAr = 'النسخة الاحتياطية الأسبوعية التلقائية ';
    } else if (customLabel === 'monthly') {
      label = 'MONTHLY_';
      labelAr = 'النسخة الاحتياطية الشهرية التلقائية ';
    }
    
    a.download = `POWER_ZONE_GYM_BACKUP_${label}${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    realmDB.addLog(
      `تم تصدير وتنزيل ${labelAr || 'نسخة احتياطية كاملة'} لبيانات النظام كملف JSON آمن بنجاح.`,
      `Complete system database backup (${customLabel ? customLabel.toUpperCase() : 'manual'}) compiled and downloaded as a secure JSON file successfully.`,
      "system"
    );
  } catch (err) {
    console.error("Backup download failed:", err);
  }
}

/**
 * Restores the complete system state from a custom uploaded JSON backup.
 */
export function restoreBackupPayload(jsonStr: string): boolean {
  try {
    const parsed = JSON.parse(jsonStr);
    if (!parsed || typeof parsed !== 'object') return false;

    // Support both direct legacy objects or versioned nested payloads
    const payloadData = parsed.data || parsed;

    if (payloadData.members) localStorage.setItem('gym_members', JSON.stringify(payloadData.members));
    if (payloadData.trainers) localStorage.setItem('gym_trainers', JSON.stringify(payloadData.trainers));
    if (payloadData.schedules) localStorage.setItem('gym_schedules', JSON.stringify(payloadData.schedules));
    if (payloadData.products) localStorage.setItem('gym_products', JSON.stringify(payloadData.products));
    if (payloadData.sales) localStorage.setItem('gym_sales', JSON.stringify(payloadData.sales));
    if (payloadData.equipment) localStorage.setItem('gym_equipment', JSON.stringify(payloadData.equipment));
    if (payloadData.attendance) localStorage.setItem('gym_attendance', JSON.stringify(payloadData.attendance));
    if (payloadData.notifications) localStorage.setItem('gym_notifications', JSON.stringify(payloadData.notifications));
    if (payloadData.settings) localStorage.setItem('gym_settings', JSON.stringify(payloadData.settings));
    if (payloadData.logs) localStorage.setItem('gym_logs', JSON.stringify(payloadData.logs));

    // Force synchronize with cloud so that restoration syncs upstream
    if (payloadData.members) syncCollectionAfterRestore('gym_members', payloadData.members);
    if (payloadData.trainers) syncCollectionAfterRestore('gym_trainers', payloadData.trainers);
    if (payloadData.schedules) syncCollectionAfterRestore('gym_schedules', payloadData.schedules);
    if (payloadData.products) syncCollectionAfterRestore('gym_products', payloadData.products);
    if (payloadData.sales) syncCollectionAfterRestore('gym_sales', payloadData.sales);
    if (payloadData.equipment) syncCollectionAfterRestore('gym_equipment', payloadData.equipment);
    if (payloadData.attendance) syncCollectionAfterRestore('gym_attendance', payloadData.attendance);
    if (payloadData.settings) syncDocToFirestore('gym_settings', 'default', payloadData.settings);
    
    realmDB.addLog(
      "تم استرجاع واستعادة كامل بيانات النظام من نسخة احتياطية مرفوعة بنجاح.",
      "Complete system database successfully restored and applied from an uploaded backup file.",
      "system"
    );

    realmDB.notify();
    return true;
  } catch (err) {
    console.error("Backup restoration failed:", err);
    return false;
  }
}

/**
 * Helper to update firestore with absolute batch consistency after restore
 */
function syncCollectionAfterRestore(key: string, list: any[]) {
  if (!Array.isArray(list)) return;
  // Propagate each record as a write mutation locally/remotely
  list.forEach(item => {
    if (item && item.id) {
      syncDocToFirestore(key, item.id, item);
    }
  });
}
