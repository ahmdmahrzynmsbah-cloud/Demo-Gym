import React, { useState } from 'react';
import { Member } from '../types';
import { translations } from '../lib/translations';
import { Send, MessageSquare, AlertCircle, Sparkles, Filter, CheckCircle2 } from 'lucide-react';

interface MarketingViewProps {
  role: 'admin' | 'male-trainer' | 'female-trainer';
  lang: 'ar' | 'en';
  members: Member[];
}

type AudienceTier = 'all' | 'active' | 'inactive';

export default function MarketingView({ role, lang, members }: MarketingViewProps) {
  const t = translations[lang];
  const isRtl = lang === 'ar';
  const isAdmin = role === 'admin';

  // State Management
  const [audienceFilter, setAudienceFilter] = useState<AudienceTier>('all');
  const [messageDraft, setMessageDraft] = useState(
    lang === 'ar' ? t.testDraftPromptAr : t.testDraftPrompt
  );
  
  // Track broadcast sent states
  const [clickedMap, setClickedMap] = useState<Record<string, boolean>>({});

  // Filter Target Audience List
  const targetedMembers = members.filter(m => {
    if (audienceFilter === 'active') return m.isActive;
    if (audienceFilter === 'inactive') return !m.isActive;
    return true;
  });

  // Compose Web WhatsApp URL parameters
  const getWhatsAppLink = (phone: string, fullName: string) => {
    // Clean phone number from whitespace or brackets
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    
    // Replace custom variables: {name} with member name
    const humanName = fullName.split('|')[lang === 'ar' ? 1 : 0]?.trim() || fullName.split('|')[0]?.trim();
    const personalizedText = messageDraft.replace('{name}', humanName);
    
    return `https://api.whatsapp.com/send?phone=${encodeURIComponent(cleanPhone)}&text=${encodeURIComponent(personalizedText)}`;
  };

  const handleTriggerBroadcastAction = (mId: string, url: string) => {
    setClickedMap(prev => ({ ...prev, [mId]: true }));
    // Open in new tab beautifully
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleResetDraft = () => {
    setMessageDraft(lang === 'ar' ? t.testDraftPromptAr : t.testDraftPrompt);
  };

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* Upper header action desk */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-muted-teal/15 pb-6">
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-wider flex items-center gap-3">
            <span className="w-2.5 h-8 bg-primary rounded-full inline-block"></span>
            {t.whatsappTitle}
          </h2>
          <p className="text-sm text-muted-teal mt-1">{t.navMarketing}</p>
        </div>
      </div>

      {/* Split pane design */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Campaign composer columns on the left */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-gray/25 border border-muted-teal/15 p-6 rounded-2xl">
            <h3 className="text-base font-bold text-white uppercase tracking-wider mb-4 border-b border-muted-teal/10 pb-2 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              {t.draftTemplate}
            </h3>

            {/* Target Audience selection filters */}
            <div className="space-y-3 mb-4">
              <label className="block text-xs text-muted-teal font-bold uppercase font-mono">{t.targetAudience}</label>
              <div className="flex flex-col gap-2">
                <button
                  id="btn-audience-all"
                  onClick={() => setAudienceFilter('all')}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl text-left rtl:text-right border transition-all cursor-pointer ${
                    audienceFilter === 'all' 
                      ? 'border-primary bg-primary/10 text-primary' 
                      : 'border-muted-teal/15 bg-black/20 text-light-gray hover:bg-black/45'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>{t.allMembers} ({members.length})</span>
                </button>
                <button
                  id="btn-audience-active"
                  onClick={() => setAudienceFilter('active')}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl text-left rtl:text-right border transition-all cursor-pointer ${
                    audienceFilter === 'active' 
                      ? 'border-primary bg-primary/10 text-primary' 
                      : 'border-muted-teal/15 bg-black/20 text-light-gray hover:bg-black/45'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>{t.activeOnly} ({members.filter(m => m.isActive).length})</span>
                </button>
                <button
                  id="btn-audience-inactive"
                  onClick={() => setAudienceFilter('inactive')}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl text-left rtl:text-right border transition-all cursor-pointer ${
                    audienceFilter === 'inactive' 
                      ? 'border-primary bg-primary/10 text-primary' 
                      : 'border-muted-teal/15 bg-black/20 text-light-gray hover:bg-black/45'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>{t.inactiveOnly} ({members.filter(m => !m.isActive).length})</span>
                </button>
              </div>
            </div>

            {/* Message drafting form */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="block text-xs text-muted-teal font-bold uppercase font-mono">{t.draftTemplate}</label>
                <button
                  id="btn-reset-draft"
                  onClick={handleResetDraft}
                  className="text-[10px] text-primary hover:underline font-mono bg-transparent cursor-pointer"
                >
                  {isRtl ? 'إعادة تعيين النص' : 'Reset text'}
                </button>
              </div>
              
              <textarea
                id="fld-marketing-message-draft"
                rows={6}
                value={messageDraft}
                onChange={(e) => setMessageDraft(e.target.value)}
                className="w-full bg-black/40 border border-muted-teal/25 rounded-xl p-4 text-white text-xs focus:outline-none focus:border-primary resize-y font-sans leading-relaxed"
                placeholder={isRtl ? 'اكتب نص الحملة الإعلانية هنا...' : 'Draft campaign parameters here...'}
              />
              <p className="text-[10px] text-muted-teal leading-relaxed">
                {isRtl 
                  ? 'ملاحظة: يمكنك استخدام الفتغ {name} في مكان مرن وسيتم استبداله باسم المشترك تلقائياً في رابط الإرسال.'
                  : 'Pro-tip: insert token {name} anywhere in code to substitute recipient names dynamically.'}
              </p>
            </div>

            {/* Warn banner details */}
            <div className="mt-4 p-3 bg-slate-gray/30 rounded-xl flex gap-2 border border-muted-teal/10">
              <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-[10px] text-muted-teal leading-normal">
                {isRtl ? t.marketingNoteAr : t.marketingNoteEn}
              </p>
            </div>

          </div>
        </div>

        {/* Recipient list grids table on the right */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-gray/25 border border-muted-teal/15 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-5 border-b border-muted-teal/10 bg-black/15 flex justify-between items-center">
              <h3 className="font-bold text-white text-base uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                {isRtl ? `شريحة البث المختارة (${targetedMembers.length} هدف)` : `Selected Broadcasting Cohort (${targetedMembers.length} targets)`}
              </h3>
            </div>

            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-sm text-light-gray text-left rtl:text-right">
                <thead className="text-xs uppercase bg-black/25 text-muted-teal border-b border-muted-teal/15">
                  <tr>
                    <th scope="col" className="px-6 py-4">{isRtl ? 'المشترك المستهدف' : 'Target Member'}</th>
                    <th scope="col" className="px-6 py-4 font-mono">{t.phone}</th>
                    <th scope="col" className="px-6 py-4 text-center">{isRtl ? 'الحالة' : 'Plan State'}</th>
                    <th scope="col" className="px-6 py-4 text-center">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-muted-teal/10">
                  {targetedMembers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-xs text-muted-teal italic bg-slate-gray/5">
                        {t.noRecords}
                      </td>
                    </tr>
                  ) : (
                    targetedMembers.map((member) => {
                      const waUrl = getWhatsAppLink(member.phone, member.fullName);
                      const isDispatched = clickedMap[member.id] || false;
                      
                      return (
                        <tr key={member.id} className="hover:bg-black/10 transition-colors">
                          <td className="px-6 py-4 font-bold text-white">
                            {member.fullName}
                          </td>
                          <td className="px-6 py-4 font-mono font-bold text-xs">{member.phone}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold ${
                              member.isActive ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-slate-gray/30 text-light-gray'
                            }`}>
                              {member.isActive ? (isRtl ? 'نشط' : 'Active') : (isRtl ? 'رصيد غائب' : 'Deactivated')}
                            </span>
                          </td>

                          {/* Quick single send triggers for WhatsApp Broadcast */}
                          <td className="px-6 py-4 text-center">
                            <button
                              id={`btn-wa-broadcast-${member.id}`}
                              onClick={() => handleTriggerBroadcastAction(member.id, waUrl)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                                isDispatched 
                                  ? 'bg-black/40 text-primary border border-primary/45' 
                                  : 'bg-primary text-black hover:opacity-90'
                              }`}
                            >
                              {isDispatched ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>{isRtl ? 'تم الفتح' : 'Dispatched'}</span>
                                </>
                              ) : (
                                <>
                                  <Send className="w-3.5 h-3.5 stroke-[2.5]" />
                                  <span>{isRtl ? 'إرسال سريع' : 'Send Fast'}</span>
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
