import React, { useState } from 'react';
import { Equipment } from '../types';
import { translations } from '../lib/translations';
import { realmDB } from '../lib/realm';
import { Plus, CheckCircle2, ShieldAlert, AlertTriangle, Trash2, Edit2, DollarSign, X, Check, Wrench, ShoppingBag } from 'lucide-react';

interface EquipmentViewProps {
  role: 'admin' | 'male-trainer' | 'female-trainer';
  lang: 'ar' | 'en';
  equipment: Equipment[];
  onRefresh: () => void;
}

export default function EquipmentView({ role, lang, equipment, onRefresh }: EquipmentViewProps) {
  const t = translations[lang];
  const isRtl = lang === 'ar';
  const isAdmin = role === 'admin';

  // State Management
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'maintenance' | 'purchase'>('all');
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [equipmentToDelete, setEquipmentToDelete] = useState<Equipment | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    lastMaintenanceDate: new Date().toISOString().split('T')[0],
    status: 'Operational' as 'Operational' | 'Under Repair' | 'Out of Service',
    repairCost: 0 as number | '',
    notes: '',
    category: 'maintenance' as 'maintenance' | 'purchase'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingEquipment) {
      const updated: Equipment = {
        ...editingEquipment,
        name: formData.name,
        purchaseDate: formData.purchaseDate,
        lastMaintenanceDate: formData.lastMaintenanceDate,
        status: formData.status,
        repairCost: Number(formData.repairCost),
        notes: formData.notes || undefined,
        category: formData.category
      };
      realmDB.saveEquipment(updated);
      setEditingEquipment(null);
    } else {
      const created: Equipment = {
        id: `eq-${Date.now()}`,
        name: formData.name,
        purchaseDate: formData.purchaseDate,
        lastMaintenanceDate: formData.lastMaintenanceDate,
        status: formData.status,
        repairCost: Number(formData.repairCost),
        notes: formData.notes || undefined,
        category: formData.category
      };
      realmDB.saveEquipment(created);
    }
    
    setShowAddModal(false);

    // Reset Form
    setFormData({
      name: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      lastMaintenanceDate: new Date().toISOString().split('T')[0],
      status: 'Operational',
      repairCost: 0,
      notes: '',
      category: 'maintenance'
    });

    onRefresh();
  };

  const handleEdit = (machine: Equipment) => {
    setEditingEquipment(machine);
    setFormData({
      name: machine.name,
      purchaseDate: machine.purchaseDate,
      lastMaintenanceDate: machine.lastMaintenanceDate,
      status: machine.status,
      repairCost: machine.repairCost,
      notes: machine.notes || '',
      category: machine.category || 'maintenance'
    });
    setShowAddModal(true);
  };

  const handleDelete = (id: string) => {
    const machine = equipment.find(e => e.id === id);
    if (machine) {
      setEquipmentToDelete(machine);
    }
  };

  const confirmDeleteEquipment = () => {
    if (equipmentToDelete) {
      realmDB.deleteEquipment(equipmentToDelete.id);
      setEquipmentToDelete(null);
      onRefresh();
    }
  };

  const handleUpdateStatus = (machine: Equipment, newStatus: 'Operational' | 'Under Repair' | 'Out of Service') => {
    const updated: Equipment = {
      ...machine,
      status: newStatus
    };
    realmDB.saveEquipment(updated);
    onRefresh();
  };

  const totalCostForCare = equipment.reduce((acc, eq) => acc + eq.repairCost, 0);
  const totalMaintenanceCost = equipment
    .filter(e => !e.category || e.category === 'maintenance')
    .reduce((acc, eq) => acc + eq.repairCost, 0);
  const totalPurchaseCost = equipment
    .filter(e => e.category === 'purchase')
    .reduce((acc, eq) => acc + eq.repairCost, 0);

  // Filter items matching selectedFilter
  const filteredEquipment = equipment.filter((eq) => {
    if (selectedFilter === 'maintenance') {
      return !eq.category || eq.category === 'maintenance';
    }
    if (selectedFilter === 'purchase') {
      return eq.category === 'purchase';
    }
    return true; // 'all'
  });

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* Header section */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6 border-b border-muted-teal/15 pb-6">
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-wider flex items-center gap-3">
            <span className="w-2.5 h-8 bg-primary rounded-full inline-block"></span>
            {t.navMaintenance}
          </h2>
          <p className="text-sm text-muted-teal mt-1">{t.equipmentDesk}</p>
        </div>

        {/* Total Cost cards indicators */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Main Total */}
          <div className="bg-slate-gray/30 border border-muted-teal/15 px-4 py-2.5 rounded-xl flex items-center gap-2.5">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <DollarSign className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <p className="text-[10px] text-muted-teal uppercase font-mono tracking-wider">{isRtl ? 'إجمالي المبالغ المنصرفة' : 'Total Spent'}</p>
              <p className="text-sm font-black text-white font-mono">{totalCostForCare} {isRtl ? 'ج.م' : 'EGP'}</p>
            </div>
          </div>

          {/* Maintenance total */}
          <div className="bg-slate-gray/30 border border-muted-teal/15 px-4 py-2.5 rounded-xl flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-muted-teal uppercase font-mono tracking-wider">{isRtl ? 'مصاريف الصيانة' : 'Maintenance Cost'}</p>
              <p className="text-sm font-black text-white font-mono">{totalMaintenanceCost} {isRtl ? 'ج.م' : 'EGP'}</p>
            </div>
          </div>

          {/* Purchases total */}
          <div className="bg-slate-gray/30 border border-muted-teal/15 px-4 py-2.5 rounded-xl flex items-center gap-2.5">
            <div className="p-2 bg-sky-500/10 rounded-lg text-sky-400">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-muted-teal uppercase font-mono tracking-wider">{isRtl ? 'مصاريف المشتريات' : 'Purchases Spent'}</p>
              <p className="text-sm font-black text-white font-mono">{totalPurchaseCost} {isRtl ? 'ج.م' : 'EGP'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action panel & Category filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Category filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setSelectedFilter('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-2 cursor-pointer ${
              selectedFilter === 'all'
                ? 'bg-primary text-black'
                : 'bg-slate-gray/30 text-light-gray border border-muted-teal/15 hover:border-muted-teal/30'
            }`}
          >
            {isRtl ? 'عرض الكل' : 'View All'}
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${selectedFilter === 'all' ? 'bg-black/15 text-black' : 'bg-black/35 text-primary'}`}>
              {equipment.length}
            </span>
          </button>
          <button
            onClick={() => setSelectedFilter('maintenance')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-2 cursor-pointer ${
              selectedFilter === 'maintenance'
                ? 'bg-primary text-black'
                : 'bg-slate-gray/30 text-light-gray border border-muted-teal/15 hover:border-muted-teal/30'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            {isRtl ? 'مصاريف صيانة' : 'Maintenance'}
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${selectedFilter === 'maintenance' ? 'bg-black/15 text-black' : 'bg-black/35 text-primary'}`}>
              {equipment.filter(e => !e.category || e.category === 'maintenance').length}
            </span>
          </button>
          <button
            onClick={() => setSelectedFilter('purchase')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-2 cursor-pointer ${
              selectedFilter === 'purchase'
                ? 'bg-primary text-black'
                : 'bg-slate-gray/30 text-light-gray border border-muted-teal/15 hover:border-muted-teal/30'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            {isRtl ? 'مصاريف مشتريات' : 'Purchases'}
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${selectedFilter === 'purchase' ? 'bg-black/15 text-black' : 'bg-black/35 text-primary'}`}>
              {equipment.filter(e => e.category === 'purchase').length}
            </span>
          </button>
        </div>

        {/* Add Machine Button */}
        {isAdmin && (
          <button
            id="btn-add-machine-item"
            onClick={() => {
              setEditingEquipment(null);
              setFormData({
                name: '',
                purchaseDate: new Date().toISOString().split('T')[0],
                lastMaintenanceDate: new Date().toISOString().split('T')[0],
                status: 'Operational',
                repairCost: 0,
                notes: '',
                category: 'maintenance'
              });
              setShowAddModal(true);
            }}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-black font-extrabold uppercase tracking-widest text-xs rounded-xl shadow-lg hover:opacity-90 transition-all cursor-pointer w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 text-black stroke-[3]" />
            {t.addMachine}
          </button>
        )}
      </div>

      {/* Machinery assets grid lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredEquipment.length === 0 ? (
          <div className="col-span-2 text-center py-16 text-xs text-muted-teal italic bg-slate-gray/5 rounded-2xl border border-dashed border-muted-teal/15">
            {t.noRecords}
          </div>
        ) : (
          filteredEquipment.map((machine) => {
            const isPurchase = machine.category === 'purchase';
            return (
              <div
                key={machine.id}
                className="bg-slate-gray/25 border border-muted-teal/15 rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden group hover:border-primary/25 transition-all"
              >
                <div>
                  <div className="flex justify-between items-start border-b border-muted-teal/10 pb-3 mb-4">
                    <div className="space-y-1">
                      <h3 className="font-extrabold text-white text-base max-w-[220px] truncate leading-snug">{machine.name}</h3>
                      <p className="text-[10px] text-muted-teal font-mono uppercase">ID CODE: {machine.id}</p>
                    </div>

                    {/* Category & Status badges */}
                    <div className="flex flex-col items-end gap-1.5">
                      {isPurchase ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-sky-400 bg-sky-500/10 border border-sky-500/25 px-2.5 py-0.5 rounded-full">
                          <ShoppingBag className="w-3 h-3" />
                          {isRtl ? 'مشتريات' : 'Purchase'}
                        </span>
                      ) : (
                        <>
                          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 rounded-full">
                            <Wrench className="w-3 h-3" />
                            {isRtl ? 'مصاريف صيانة' : 'Maintenance'}
                          </span>
                          
                          {machine.status === 'Operational' ? (
                            <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase text-primary bg-primary/10 border border-primary/25 px-2 py-0.5 rounded-full mt-1">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              {t.operationalStatus}
                            </span>
                          ) : machine.status === 'Under Repair' ? (
                            <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase text-amber-400 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-full mt-1">
                              <AlertTriangle className="w-2.5 h-2.5 animate-pulse" />
                              {t.underRepairStatus}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase text-red-400 bg-red-950/40 border border-red-500/25 px-2 py-0.5 rounded-full mt-1">
                              <ShieldAlert className="w-2.5 h-2.5" />
                              {t.outOfServiceStatus}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Notes & Description */}
                  {machine.notes && (
                    <p className="text-xs text-light-gray italic bg-slate-gray/40 border-l-2 border-muted-teal/20 p-2.5 rounded mb-4">
                      {machine.notes}
                    </p>
                  )}

                  {/* Parameters specs */}
                  <div className="grid grid-cols-2 gap-4 text-xs font-mono mb-4 text-light-gray">
                    <div>
                      <p className="text-[10px] text-muted-teal uppercase font-mono">
                        {isRtl ? 'تاريخ الصرف الشراء' : 'Purchase Date'}
                      </p>
                      <p className="text-white font-bold">{machine.purchaseDate}</p>
                    </div>
                    {!isPurchase && (
                      <div>
                        <p className="text-[10px] text-muted-teal uppercase font-mono">{t.lastMaintenance}</p>
                        <p className="text-white font-bold">{machine.lastMaintenanceDate}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-muted-teal/10 flex items-center justify-between text-xs font-sans">
                  
                  {/* Costs sum */}
                  <div className="text-left rtl:text-right">
                    <p className="text-[10px] text-muted-teal uppercase font-mono">{t.repairCost}</p>
                    <p className="text-sm font-black text-primary font-mono">{machine.repairCost} {isRtl ? 'ج.م' : 'EGP'}</p>
                  </div>

                  {/* Switch Action parameters */}
                  <div className="flex items-center gap-2">
                    {!isPurchase && (
                      <select
                        id={`select-status-mach-${machine.id}`}
                        value={machine.status}
                        onChange={(e) => handleUpdateStatus(machine, e.target.value as any)}
                        className="bg-black/35 border border-muted-teal/15 text-light-gray text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-primary font-bold cursor-pointer"
                      >
                        <option value="Operational">✓ {t.operationalStatus}</option>
                        <option value="Under Repair">⚠ {t.underRepairStatus}</option>
                        <option value="Out of Service">❌ {t.outOfServiceStatus}</option>
                      </select>
                    )}

                    {isAdmin && (
                      <div className="flex gap-1.5">
                        <button
                          id={`btn-edit-machine-${machine.id}`}
                          onClick={() => handleEdit(machine)}
                          title={isRtl ? 'تعديل بند المصروف' : 'Edit Expense'}
                          className="p-2 bg-slate-gray/40 border border-muted-teal/20 text-sky-400 hover:bg-sky-500/15 rounded-lg transition-all cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id={`btn-del-machine-${machine.id}`}
                          onClick={() => handleDelete(machine.id)}
                          title={isRtl ? 'حذف بند المصروف' : 'Delete Expense'}
                          className="p-2 bg-slate-gray/40 border border-muted-teal/20 text-red-400 hover:bg-red-500/15 rounded-lg transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add New Equipment dialog */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 flex items-center justify-center p-4">
          <div className="bg-dark-charcoal border border-muted-teal max-w-md w-full rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-black text-white uppercase tracking-wider mb-4 border-b border-muted-teal/15 pb-2">
              {editingEquipment ? (isRtl ? 'تعديل بيانات المصروف' : 'Edit Expense Details') : t.addMachine}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Category selector */}
              <div>
                <label className="block text-xs text-muted-teal uppercase font-mono mb-1 font-bold">
                  {isRtl ? 'نوع وتصنيف المصروف:' : 'Expense Classification:'}
                </label>
                <select
                  id="fld-item-category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full bg-black/40 border border-muted-teal/25 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-primary"
                >
                  <option value="maintenance">{isRtl ? 'مصاريف صيانة (أجهزة وإصلاحات)' : 'Maintenance / Repair Expense'}</option>
                  <option value="purchase">{isRtl ? 'مصاريف مشتريات جديدة (كرسي، مكنسة، أدوات...)' : 'New Gym Purchase / Supplies Expense'}</option>
                </select>
              </div>

              {/* Machine name */}
              <div>
                <label className="block text-xs text-muted-teal uppercase font-mono mb-1 font-bold">{t.equipName}</label>
                <input
                  id="fld-[machine-name]"
                  type="text"
                  required
                  placeholder={formData.category === 'purchase' ? (isRtl ? "مكنسة، كراسي، أثاث..." : "Vacuum cleaner, chairs, furniture...") : (isRtl ? "صيانة المشاية، سير جديد..." : "Treadmill repair, engine oil...")}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-black/40 border border-muted-teal/25 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-primary"
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className={formData.category === 'purchase' ? 'col-span-2' : 'col-span-1'}>
                  <label className="block text-xs text-muted-teal uppercase font-mono mb-1 font-bold">{isRtl ? 'تاريخ الصرف الشراء' : 'Expense / Purchase Date'}</label>
                  <input
                    id="fld-[machine-purchase]"
                    type="date"
                    required
                    value={formData.purchaseDate}
                    onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                    className="w-full bg-black/40 border border-muted-teal/25 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none focus:border-primary font-mono"
                  />
                </div>
                {formData.category === 'maintenance' && (
                  <div>
                    <label className="block text-xs text-muted-teal uppercase font-mono mb-1 font-bold">{t.lastMaintenance}</label>
                    <input
                      id="fld-[machine-care]"
                      type="date"
                      required
                      value={formData.lastMaintenanceDate}
                      onChange={(e) => setFormData({ ...formData, lastMaintenanceDate: e.target.value })}
                      className="w-full bg-black/40 border border-muted-teal/25 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none focus:border-primary font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Status Selector - Only show for maintenance */}
              {formData.category === 'maintenance' && (
                <div>
                  <label className="block text-xs text-muted-teal uppercase font-mono mb-1 font-bold">{t.statusState}</label>
                  <select
                    id="fld-[machine-status]"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full bg-black/40 border border-muted-teal/25 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-primary"
                  >
                    <option value="Operational">Operational</option>
                    <option value="Under Repair">Under Repair</option>
                    <option value="Out of Service">Out of Service</option>
                  </select>
                </div>
              )}

              {/* Repair Care Prices */}
              <div>
                <label className="block text-xs text-muted-teal uppercase font-mono mb-1 font-bold">{t.repairCost} ({isRtl ? 'ج.م' : 'EGP'})</label>
                <input
                  id="fld-[machine-cost]"
                  type="number"
                  min="0"
                  required
                  translate="no"
                  dir="ltr"
                  value={formData.repairCost}
                  onChange={(e) => setFormData({ ...formData, repairCost: e.target.value === '' ? '' : Number(e.target.value) })}
                  onFocus={(e) => e.target.select()}
                  className="w-full bg-black/40 border border-muted-teal/25 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-primary font-mono text-center notranslate dir-ltr"
                />
              </div>

              {/* Engineering notes details */}
              <div>
                <label className="block text-xs text-muted-teal uppercase font-mono mb-1 font-bold">{isRtl ? 'تفاصيل بنود المصروف والبيانات الإضافية' : 'Expense breakdown details & Extra comments'}</label>
                <textarea
                  id="fld-[machine-notes]"
                  rows={2}
                  placeholder={isRtl ? "توضيحات شراء أو صيانة..." : "Details on purchase or work carried out..."}
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-black/40 border border-muted-teal/25 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-primary resize-none placeholder-muted-teal/50"
                />
              </div>

              {/* Modal controls actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-muted-teal/15">
                <button
                  id="btn-cancel-eq"
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-gray text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-slate-gray/80 transition-all cursor-pointer"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  id="btn-save-machine-care"
                  type="submit"
                  className="px-4 py-2 bg-primary text-black font-extrabold text-xs uppercase tracking-widest rounded-xl hover:opacity-95 transition-all cursor-pointer"
                >
                  {t.saveChange}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Custom Equipment Delete Confirmation Modal */}
      {equipmentToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 flex items-center justify-center p-4">
          <div className="bg-dark-charcoal border border-red-500/30 max-w-md w-full rounded-2xl p-6 shadow-2xl relative">
            <h3 className="text-lg font-black text-red-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="w-2.5 h-6 bg-red-500 rounded-full inline-block"></span>
              {isRtl ? 'حذف بند مصروفات' : 'Delete Expense Log'}
            </h3>
            <p className="text-sm text-light-gray mb-6 leading-relaxed">
              {isRtl 
                ? `هل أنت متأكد تماماً من حذف بند المصروفات "${equipmentToDelete.name}" بشكل نهائي من الدفاتر المالية؟`
                : `Are you sure you want to permanently delete expense item "${equipmentToDelete.name}" from treasury registers?`}
            </p>
            <div className="flex justify-end gap-3 pt-4 border-t border-muted-teal/15">
              <button
                id="btn-cancel-eq-delete"
                onClick={() => setEquipmentToDelete(null)}
                className="px-4 py-2 bg-slate-gray text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-slate-gray/80 transition-all cursor-pointer"
              >
                {isRtl ? 'تراجع' : 'Cancel'}
              </button>
              <button
                id="btn-confirm-eq-delete"
                onClick={confirmDeleteEquipment}
                className="px-4 py-2 bg-red-600 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl hover:bg-red-500 transition-all cursor-pointer"
              >
                {isRtl ? 'تأكيد الحذف' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
