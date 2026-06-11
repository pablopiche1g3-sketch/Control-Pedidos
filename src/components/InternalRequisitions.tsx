import React, { useState } from 'react';
import { Branch, Product, Requisition, RequisitionItem, RequisitionStatus } from '../types';
import { Plus, Search, Trash2, Tag, Calendar, FileText, CheckCircle, ChevronDown, RefreshCw, X, MessageSquare, Ship, Layers } from 'lucide-react';

interface InternalRequisitionsProps {
  branches: Branch[];
  products: Product[];
  requisitions: Requisition[];
  setRequisitions: React.Dispatch<React.SetStateAction<Requisition[]>>;
}

export default function InternalRequisitions({
  branches,
  products,
  requisitions,
  setRequisitions,
}: InternalRequisitionsProps) {
  // New Requisition Form State
  const [originId, setOriginId] = useState('');
  const [destinationId, setDestinationId] = useState('');
  const [managerName, setManagerName] = useState('');

  // Item form state
  const [skuInput, setSkuInput] = useState('');
  const [quantityInput, setQuantityInput] = useState(1);
  const [descriptionInput, setDescriptionInput] = useState('');

  // List of added items in current draft
  const [draftItems, setDraftItems] = useState<{ id: string; sku: string; description: string; quantity: number }[]>([]);

  // Search/Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Selected Requisition detail view (Modal)
  const [selectedReq, setSelectedReq] = useState<Requisition | null>(null);

  // Notification Banner
  const [notification, setNotification] = useState<string | null>(null);

  // Filter branches by type
  const origBodegas = branches; // Can transfer from CEDI or other branches
  const destBodegas = branches.filter((b) => b.type === 'sucursal'); // Usually requests come from retail stores

  // Auto-complete product description when typing SKU
  const handleSkuChange = (sku: string) => {
    setSkuInput(sku);
    const matched = products.find((p) => p.sku.toLowerCase() === sku.trim().toLowerCase());
    if (matched) {
      setDescriptionInput(matched.name);
    } else {
      setDescriptionInput('');
    }
  };

  // Set manager name automatically when destination branch is selected
  const handleDestinationChange = (id: string) => {
    setDestinationId(id);
    const selectedBranch = branches.find((b) => b.id === id);
    if (selectedBranch) {
      setManagerName(selectedBranch.manager);
      // Auto assign origin if defaultCediId is configured
      if (selectedBranch.defaultCediId) {
        setOriginId(selectedBranch.defaultCediId);
      }
    }
  };

  // Add SKU item to draft list
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!skuInput.trim() || quantityInput <= 0) return;

    const desc = descriptionInput || `Producto Genérico (${skuInput})`;
    const newItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      sku: skuInput.toUpperCase().trim(),
      description: desc,
      quantity: Math.max(1, quantityInput),
    };

    setDraftItems((prev) => [...prev, newItem]);
    setSkuInput('');
    setQuantityInput(1);
    setDescriptionInput('');
  };

  // Remove item from draft
  const handleRemoveDraftItem = (id: string) => {
    setDraftItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Submit Draft Requisition
  const handleSubmitRequisition = () => {
    if (!originId) {
      showNotice('Debe seleccionar la Bodega Origen (la que da el material).');
      return;
    }
    if (!destinationId) {
      showNotice('Debe seleccionar la Bodega Destino (la que solicita).');
      return;
    }
    if (originId === destinationId) {
      showNotice('La bodega de origen no puede ser la misma de destino.');
      return;
    }
    if (!managerName.trim()) {
      showNotice('Debe ingresar el nombre del Responsable.');
      return;
    }
    if (draftItems.length === 0) {
      showNotice('Debe agregar al menos un producto a la lista de requisición.');
      return;
    }

    // Generate Request ID
    const year = new Date().getFullYear();
    const count = requisitions.length + 1;
    const formattedId = `REQ-${year}-${String(count).padStart(4, '0')}`;

    const newReq: Requisition = {
      id: formattedId,
      date: new Date().toISOString().split('T')[0],
      originId,
      destinationId,
      managerName,
      items: draftItems,
      status: 'Pendiente',
    };

    setRequisitions((prev) => [newReq, ...prev]);
    setDraftItems([]);
    setOriginId('');
    setDestinationId('');
    setManagerName('');
    showNotice(`¡Requisición ${formattedId} enviada con éxito!`);
  };

  const showNotice = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Update Requisition Status
  const handleUpdateStatus = (reqId: string, status: RequisitionStatus) => {
    setRequisitions((prev) =>
      prev.map((r) => {
        if (r.id === reqId) {
          const updated = { ...r, status };
          if (selectedReq && selectedReq.id === reqId) {
            setSelectedReq(updated);
          }
          return updated;
        }
        return r;
      })
    );
    showNotice(`Estado de requisición ${reqId} cambiado a: ${status}`);
  };

  // Filters calculation
  const filteredRequisitions = requisitions.filter((r) => {
    const originName = branches.find((b) => b.id === r.originId)?.name || '';
    const destName = branches.find((b) => b.id === r.destinationId)?.name || '';
    const matchSearch =
      r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.managerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      originName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      destName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchStatus = filterStatus === 'all' || r.status === filterStatus;

    return matchSearch && matchStatus;
  });

  const getStatusBadgeClass = (status: RequisitionStatus) => {
    switch (status) {
      case 'Pendiente':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'Procesado':
        return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'En Tránsito':
        return 'bg-indigo-50 text-indigo-700 border border-indigo-200';
      case 'Entregado':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'Cancelado':
        return 'bg-rose-50 text-rose-700 border border-rose-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Banner */}
      {notification && (
        <div className="p-4 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl shadow-sm animate-fade-in flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></div>
            <span className="text-sm font-medium">{notification}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-blue-500 hover:text-blue-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Grid: Form Left, Table Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Create Requisition (Span 5) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
          {/* Header */}
          <div className="bg-slate-50 p-4 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <h2 className="text-slate-800 font-semibold text-sm">Nueva Requisición entre Sucursales</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">Solicite y traslade stock de forma ágil entre cualquier sede o CEDI.</p>
          </div>

          <div className="p-5 space-y-4 flex-1">
            {/* Warehouses configuration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1 font-bold">
                  BODEGA (LA QUE DA EL MATERIAL)
                </label>
                <select
                  value={originId}
                  onChange={(e) => setOriginId(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-700 text-xs rounded-lg p-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                >
                  <option value="">Origen...</option>
                  {origBodegas.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.type === 'cedi' ? 'CEDI' : 'Suc.'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1 font-bold">
                  BODEGA (QUE SOLICITA)
                </label>
                <select
                  value={destinationId}
                  onChange={(e) => handleDestinationChange(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-700 text-xs rounded-lg p-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                >
                  <option value="">Destino...</option>
                  {destBodegas.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Manager Name */}
            <div>
              <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1 font-bold">
                RESPONSABLE DE SOLICITUD
              </label>
              <input
                type="text"
                placeholder="Nombre del encargado..."
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-700 text-xs placeholder-slate-400 rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>

            {/* Product Inputs Panel */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
              <span className="text-[10px] font-mono uppercase text-blue-700 font-bold block">Agregar Producto Manual</span>
              
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-[9px] font-mono text-slate-500 uppercase mb-1">Código / SKU</label>
                  <input
                    type="text"
                    placeholder="Escribe SKU..."
                    value={skuInput}
                    onChange={(e) => handleSkuChange(e.target.value)}
                    list="catalog-skus"
                    className="w-full bg-white border border-slate-200 text-slate-755 text-xs rounded-lg px-2.5 py-2 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 uppercase"
                  />
                  {/* Autocomplete help list */}
                  <datalist id="catalog-skus">
                    {products.map((p) => (
                      <option key={p.sku} value={p.sku}>{p.name}</option>
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-[9px] font-mono text-slate-500 uppercase mb-1">Cantidad</label>
                  <input
                    type="number"
                    min={1}
                    value={quantityInput}
                    onChange={(e) => setQuantityInput(parseInt(e.target.value) || 1)}
                    className="w-full bg-white border border-slate-200 text-slate-700 text-xs rounded-lg px-2 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-mono text-slate-500 uppercase mb-1">Descripción del Producto</label>
                <input
                  type="text"
                  placeholder="Se auto-rellena al escribir SKU..."
                  value={descriptionInput}
                  onChange={(e) => setDescriptionInput(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-700 text-xs rounded-lg px-3 py-2 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <button
                type="button"
                onClick={handleAddItem}
                className="w-full py-2 px-3 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar a Lista
              </button>
            </div>

            {/* List Table of draft items */}
            <div className="space-y-2 flex-1 min-h-[140px] max-h-[220px] overflow-y-auto pr-1">
              <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">
                Artículos en la Solicitud ({draftItems.length})
              </span>
              
              {draftItems.length === 0 ? (
                <div className="h-28 border border-dashed border-slate-200 rounded-xl flex flex-col justify-center items-center text-slate-400 bg-slate-50/50">
                  <Tag className="w-5 h-5 text-slate-400 mb-1" />
                  <p className="text-[11px]">Agregue artículos para enviar la solicitud</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white overflow-hidden">
                  {draftItems.map((item) => (
                    <div key={item.id} className="p-2 sm:p-3 flex items-center justify-between gap-2 hover:bg-slate-50">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-100 px-1.5 rounded">
                            {item.sku}
                          </span>
                          <span className="text-slate-800 text-xs font-medium truncate max-w-[150px] sm:max-w-[180px]">
                            {item.description}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-600 text-xs font-mono font-medium">Cant: {item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveDraftItem(item.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-slate-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit button */}
            <button
              onClick={handleSubmitRequisition}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 font-semibold text-white text-xs rounded-xl flex items-center justify-center gap-2 transition-all hover:shadow-xs active:scale-[0.99] cursor-pointer mt-4"
            >
              <FileText className="w-4 h-4" /> ENVIAR SOLICITUD INTERNA
            </button>
          </div>
        </div>

        {/* Right Side: Requisition History (Span 7) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
          {/* Filter/Search Bar */}
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-50/50">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar requisición por código, bodega o encargado..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-200 text-xs placeholder-slate-400 text-slate-700 pl-9 pr-4 py-2 rounded-lg outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Status tab selectors */}
            <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
              {['all', 'Pendiente', 'En Tránsito', 'Entregado'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors shrink-0 ${
                    filterStatus === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {status === 'all' ? 'Ver Todo' : status}
                </button>
              ))}
            </div>
          </div>

          {/* History table */}
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Código / Fecha</th>
                  <th className="py-3 px-4">Ruta (Origen ➔ Destino)</th>
                  <th className="py-3 px-4">Solicitante</th>
                  <th className="py-3 px-4 text-center">Ítems</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600 text-xs">
                {filteredRequisitions.map((req) => {
                  const originName = branches.find((b) => b.id === req.originId)?.name || 'Bodega General';
                  const destinationName = branches.find((b) => b.id === req.destinationId)?.name || 'Sucursal';
                  
                  return (
                    <tr
                      key={req.id}
                      className="hover:bg-slate-50 transition-colors cursor-pointer group"
                      onClick={() => setSelectedReq(req)}
                    >
                      <td className="py-3 px-4">
                        <span className="font-semibold text-blue-600 block group-hover:underline">
                          {req.id}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono block">
                          {req.date}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-800 font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px]" title={originName}>
                            {originName.replace('CEDI Central ', '').replace('CEDI Regional ', '')}
                          </span>
                          <span className="text-slate-400">➔</span>
                          <span className="text-blue-700 font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px]" title={destinationName}>
                            {destinationName.replace('Sucursal ', '')}
                          </span>
                        </div>
                        <p className="text-[9px] text-slate-500 font-mono mt-0.5">Asignación automática de enlace</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="block text-slate-700">{req.managerName}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                          {req.items.reduce((total, i) => total + i.quantity, 0)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] leading-none font-medium ${getStatusBadgeClass(req.status)}`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedReq(req)}
                          className="px-2.5 py-1 text-slate-650 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 rounded-lg text-xs leading-none transition-colors bg-white shadow-xs"
                        >
                          Gestionar
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredRequisitions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-450">
                      <p className="text-sm font-medium">No se encontraron requisiciones registradas.</p>
                      <p className="text-xs text-slate-500 mt-1">Intente cambiar el filtro o cree una en la sección izquierda.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal / Details Drawer for Requisition State and dispatch */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full overflow-hidden shadow-xl">
            {/* Header */}
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="text-slate-800 font-semibold text-base flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-650" />
                  Detalle de Requisición {selectedReq.id}
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">Fecha de Envío: {selectedReq.date}</p>
              </div>
              <button
                onClick={() => setSelectedReq(null)}
                className="p-1 px-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors bg-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Route segment detail */}
              <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl grid grid-cols-3 items-center text-center">
                <div className="text-left">
                  <span className="text-[10px] uppercase font-mono text-slate-500 block">DESPACHA DESDE</span>
                  <span className="text-xs font-semibold text-slate-850 mt-1 block">
                    {branches.find((b) => b.id === selectedReq.originId)?.name || 'Bodega de Despacho'}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    {branches.find((b) => b.id === selectedReq.originId)?.address}
                  </span>
                </div>

                <div className="flex flex-col items-center">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${getStatusBadgeClass(selectedReq.status)}`}>
                    {selectedReq.status.toUpperCase()}
                  </span>
                  <div className="w-full max-w-[80px] h-[2px] bg-slate-200 relative my-2">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-600"></div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">Mapeo CD Directo</span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-mono text-slate-500 block">TIENDA / DESTINO</span>
                  <span className="text-xs font-semibold text-blue-700 mt-1 block">
                    {branches.find((b) => b.id === selectedReq.destinationId)?.name || 'Sucursal de Destino'}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    {branches.find((b) => b.id === selectedReq.destinationId)?.address}
                  </span>
                </div>
              </div>

              {/* Responsable & Routing audit */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <span className="text-slate-500 font-mono text-[9px] uppercase">Solicitante en Planta</span>
                  <span className="block font-medium text-slate-800 mt-0.5">{selectedReq.managerName}</span>
                </div>

                <div className="p-3 bg-slate-55/30 border border-slate-200 rounded-lg text-xs">
                  <span className="text-slate-500 font-mono text-[9px] uppercase">Canal de Distribución</span>
                  <span className="block font-medium text-blue-700 mt-0.5">
                    {branches.find((b) => b.id === selectedReq.originId)?.name.split(' ')[0]} ➔{' '}
                    {branches.find((b) => b.id === selectedReq.destinationId)?.name.split(' ').slice(-1)[0]}
                  </span>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">Artículos Solicitados</span>
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white max-h-48 overflow-y-auto">
                  {selectedReq.items.map((it) => (
                    <div key={it.id} className="p-3 flex justify-between items-center text-xs hover:bg-slate-50">
                      <div className="flex items-center gap-2">
                        <span className="font-mono bg-blue-50 text-blue-700 px-1.5 rounded text-[10px] font-semibold">{it.sku}</span>
                        <span className="font-medium text-slate-700">{it.description}</span>
                      </div>
                      <span className="font-mono font-bold text-slate-700">CANT: {it.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Update Status Buttons */}
              <div className="border-t border-slate-200 pt-4 space-y-3">
                <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">Actualizar Estado de Procesamiento</span>
                <div className="grid grid-cols-5 gap-1.5">
                  {(['Pendiente', 'Procesado', 'En Tránsito', 'Entregado', 'Cancelado'] as RequisitionStatus[]).map((st) => (
                    <button
                      key={st}
                      onClick={() => handleUpdateStatus(selectedReq.id, st)}
                      className={`py-2 px-1 rounded-lg text-[10px] font-bold text-center cursor-pointer transition-all ${
                        selectedReq.status === st
                          ? 'bg-blue-600 text-white shadow-sm border-blue-500'
                          : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-between">
              <button
                onClick={() => {
                  showNotice(`Generando de forma interna la Guía de Abasto para Requisición ${selectedReq.id}.`);
                  setSelectedReq(null);
                }}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 bg-white shadow-xs"
              >
                Imprimir Guía de Abasto
              </button>
              <button
                onClick={() => setSelectedReq(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs rounded-lg transition-colors cursor-pointer"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
