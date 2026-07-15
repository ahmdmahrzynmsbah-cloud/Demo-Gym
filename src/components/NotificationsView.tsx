import React, { useState } from 'react';
import { AppNotification } from '../types';
import { translations } from '../lib/translations';
import { realmDB, triggerBackupDownload } from '../lib/realm';
import { Bell, ShieldAlert, CheckCircle2, UserCheck, AlertTriangle, AlertCircle, ShoppingCart, Download, Database, Megaphone, Check } from 'lucide-react';
import { motion } from 'motion/react';

interface NotificationsViewProps {
  role: 'admin' | 'male-trainer' | 'female-trainer';
  lang: 'ar' | 'en';
  notifications: AppNotification[];
  onRefresh: () => void;
}

export default function NotificationsView({ role, lang, notifications, onRefresh }: NotificationsViewProps) {
  const t = translations[lang];
  const isRtl = lang === 'ar';
  const isAdmin = role === 'admin';
  const settings = realmDB.getSettings();

  const [announcementText, setAnnouncementText] = useState(settings.trainerAnnouncement || "يا كابتن، متنساش تنظف الجيم وتظبط الأجهزة والبارات بعد الوردية! 🧹💪");
  const [announcementEnabled, setAnnouncementEnabled] = useState(settings.trainerAnnouncementEnabled ?? true);
  const [successMsg, setSuccessMsg] = useState('');

  const handleSaveAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    const currentSettings = realmDB.getSettings();
    const updated = {
      ...currentSettings,
      trainerAnnouncement: announcementText,
      trainerAnnouncementEnabled: announcementEnabled,
      trainerAnnouncementVersion: (currentSettings.trainerAnnouncementVersion || 1) + 1,
    };
    realmDB.saveSettings(updated);
    
    realmDB.addLog(
      `تم تحديث وتعليق تنبيه لوحة إعلانات المدربين: "${announcementText.slice(0, 30)}..."`,
      `Updated the daily staff bulletin block message to: "${announcementText.slice(0, 30)}..."`,
      'settings'
    );

    setSuccessMsg(isRtl ? 'تم بفضل الله تحديث التوجيهات وبثها للمدربين والمدربات بنجاح! 🚀' : 'Success! Directives saved and instantly broadcasted to all staff pages.');
    setTimeout(() => setSuccessMsg(''), 4000);
    onRefresh();
  };

  const handleMarkAsRead = (id: string) => {
    realmDB.markNotificationAsRead(id);
    onRefresh();
  };

  const handleClearAll = () => {
    realmDB.clearAllNotifications();
    onRefresh();
  };

  const sortedNotifs = [...notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* Upper action headers */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-b border-muted-teal/15 pb-6">
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-wider flex items-center gap-3">
            <span className="w-2.5 h-8 bg-primary rounded-full inline-block"></span>
            {t.navNotifications}
          </h2>
          <p className="text-sm text-muted-teal mt-1">{t.notifCenter}</p>
        </div>

        {/* Clear all action button */}
        {notifications.filter(n => !n.isRead).length > 0 && (
          <button
            id="btn-clear-all-alerts"
            onClick={handleClearAll}
            className="px-5 py-2.5 bg-slate-gray text-white font-bold text-xs uppercase tracking-wider rounded-xl border border-muted-teal/20 hover:bg-slate-gray/80 transition-all cursor-pointer"
          >
            {isRtl ? 'تحديد الكل كمقروء' : 'Mark all alerts as Read'}
          </button>
        )}
      </div>

      {/* Administrative Coach Bulletin Board Editor */}
      {isAdmin && (
        <div className="max-w-4xl mx-auto bg-[#1b232c] border border-primary/20 rounded-2xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#3E4E5B]/20">
            <Megaphone className="w-5 h-5 text-primary stroke-[2.5]" />
            <h3 className="text-base font-black text-white uppercase tracking-wider">
              {isRtl ? 'لوحة إعلانات التوجيه اليومي للمدربين والمدربات' : 'Staff Daily Bulletin & Interactive Directives'}
            </h3>
          </div>
          
          <form onSubmit={handleSaveAnnouncement} className="space-y-4">
            <div>
              <label className="block text-[11px] font-mono text-muted-teal mb-2 font-bold uppercase tracking-wider">
                {isRtl ? 'نص التوجيه الإداري (يظهر كصندوق تنبيه منبثق فوري للمدربين فور تسجيل الدخول والفتح)' : 'Directives Text Area (Triggers instantly in coaches login dashboards)'}
              </label>
              <textarea
                required
                rows={3}
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                placeholder={isRtl ? 'اكتب التوجيهات اليومية هنا، على سبيل المثال: متنساش تنظف الجيم وتظبط الأجهزة والبارات بعد الوردية! 🧹' : 'Write daily instructions here for trainers, e.g., don\'t forget to clean the gym! 🧹'}
                className="w-full bg-black/40 border border-[#3E4E5B] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-primary font-mono leading-relaxed placeholder-muted-teal/40"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
              {/* Enable / Disable toggle */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={announcementEnabled}
                  onChange={(e) => setAnnouncementEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-[#3E4E5B] text-primary focus:ring-primary focus:ring-offset-dark-charcoal bg-black/50 cursor-pointer"
                />
                <span className="text-xs font-bold text-[#EBF4FA] select-none">
                  {isRtl ? 'تفعيل وتنشيط وضع التنبيه المنبثق التلقائي للمدربين' : 'Activate auto login popup challenge on staff viewport'}
                </span>
              </label>

              {/* Action buttons */}
              <div className="flex items-center gap-3">
                {successMsg && (
                  <p className="text-xs text-[#C4D600] font-black animate-pulse bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">{successMsg}</p>
                )}
                <button
                  id="btn-save-coach-announcement"
                  type="submit"
                  className="px-5 py-2.5 bg-primary text-black font-black text-xs uppercase tracking-wider rounded-xl hover:opacity-90 transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-primary/10"
                >
                  <Check className="w-4 h-4 text-black stroke-[3]" />
                  <span>{isRtl ? 'حفظ وبث التوجيه للمدربين 📢' : 'Save & Publish Bulletin'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Main Alerts queue logs */}
      <div className="max-w-4xl mx-auto space-y-4">
        {sortedNotifs.length === 0 ? (
          <div className="text-center py-20 text-xs text-muted-teal italic bg-slate-gray/25 rounded-2xl border border-dashed border-muted-teal/15 p-6">
            <Bell className="w-8 h-8 mx-auto text-muted-teal/30 mb-3" />
            <p>{t.noNotif}</p>
          </div>
        ) : (
          sortedNotifs.map((notif) => {
            const heading = lang === 'ar' ? notif.titleAr : notif.titleEn;
            const textDesc = lang === 'ar' ? notif.messageAr : notif.messageEn;
            
            return (
              <motion.div
                layout
                key={notif.id}
                className={`border rounded-2xl p-5 flex items-start gap-4 transition-all ${
                  notif.isRead 
                    ? 'bg-slate-gray/10 border-muted-teal/10 opacity-60' 
                    : 'bg-slate-gray/30 border-muted-teal/20 shadow-lg'
                }`}
              >
                {/* Specific stylized graphics depending on alert category */}
                <div className={`p-3 rounded-xl shrink-0 ${
                  notif.type === 'trainer_tardiness' 
                    ? 'bg-red-500/10 text-red-400' 
                    : notif.type === 'low_stock' 
                    ? 'bg-amber-500/10 text-amber-400' 
                    : (notif.type === 'weekly_backup' || notif.type === 'daily_backup' || notif.type === 'monthly_backup')
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-primary/10 text-primary'
                }`}>
                  {notif.type === 'trainer_tardiness' ? (
                    <UserCheck className="w-6 h-6 animate-pulse" />
                  ) : notif.type === 'low_stock' ? (
                    <ShoppingCart className="w-6 h-6" />
                  ) : (notif.type === 'weekly_backup' || notif.type === 'daily_backup' || notif.type === 'monthly_backup') ? (
                    <Database className="w-6 h-6 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-6 h-6" />
                  )}
                </div>

                {/* Text logs details */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-black text-white uppercase tracking-wide">{heading}</h4>
                    {!notif.isRead && (
                      <span className="text-[8px] bg-primary text-black font-extrabold px-1.5 py-0.2 rounded uppercase tracking-wider">
                        {isRtl ? 'جديد' : 'NEW'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-light-gray leading-relaxed">{textDesc}</p>
                </div>

                {/* Action button checklist trigger */}
                {(notif.type === 'weekly_backup' || notif.type === 'daily_backup' || notif.type === 'monthly_backup') ? (
                  <div className="flex items-center gap-2">
                    <button
                      id={`btn-download-backup-${notif.id}`}
                      onClick={() => {
                        triggerBackupDownload();
                        handleMarkAsRead(notif.id);
                      }}
                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {isRtl ? 'تحميل' : 'Download'}
                    </button>
                    {!notif.isRead && (
                      <button
                        id={`btn-mark-alert-read-${notif.id}`}
                        onClick={() => handleMarkAsRead(notif.id)}
                        className="px-3 py-1.5 bg-black/35 hover:bg-black/55 text-primary border border-primary/25 rounded-lg text-xs font-bold transition-all cursor-pointer select-none shrink-0"
                      >
                        {t.dismiss}
                      </button>
                    )}
                  </div>
                ) : (
                  !notif.isRead && (
                    <button
                      id={`btn-mark-alert-read-${notif.id}`}
                      onClick={() => handleMarkAsRead(notif.id)}
                      className="px-3 py-1.5 bg-black/35 hover:bg-black/55 text-primary border border-primary/25 rounded-lg text-xs font-bold transition-all cursor-pointer select-none"
                    >
                      {t.dismiss}
                    </button>
                  )
                )}
              </motion.div>
            );
          })
        )}
      </div>

    </div>
  );
}
