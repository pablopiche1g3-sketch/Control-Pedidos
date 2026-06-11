import React, { useState, useEffect } from 'react';
import { Branch, Product, Supplier, ExternalOrder, ExternalOrderItem, ExternalOrderStatus, Requisition } from '../types';
import { Plus, Search, Trash2, Shield, ShieldAlert, Key, Calendar, Mail, Phone, UserCheck, DollarSign, ArrowRight, X, ExternalLink, RefreshCw, Truck } from 'lucide-react';

interface ExternalOrdersProps {
  branches: Branch[];
  products: Product[];
  suppliers: Supplier[];
  requisitions: Requisition[];
  externalOrders: ExternalOrder[];
  setExternalOrders: React.Dispatch<React.SetStateAction<ExternalOrder[]>>;
}

export default function ExternalOrders({
  branches,
  products,
  suppliers,
  requisitions,
  externalOrders,
  setExternalOrders,
}: ExternalOrdersProps) {
  // New Supplier Order Form State
  const [supplierId, setSupplierId] = useState('');
  const [destinationId, setDestinationId] = useState('');
  const [managerName, setManagerName] = useState('RENE LANGLOIS');

  // Shipping & Signatures Configuration
  const [sendToEmail, setSendToEmail] = useState('');
  const [fromEmail, setFromEmail] = useState('pablopiche1g3@gmail.com');
  const [orderPhone, setOrderPhone] = useState('74503973');
  const [authorizedBy, setAuthorizedBy] = useState('JULIO NEFTALI CAÑAS ZELA');
  const [digitizedBy, setDigitizedBy] = useState('RENE LANGLOIS');
  const [isLocked, setIsLocked] = useState(true);

  // Manual Item input state
  const [skuInput, setSkuInput] = useState('');
  const [quantityInput, setQuantityInput] = useState(1);
  const [costInput, setCostInput] = useState(0);
  const [quotationNo, setQuotationNo] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');

  // Draft items list
  const [draftItems, setDraftItems] = useState<ExternalOrderItem[]>([]);

  // Search / Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<ExternalOrder | null>(null);

  // Requisitions popover/import modal
  const [showImportModal, setShowImportModal] = useState(false);

  // Notification Banner
  const [notification, setNotification] = useState<string | null>(null);

  // Set default supplier contact info when supplier selection changes
  const handleSupplierChange = (id: string) => {
    setSupplierId(id);
    const selectedSupplier = suppliers.find((s) => s.id === id);
    if (selectedSupplier) {
      setSendToEmail(selectedSupplier.email);
    }
  };

  // Auto-complete product details when typing SKU
  const handleSkuChange = (sku: string) => {
    setSkuInput(sku);
    const matched = products.find((p) => p.sku.toLowerCase() === sku.trim().toLowerCase());
    if (matched) {
      setDescriptionInput(matched.name);
      setCostInput(matched.price || 0);
    } else {
      setDescriptionInput('');
      setCostInput(0);
    }
  };

  // Add Item to external order list
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!skuInput.trim() || quantityInput <= 0) return;

    const desc = descriptionInput || `Suministro de Oficina (${skuInput})`;
    const newItem: ExternalOrderItem = {
      id: `ord-item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      sku: skuInput.toUpperCase().trim(),
      description: desc,
      quantity: Math.max(1, quantityInput),
      cost: costInput >= 0 ? costInput : 0,
      quotationNo: quotationNo || undefined,
    };

    setDraftItems((prev) => [...prev, newItem]);
    setSkuInput('');
    setQuantityInput(1);
    setCostInput(0);
    setQuotationNo('');
    setDescriptionInput('');
  };

  // Remove item from draft
  const handleRemoveDraftItem = (id: string) => {
    setDraftItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Import Requisition items
  const handleImportRequisition = (req: Requisition) => {
    const importedItems: ExternalOrderItem[] = req.items.map((it) => ({
      id: `imported-${it.id}-${Date.now()}`,
      sku: it.sku,
      description: it.description,
      quantity: it.quantity,
      cost: products.find((p) => p.sku === it.sku)?.price || 15.00,
    }));

    setDraftItems((prev) => [...prev, ...importedItems]);
    
    // Auto configure destination
    setDestinationId(req.originId); // Send provider items to the origin warehouse requesting it
    setShowImportModal(false);
    showNotice(`Se importaron ${importedItems.length} ítems de la requisición ${req.id} al borrador.`);
  };

  // Submit consolidated External Order
  const handleSubmitExternalOrder = () => {
    if (!supplierId) {
      showNotice('Debe seleccionar el Proveedor.');
      return;
    }
    if (!destinationId) {
      showNotice('Debe seleccionar el Centro de Destino / CD.');
      return;
    }
    if (draftItems.length === 0) {
      showNotice('Debe registrar al menos un producto en la orden de compra.');
      return;
    }

    const year = new Date().getFullYear();
    const count = externalOrders.length + 1;
    const formattedId = `ORD-EXT-${year}-${String(count).padStart(4, '0')}`;

    const newOrder: ExternalOrder = {
      id: formattedId,
      date: new Date().toISOString().split('T')[0],
      supplierId,
      destinationId,
      managerName,
      items: draftItems,
      status: 'Borrador',
      shippingConfig: {
        sendToEmail: sendToEmail || 'compras@empresa.com',
        fromEmail,
        phone: orderPhone,
        authorizedBy,
        digitizedBy,
        isLocked,
      },
    };

    setExternalOrders((prev) => [newOrder, ...prev]);
    setDraftItems([]);
    setSupplierId('');
    setDestinationId('');
    showNotice(`¡Orden de compra externa ${formattedId} creada con éxito en Firestore!`);
  };

  const showNotice = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Update External Order status
  const handleUpdateOrderStatus = (orderId: string, status: ExternalOrderStatus) => {
    setExternalOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          const updated = { ...o, status };
          if (selectedOrder && selectedOrder.id === orderId) {
            setSelectedOrder(updated);
          }
          return updated;
        }
        return o;
      })
    );
    showNotice(`Estado de orden externa ${orderId} actualizado a: ${status}`);
  };

  // Filter list
  const filteredOrders = externalOrders.filter((o) => {
    const supplierName = suppliers.find((s) => s.id === o.supplierId)?.name || '';
    const destName = branches.find((b) => b.id === o.destinationId)?.name || '';
    const matchesSearch =
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      destName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getOrderStatusBadgeClass = (status: ExternalOrderStatus) => {
    switch (status) {
      case 'Borrador':
        return 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800';
      case 'Enviado a Proveedor':
        return 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900/60';
      case 'Recibido':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/60';
      case 'Cancelado':
        return 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-455 dark:border-rose-900/60';
    }
  };

  // Calculations
  const totalDraftInvestment = draftItems.reduce((acc, current) => acc + (current.quantity * current.cost), 0);
  const activeRequisitionsCount = requisitions.filter((r) => r.status === 'Pendiente' || r.status === 'Procesado').length;

  return (
    <div className="space-y-6 text-[#1e293b] dark:text-slate-100">
      {/* Alert Notification */}
      {notification && (
        <div className="p-4 bg-blue-50 border border-blue-200 text-blue-800 dark:bg-blue-950/40 dark:border-blue-900/60 dark:text-blue-400 rounded-xl shadow-sm animate-fade-in flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></div>
            <span className="text-sm font-medium">{notification}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer bg-transparent border-0 outline-none">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* consolidated banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl p-5 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h2 className="text-base font-bold tracking-wide flex items-center gap-2">
            Consolidar Pedidos con Proveedores
          </h2>
          <p className="text-xs text-blue-100 max-w-xl">
            Importe los requerimientos acumulados de las sucursales directamente para emitir solicitudes formales de compra a proveedores externos.
          </p>
        </div>
        <button
          onClick={() => setShowImportModal(true)}
          className="px-4 py-2.5 bg-white text-blue-700 hover:bg-blue-50 text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Importar Requisiciones ({activeRequisitionsCount})
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Consolidated purchase form */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col transition-colors duration-250">
          <div className="bg-slate-50 dark:bg-slate-900 p-4 border-b border-slate-200 dark:border-slate-800 transition-colors">
            <div className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-650 dark:text-indigo-400" />
              <h2 className="text-slate-800 dark:text-slate-100 font-semibold text-sm">Nueva Orden Externa (Proveedor)</h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Estructure una orden de compra detallando costos, cotizaciones y firmas.</p>
          </div>

          <div className="p-5 space-y-4 flex-1">
            {/* Provider and Warehouse Destination */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono text-slate-500 dark:text-slate-455 uppercase tracking-wider mb-1 font-bold">
                  PROVEEDOR ADJUDICADO *
                </label>
                <select
                  value={supplierId}
                  onChange={(e) => handleSupplierChange(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded-lg p-2.5 outline-none focus:border-blue-500 dark:focus:border-blue-600 transition-colors"
                >
                  <option value="" className="dark:bg-slate-900">Seleccione Proveedor...</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id} className="dark:bg-slate-900">
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-500 dark:text-slate-455 uppercase tracking-wider mb-1 font-bold">
                  BODEGA DE RECEPCIÓN *
                </label>
                <select
                  value={destinationId}
                  onChange={(e) => setDestinationId(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded-lg p-2.5 outline-none focus:border-blue-500 dark:focus:border-blue-600 transition-colors"
                >
                  <option value="" className="dark:bg-slate-900">Destino de Stock...</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id} className="dark:bg-slate-900">
                      {b.name} ({b.type === 'cedi' ? 'CEDI' : 'Suc.'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Lock / Unlock administrative configurations */}
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-3 transition-colors">
              <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2">
                <span className="text-[10px] font-mono uppercase text-indigo-700 dark:text-indigo-400 font-bold flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Configuración de Envíos y Firmas
                </span>
                <button
                  type="button"
                  onClick={() => setIsLocked(!isLocked)}
                  className="text-[10px] font-mono uppercase text-blue-650 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-bold flex items-center gap-1 cursor-pointer bg-transparent border-0 outline-none"
                >
                  {isLocked ? '🔓 Editar' : '🔒 Bloquear'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-mono text-slate-500 dark:text-slate-450 uppercase mb-1">Enviar A (Correo Proveedor)</label>
                  <input
                    type="email"
                    disabled={isLocked}
                    value={sendToEmail}
                    onChange={(e) => setSendToEmail(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded-lg px-2.5 py-2 placeholder-slate-400 outline-none focus:border-blue-500 dark:focus:border-blue-600 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-mono text-slate-500 dark:text-slate-450 uppercase mb-1">Autorizado Por (Gerencia)</label>
                  <input
                    type="text"
                    disabled={isLocked}
                    value={authorizedBy}
                    onChange={(e) => setAuthorizedBy(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded-lg px-2.5 py-2 placeholder-slate-400 outline-none focus:border-blue-500 dark:focus:border-blue-600 disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[9px] font-mono text-slate-500 dark:text-slate-450 uppercase mb-1">Remitente Enlace (Desde)</label>
                  <input
                    type="email"
                    disabled={isLocked}
                    value={fromEmail}
                    onChange={(e) => setFromEmail(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded-lg px-2.5 py-2 placeholder-slate-400 outline-none focus:border-blue-500 dark:focus:border-blue-600 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-mono text-slate-500 dark:text-slate-450 uppercase mb-1">Digitado Por (Responsable)</label>
                  <input
                    type="text"
                    disabled={isLocked}
                    value={digitizedBy}
                    onChange={(e) => setDigitizedBy(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded-lg px-2.5 py-2 placeholder-slate-400 outline-none focus:border-blue-500 dark:focus:border-blue-600 disabled:opacity-60"
                  />
                </div>
              </div>
            </div>

            {/* Manual Product entry */}
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl space-y-3 transition-colors">
              <span className="text-[10px] font-mono uppercase text-indigo-700 dark:text-indigo-400 font-bold block">Ingresar Producto Manual</span>
              
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-[9px] font-mono text-slate-500 dark:text-slate-400 uppercase mb-1">Código / SKU</label>
                  <input
                    type="text"
                    placeholder="SKU-..."
                    value={skuInput}
                    onChange={(e) => handleSkuChange(e.target.value)}
                    list="catalog-ext-skus"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-755 dark:text-slate-100 text-xs rounded-lg px-2.5 py-2 placeholder-slate-450 outline-none focus:border-blue-500 dark:focus:border-blue-600 uppercase"
                  />
                  <datalist id="catalog-ext-skus">
                    {products.map((p) => (
                      <option key={p.sku} value={p.sku}>{p.name}</option>
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-[9px] font-mono text-slate-500 dark:text-slate-400 uppercase mb-1">Cantidad</label>
                  <input
                    type="number"
                    min={1}
                    value={quantityInput}
                    onChange={(e) => setQuantityInput(parseInt(e.target.value) || 1)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-100 text-xs rounded-lg px-2 py-2 outline-none focus:border-blue-500 dark:focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-[9px] font-mono text-slate-500 dark:text-slate-400 uppercase mb-1">Descripción de Producto</label>
                  <input
                    type="text"
                    placeholder="Laptop, tinta, etc..."
                    value={descriptionInput}
                    onChange={(e) => setDescriptionInput(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs rounded-lg px-2.5 py-2 placeholder-slate-400 outline-none focus:border-blue-500 dark:focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-mono text-slate-500 dark:text-slate-400 uppercase mb-1">Costo Unitario ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={costInput}
                    onChange={(e) => setCostInput(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-100 text-xs rounded-lg px-2 py-2 outline-none focus:border-blue-500 dark:focus:border-blue-600 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-mono text-slate-500 dark:text-slate-400 uppercase mb-1">No. Cotización (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej. COT-229-B..."
                  value={quotationNo}
                  onChange={(e) => setQuotationNo(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs rounded-lg px-3 py-2 placeholder-slate-400 outline-none focus:border-blue-500 dark:focus:border-blue-600"
                />
              </div>

              <button
                type="button"
                onClick={handleAddItem}
                className="w-full py-2 px-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-705 dark:text-indigo-400 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar Item a Pedido
              </button>
            </div>

            {/* List Table of draft items */}
            <div className="space-y-2 flex-1 min-h-[140px] max-h-[220px] overflow-y-auto pr-1">
              <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-450 font-bold block">
                Artículos en la Orden Consolidada ({draftItems.length})
              </span>
              
              {draftItems.length === 0 ? (
                <div className="h-28 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex flex-col justify-center items-center text-slate-450 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-900/40 transition-colors">
                  <DollarSign className="w-5 h-5 text-slate-400 dark:text-slate-500 mb-1" />
                  <p className="text-[11px]">Agregue productos o importe requisiciones</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 overflow-hidden transition-colors">
                  {draftItems.map((item) => (
                    <div key={item.id} className="p-3 flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-mono bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/60 px-1.5 rounded">
                            {item.sku}
                          </span>
                          <span className="text-slate-800 dark:text-slate-200 text-xs font-semibold truncate max-w-[130px] sm:max-w-[170px]" title={item.description}>
                            {item.description}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-450 font-mono block mt-0.5">${item.cost.toFixed(2)} c/u</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-slate-700 dark:text-slate-350 text-xs font-mono font-bold">Cant: {item.quantity}</span>
                        <span className="text-indigo-700 dark:text-indigo-400 text-xs font-mono font-bold">${(item.quantity * item.cost).toFixed(2)}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveDraftItem(item.id)}
                          className="text-slate-400 dark:text-slate-500 hover:text-rose-650 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer bg-transparent border-0 outline-none"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Total Consolidation block */}
            <div className="flex justify-between items-center p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-150/50 dark:border-indigo-900/60 rounded-xl transition-colors">
              <span className="text-[11px] font-mono text-indigo-800 dark:text-indigo-400 uppercase tracking-wider font-bold">INVERSIÓN TOTAL ESTIMADA:</span>
              <span className="text-base font-bold text-indigo-700 dark:text-indigo-400 font-mono">${totalDraftInvestment.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>

            {/* Submit consolidated order button */}
            <button
              onClick={handleSubmitExternalOrder}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 font-semibold text-white text-xs rounded-xl flex items-center justify-center gap-2 transition-all hover:shadow-xs active:scale-[0.99] cursor-pointer mt-2"
            >
              <Truck className="w-4 h-4" /> REGISTRAR ORDEN Y ENVIAR AL SERVIDOR
            </button>
          </div>
        </div>

        {/* Right Side: Consolidated Order List & Search */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col transition-colors duration-250">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 transition-colors">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-450 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Buscar orden por código, proveedor o destino..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs placeholder-slate-400 dark:placeholder-slate-500 text-slate-700 dark:text-slate-200 pl-9 pr-4 py-2 rounded-lg outline-none focus:border-blue-500 dark:focus:border-blue-600 transition-colors"
              />
            </div>
            <span className="text-xs bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-655 dark:text-slate-400 px-3 py-1.5 rounded-lg font-mono font-bold transition-colors">
              {filteredOrders.length} órdenes registradas
            </span>
          </div>

          <div className="overflow-x-auto flex-1 text-slate-800 dark:text-slate-250">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 font-mono text-slate-505 dark:text-slate-400 uppercase tracking-wider transition-colors">
                  <th className="py-3 px-4 font-bold">Código / Fecha</th>
                  <th className="py-3 px-4 font-bold">Proveedor</th>
                  <th className="py-3 px-4 font-bold">Bodega Destino</th>
                  <th className="py-3 px-4 font-bold">Montos</th>
                  <th className="py-3 px-4 font-bold">Estado</th>
                  <th className="py-3 px-4 text-right font-bold">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-slate-600 dark:text-slate-300">
                {filteredOrders.map((ord) => {
                  const supplierName = suppliers.find((s) => s.id === ord.supplierId)?.name || 'Distribuidor';
                  const destinationName = branches.find((b) => b.id === ord.destinationId)?.name || 'Bodega';
                  const totalCost = ord.items.reduce((acc, current) => acc + (current.quantity * current.cost), 0);

                  return (
                    <tr
                      key={ord.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors cursor-pointer group"
                      onClick={() => setSelectedOrder(ord)}
                    >
                      <td className="py-3 px-4">
                        <span className="font-semibold text-blue-600 dark:text-blue-450 block group-hover:underline">
                          {ord.id}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-450 font-mono block">
                          {ord.date}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 dark:text-slate-100 block">{supplierName}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-450 block">{ord.shippingConfig.sendToEmail}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-800 dark:text-slate-200 block">{destinationName}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-450 block font-mono">Autoriza: {ord.shippingConfig.authorizedBy.split(' ')[0]}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 dark:text-slate-100 block font-mono">
                          ${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-450 font-mono">{ord.items.length} productos</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${getOrderStatusBadgeClass(ord.status)}`}>
                          {ord.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedOrder(ord)}
                          className="px-2.5 py-1 text-slate-655 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs leading-none transition-colors bg-white dark:bg-slate-950 shadow-xs cursor-pointer"
                        >
                          Gestionar
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-450 dark:text-slate-500">
                      <p className="text-sm font-medium">No se encontraron órdenes externas registradas.</p>
                      <p className="text-xs text-slate-500 dark:text-slate-450 mt-1">Consolide con el banner superior o cree una manual.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Selectable Requisitions overlay popover in full layout mode */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl max-w-xl w-full overflow-hidden shadow-xl text-slate-800 dark:text-slate-200 transition-colors duration-250 animate-fade-in">
            <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center transition-colors">
              <h3 className="text-slate-800 dark:text-slate-100 font-semibold text-sm">Importar Requisición de Sucursal</h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-slate-555 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 text-xs border border-slate-200 dark:border-slate-800 rounded p-1 bg-white dark:bg-slate-950 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 max-h-96 overflow-y-auto">
              <p className="text-xs text-slate-505 dark:text-slate-400">
                Seleccione una de las requisiciones pendientes o procesadas para abastecerlas mediante compras consolidando directamente con el proveedor:
              </p>

              {requisitions
                .filter((r) => r.status === 'Pendiente' || r.status === 'Procesado')
                .map((req) => (
                  <div
                    key={req.id}
                    onClick={() => handleImportRequisition(req)}
                    className="p-3 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-lg hover:border-blue-500 dark:hover:border-blue-600 cursor-pointer transition-all flex justify-between items-center"
                  >
                    <div>
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-450 font-mono block">{req.id}</span>
                      <p className="text-[11px] text-slate-700 dark:text-slate-300 mt-0.5 font-medium">
                        {branches.find((b) => b.id === req.destinationId)?.name || 'Sucursal'} solicita a{' '}
                        {branches.find((b) => b.id === req.originId)?.name || 'CEDI'}
                      </p>
                      <span className="text-[10px] text-slate-500 dark:text-slate-450">Artículos: {req.items.length} unidades</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 hover:text-blue-650 transition-colors" />
                  </div>
                ))}

              {requisitions.filter((r) => r.status === 'Pendiente' || r.status === 'Procesado').length === 0 && (
                <p className="text-xs text-slate-400 dark:text-slate-505 italic text-center py-6">No hay solicitudes pendientes aptas para procesar con proveedor.</p>
              )}
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-right transition-colors">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 bg-slate-205 dark:bg-slate-800 text-slate-705 dark:text-slate-300 text-xs font-medium rounded hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* External Order details modal (allows receiving orders & status transition) */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full overflow-hidden shadow-xl text-slate-800 dark:text-slate-200 transition-colors duration-250 animate-fade-in">
            <div className="bg-slate-50 dark:bg-slate-900 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center transition-colors">
              <div>
                <h3 className="text-slate-850 dark:text-slate-100 font-semibold text-base flex items-center gap-1.5">
                  <ExternalLink className="w-4 h-4 text-blue-650 dark:text-blue-500" />
                  Orden de Compra Externa {selectedOrder.id}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-450 font-mono mt-0.5">Fecha Generación: {selectedOrder.date}</p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 text-slate-550 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg transition-colors bg-white dark:bg-slate-950 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg transition-colors">
                  <span className="text-slate-500 dark:text-slate-450 font-mono text-[9px] uppercase">PROVEEDOR ADJUDICADO</span>
                  <span className="block font-semibold text-slate-800 dark:text-slate-100 mt-1 text-xs">
                    {suppliers.find((s) => s.id === selectedOrder.supplierId)?.name || 'Distribuidor'}
                  </span>
                  <span className="block text-[10px] text-slate-500 dark:text-slate-455 mt-0.5 font-mono">
                    {selectedOrder.shippingConfig.sendToEmail}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg transition-colors">
                  <span className="text-slate-500 dark:text-slate-450 font-mono text-[9px] uppercase">BODEGA DE RECEPCIÓN</span>
                  <span className="block font-semibold text-blue-700 dark:text-blue-450 mt-1 text-xs">
                    {branches.find((b) => b.id === selectedOrder.destinationId)?.name || 'Almacén de Entrada'}
                  </span>
                  <span className="block text-[10px] text-slate-500 dark:text-slate-455 mt-0.5 font-mono">
                    Firma: {selectedOrder.shippingConfig.authorizedBy}
                  </span>
                </div>
              </div>

              {/* Items Table details */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase text-slate-550 dark:text-slate-400 font-bold block">Artículos Solicitados</span>
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-950 max-h-48 overflow-y-auto transition-colors">
                  {selectedOrder.items.map((it) => (
                    <div key={it.id} className="p-3 flex justify-between items-center text-xs hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono bg-blue-50 text-blue-700 dark:bg-blue-955 dark:text-blue-400 px-1.5 rounded text-[10px] font-semibold">{it.sku}</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">{it.description}</span>
                        </div>
                        {it.quotationNo && (
                          <span className="text-[10px] text-slate-500 dark:text-slate-450 font-mono mt-0.5 block">Cotización: {it.quotationNo}</span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200 block">CANT: {it.quantity}</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-450 font-mono">${it.cost.toFixed(2)} c/u</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Inversion Total */}
              <div className="flex items-center justify-between text-xs p-3 bg-slate-50 dark:bg-slate-900 border border-slate-250/60 dark:border-slate-800 rounded-xl transition-colors">
                <span className="font-mono text-slate-500 dark:text-slate-400">Inversión Adquirida Total:</span>
                <span className="text-sm font-bold text-blue-700 dark:text-blue-450 font-mono">
                  ${selectedOrder.items.reduce((acc, current) => acc + (current.quantity * current.cost), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Signatures Audit info */}
              <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-150/50 dark:border-blue-900/60 rounded-xl text-[11px] text-slate-500 dark:text-slate-400 grid grid-cols-2 gap-2 transition-colors">
                <div>
                  <span className="text-[9px] uppercase font-mono block text-slate-500 dark:text-slate-450">Canal Digitado Por</span>
                  <span className="text-slate-850 dark:text-slate-200 font-medium">{selectedOrder.shippingConfig.digitizedBy}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-mono block text-slate-500 dark:text-slate-450">Teléfono de Enlace</span>
                  <span className="text-slate-850 dark:text-slate-200 font-mono">{selectedOrder.shippingConfig.phone}</span>
                </div>
              </div>

              {/* Change status buttons */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-450 font-bold block">Registrar Arribo o Actualizar Estado</span>
                <div className="grid grid-cols-4 gap-2">
                  {(['Borrador', 'Enviado a Proveedor', 'Recibido', 'Cancelado'] as ExternalOrderStatus[]).map((state) => (
                    <button
                      key={state}
                      onClick={() => handleUpdateOrderStatus(selectedOrder.id, state)}
                      className={`py-2 rounded-lg text-[10px] font-bold text-center cursor-pointer transition-colors ${
                        selectedOrder.status === state
                          ? 'bg-blue-600 text-white shadow-sm border-blue-500'
                          : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-450 hover:text-slate-850 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {state}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 p-4 border-t border-slate-200 dark:border-slate-800 flex justify-between transition-colors">
              <button
                onClick={() => {
                  showNotice(`Generando PDF formal de Orden de Pedido ${selectedOrder.id} para enviar a ${selectedOrder.shippingConfig.sendToEmail}.`);
                  setSelectedOrder(null);
                }}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded-lg transition-colors cursor-pointer bg-white dark:bg-slate-950 shadow-xs"
              >
                Exportar Orden de Compra
              </button>
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs rounded-lg transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
