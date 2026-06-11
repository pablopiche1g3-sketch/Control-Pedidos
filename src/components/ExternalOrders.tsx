import React, { useState, useEffect } from 'react';
import { Branch, Product, Supplier, ExternalOrder, ExternalOrderItem, ExternalOrderStatus, Requisition } from '../types';
import { Plus, Search, Trash2, Shield, ShieldAlert, Key, Calendar, Mail, Phone, UserCheck, DollarSign, ArrowRight, X, ExternalLink, RefreshCw } from 'lucide-react';

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
  const handleRemoveItem = (id: string) => {
    setDraftItems((prev) => prev.filter((it) => it.id !== id));
  };

  // Import items from an approved/pending Internal Requisition
  const handleImportRequisition = (req: Requisition) => {
    const importedItems: ExternalOrderItem[] = req.items.map((it, idx) => {
      // Lookup if catalog price exists, else mock a default
      const catalogProd = products.find((p) => p.sku === it.sku);
      return {
        id: `imported-${Date.now()}-${idx}`,
        sku: it.sku,
        description: it.description,
        quantity: it.quantity,
        cost: catalogProd?.price || 15.00,
        quotationNo: `REQ-IMP-${req.id.split('-').pop()}`,
      };
    });

    setDraftItems((prev) => [...prev, ...importedItems]);
    // Set destination automatically to where the shop requested or to the central CEDI supplying it
    setDestinationId(req.originId); // Send first to default supply node
    setShowImportModal(false);
    showNotice(`Se importaron con éxito ${req.items.length} artículos de la requisición ${req.id}.`);
  };

  // Create & Register the External Purchase Order
  const handleSubmitOrder = () => {
    if (!supplierId) {
      showNotice('Debe seleccionar un Proveedor.');
      return;
    }
    if (!destinationId) {
      showNotice('Debe seleccionar la Bodega de Recepción.');
      return;
    }
    if (draftItems.length === 0) {
      showNotice('Agregue artículos a la orden para poder generarla.');
      return;
    }

    const year = new Date().getFullYear();
    const count = externalOrders.length + 1;
    const orderId = `ORD-${year}-${String(count).padStart(4, '0')}`;

    const newOrder: ExternalOrder = {
      id: orderId,
      date: new Date().toISOString().split('T')[0],
      supplierId,
      destinationId,
      managerName,
      shippingConfig: {
        sendToEmail,
        fromEmail,
        phone: orderPhone,
        authorizedBy,
        digitizedBy,
        isLocked,
      },
      items: draftItems,
      status: 'Enviado a Proveedor',
    };

    setExternalOrders((prev) => [newOrder, ...prev]);
    setDraftItems([]);
    setSupplierId('');
    setDestinationId('');
    showNotice(`¡Orden de Compra ${orderId} generada exitosamente y enviada al proveedor!`);
  };

  const showNotice = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // Update order status
  const handleUpdateOrderStatus = (id: string, status: ExternalOrderStatus) => {
    setExternalOrders((prev) =>
      prev.map((o) => {
        if (o.id === id) {
          const updated = { ...o, status };
          if (selectedOrder && selectedOrder.id === id) {
            setSelectedOrder(updated);
          }
          return updated;
        }
        return o;
      })
    );
    showNotice(`Orden ${id} de proveedor actualizada a status: ${status}`);
  };

  // Filters calculation
  const filteredOrders = externalOrders.filter((o) => {
    const suppName = suppliers.find((s) => s.id === o.supplierId)?.name || '';
    const destName = branches.find((b) => b.id === o.destinationId)?.name || '';
    return (
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      suppName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      destName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const getDraftTotalValutation = () => {
    return draftItems.reduce((acc, current) => acc + (current.quantity * current.cost), 0);
  };

  return (
    <div className="space-y-6 text-[#1e293b]">
      {/* Notifications */}
      {notification && (
        <div className="p-4 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl shadow-sm animate-fade-in flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></div>
            <span className="text-sm font-medium">{notification}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-blue-500 hover:text-blue-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Primary Layout Block */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side (Create form, Spans 5) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
          <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-slate-800 font-semibold text-sm">Nueva Orden de Pedido a Proveedor</h2>
              <p className="text-xs text-slate-500 mt-1">Cree cotizaciones u órdenes formales de compra.</p>
            </div>
            
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold rounded-lg flex items-center gap-1 transition-all pointer-events-auto cursor-pointer"
            >
              <Plus className="w-3 h-3" /> Importar Requisición
            </button>
          </div>

          <div className="p-5 space-y-4 flex-1">
            {/* Quick Banner for Requisition import */}
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-550"></span>
                <span className="text-blue-850">¿Cargar desde tienda? Importe las solicitudes registradas directa a esta orden.</span>
              </div>
            </div>

            {/* Selecting Provider and Recepient warehouses */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1 font-bold">SELECCIONAR PROVEEDOR</label>
                <select
                  value={supplierId}
                  onChange={(e) => handleSupplierChange(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-700 text-xs rounded-lg p-2.5 outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="">Seleccione de la lista...</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1 font-bold">BODEGA DE RECEPCIÓN</label>
                <select
                  value={destinationId}
                  onChange={(e) => setDestinationId(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-700 text-xs rounded-lg p-2.5 outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="">Bodega...</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.type === 'cedi' ? 'CEDI' : 'Suc.'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Responsable de Orden */}
            <div>
              <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1 font-bold">RESPONSABLE DE ORDEN</label>
              <input
                type="text"
                placeholder="Nombre completo"
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-lg px-3 py-2.5 outline-none focus:border-blue-500"
              />
            </div>

            {/* Shipping Config block (Envíos y Firmas) */}
            <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono uppercase text-[#475569] font-bold flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-blue-600" /> CONFIGURACIÓN DE ENVÍO & FIRMAS
                </span>
                <button
                  type="button"
                  onClick={() => setIsLocked(!isLocked)}
                  className="p-1 px-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg text-[10px] text-slate-600 flex items-center gap-1 cursor-pointer shadow-xs"
                >
                  {isLocked ? 'Desbloquear' : 'Bloquear & Guardar'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[9px] text-slate-500 font-mono mb-1">Enviar al correo electrónico</label>
                  <input
                    type="email"
                    disabled={isLocked}
                    value={sendToEmail}
                    onChange={(e) => setSendToEmail(e.target.value)}
                    placeholder="email@proveedor.com"
                    className="w-full bg-white border border-slate-200 text-slate-750 rounded-lg p-2 disabled:opacity-60 font-mono text-[11px]"
                  />
                </div>

                <div>
                  <label className="block text-[9px] text-slate-500 font-mono mb-1">Desde el correo electrónico</label>
                  <input
                    type="email"
                    disabled={isLocked}
                    value={fromEmail}
                    onChange={(e) => setFromEmail(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-750 rounded-lg p-2 disabled:opacity-60 font-mono text-[11px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[9px] text-slate-500 font-mono mb-1">Teléfono de quien solicita</label>
                  <input
                    type="text"
                    disabled={isLocked}
                    value={orderPhone}
                    onChange={(e) => setOrderPhone(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-755 rounded-lg p-2 disabled:opacity-60 font-mono text-[11px]"
                  />
                </div>

                <div>
                  <label className="block text-[9px] text-slate-500 font-mono mb-1">Autorizado Por</label>
                  <input
                    type="text"
                    disabled={isLocked}
                    value={authorizedBy}
                    onChange={(e) => setAuthorizedBy(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-755 rounded-lg p-2 disabled:opacity-60 text-xs font-semibold uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] text-slate-450 font-mono mb-0.5">Digitado Por</label>
                <input
                  type="text"
                  disabled={isLocked}
                  value={digitizedBy}
                  onChange={(e) => setDigitizedBy(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-700 rounded-lg p-2 disabled:opacity-60 text-xs uppercase"
                />
              </div>

              <p className="text-[10px] text-slate-500 font-mono flex items-center justify-center gap-1.5 pt-1">
                <span>{isLocked ? '🔒 Configuración bloqueada y guardada.' : '🔓 Configuración editable.'}</span>
              </p>
            </div>

            {/* Add Products Panel */}
            <div className="bg-slate-50/30 border border-slate-200 p-4 rounded-xl space-y-3">
              <span className="text-[10px] font-mono text-blue-700 uppercase font-bold block">AGREGAR PRODUCTO MANUAL</span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-2">
                  <label className="block text-[9px] font-mono text-slate-500 uppercase mb-1">Código / SKU</label>
                  <input
                    type="text"
                    placeholder="Escribe SKU..."
                    value={skuInput}
                    onChange={(e) => handleSkuChange(e.target.value)}
                    list="supplier-skus"
                    className="w-full bg-white border border-slate-200 text-slate-850 text-xs rounded-lg px-2.5 py-2 outline-none focus:border-blue-500 uppercase"
                  />
                  <datalist id="supplier-skus">
                    {products.map((p) => (
                      <option key={p.sku} value={p.sku}>{p.name}</option>
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-[9px] font-mono text-slate-500 uppercase mb-1">Cant.</label>
                  <input
                    type="number"
                    min={1}
                    value={quantityInput}
                    onChange={(e) => setQuantityInput(parseInt(e.target.value) || 1)}
                    className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-lg px-2 py-2 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-mono text-slate-500 uppercase mb-1">Costo ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={costInput || ''}
                    onChange={(e) => setCostInput(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-200 text-slate-850 text-xs rounded-lg px-2.5 py-2 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-mono text-slate-500 uppercase mb-1">No. Cotización</label>
                  <input
                    type="text"
                    placeholder="Ej: COT-102"
                    value={quotationNo}
                    onChange={(e) => setQuotationNo(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-850 text-xs rounded-lg px-2.5 py-2 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-mono text-slate-500 uppercase mb-1">Descripción del Producto</label>
                <input
                  type="text"
                  placeholder="Se auto-rellena..."
                  value={descriptionInput}
                  onChange={(e) => setDescriptionInput(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-700 text-xs rounded-lg px-2.5 py-2 outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="button"
                onClick={handleAddItem}
                className="w-full py-2 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 text-blue-600" /> Agregar Ítem
              </button>
            </div>

            {/* List of draft items */}
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">Artículos a Adquirir ({draftItems.length})</span>
              
              {draftItems.map((item) => (
                <div key={item.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-1.5 hover:bg-slate-100/55">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-1 rounded">{item.sku}</span>
                      <span className="text-slate-800 text-xs font-medium truncate max-w-[150px]">{item.description}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 flex gap-2">
                      <span>Costo unitario: ${item.cost.toFixed(2)}</span>
                      {item.quotationNo && <span>Cotiz: {item.quotationNo}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-800 text-xs font-mono font-medium">${(item.quantity * item.cost).toFixed(2)}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-slate-450 hover:text-rose-600 p-1.5 rounded hover:bg-white border border-transparent hover:border-slate-100 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {draftItems.length === 0 && (
                <p className="text-xs text-slate-450 italic text-center py-4">No hay ítems agregados a la adquisición.</p>
              )}
            </div>

            {/* Total inversion indicator */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs text-slate-650">
              <span className="font-mono">Inversión Estimada:</span>
              <span className="text-base text-blue-700 font-bold font-mono">
                ${getDraftTotalValutation().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Final Generation Purchase Order */}
            <button
              onClick={handleSubmitOrder}
              className="w-full py-3 bg-blue-650 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer mt-4"
            >
              <Plus className="w-4 h-4" /> GENERAR ORDEN DE PEDIDO
            </button>
          </div>
        </div>

        {/* Right Side (List of purchase order registers, Spans 7) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col text-slate-700">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar orden externa por código, proveedor o bodega..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-200 text-xs pl-9 pr-4 py-2 placeholder-slate-400 text-slate-800 rounded-lg outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                  <th className="py-3 px-4">Código / Fecha</th>
                  <th className="py-3 px-4">Proveedor</th>
                  <th className="py-3 px-4">Destino</th>
                  <th className="py-3 px-4 text-right">Inversión</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600 text-xs">
                {filteredOrders.map((ord) => {
                  const supplierName = suppliers.find((s) => s.id === ord.supplierId)?.name || 'Distribuidor';
                  const destinationName = branches.find((b) => b.id === ord.destinationId)?.name || 'CEDI Central';
                  const totalCost = ord.items.reduce((acc, current) => acc + (current.quantity * current.cost), 0);

                  return (
                    <tr
                      key={ord.id}
                      onClick={() => setSelectedOrder(ord)}
                      className="hover:bg-slate-50 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4">
                        <span className="font-semibold text-blue-600 block group-hover:underline">
                          {ord.id}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono block">
                          {ord.date}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-800 block">{supplierName}</span>
                        <span className="text-[10px] text-slate-500 block">{ord.managerName}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-700">{destinationName.replace('CEDI ', 'CEDI ')}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-blue-700 font-bold">
                        ${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] leading-none font-medium ${
                            ord.status === 'Recibido'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : ord.status === 'Enviado a Proveedor'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : ord.status === 'Cancelado'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {ord.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-slate-450 italic">
                      No se encontraron órdenes registradas.
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-xl max-w-xl w-full overflow-hidden shadow-xl text-slate-800">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-slate-800 font-semibold text-sm">Importar Requisición de Sucursal</h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-slate-500 hover:text-slate-800 text-xs border border-slate-200 rounded p-1 bg-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 max-h-96 overflow-y-auto">
              <p className="text-xs text-slate-500">
                Seleccione una de las requisiciones pendientes o procesadas para abastecerlas mediante compras consolidando directamente con el proveedor:
              </p>

              {requisitions
                .filter((r) => r.status === 'Pendiente' || r.status === 'Procesado')
                .map((req) => (
                  <div
                    key={req.id}
                    onClick={() => handleImportRequisition(req)}
                    className="p-3 bg-slate-50/50 border border-slate-200 rounded-lg hover:border-blue-500 cursor-pointer transition-colors flex justify-between items-center"
                  >
                    <div>
                      <span className="text-xs font-bold text-blue-600 font-mono block">{req.id}</span>
                      <p className="text-[11px] text-slate-700 mt-0.5 font-medium">
                        {branches.find((b) => b.id === req.destinationId)?.name || 'Sucursal'} solicita a{' '}
                        {branches.find((b) => b.id === req.originId)?.name || 'CEDI'}
                      </p>
                      <span className="text-[10px] text-slate-500">Artículos: {req.items.length} unidades</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 hover:text-blue-650 transition-colors" />
                  </div>
                ))}

              {requisitions.filter((r) => r.status === 'Pendiente' || r.status === 'Procesado').length === 0 && (
                <p className="text-xs text-slate-400 italic text-center py-6">No hay solicitudes pendientes aptas para procesar con proveedor.</p>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 text-right">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 bg-slate-200 text-slate-750 text-xs font-medium rounded hover:bg-slate-300 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* External Order details modal (allows receiving orders & status transition) */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full overflow-hidden shadow-xl text-slate-800">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="text-slate-850 font-semibold text-base flex items-center gap-1.5">
                  <ExternalLink className="w-4 h-4 text-blue-600" />
                  Orden de Compra Externa {selectedOrder.id}
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">Fecha Generación: {selectedOrder.date}</p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1 px-2 text-slate-550 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors bg-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-slate-500 font-mono text-[9px] uppercase">PROVEEDOR ADJUDICADO</span>
                  <span className="block font-semibold text-slate-800 mt-1 text-xs">
                    {suppliers.find((s) => s.id === selectedOrder.supplierId)?.name || 'Distribuidor'}
                  </span>
                  <span className="block text-[10px] text-slate-500 mt-0.5 font-mono">
                    {selectedOrder.shippingConfig.sendToEmail}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-slate-500 font-mono text-[9px] uppercase">BODEGA DE RECEPCIÓN</span>
                  <span className="block font-semibold text-blue-700 mt-1 text-xs">
                    {branches.find((b) => b.id === selectedOrder.destinationId)?.name || 'Almacén de Entrada'}
                  </span>
                  <span className="block text-[10px] text-slate-500 mt-0.5 font-mono">
                    Firma: {selectedOrder.shippingConfig.authorizedBy}
                  </span>
                </div>
              </div>

              {/* Items Table details */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase text-slate-550 font-bold block">Artículos Solicitados</span>
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white max-h-48 overflow-y-auto">
                  {selectedOrder.items.map((it) => (
                    <div key={it.id} className="p-3 flex justify-between items-center text-xs hover:bg-slate-50">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono bg-blue-50 text-blue-700 px-1.5 rounded text-[10px] font-semibold">{it.sku}</span>
                          <span className="font-medium text-slate-700">{it.description}</span>
                        </div>
                        {it.quotationNo && (
                          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">Cotización: {it.quotationNo}</span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-slate-800 block">CANT: {it.quantity}</span>
                        <span className="text-[11px] text-slate-500 font-mono">${it.cost.toFixed(2)} c/u</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Inversion Total */}
              <div className="flex items-center justify-between text-xs p-3 bg-slate-50 border border-slate-250/60 rounded-xl">
                <span className="font-mono text-slate-650">Inversión Adquirida Total:</span>
                <span className="text-sm font-bold text-blue-700 font-mono">
                  ${selectedOrder.items.reduce((acc, current) => acc + (current.quantity * current.cost), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Signatures Audit info */}
              <div className="p-3 bg-blue-50/50 border border-blue-150/50 rounded-xl text-[11px] text-slate-500 grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[9px] uppercase font-mono block text-slate-500">Canal Digitado Por</span>
                  <span className="text-slate-800 font-medium">{selectedOrder.shippingConfig.digitizedBy}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-mono block text-slate-500">Teléfono de Enlace</span>
                  <span className="text-slate-800 font-mono">{selectedOrder.shippingConfig.phone}</span>
                </div>
              </div>

              {/* Change status buttons */}
              <div className="pt-3 border-t border-slate-200 space-y-2">
                <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">Registrar Arribo o Actualizar Estado</span>
                <div className="grid grid-cols-4 gap-2">
                  {(['Borrador', 'Enviado a Proveedor', 'Recibido', 'Cancelado'] as ExternalOrderStatus[]).map((state) => (
                    <button
                      key={state}
                      onClick={() => handleUpdateOrderStatus(selectedOrder.id, state)}
                      className={`py-2 rounded-lg text-[10px] font-bold text-center cursor-pointer transition-colors ${
                        selectedOrder.status === state
                          ? 'bg-blue-605 text-white bg-blue-600 shadow-sm border-blue-500'
                          : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      {state}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-between">
              <button
                onClick={() => {
                  showNotice(`Generando PDF formal de Orden de Pedido ${selectedOrder.id} para enviar a ${selectedOrder.shippingConfig.sendToEmail}.`);
                  setSelectedOrder(null);
                }}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs rounded-lg transition-colors cursor-pointer bg-white shadow-xs"
              >
                Exportar Orden de Compra
              </button>
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs rounded-lg transition-colors cursor-pointer"
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
