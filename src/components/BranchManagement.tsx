import React, { useState } from 'react';
import { Branch, PointType, Requisition } from '../types';
import { Plus, Shield, MapPin, Building2, User, Phone, Mail, Link, Layers, ArrowRight, TrendingUp, X, Trash2 } from 'lucide-react';

interface BranchManagementProps {
  branches: Branch[];
  setBranches: React.Dispatch<React.SetStateAction<Branch[]>>;
  requisitions: Requisition[];
}

export default function BranchManagement({ branches, setBranches, requisitions }: BranchManagementProps) {
  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState<PointType>('sucursal');
  const [address, setAddress] = useState('');
  const [manager, setManager] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [defaultCediId, setDefaultCediId] = useState('');

  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCediId, setSelectedCediId] = useState<string>('all');
  const [notification, setNotification] = useState<string | null>(null);

  // Filter CEDIs for the dropdown
  const cedis = branches.filter((b) => b.type === 'cedi');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim() || !manager.trim()) {
      showNotice('Por favor complete los campos obligatorios: Nombre, Dirección y Encargado.');
      return;
    }

    const newBranch: Branch = {
      id: `${type}-${Date.now()}`,
      name,
      type,
      address,
      manager,
      email: email || 'contacto@empresa.com',
      phone: phone || '2200-0000',
      defaultCediId: type === 'sucursal' && defaultCediId ? defaultCediId : undefined,
    };

    setBranches((prev) => [newBranch, ...prev]);
    showNotice(`¡${type === 'cedi' ? 'CEDI' : 'Sucursal'} registrado exitosamente: ${name}!`);

    // Reset Form
    setName('');
    setType('sucursal');
    setAddress('');
    setManager('');
    setEmail('');
    setPhone('');
    setDefaultCediId('');
  };

  const showNotice = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Filtered list
  const filteredBranches = branches.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.manager.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Calculate active requisitions count for each point
  const getActiveRequisitionsCount = (branchId: string, asOrigin = false) => {
    return requisitions.filter((r) => {
      const isPoint = asOrigin ? r.originId === branchId : r.destinationId === branchId;
      return isPoint && r.status !== 'Entregado' && r.status !== 'Cancelado';
    }).length;
  };

  return (
    <div className="space-y-6 text-[#1e293b] dark:text-slate-100">
      {/* Real-time alert */}
      {notification && (
        <div className="p-4 bg-blue-50 border border-blue-200 text-blue-800 dark:bg-blue-950/40 dark:border-blue-900/60 dark:text-blue-400 rounded-xl shadow-xs animate-fade-in flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></div>
            <span className="text-sm font-medium">{notification}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer bg-transparent border-0 outline-none">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Intro Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex items-center justify-between shadow-xs transition-colors duration-250">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono font-bold">CENTROS DE DISTRIBUCIÓN (CEDI)</p>
            <p className="text-3xl font-semibold text-slate-800 dark:text-slate-100 mt-1">
              {branches.filter((b) => b.type === 'cedi').length}
            </p>
            <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1 font-mono font-bold">
              <TrendingUp className="w-3.5 h-3.5" /> NODOS DE ABASTECIMIENTO
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 text-blue-600 dark:text-blue-400">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex items-center justify-between shadow-xs transition-colors duration-250">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono font-bold">SUCURSALES / TIENDAS</p>
            <p className="text-3xl font-semibold text-slate-800 dark:text-slate-100 mt-1">
              {branches.filter((b) => b.type === 'sucursal').length}
            </p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1 font-mono font-bold">
              <MapPin className="w-3.5 h-3.5" /> PUNTOS DE SOLICITUD
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60 text-emerald-600 dark:text-emerald-400">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex items-center justify-between shadow-xs transition-colors duration-250">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono font-bold">SOLICITUDES ACTIVAS EN COLA</p>
            <p className="text-3xl font-semibold text-slate-800 dark:text-slate-100 mt-1">
              {requisitions.filter((r) => r.status === 'Pendiente' || r.status === 'En Tránsito').length}
            </p>
            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1 font-mono font-bold">
              <ArrowRight className="w-3.5 h-3.5" /> ENRUTAMIENTOS VIVOS
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/60 text-amber-600 dark:text-amber-400">
            <Link className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Registration Form (Left-hand Column, Span 5) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs flex flex-col transition-colors duration-250">
          <div className="bg-slate-50 dark:bg-slate-900 p-4 border-b border-slate-200 dark:border-slate-800 transition-colors">
            <h2 className="text-[#0f172a] dark:text-slate-100 font-semibold text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-500" />
              Nuevo Establecimiento de la Red (CEDI o Tienda)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Registre nuevos puntos receptores de mercadería o almacenes logísticos.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4 flex-1">
            <div>
              <label className="block text-[10px] font-mono text-slate-500 dark:text-slate-450 uppercase tracking-wider mb-1.5 font-bold">TIPO DE ESTABLECIMIENTO *</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType('sucursal')}
                  className={`py-2.5 px-3 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                    type === 'sucursal'
                      ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-400 shadow-xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-655 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  Sucursal / Tienda
                </button>
                <button
                  type="button"
                  onClick={() => setType('cedi')}
                  className={`py-2.5 px-3 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                    type === 'cedi'
                      ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-400 shadow-xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-655 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  CEDI (Distribución)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-slate-500 dark:text-slate-450 uppercase tracking-wider mb-1.5 font-bold">NOMBRE DE ESTABLECIMIENTO *</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-3 h-4 w-4 text-slate-450 dark:text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="Ej. Sucursal Santa Ana, CEDI Oriente..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-xs rounded-lg pl-10 pr-4 py-2.5 outline-none focus:border-blue-500 dark:focus:border-blue-600 transition-colors"
                />
              </div>
            </div>

            {type === 'sucursal' && (
              <div>
                <label className="block text-[10px] font-mono text-slate-500 dark:text-slate-450 uppercase tracking-wider mb-1.5 flex items-center justify-between font-bold">
                  <span>CEDI ASIGNADO SURTIDOR</span>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold font-mono uppercase tracking-wider">Enrutado automático</span>
                </label>
                <select
                  value={defaultCediId}
                  onChange={(e) => setDefaultCediId(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 dark:focus:border-blue-600 transition-colors"
                >
                  <option value="" className="dark:bg-slate-900">Seleccione CEDI de abastecimiento...</option>
                  {cedis.map((cedi) => (
                    <option key={cedi.id} value={cedi.id} className="dark:bg-slate-900">
                      {cedi.name}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 dark:text-slate-450 mt-1 font-sans">
                  Las requisiciones creadas por esta sucursal se remitirán de forma automatizada a este Centro de Distribución por defecto.
                </p>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-mono text-slate-500 dark:text-slate-450 uppercase tracking-wider mb-1.5 font-bold">DIRECCIÓN FÍSICA *</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-455 dark:text-slate-500" />
                <textarea
                  required
                  rows={2}
                  placeholder="Ej. Km 22, Carretera a Sonsonate, San Salvador..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-xs rounded-lg pl-10 pr-4 py-2.5 outline-none focus:border-blue-500 dark:focus:border-blue-600 transition-colors resize-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono text-slate-500 dark:text-slate-455 uppercase tracking-wider mb-1.5 font-bold">ENCARGADO DE PUNTO *</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="Nombre completo"
                    value={manager}
                    onChange={(e) => setManager(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-xs rounded-lg pl-9 pr-3 py-2.5 outline-none focus:border-blue-500 dark:focus:border-blue-600 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-500 dark:text-slate-455 uppercase tracking-wider mb-1.5 font-bold">TELÉFONO ENLACE</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    placeholder="2200-XXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-xs rounded-lg pl-9 pr-3 py-2.5 outline-none focus:border-blue-500 dark:focus:border-blue-600 transition-colors"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-slate-500 dark:text-slate-455 uppercase tracking-wider mb-1.5 font-bold">CORREO ELECTRÓNICO INSTITUCIONAL</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                <input
                  type="email"
                  placeholder="ejemplo@bodega.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-xs rounded-lg pl-9 pr-3 py-2.5 outline-none focus:border-blue-500 dark:focus:border-blue-600 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer mt-4"
            >
              <Plus className="w-4 h-4" /> Registrar Establecimiento
            </button>
          </form>
        </div>

        {/* Visual routing & list (Span 7) */}
        <div className="lg:col-span-7 flex flex-col space-y-6">
          {/* Diagnostic Routing flow */}
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs text-slate-800 dark:text-slate-200 transition-colors duration-250">
            <h2 className="text-slate-800 dark:text-slate-100 font-semibold text-sm flex items-center gap-2">
              <Link className="w-4 h-4 text-blue-600 dark:text-blue-500" />
              Mapeo de Flujo de Abasto y Requisiciones Activas
            </h2>
            <p className="text-xs text-slate-555 dark:text-slate-400 mt-1 mb-4">
              Visualice qué sucursales están realizando solicitudes de traslado y a qué almacén/CEDI están asignadas.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
              {/* Distribution centers list column */}
              <div className="md:col-span-5 bg-slate-50 dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 transition-colors">
                <span className="text-[10px] font-mono uppercase text-blue-750 dark:text-blue-400 font-bold block mb-1">Centros de Distribución (CEDIs)</span>
                {cedis.map((cedi) => {
                  const activeIns = getActiveRequisitionsCount(cedi.id, true);
                  const isSelected = selectedCediId === cedi.id;
                  return (
                    <div
                      key={cedi.id}
                      onClick={() => setSelectedCediId(isSelected ? 'all' : cedi.id)}
                      className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 dark:border-blue-800 font-medium'
                          : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 block truncate max-w-[150px]">{cedi.name}</span>
                        <span className="text-[9px] bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-450 dark:border-blue-900/60 px-1.5 py-0.5 rounded font-mono font-bold">
                          CEDI
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Resp: {cedi.manager}</p>
                      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-400">
                        <span>Abastece a: {branches.filter((b) => b.defaultCediId === cedi.id).length} sucs</span>
                        <span className="font-mono bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/60 font-bold px-1.5 rounded">
                          {activeIns} reqs
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Transit line indicators */}
              <div className="md:col-span-2 hidden md:flex flex-col justify-center items-center">
                <div className="w-0.5 bg-slate-200 dark:bg-slate-800 flex-1 relative my-2">
                  <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-blue-50 dark:bg-blue-955 border border-blue-200 dark:border-blue-900/60 flex items-center justify-center">
                    <ArrowRight className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="absolute top-3/4 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-blue-50 dark:bg-blue-955 border border-blue-200 dark:border-blue-900/60 flex items-center justify-center">
                    <ArrowRight className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </div>

              {/* Dependent Branches column */}
              <div className="md:col-span-5 bg-slate-50 dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 transition-colors">
                <span className="text-[10px] font-mono uppercase text-blue-700 dark:text-blue-450 font-bold block mb-1">
                  {selectedCediId === 'all'
                    ? 'Sucursales / Tiendas'
                    : `Abastecidos por CEDI`}
                </span>
                
                {filteredBranches
                  .filter((b) => b.type === 'sucursal' && (selectedCediId === 'all' || b.defaultCediId === selectedCediId))
                  .slice(0, 4) // Show up to 4 for clean layout sizing
                  .map((suc) => {
                    const parentCediName = branches.find((p) => p.id === suc.defaultCediId)?.name || 'Sin Asignar CEDI';
                    const activeReqs = getActiveRequisitionsCount(suc.id, false);
                    return (
                      <div key={suc.id} className="p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 block truncate max-w-[150px]">{suc.name}</span>
                          <span className="text-[9px] bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400 border border-slate-200 dark:border-slate-800 px-1.5 py-0.5 rounded font-mono">
                            TIENDA
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-450 mt-1 italic">Surtido por: {parentCediName}</p>
                        <div className="mt-2 flex items-center justify-between text-[10px]">
                          <span className="text-slate-400 dark:text-slate-500">Solicitudes:</span>
                          <span className="text-blue-700 dark:text-blue-450 font-mono font-bold">{activeReqs} en cola</span>
                        </div>
                      </div>
                    );
                  })}
                {branches.filter((b) => b.type === 'sucursal' && (selectedCediId === 'all' || b.defaultCediId === selectedCediId)).length === 0 && (
                  <p className="text-slate-400 dark:text-slate-500 text-xs text-center py-4 italic">No hay sucursales vinculadas a este CEDI.</p>
                )}
              </div>
            </div>

            {selectedCediId !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedCediId('all')}
                className="mt-3 text-xs text-blue-650 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 block font-mono font-bold cursor-pointer bg-transparent border-0 outline-none"
              >
                ← Mostrar todas las sucursales
              </button>
            )}
          </div>

          {/* Branches list & Search */}
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs flex-1 flex flex-col transition-colors duration-250">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/50 dark:bg-slate-900/50 transition-colors">
              <div>
                <h3 className="text-slate-805 dark:text-slate-100 font-semibold text-sm">Listado de Puntos Registrados ({filteredBranches.length})</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Gestione y revise datos de contacto.</p>
              </div>

              <input
                type="text"
                placeholder="Buscar establecimiento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg px-3 py-1.5 w-full sm:w-48 outline-none focus:border-blue-500 dark:focus:border-blue-600 transition-colors"
              />
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 font-mono text-slate-500 dark:text-slate-405 uppercase tracking-wider">
                    <th className="py-2.5 px-4 font-bold">Establecimiento</th>
                    <th className="py-2.5 px-4 font-bold">Tipo</th>
                    <th className="py-2.5 px-4 font-bold">Enlace de Abasto</th>
                    <th className="py-2.5 px-4 font-bold">Encargado / Teléfono</th>
                    <th className="py-2.5 px-4 text-center font-bold">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-slate-700 dark:text-slate-300">
                  {filteredBranches.map((point) => (
                    <tr key={point.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 dark:text-slate-100 block">{point.name}</span>
                        <span className="text-[10px] text-slate-450 dark:text-slate-500 block truncate max-w-[200px]" title={point.address}>
                          {point.address}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {point.type === 'cedi' ? (
                          <span className="bg-blue-50 text-blue-705 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-450 dark:border-blue-900/60 px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold">
                            CEDI (Abasto)
                          </span>
                        ) : (
                          <span className="bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400 border border-slate-200 dark:border-slate-800 px-2.5 py-0.5 rounded-full text-[9px] font-mono">
                            Sucursal (Tienda)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {point.type === 'sucursal' && point.defaultCediId ? (
                          <div className="flex items-center gap-1.5 text-blue-650 dark:text-blue-400 font-semibold">
                            <Layers className="w-3 h-3" />
                            <span>
                              {branches.find((br) => br.id === point.defaultCediId)?.name.split(' ')[0] || 'CEDI'}
                            </span>
                          </div>
                        ) : point.type === 'cedi' ? (
                          <span className="text-slate-400 dark:text-slate-500 italic">Abastece red</span>
                        ) : (
                          <span className="text-amber-700 dark:text-amber-400 font-mono font-bold">Sin CEDI Vinculado</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="block text-slate-800 dark:text-slate-200 font-medium">{point.manager}</span>
                        <span className="block text-[10px] text-slate-500 dark:text-slate-450 font-mono font-semibold">{point.phone}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`¿Desea eliminar la sucursal/CEDI "${point.name}"?`)) {
                              setBranches((prev) => prev.filter((b) => b.id !== point.id));
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors bg-transparent border-0 outline-none cursor-pointer"
                          title="Eliminar de Firestore"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredBranches.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-6 text-slate-400 dark:text-slate-500 italic">
                        No se encontraron puntos de venta o abasto regulados.
                      </td>
                    </tr>
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
