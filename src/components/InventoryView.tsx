import React, { useState } from 'react';
import { Product, Sale } from '../types';
import { translations } from '../lib/translations';
import { realmDB } from '../lib/realm';
import { Plus, ShoppingCart, ShoppingBag, Trash2, Edit2, Tag, ShieldCheck, Lock, CreditCard, ChevronRight, X, Check } from 'lucide-react';

interface InventoryViewProps {
  role: 'admin' | 'male-trainer' | 'female-trainer';
  lang: 'ar' | 'en';
  products: Product[];
  onRefresh: () => void;
}

interface CartItem {
  product: Product;
  qty: number;
}

export default function InventoryView({ role, lang, products, onRefresh }: InventoryViewProps) {
  const t = translations[lang];
  const isRtl = lang === 'ar';
  const isAdmin = role === 'admin';

  // Categories list with dynamic persistence
  const [categories, setCategories] = React.useState<string[]>(() => {
    const saved = localStorage.getItem('gym_product_categories');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback on error
      }
    }
    return ["Supplements", "Energy Drinks", "Nutrition", "Accessories", "Equipment"];
  });

  // State Management
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    nameEn: '',
    nameAr: '',
    category: 'Supplements',
    stockQty: 10 as number | '',
    costPrice: 50 as number | '',
    retailPrice: 85 as number | '',
    thresholdQty: 5 as number | ''
  });

  const [showNewCategorySection, setShowNewCategorySection] = useState(false);
  const [showManageCategories, setShowManageCategories] = useState(false);
  const [newCategoryVal, setNewCategoryVal] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | null }>({ message: '', type: null });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => prev.message === message ? { message: '', type: null } : prev);
    }, 4000);
  };

  const handleAddNewCategory = () => {
    const trimmed = newCategoryVal.trim();
    if (trimmed) {
      if (!categories.includes(trimmed)) {
        const updatedCats = [...categories, trimmed];
        setCategories(updatedCats);
        localStorage.setItem('gym_product_categories', JSON.stringify(updatedCats));
        setFormData(prev => ({ ...prev, category: trimmed }));
      } else {
        setFormData(prev => ({ ...prev, category: trimmed }));
      }
      setNewCategoryVal('');
      setShowNewCategorySection(false);
      showToast(isRtl ? `تمت إضافة تصنيف "${trimmed}" بنجاح!` : `Added category "${trimmed}" successfully!`, 'success');
    }
  };

  const handleDeleteCategory = (catToDelete: string) => {
    if (categories.length <= 1) {
      showToast(isRtl ? 'يجب أن يبقى تصنيف واحد على الأقل بالتطبيق!' : 'At least one category must remain in the application!', 'error');
      return;
    }
    const updatedCats = categories.filter(c => c !== catToDelete);
    setCategories(updatedCats);
    localStorage.setItem('gym_product_categories', JSON.stringify(updatedCats));
    
    if (formData.category === catToDelete) {
      setFormData(prev => ({ ...prev, category: updatedCats[0] }));
    }
    showToast(isRtl ? `تم حذف تصنيف "${catToDelete}" بنجاح!` : `Deleted category "${catToDelete}" successfully!`, 'success');
  };

  // Filters based on trainer permissions
  const isMaleSection = role === 'male-trainer';

  // Cart operations
  const addToCart = (product: Product) => {
    if (product.stockQty <= 0) {
      showToast(t.outOfStock, 'error');
      return;
    }

    const exist = cart.find(item => item.product.id === product.id);
    if (exist) {
      if (exist.qty >= product.stockQty) {
        showToast(t.outOfStock, 'error');
        return;
      }
      setCart(cart.map(item => item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setCart([...cart, { product, qty: 1 }]);
    }
  };

  const removeFromCart = (pId: string) => {
    setCart(cart.filter(item => item.product.id !== pId));
  };

  const updateCartQty = (pId: string, customQty: number) => {
    const item = cart.find(i => i.product.id === pId);
    if (!item) return;

    // Constrain quantity between 1 and the available warehouse stock of this item
    const sanitizedQty = Math.max(1, Math.min(item.product.stockQty, customQty));
    setCart(cart.map(i => i.product.id === pId ? { ...i, qty: sanitizedQty } : i));
  };

  const clearCart = () => setCart([]);

  // Calculate cart metrics
  const totalCostPrice = cart.reduce((acc, item) => acc + (item.product.costPrice * item.qty), 0);
  const totalRetailPrice = cart.reduce((acc, item) => acc + (item.product.retailPrice * item.qty), 0);
  const totalProfit = totalRetailPrice - totalCostPrice;

  // Checkout sale triggers
  const handleCheckout = () => {
    if (cart.length === 0) return;

    cart.forEach(item => {
      const sale: Sale = {
        id: `sa-${Date.now()}-${item.product.id}`,
        productId: item.product.id,
        productName: lang === 'ar' ? item.product.nameAr : item.product.nameEn,
        qty: item.qty,
        totalCostPrice: item.product.costPrice * item.qty,
        totalRetailPrice: item.product.retailPrice * item.qty,
        profit: (item.product.retailPrice - item.product.costPrice) * item.qty,
        date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
        soldBy: role,
        genderSection: isMaleSection ? 'male' : 'female'
      };
      
      realmDB.addSale(sale);
    });

    showToast(lang === 'ar' ? 'تم إتمام البيع بنجاح وطبع الإيصال ورقياً بنجاح!' : 'Retail POS Checkout completed successfully and ticket printable!', 'success');
    clearCart();
    onRefresh();
  };

  // Add/Edit Item to warehouse inventories
  const handleAddNewProduct = (e: React.FormEvent) => {
    e.preventDefault();

    const finalNameEn = formData.nameEn.trim() || formData.nameAr.trim();

    if (editingProduct) {
      const updated: Product = {
        ...editingProduct,
        nameEn: finalNameEn,
        nameAr: formData.nameAr,
        category: formData.category,
        stockQty: Number(formData.stockQty),
        costPrice: Number(formData.costPrice),
        retailPrice: Number(formData.retailPrice),
        thresholdQty: Number(formData.thresholdQty)
      };
      realmDB.saveProduct(updated);
      setEditingProduct(null);
    } else {
      const created: Product = {
        id: `p-${Date.now()}`,
        nameEn: finalNameEn,
        nameAr: formData.nameAr,
        category: formData.category,
        stockQty: Number(formData.stockQty),
        costPrice: Number(formData.costPrice),
        retailPrice: Number(formData.retailPrice),
        thresholdQty: Number(formData.thresholdQty)
      };
      realmDB.saveProduct(created);
    }

    setShowAddModal(false);
    
    // Reset form
    setFormData({
      nameEn: '',
      nameAr: '',
      category: 'Supplements',
      stockQty: 10,
      costPrice: 50,
      retailPrice: 85,
      thresholdQty: 5
    });

    onRefresh();
  };

  const handleEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setFormData({
      nameEn: prod.nameEn,
      nameAr: prod.nameAr,
      category: prod.category,
      stockQty: prod.stockQty,
      costPrice: prod.costPrice,
      retailPrice: prod.retailPrice,
      thresholdQty: prod.thresholdQty
    });
    setShowAddModal(true);
  };

  const handleDeleteProduct = (pId: string) => {
    const prod = products.find(p => p.id === pId);
    if (prod) {
      setProductToDelete(prod);
    }
  };

  const confirmDeleteProduct = () => {
    if (productToDelete) {
      realmDB.deleteProduct(productToDelete.id);
      setProductToDelete(null);
      onRefresh();
    }
  };

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* Upper action header */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-b border-muted-teal/15 pb-6">
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-wider flex items-center gap-3">
            <span className="w-2.5 h-8 bg-primary rounded-full inline-block"></span>
            {t.navInventory}
          </h2>
          <p className="text-sm text-muted-teal mt-1">{t.inventoryAssets}</p>
        </div>

        {/* Add Product Button (Admin exclusive) */}
        {isAdmin ? (
          <button
            id="btn-add-inventory-product"
            onClick={() => {
              setEditingProduct(null);
              setFormData({
                nameEn: '',
                nameAr: '',
                category: 'Supplements',
                stockQty: 10,
                costPrice: 50,
                retailPrice: 85,
                thresholdQty: 5
              });
              setShowAddModal(true);
            }}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-black font-extrabold uppercase tracking-widest text-xs rounded-xl shadow-lg hover:opacity-90 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-black stroke-[3]" />
            {t.addProduct}
          </button>
        ) : (
          <div className="px-4 py-2 bg-slate-gray/30 border border-muted-teal/15 rounded-xl text-xs text-muted-teal flex items-center gap-2 font-mono uppercase">
            <Lock className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
            {lang === 'ar' ? 'إضافة منتجات: مقفل للمديرين فقط' : 'Add products: locked for administrators only'}
          </div>
        )}
      </div>

      {/* Main split grid: POS terminal on the left, stock tracker ledger on the right */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Stock list ledger */}
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-slate-gray/25 border border-muted-teal/15 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-5 border-b border-muted-teal/10 bg-black/15">
              <h3 className="font-bold text-white text-base uppercase tracking-wider flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-primary" />
                {lang === 'ar' ? 'الأصناف المتوفرة بالمستودع الرياضي' : 'Available Gym Supplements & Gear'}
              </h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-light-gray text-left rtl:text-right">
                <thead className="text-xs uppercase bg-black/25 text-muted-teal border-b border-muted-teal/15">
                  <tr>
                    <th scope="col" className="px-6 py-4">{isRtl ? 'اسم الصنف' : 'Product name'}</th>
                    <th scope="col" className="px-6 py-4">{t.category}</th>
                    <th scope="col" className="px-6 py-4 text-center">{t.stockCount}</th>
                    {isAdmin && <th scope="col" className="px-6 py-4 text-center text-amber-200">{t.costPrice}</th>}
                    <th scope="col" className="px-6 py-4 text-center">{t.retailPrice}</th>
                    <th scope="col" className="px-6 py-4 text-center">{lang === 'ar' ? 'البيع مكملات' : 'POS Add'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-muted-teal/10">
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-xs text-muted-teal italic bg-slate-gray/5">
                        {t.noRecords}
                      </td>
                    </tr>
                  ) : (
                    products.map((prod) => {
                      const isLowStock = prod.stockQty <= prod.thresholdQty;
                      return (
                        <tr key={prod.id} className="hover:bg-black/10 transition-colors">
                          <td className="px-6 py-4 font-bold text-white max-w-[200px] truncate">
                            <p>{lang === 'ar' ? prod.nameAr : prod.nameEn}</p>
                            <p className="text-[10px] text-muted-teal font-mono uppercase mt-0.5">{prod.nameEn !== prod.nameAr ? (lang === 'ar' ? prod.nameEn : prod.nameAr) : ''}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-0.5 bg-black/25 text-muted-teal text-[10px] rounded border border-muted-teal/10 uppercase tracking-wide font-mono">
                              {isRtl ? (
                                prod.category === 'Supplements' ? 'مكملات غذائية' :
                                prod.category === 'Drinks' ? 'مشروبات وعصائر' :
                                prod.category === 'Clothing' ? 'ملابس رياضية' :
                                prod.category === 'Equipment' ? 'أجهزة رياضية' :
                                prod.category
                              ) : prod.category}
                            </span>
                          </td>
                          
                          {/* Stock Counter with low inventory warnings */}
                          <td className="px-6 py-4 text-center">
                            <div className="flex flex-col items-center">
                              <span className={`font-mono text-sm font-bold ${isLowStock ? 'text-red-400 font-black animate-pulse' : 'text-white'}`}>
                                {prod.stockQty}
                              </span>
                              {isLowStock && (
                                <span className="text-[8px] bg-red-950/60 text-red-400 px-1 py-0.2 rounded mt-0.5 font-bold uppercase tracking-wider">
                                  {isRtl ? 'حرج' : 'CRISIS'}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Purchase price only visible to Admin */}
                          {isAdmin && (
                            <td className="px-6 py-4 text-center font-mono font-bold text-amber-200">
                              {prod.costPrice} {isRtl ? 'ج.م' : 'EGP'}
                            </td>
                          )}

                          {/* Retail Price */}
                          <td className="px-6 py-4 text-center font-mono font-black text-primary">
                            {prod.retailPrice} {isRtl ? 'ج.م' : 'EGP'}
                          </td>

                          {/* POS selection quick add */}
                          <td className="px-6 py-4 text-center text-sm">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                id={`btn-add-to-cart-${prod.id}`}
                                disabled={prod.stockQty <= 0}
                                onClick={() => addToCart(prod)}
                                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                  prod.stockQty <= 0 
                                    ? 'bg-slate-gray/30 text-light-gray/20 cursor-not-allowed' 
                                    : 'bg-primary/25 text-primary hover:bg-primary/40 border border-primary/20'
                                }`}
                              >
                                <ShoppingCart className="w-4 h-4" />
                              </button>
                              
                              {isAdmin && (
                                <>
                                  <button
                                    id={`btn-edit-prod-${prod.id}`}
                                    onClick={() => handleEditProduct(prod)}
                                    title={isRtl ? 'تعديل الصنف' : 'Edit Product'}
                                    className="p-1.5 bg-slate-gray/40 border border-muted-teal/20 text-sky-400 hover:bg-sky-500/15 rounded transition-all cursor-pointer"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    id={`btn-del-prod-${prod.id}`}
                                    onClick={() => handleDeleteProduct(prod.id)}
                                    title={isRtl ? 'حذف الصنف' : 'Delete Product'}
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
        </div>

        {/* Lightweight POS Checkout terminal interface on the right side */}
        <div className="bg-slate-gray/25 border border-muted-teal/15 p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <h3 className="lg:text-lg font-black text-white uppercase tracking-wider mb-2 border-b border-muted-teal/15 pb-2 flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary animate-pulse" />
                {t.cart}
              </span>
              <span className="text-[9px] bg-primary/20 border border-primary/40 text-primary px-2.5 py-1 rounded-full font-bold uppercase tracking-widest leading-none">
                {isRtl ? 'طاقم التدريب: بيع وتحصيل' : 'POS Cashier Mode'}
              </span>
            </h3>

            {cart.length === 0 ? (
              <div className="text-center py-12 text-xs text-muted-teal italic bg-black/10 rounded-xl border border-dashed border-muted-teal/10 p-4">
                {t.emptyCart}
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {cart.map(item => (
                  <div key={item.product.id} className="bg-black/25 rounded-xl border border-muted-teal/10 p-3 flex justify-between items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate leading-snug">{lang === 'ar' ? item.product.nameAr : item.product.nameEn}</p>
                      <p className="text-[10px] text-muted-teal font-mono uppercase mt-1">
                        {isRtl ? 'سعر القطعة:' : 'Price/Unit:'} <span className="text-white font-bold">{item.product.retailPrice} {isRtl ? 'ج.م' : 'EGP'}</span>
                      </p>
                      <p className="text-[10px] text-[#C4D600] font-mono mt-0.5">
                        {isRtl ? 'الكمية المتوفرة بالمستودع:' : 'In Stock:'} <span className="font-bold underline">{item.product.stockQty}</span>
                      </p>
                      {item.qty > 1 && (
                        <p className="text-[9px] text-primary font-mono mt-0.5 font-bold bg-primary/5 px-2 py-0.5 rounded border border-primary/10 inline-block">
                          {isRtl ? 'إجمالي القطع:' : 'Subtotal:'} {item.product.retailPrice * item.qty} {isRtl ? 'ج.م' : 'EGP'}
                        </p>
                      )}
                    </div>

                    {/* Quantity selectors with decrement, increment, and custom text inputs */}
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <div className="flex items-center gap-1 bg-black/45 border border-muted-teal/20 rounded-xl p-1">
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.product.id, item.qty - 1)}
                          disabled={item.qty <= 1}
                          className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
                            item.qty <= 1
                              ? 'text-muted-teal/20 cursor-not-allowed'
                              : 'text-primary bg-primary/5 hover:bg-primary/20 cursor-pointer'
                          }`}
                        >
                          -
                        </button>
                        <span className="w-8 text-center text-sm font-mono font-bold text-white select-none">
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.product.id, item.qty + 1)}
                          disabled={item.qty >= item.product.stockQty}
                          className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
                            item.qty >= item.product.stockQty
                              ? 'text-muted-teal/20 cursor-not-allowed'
                              : 'text-primary bg-primary/5 hover:bg-primary/20 cursor-pointer'
                          }`}
                        >
                          +
                        </button>
                      </div>
                      <span className="text-[9px] text-[#C4D600] font-mono font-bold bg-black/30 px-1.5 py-0.2 rounded border border-muted-teal/10">
                        {isRtl ? `أقصى حد: ${item.product.stockQty}` : `Max: ${item.product.stockQty}`}
                      </span>
                    </div>

                    <button
                      id={`btn-remove-cart-${item.product.id}`}
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-red-400 hover:text-red-500 p-1.5 hover:bg-red-500/10 rounded cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pricing calculations for premium card checkout billing */}
          {cart.length > 0 && (
            <div className="mt-6 pt-4 border-t border-muted-teal/15 space-y-4">
              <div className="bg-black/35 p-4 rounded-xl border border-muted-teal/10 text-xs text-light-gray space-y-2">
                <div className="flex justify-between items-center">
                  <span>{t.totalBill}:</span>
                  <span className="font-mono text-base font-black text-primary">{totalRetailPrice} {isRtl ? 'ج.م' : 'EGP'}</span>
                </div>
                
                {/* Profit logs and purchasing values displayed strictly for Administrator clearance */}
                {isAdmin ? (
                  <div className="pt-2 border-t border-muted-teal/10 flex justify-between items-center text-[10px] text-amber-200 uppercase font-mono">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-primary" />
                      {t.profitMargin}:
                    </span>
                    <span>+{totalProfit} {isRtl ? 'ج.م' : 'EGP'} ({Math.round((totalProfit / totalRetailPrice) * 100)}%)</span>
                  </div>
                ) : (
                  <p className="text-[9px] text-muted-teal tracking-widest mt-2 uppercase font-mono flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    {isRtl ? 'التكلفة الإجمالية والأرباح مخفية لدور الإشراف' : 'Cost & margin parameters locked under trainer profile'}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  id="btn-clear-pos-cart"
                  onClick={clearCart}
                  className="py-2.5 bg-slate-gray hover:bg-slate-gray/80 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  {isRtl ? 'إخلاء' : 'Clear'}
                </button>
                <button
                  id="btn-process-pos-checkout"
                  onClick={handleCheckout}
                  className="py-2.5 bg-primary text-black font-extrabold text-xs uppercase tracking-widest rounded-xl hover:opacity-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CreditCard className="w-4 h-4 stroke-[2.5]" />
                  {t.checkout}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Add New Product Overlay Form Modal (Admin access only) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 flex items-center justify-center p-4">
          <div className="bg-dark-charcoal border border-muted-teal max-w-lg w-full rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-black text-white uppercase tracking-wider mb-4 border-b border-muted-teal/15 pb-2">
              {editingProduct ? (isRtl ? 'تعديل بيانات الصنف' : 'Edit Product Details') : t.addProduct}
            </h3>

            <form onSubmit={handleAddNewProduct} className="space-y-4">
              
              {/* Name fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-muted-teal uppercase font-mono mb-1 font-bold">
                    {t.productNameEn} <span className="opacity-60">({isRtl ? 'اختياري' : 'Optional'})</span>
                  </label>
                  <input
                    id="fld-[product-name-en]"
                    type="text"
                    placeholder="Premium Shaker 700ml"
                    value={formData.nameEn}
                    onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                    className="w-full bg-black/40 border border-muted-teal/25 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-teal uppercase font-mono mb-1 font-bold">{t.productNameAr}</label>
                  <input
                    id="fld-[product-name-ar]"
                    type="text"
                    required
                    placeholder="شيكر بروتين فاخر"
                    value={formData.nameAr}
                    onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                    className="w-full bg-black/40 border border-muted-teal/25 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Category selector */}
              <div className="bg-black/20 p-3 rounded-xl border border-muted-teal/10 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="block text-xs text-muted-teal uppercase font-mono font-bold">{t.category}</label>
                  {!showNewCategorySection && (
                    <div className="flex gap-1.5">
                      <button
                        id="btn-trigger-add-category"
                        type="button"
                        onClick={() => {
                          setShowNewCategorySection(true);
                          setShowManageCategories(false);
                        }}
                        className="text-[10px] bg-primary/25 text-primary border border-primary/40 px-2.5 py-1 rounded-lg hover:bg-primary/35 transition-all cursor-pointer font-bold uppercase"
                      >
                        {isRtl ? '+ إضافة تصنيف' : '+ New Category'}
                      </button>
                      <button
                        id="btn-trigger-manage-categories"
                        type="button"
                        onClick={() => {
                          setShowManageCategories(!showManageCategories);
                        }}
                        className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer font-bold uppercase flex items-center gap-1 ${
                          showManageCategories 
                            ? 'bg-amber-500/25 text-amber-300 border-amber-500/40 hover:bg-amber-500/35'
                            : 'bg-black/45 text-muted-teal border-muted-teal/30 hover:bg-black/60 hover:text-white'
                        }`}
                      >
                        <span>🗑️</span>
                        <span>{isRtl ? 'إدارة وحذف' : 'Manage'}</span>
                      </button>
                    </div>
                  )}
                </div>

                {showNewCategorySection ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCategoryVal}
                        onChange={(e) => setNewCategoryVal(e.target.value)}
                        placeholder={isRtl ? 'اسـم التصنيف الجديد...' : 'New category name...'}
                        className="flex-1 bg-black/50 border border-primary/40 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none focus:border-primary placeholder:text-muted-teal/50"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddNewCategory();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleAddNewCategory}
                        className="bg-primary text-black font-extrabold px-3 py-1.5 rounded-xl text-xs hover:opacity-90 cursor-pointer flex items-center justify-center gap-1"
                      >
                        {isRtl ? 'إضافة' : 'Add'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNewCategoryVal('');
                          setShowNewCategorySection(false);
                        }}
                        className="bg-slate-gray px-2.5 py-1.5 rounded-xl text-xs text-white hover:bg-slate-gray/80 cursor-pointer"
                      >
                        {isRtl ? 'إلغاء' : 'Cancel'}
                      </button>
                    </div>
                    {isRtl ? (
                      <p className="text-[9px] text-primary/70">اكتب اسم التصنيف الجديد ثم اضغط على زر "إضافة" لحفظه بالتطبيق.</p>
                    ) : (
                      <p className="text-[9px] text-primary/70">Enter category name, then click "Add" to save it instantly.</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <select
                      id="fld-[product-category]"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full bg-black/40 border border-muted-teal/25 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-primary"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat} className="bg-dark-charcoal text-white">
                          {isRtl ? (
                            cat === 'Supplements' ? 'مكملات غذائية' :
                            cat === 'Drinks' ? 'مشروبات وعصائر' :
                            cat === 'Clothing' ? 'ملابس رياضية' :
                            cat === 'Equipment' ? 'أجهزة رياضية' :
                            cat
                          ) : cat}
                        </option>
                      ))}
                    </select>

                    {showManageCategories && (
                      <div className="bg-black/30 p-2.5 rounded-xl border border-dashed border-amber-500/30 space-y-1.5 max-h-36 overflow-y-auto">
                        <p className="text-[9px] text-amber-200/80 font-bold border-b border-muted-teal/10 pb-1">
                          {isRtl ? 'حذف تصنيف من القائمة:' : 'Delete category from list:'}
                        </p>
                        {categories.map((cat) => (
                          <div key={cat} className="flex justify-between items-center bg-[#151b22] px-2 py-1 rounded-lg border border-muted-teal/5 text-xs text-white">
                            <span className="font-medium text-[11px]">
                              {isRtl ? (
                                cat === 'Supplements' ? 'مكملات غذائية' :
                                cat === 'Drinks' ? 'مشروبات وعصائر' :
                                cat === 'Clothing' ? 'ملابس رياضية' :
                                cat === 'Equipment' ? 'أجهزة رياضية' :
                                cat
                              ) : cat}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(cat)}
                              className="text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 w-5.5 h-5.5 rounded-md flex items-center justify-center transition-all cursor-pointer"
                              title={isRtl ? 'حذف' : 'Delete'}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Inventory metrics */}
              <div className="bg-black/20 p-4 rounded-xl border border-muted-teal/10 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-muted-teal uppercase font-mono mb-1 font-bold">{t.stockCount}</label>
                    <input
                      id="fld-[product-stock]"
                      type="number"
                      min="1"
                      required
                      translate="no"
                      dir="ltr"
                      value={formData.stockQty}
                      onChange={(e) => setFormData({ ...formData, stockQty: e.target.value === '' ? '' : Number(e.target.value) })}
                      onFocus={(e) => e.target.select()}
                      className="w-full bg-black/40 border border-muted-teal/25 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-primary font-mono text-center notranslate dir-ltr"
                    />
                    <p className="text-[9px] text-muted-teal/60 mt-1 text-center">{isRtl ? 'مثال: 5 قطع أو 15 علبة' : 'e.g., 5 items or 15 packs'}</p>
                  </div>
                  <div>
                    <label className="block text-xs text-muted-teal uppercase font-mono mb-1 font-bold">{t.costPrice}</label>
                    <input
                      id="fld-[product-cost]"
                      type="number"
                      min="0"
                      required
                      translate="no"
                      dir="ltr"
                      value={formData.costPrice}
                      onChange={(e) => setFormData({ ...formData, costPrice: e.target.value === '' ? '' : Number(e.target.value) })}
                      onFocus={(e) => e.target.select()}
                      className="w-full bg-black/40 border border-muted-teal/25 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-amber-400 font-mono text-center notranslate dir-ltr"
                    />
                    <p className="text-[9px] text-amber-300 font-bold mt-1 text-center">{isRtl ? '⚠️ تكلفتها للقطعة الواحدة' : '⚠️ Price per 1 single item'}</p>
                  </div>
                  <div>
                    <label className="block text-xs text-muted-teal uppercase font-mono mb-1 font-bold">{t.retailPrice}</label>
                    <input
                      id="fld-[product-retail]"
                      type="number"
                      min="0"
                      required
                      translate="no"
                      dir="ltr"
                      value={formData.retailPrice}
                      onChange={(e) => setFormData({ ...formData, retailPrice: e.target.value === '' ? '' : Number(e.target.value) })}
                      onFocus={(e) => e.target.select()}
                      className="w-full bg-black/40 border border-muted-teal/25 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-primary font-mono text-center notranslate dir-ltr"
                    />
                    <p className="text-[9px] text-primary font-bold mt-1 text-center">{isRtl ? '⚠️ بيعها للقطعة الواحدة مفرداً' : '⚠️ Retail price of 1 single item'}</p>
                  </div>
                </div>
                {isRtl ? (
                  <p className="text-[9px] text-muted-teal bg-black/35 px-3 py-2 rounded-lg border border-muted-teal/10 leading-relaxed">
                    💡 <span className="text-white font-bold">توضيح هام للـمـديـر:</span> أدخل الكمية الإجمالية للمخزون، وثمن شراء <span className="text-amber-300 font-black">القطعة الواحدة</span>، وثمن بيع <span className="text-primary font-black">القطعة الواحدة للجمهور</span>. النظام سيتولى آلياً ضرب الإجمالي عند تعديل المبيعات أو الشراء، فلا تضرب ثمن مخزونك مسبقاً بنفسك.
                  </p>
                ) : (
                  <p className="text-[9px] text-muted-teal bg-black/35 px-3 py-2 rounded-lg border border-muted-teal/10 leading-relaxed">
                    💡 <span className="text-white font-bold">Important note for Admin:</span> Enter total stocks, and cost/retail price per <span className="text-primary font-black">1 single item</span>. Subtotal metrics multiplied by selected quantity will compute automatically inside POS checkout.
                  </p>
                )}
              </div>

              {/* Safety alert minimum safety threshold */}
              <div>
                <label className="block text-xs text-muted-teal uppercase font-mono mb-1 font-bold">{t.itemThreshold}</label>
                <input
                  id="fld-[product-threshold]"
                  type="number"
                  min="1"
                  required
                  translate="no"
                  dir="ltr"
                  value={formData.thresholdQty}
                  onChange={(e) => setFormData({ ...formData, thresholdQty: e.target.value === '' ? '' : Number(e.target.value) })}
                  onFocus={(e) => e.target.select()}
                  className="w-full bg-black/40 border border-muted-teal/25 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-primary font-mono text-center notranslate dir-ltr"
                />
              </div>

              {/* Form buttons action control */}
              <div className="flex justify-end gap-3 pt-4 border-t border-muted-teal/15">
                <button
                  id="btn-cancel-prod"
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-gray text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-slate-gray/80 transition-all cursor-pointer"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  id="btn-save-prod-inventory"
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

      {/* Custom Product Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 flex items-center justify-center p-4">
          <div className="bg-dark-charcoal border border-red-500/30 max-w-md w-full rounded-2xl p-6 shadow-2xl relative">
            <h3 className="text-lg font-black text-red-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="w-2.5 h-6 bg-red-500 rounded-full inline-block"></span>
              {isRtl ? 'حذف صنف من المستودع' : 'Deactivate Product Item'}
            </h3>
            <p className="text-sm text-light-gray mb-6 leading-relaxed">
              {isRtl 
                ? `هل أنت متأكد تماماً من حذف المنتج "${isRtl ? productToDelete.nameAr : productToDelete.nameEn}" من سجلات المستودع بالكامل؟`
                : `Are you sure you want to permanently remove "${productToDelete.nameEn}" from the active inventory ledger?`}
            </p>
            <div className="flex justify-end gap-3 pt-4 border-t border-muted-teal/15">
              <button
                id="btn-cancel-prod-delete"
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 bg-slate-gray text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-slate-gray/80 transition-all cursor-pointer"
              >
                {isRtl ? 'إلغاء وتراجع' : 'Cancel'}
              </button>
              <button
                id="btn-confirm-prod-delete"
                onClick={confirmDeleteProduct}
                className="px-4 py-2 bg-red-600 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl hover:bg-red-500 transition-all cursor-pointer"
              >
                {isRtl ? 'تأكيد الحذف' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Absolute Toast alert feedback bubble */}
      {toast.message && (
        <div className={`fixed bottom-6 right-6 left-6 md:left-auto md:w-96 z-50 p-4 rounded-xl border flex items-center gap-3 shadow-2xl transition-all duration-300 ${
          toast.type === 'error' 
            ? 'bg-red-950/90 border-red-500/50 text-red-100' 
            : 'bg-slate-gray/90 border-primary/50 text-white'
        }`} dir={isRtl ? 'rtl' : 'ltr'}>
          <span className="text-lg shrink-0">{toast.type === 'error' ? '⚠️' : '✓'}</span>
          <p className="text-xs font-bold flex-1 leading-snug">{toast.message}</p>
          <button 
            type="button" 
            onClick={() => setToast({ message: '', type: null })}
            className="text-xs text-white/65 hover:text-white bg-black/30 w-5 h-5 rounded-full flex items-center justify-center font-bold shrink-0"
          >
            ×
          </button>
        </div>
      )}

    </div>
  );
}
