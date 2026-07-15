import React, { useState } from 'react';
import { SessionTicket } from '../types';
import { translations } from '../lib/translations';
import { realmDB } from '../lib/realm';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  X, 
  Check, 
  Search, 
  MessageCircle, 
  Phone, 
  User, 
  PlusCircle, 
  MinusCircle, 
  Tag, 
  Coins, 
  Users, 
  ClipboardCopy,
  ChevronRight,
  Filter
} from 'lucide-react';

interface SessionsViewProps {
  role: 'admin' | 'male-trainer' | 'female-trainer';
  lang: 'ar' | 'en';
  sessions: SessionTicket[];
  onRefresh: () => void;
}

export default function SessionsView({ role, lang, sessions, onRefresh }: SessionsViewProps) {
  const t = translations[lang];
  const isRtl = lang === 'ar';
  const isAdmin = role === 'admin';

  // State Management
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSession, setEditingSession] = useState<SessionTicket | null>(null);
  const [ticketToDelete, setTicketToDelete] = useState<SessionTicket | null>(null);
  
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    sessionsCount: 1 as number | '',
    genderSection: 'male' as 'male' | 'female',
    notes: '',
    price: 0 as number | '',
    sessionType: 'adult' as 'adult' | 'kids'
  });

  const getTodayStr = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const handleSessionTypeChange = (type: 'adult' | 'kids') => {
    const s = realmDB.getSettings();
    const perSessionPrice = type === 'adult'
      ? (s.pricingSessionAdults ?? 50)
      : (s.pricingSessionKids ?? 30);
    const count = formData.sessionsCount === '' ? 0 : Number(formData.sessionsCount);
    const calculatedPrice = count * perSessionPrice;

    setFormData(prev => ({
      ...prev,
      sessionType: type,
      price: calculatedPrice === 0 && count > 0 ? perSessionPrice : calculatedPrice
    }));
  };

  const handleSessionsCountChange = (count: number | '') => {
    const s = realmDB.getSettings();
    let calculatedPrice = 0;
    if (count !== '') {
      const perSessionPrice = formData.sessionType === 'adult'
        ? (s.pricingSessionAdults ?? 50)
        : (s.pricingSessionKids ?? 30);
      calculatedPrice = count * perSessionPrice;
    }
    
    setFormData(prev => ({
      ...prev,
      sessionsCount: count,
      price: count === '' ? '' : calculatedPrice
    }));
  };

  const handleOpenAdd = () => {
    setEditingSession(null);
    const s = realmDB.getSettings();
    setFormData({
      fullName: '',
      phone: '',
      sessionsCount: 1,
      genderSection: 'male',
      notes: '',
      price: s.pricingSessionAdults ?? 50,
      sessionType: 'adult'
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (ticket: SessionTicket) => {
    setEditingSession(ticket);
    setFormData({
      fullName: ticket.fullName,
      phone: ticket.phone,
      sessionsCount: ticket.sessionsCount,
      genderSection: ticket.genderSection,
      notes: ticket.notes || '',
      price: ticket.price || 0,
      sessionType: ticket.sessionType || 'adult'
    });
    setShowAddModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim()) return;

    if (editingSession) {
      const updated: SessionTicket = {
        ...editingSession,
        fullName: formData.fullName.trim(),
        phone: formData.phone.trim(),
        sessionsCount: Math.max(0, formData.sessionsCount === '' ? 0 : Number(formData.sessionsCount)),
        genderSection: formData.genderSection,
        notes: formData.notes.trim() || undefined,
        price: Number(formData.price) || 0,
        sessionType: formData.sessionType
      };
      realmDB.saveSessionTicket(updated);
    } else {
      const created: SessionTicket = {
        id: `session-${Date.now()}`,
        fullName: formData.fullName.trim(),
        phone: formData.phone.trim(),
        sessionsCount: Math.max(0, formData.sessionsCount === '' ? 0 : Number(formData.sessionsCount)),
        genderSection: formData.genderSection,
        registrationDate: getTodayStr(),
        notes: formData.notes.trim() || undefined,
        price: Number(formData.price) || 0,
        sessionType: formData.sessionType
      };
      realmDB.saveSessionTicket(created);
    }

    setShowAddModal(false);
    onRefresh();
  };

  const handleDelete = (id: string) => {
    if (!isAdmin) return;
    const ticket = sessions.find(s => s.id === id);
    if (ticket) {
      setTicketToDelete(ticket);
    }
  };

  const confirmDelete = () => {
    if (!isAdmin) return;
    if (ticketToDelete) {
      realmDB.deleteSessionTicket(ticketToDelete.id);
      setTicketToDelete(null);
      onRefresh();
    }
  };

  const incrementSessions = (ticket: SessionTicket) => {
    const s = realmDB.getSettings();
    const type = ticket.sessionType || 'adult';
    const perSessionPrice = type === 'adult'
      ? (s.pricingSessionAdults ?? 50)
      : (s.pricingSessionKids ?? 30);

    const updated: SessionTicket = {
      ...ticket,
      sessionsCount: ticket.sessionsCount + 1,
      price: (ticket.price || 0) + perSessionPrice
    };
    realmDB.saveSessionTicket(updated);
    onRefresh();
  };

  const decrementSessions = (ticket: SessionTicket) => {
    if (!isAdmin) return;
    if (ticket.sessionsCount <= 0) return;
    const s = realmDB.getSettings();
    const type = ticket.sessionType || 'adult';
    const perSessionPrice = type === 'adult'
      ? (s.pricingSessionAdults ?? 50)
      : (s.pricingSessionKids ?? 30);

    const updated: SessionTicket = {
      ...ticket,
      sessionsCount: ticket.sessionsCount - 1,
      price: Math.max(0, (ticket.price || 0) - perSessionPrice)
    };
    realmDB.saveSessionTicket(updated);
    onRefresh();
  };

  // Build WhatsApp Message Link
  const handleWhatsAppMessage = (phone: string, name: string) => {
    let digits = phone.replace(/\D/g, '');
    if (digits.startsWith('01') && digits.length === 11) {
      digits = '20' + digits.substring(1);
    }
    const txt = isRtl 
      ? `السلام عليكم يا كابتن ${name}. نود تذكيرك بعدد الحصص الرياضية المتبقية/المسجلة في حسابك لدينا.`
      : `Hello ${name}, we would like to update you on your registered training sessions.`;
    
    const url = `https://wa.me/${digits}?text=${encodeURIComponent(txt)}`;
    window.open(url, '_blank');
  };

  // Filters logic
  const filteredSessions = sessions.filter(s => {
    const matchesSearch = s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.phone.includes(searchQuery);
    const matchesGender = genderFilter === 'all' || s.genderSection === genderFilter;
    return matchesSearch && matchesGender;
  });

  const aggregateTotalSessions = sessions.reduce((acc, curr) => acc + curr.sessionsCount, 0);

  return (
    <div className="space-y-6">
      {/* Header and Add Action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-gray p-6 rounded-2xl border border-primary/10 shadow-lg">
        <div>
          <h2 className="text-2xl font-black text-white tracking-wide font-mono flex items-center gap-3">
            <Tag className="w-7 h-7 text-primary" />
            {isRtl ? 'نظام تتبع وإدارة الحصص الرياضية' : 'Session Counter & Tracking System'}
          </h2>
          <p className="text-sm text-muted-teal mt-1 font-mono">
            {isRtl 
              ? 'إدارة الأعضاء ويسجلون بالحصص المنفردة وتخصيص أرصدتهم اليومية.' 
              : 'Keep track of members with customizable session counts and reminders.'}
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="bg-primary text-black font-black hover:bg-opacity-90 px-5 py-3 rounded-xl transition duration-250 flex items-center gap-2 text-sm shadow-md font-sans"
        >
          <Plus className="w-5 h-5 stroke-[3]" />
          {isRtl ? 'إضافة عضو حصص جديد' : 'New Session Entry'}
        </button>
      </div>

      {/* Aggregate metrics for casuals */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#2D3740] p-6 rounded-2xl border border-[#3E4E5B] shadow-sm">
          <p className="text-xs text-muted-teal uppercase font-mono tracking-wider">
            {isRtl ? 'إجمالي المقيدين بالحصص' : 'Total Session Members'}
          </p>
          <div className="flex justify-between items-center mt-2">
            <h3 className="text-3xl font-black text-white font-mono">{sessions.length}</h3>
            <Users className="w-8 h-8 text-primary opacity-40" />
          </div>
        </div>

        <div className="bg-[#2D3740] p-6 rounded-2xl border border-[#3E4E5B] shadow-sm">
          <p className="text-xs text-muted-teal uppercase font-mono tracking-wider">
            {isRtl ? 'إجمالي الحصص المسجلة' : 'Aggregated Session Pool'}
          </p>
          <div className="flex justify-between items-center mt-2">
            <h3 className="text-3xl font-black text-white font-mono">{aggregateTotalSessions}</h3>
            <Coins className="w-8 h-8 text-primary opacity-40" />
          </div>
        </div>

        <div className="bg-[#2D3740] p-6 rounded-2xl border border-[#3E4E5B] shadow-sm">
          <p className="text-xs text-muted-teal uppercase font-mono tracking-wider">
            {isRtl ? 'المشتركون اليوم' : 'Active Trackers'}
          </p>
          <div className="flex justify-between items-center mt-2">
            <h3 className="text-3xl font-black text-white font-mono">
              {sessions.filter(s => s.sessionsCount > 0).length}
            </h3>
            <div className="text-xs bg-primary/15 text-primary border border-primary/30 px-2 py-1 rounded-lg font-mono">
              {isRtl ? 'أرصدة متبقية' : 'With Sessions'}
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Panel */}
      <div className="flex flex-col md:flex-row gap-4 bg-slate-gray p-4 rounded-xl border border-primary/5 shadow-inner">
        <div className="flex-1 relative">
          <Search className="absolute top-1/2 left-3 -translate-y-1/2 w-5 h-5 text-muted-teal" />
          <input
            type="text"
            className="w-full bg-[#1e252b] border border-[#3E4E5B] text-white focus:outline-none focus:border-primary px-10 py-3 rounded-lg text-sm placeholder:text-[#536575] font-sans"
            placeholder={isRtl ? 'ابحث باسم عضو الحصة أو رقم الهاتف...' : 'Search by name or mobile...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setGenderFilter('all')}
            className={`px-4 py-2.5 rounded-lg text-xs font-mono border ${
              genderFilter === 'all'
                ? 'bg-primary border-primary text-black font-black'
                : 'bg-[#1e252b] border-[#3E4E5B] text-muted-teal hover:text-white'
            }`}
          >
            {isRtl ? 'الكل' : 'All Sections'}
          </button>
          
          <button
            onClick={() => setGenderFilter('male')}
            className={`px-4 py-2.5 rounded-lg text-xs font-mono border ${
              genderFilter === 'male'
                ? 'bg-primary border-primary text-black font-black'
                : 'bg-[#1e252b] border-[#3E4E5B] text-muted-teal hover:text-white'
            }`}
          >
            {isRtl ? 'قسم الرجال' : 'Boys'}
          </button>

          <button
            onClick={() => setGenderFilter('female')}
            className={`px-4 py-2.5 rounded-lg text-xs font-mono border ${
              genderFilter === 'female'
                ? 'bg-primary border-primary text-black font-black'
                : 'bg-[#1e252b] border-[#3E4E5B] text-muted-teal hover:text-white'
            }`}
          >
            {isRtl ? 'قسم السيدات' : 'Girls'}
          </button>
        </div>
      </div>

      {/* Grid of Casual cards */}
      {filteredSessions.length === 0 ? (
        <div className="bg-slate-gray/50 rounded-2xl p-12 text-center border border-dashed border-[#3E4E5B] outline-none">
          <MessageCircle className="w-12 h-12 text-muted-teal mx-auto opacity-30 mb-3" />
          <p className="text-gray-400 font-sans text-sm">
            {isRtl ? 'لا توجد بيانات تطابق بحثك حالياً.' : 'No session entries found matching filters.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSessions.map(ticket => (
            <div 
              key={ticket.id}
              className="bg-slate-gray p-6 rounded-2xl border border-primary/5 hover:border-primary/20 transition-all duration-200 relative shadow-md flex flex-col justify-between"
            >
              {/* Card Header */}
              <div>
                <div className="flex justify-between items-start gap-2">
                  <div className="flex gap-1.5 flex-wrap">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md uppercase font-sans ${
                      ticket.genderSection === 'male' 
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/25' 
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/25'
                    }`}>
                      {ticket.genderSection === 'male' ? (isRtl ? 'قسم الرجال' : 'Boys') : (isRtl ? 'قسم السيدات' : 'Girls')}
                    </span>
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-md uppercase font-sans ${
                      ticket.sessionType === 'kids'
                        ? 'bg-amber-400/15 text-amber-400 border border-amber-500/25'
                        : 'bg-emerald-400/15 text-emerald-400 border border-emerald-500/25'
                    }`}>
                      {ticket.sessionType === 'kids' ? (isRtl ? 'حصة أطفال' : 'Kids') : (isRtl ? 'حصة بالغين' : 'Adults')}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(ticket)}
                      className="p-1 px-2 bg-[#1e252b] hover:bg-neutral-800 text-slate-300 rounded border border-[#3E4E5B] hover:text-white"
                      title={isRtl ? "تعديل" : "Edit"}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(ticket.id)}
                        className="p-1 px-2 bg-red-950/20 hover:bg-red-900/30 text-rose-300 rounded border border-rose-900/40 hover:text-red-100 cursor-pointer"
                        title={isRtl ? "حذف" : "Delete"}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <h4 className="text-lg font-black text-white leading-tight font-sans">
                    {ticket.fullName}
                  </h4>
                  
                  <div className="flex items-center gap-2 text-muted-teal text-xs font-mono mt-1.5">
                    <Phone className="w-3.5 h-3.5 text-primary opacity-60" />
                    <span>{ticket.phone || (isRtl ? "بدون هاتف" : "No Phone")}</span>
                  </div>

                  {/* Price info badge */}
                  <div className="flex items-center gap-2 text-xs text-muted-teal font-sans mt-3 bg-black/20 p-2 rounded-xl border border-muted-teal/5 w-fit">
                    <span className="font-extrabold text-primary font-mono text-sm">
                      {ticket.price || 0} {isRtl ? 'ج.م' : 'EGP'}
                    </span>
                    <span className="text-[11px] text-muted-teal/75">{isRtl ? 'سعر باقة الحصص' : 'Session Package Price'}</span>
                  </div>

                  {ticket.notes && (
                    <p className="text-xs bg-[#1e252b] p-2.5 rounded-lg border border-[#3E4E5B] mt-3 text-slate-300 leading-normal font-sans">
                      {ticket.notes}
                    </p>
                  )}
                </div>
              </div>

              {/* Card Footer: Sessions count adjuster & WhatsApp link */}
              <div className="mt-6 pt-4 border-t border-[#3E4E5B] space-y-4">
                <div className="flex justify-between items-center bg-[#1e252b] p-2.5 rounded-xl border border-[#3E4E5B]">
                  <span className="text-xs text-muted-teal font-sans">
                    {isRtl ? 'الحصص المحضورة:' : 'Sessions count:'}
                  </span>
                  
                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <button
                        onClick={() => decrementSessions(ticket)}
                        className="text-muted-teal hover:text-red-400 transition cursor-pointer"
                        title={isRtl ? "إنقاص حصة" : "Subtract Session"}
                      >
                        <MinusCircle className="w-5 h-5" />
                      </button>
                    )}
                    
                    <span className="font-mono text-base font-black text-[#F1F5F9] px-2 min-w-[20px] text-center">
                      {ticket.sessionsCount}
                    </span>
 
                    <button
                      onClick={() => incrementSessions(ticket)}
                      className="text-muted-teal hover:text-primary transition cursor-pointer"
                      title={isRtl ? "إضافة حصة" : "Add Session"}
                    >
                      <PlusCircle className="w-5 h-5 text-primary" />
                    </button>
                  </div>
                </div>

                {ticket.phone && (
                  <button
                    onClick={() => handleWhatsAppMessage(ticket.phone, ticket.fullName)}
                    className="w-full bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 text-[#25D366] font-bold py-2 px-3 rounded-lg text-xs transition duration-200 flex items-center justify-center gap-2 font-mono"
                  >
                    <MessageCircle className="w-4 h-4" />
                    {isRtl ? 'مراسلة العميل (واتساب)' : 'Send WhatsApp Message'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#2D3740] rounded-2xl border border-primary/20 max-w-sm w-full p-5 shadow-2xl relative">
            <button
               onClick={() => setShowAddModal(false)}
               className="absolute top-4 right-4 text-muted-teal hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-black text-white tracking-wide font-sans mb-3">
              {editingSession 
                ? (isRtl ? 'تعديل بيانات عضو الحصص' : 'Edit Session Tracker') 
                : (isRtl ? 'تسجيل عضو حصص منفردة جديد' : 'New Drop-In Member')}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Full Name */}
              <div>
                <label className="block text-[11px] font-mono uppercase text-muted-teal mb-0.5">
                  {isRtl ? 'الاسم بالكامل *' : 'Full Name *'}
                </label>
                <input
                  type="text"
                  required
                  className="w-full bg-[#1e252b] border border-[#3E4E5B] text-white focus:outline-none focus:border-primary px-3 py-1.5 rounded-lg text-sm font-sans"
                  placeholder={isRtl ? 'مثال: أحمد فؤاد سلامة' : 'e.g. Mahmoud Ahmed'}
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-[11px] font-mono uppercase text-muted-teal mb-0.5">
                  {isRtl ? 'رقم الهاتف' : 'Phone Number'}
                </label>
                <input
                  type="text"
                  className="w-full bg-[#1e252b] border border-[#3E4E5B] text-white focus:outline-none focus:border-primary px-3 py-1.5 rounded-lg text-sm font-mono text-left"
                  placeholder="01xxxxxxxxx"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              {/* Type of casual session (Kids / Adults) */}
              <div>
                <label className="block text-[11px] font-mono uppercase text-[#C4D600] mb-1 font-bold">
                  {isRtl ? 'نوع الحصة الرياضية' : 'Session Ticket Type'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSessionTypeChange('adult')}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold border transition text-center cursor-pointer ${
                      formData.sessionType === 'adult'
                        ? 'bg-primary border-primary text-black font-black'
                        : 'bg-[#1e252b] border-[#3E4E5B] text-muted-teal hover:text-white font-normal'
                    }`}
                  >
                    {isRtl ? 'حصة للبالغين' : 'Adults Session'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSessionTypeChange('kids')}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold border transition text-center cursor-pointer ${
                      formData.sessionType === 'kids'
                        ? 'bg-primary border-primary text-black font-black'
                        : 'bg-[#1e252b] border-[#3E4E5B] text-muted-teal hover:text-white font-normal'
                    }`}
                  >
                    {isRtl ? 'حصة للأطفال' : 'Kids Session'}
                  </button>
                </div>
              </div>

              {/* Grid block */}
              <div className="grid grid-cols-2 gap-3">
                {/* Gender selection */}
                <div>
                  <label className="block text-[11px] font-mono uppercase text-muted-teal mb-0.5">
                    {isRtl ? 'القسم / الصالة' : 'Gym Section'}
                  </label>
                  <select
                    className="w-full bg-[#1e252b] border border-[#3E4E5B] text-white focus:outline-none focus:border-primary px-3 py-1.5 rounded-lg text-sm font-sans"
                    value={formData.genderSection}
                    onChange={(e) => setFormData({ ...formData, genderSection: e.target.value as 'male' | 'female' })}
                  >
                    <option value="male">{isRtl ? 'رجال' : 'Men'}</option>
                    <option value="female">{isRtl ? 'سيدات' : 'Women'}</option>
                  </select>
                </div>

                {/* Sessions initial count */}
                <div>
                  <label className="block text-[11px] font-mono uppercase text-muted-teal mb-0.5">
                    {isRtl ? 'عدد الحصص المقيدة' : 'Initial Sessions'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    translate="no"
                    dir="ltr"
                    className="w-full bg-[#1e252b] border border-[#3E4E5B] text-white focus:outline-none focus:border-primary px-3 py-1.5 rounded-lg text-sm font-mono text-center notranslate dir-ltr"
                    value={formData.sessionsCount}
                    onChange={(e) => handleSessionsCountChange(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                    onFocus={(e) => e.target.select()}
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {[1, 2, 5, 10].map(count => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => handleSessionsCountChange(count)}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded border tracking-wide transition duration-150 ${
                          formData.sessionsCount === count
                            ? 'bg-primary border-primary text-black font-black'
                            : 'bg-black/30 border-[#3E4E5B] text-muted-teal hover:text-white'
                        }`}
                      >
                        {isRtl ? `${count} حصص` : `${count} Sess`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-mono uppercase text-muted-teal mb-0.5 font-bold">
                  {isRtl ? 'ملاحظات وتفاصيل إضافية' : 'Custom Notes / Details'}
                </label>
                <textarea
                  className="w-full bg-[#1e252b] border border-[#3E4E5B] text-white focus:outline-none focus:border-primary px-3 py-1.5 rounded-lg text-sm font-sans h-16 resize-none"
                  placeholder={isRtl ? 'تاريخ الدفع، مواعيد معينة أو إيصالات...' : 'Optional metadata notes...'}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              {/* Price (Editable only by Admin, Visible to Trainers as Read-Only) */}
              <div>
                <label className="block text-[11px] font-mono uppercase text-muted-teal mb-0.5 flex items-center justify-between font-bold">
                  <span>{isRtl ? 'سعر الحصص / الباقة *' : 'Session/Package Price *'}</span>
                  {!isAdmin && <span className="text-[10px] text-amber-400 font-extrabold">{isRtl ? '🔒 للمدير فقط' : '🔒 Admin Only'}</span>}
                </label>
                <input
                  type="number"
                  min="0"
                  disabled={!isAdmin}
                  required
                  translate="no"
                  dir="ltr"
                  className={`w-full bg-[#1e252b] border border-[#3E4E5B] text-white focus:outline-none focus:border-primary px-3 py-1.5 rounded-lg text-sm font-mono text-center notranslate dir-ltr ${
                    !isAdmin ? 'opacity-55 cursor-not-allowed bg-black/35 text-slate-400' : ''
                  }`}
                  placeholder="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value === '' ? '' : Number(e.target.value) || 0 })}
                  onFocus={(e) => e.target.select()}
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 text-sm text-gray-400 hover:text-white"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="bg-primary text-black font-black px-4 py-1.5 rounded-lg text-sm hover:bg-opacity-90"
                >
                  {isRtl ? 'حفظ البيانات' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {ticketToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#2D3740] rounded-2xl border border-rose-500/30 max-w-md w-full p-6 shadow-2xl relative">
            <h3 className="text-xl font-black text-rose-400 tracking-wide font-sans mb-2">
              {isRtl ? 'حذف بطاقة حصص العضو؟' : 'Confirm Delete?'}
            </h3>
            
            <p className="text-sm text-gray-300 mb-6 font-sans">
              {isRtl 
                ? `هل أنت متأكد تماماً من حذف العضو "${ticketToDelete.fullName}" وإلغاء رصيد حصصه بالكامل من السجلات؟ لا يمكن التراجع عن هذا الإجراء.` 
                : `Are you sure you want to completely erase the session card of "${ticketToDelete.fullName}"? All session logs will be permanently deleted.`}
            </p>

            <div className="flex justify-end gap-3 font-sans">
              <button
                onClick={() => setTicketToDelete(null)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white"
              >
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={confirmDelete}
                className="bg-red-500 hover:bg-red-600 text-white font-bold px-4 py-2 rounded-lg text-sm"
              >
                {isRtl ? 'حذف الآن' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
