import React, { useState, useEffect } from 'react';
import { Product, Branch, Supplier, Requisition, ExternalOrder } from './types';
import InternalRequisitions from './components/InternalRequisitions';
import ExternalOrders from './components/ExternalOrders';
import BranchManagement from './components/BranchManagement';
import BulkProductLoader from './components/BulkProductLoader';
import {
  FileText,
  Truck,
  Building,
  UploadCloud,
  Layers,
  Wifi,
  WifiOff,
  RefreshCw,
  Sun,
  Moon,
} from 'lucide-react';
import { db, seedDatabaseIfEmpty, commitChanges } from './firebase';
import { collection, onSnapshot, getDocs, writeBatch, doc, setDoc } from 'firebase/firestore';

export default function App() {
  const fromEmail = 'pablopiche1g3@gmail.com';

  // --- Dark Mode State ---
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('cr_dark_mode') === 'true';
  });

  // --- Database Options Modal State ---
  const [showResetModal, setShowResetModal] = useState<boolean>(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('cr_dark_mode', String(darkMode));
  }, [darkMode]);

  // --- Real-time States from Firestore ---
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [externalOrders, setExternalOrders] = useState<ExternalOrder[]>([]);

  // --- Connection Status state ---
  const [dbStatus, setDbStatus] = useState<'connecting' | 'connected' | 'error' | 'resetting'>('connecting');

  // --- Real-time Firestore Sync ---
  useEffect(() => {
    let unsubBranches: () => void = () => {};
    let unsubProducts: () => void = () => {};
    let unsubSuppliers: () => void = () => {};
    let unsubRequisitions: () => void = () => {};
    let unsubExternalOrders: () => void = () => {};

    async function initFirebase() {
      try {
        await seedDatabaseIfEmpty();
        setDbStatus('connected');
      } catch (err) {
        console.error("Firebase connection/seeding error:", err);
        setDbStatus('error');
      }

      unsubBranches = onSnapshot(collection(db, 'branches'), (snapshot) => {
        const list: Branch[] = [];
        snapshot.forEach((docSnapshot) => list.push(docSnapshot.data() as Branch));
        setBranches(list);
      }, (err) => {
        console.error("Branches listener error:", err);
        setDbStatus('error');
      });

      unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
        const list: Product[] = [];
        snapshot.forEach((docSnapshot) => list.push(docSnapshot.data() as Product));
        setProducts(list);
      }, (err) => {
        console.error("Products listener error:", err);
        setDbStatus('error');
      });

      unsubSuppliers = onSnapshot(collection(db, 'suppliers'), (snapshot) => {
        const list: Supplier[] = [];
        snapshot.forEach((docSnapshot) => list.push(docSnapshot.data() as Supplier));
        setSuppliers(list);
      }, (err) => {
        console.error("Suppliers listener error:", err);
        setDbStatus('error');
      });

      unsubRequisitions = onSnapshot(collection(db, 'requisitions'), (snapshot) => {
        const list: Requisition[] = [];
        snapshot.forEach((docSnapshot) => list.push(docSnapshot.data() as Requisition));
        list.sort((a, b) => b.id.localeCompare(a.id));
        setRequisitions(list);
      }, (err) => {
        console.error("Requisitions listener error:", err);
        setDbStatus('error');
      });

      unsubExternalOrders = onSnapshot(collection(db, 'externalOrders'), (snapshot) => {
        const list: ExternalOrder[] = [];
        snapshot.forEach((docSnapshot) => list.push(docSnapshot.data() as ExternalOrder));
        list.sort((a, b) => b.id.localeCompare(a.id));
        setExternalOrders(list);
      }, (err) => {
        console.error("External orders listener error:", err);
        setDbStatus('error');
      });
    }

    initFirebase();

    return () => {
      unsubBranches();
      unsubProducts();
      unsubSuppliers();
      unsubRequisitions();
      unsubExternalOrders();
    };
  }, []);

  // --- Wrapper Setters to sync local updates to Firestore ---
  const handleSetRequisitions = (value: React.SetStateAction<Requisition[]>) => {
    const nextVal = typeof value === 'function' ? (value as Function)(requisitions) : value;
    commitChanges('requisitions', nextVal, requisitions, 'id');
  };

  const handleSetExternalOrders = (value: React.SetStateAction<ExternalOrder[]>) => {
    const nextVal = typeof value === 'function' ? (value as Function)(externalOrders) : value;
    commitChanges('externalOrders', nextVal, externalOrders, 'id');
  };

  const handleSetBranches = (value: React.SetStateAction<Branch[]>) => {
    const nextVal = typeof value === 'function' ? (value as Function)(branches) : value;
    commitChanges('branches', nextVal, branches, 'id');
  };

  const handleSetProducts = (value: React.SetStateAction<Product[]>) => {
    const nextVal = typeof value === 'function' ? (value as Function)(products) : value;
    commitChanges('products', nextVal, products, 'sku');
  };

  // --- Clear Database completely (Blank Slate) ---
  const handleClearDatabase = async () => {
    setShowResetModal(false);
    setDbStatus('resetting');
    try {
      const collectionsList = ['products', 'branches', 'suppliers', 'requisitions', 'externalOrders', 'systemSettings'];
      for (const coll of collectionsList) {
        const snap = await getDocs(collection(db, coll));
        const batch = writeBatch(db);
        snap.forEach((docSnapshot) => {
          batch.delete(docSnapshot.ref);
        });
        await batch.commit();
      }

      // Re-initialize config document as initialized, but empty of default data
      await setDoc(doc(db, 'systemSettings', 'config'), {
        initialized: true,
        clearedAt: new Date().toISOString()
      });

      alert('¡Base de datos Firestore limpiada con éxito! Todos los datos han sido borrados y está lista para recibir tu información.');
    } catch (err) {
      console.error(err);
      alert('Error al limpiar la base de datos Firestore.');
      setDbStatus('error');
    } finally {
      setDbStatus('connected');
    }
  };

  // --- Restore Demo Data ---
  const handleRestoreDemoDatabase = async () => {
    setShowResetModal(false);
    setDbStatus('resetting');
    try {
      const collectionsList = ['products', 'branches', 'suppliers', 'requisitions', 'externalOrders', 'systemSettings'];
      for (const coll of collectionsList) {
        const snap = await getDocs(collection(db, coll));
        const batch = writeBatch(db);
        snap.forEach((docSnapshot) => {
          batch.delete(docSnapshot.ref);
        });
        await batch.commit();
      }
      
      // Run seeding which will write systemSettings/config and defaults
      await seedDatabaseIfEmpty();
      alert('¡Datos de demostración restablecidos con éxito!');
    } catch (err) {
      console.error(err);
      alert('Error al restablecer los datos de demostración.');
      setDbStatus('error');
    } finally {
      setDbStatus('connected');
    }
  };

  // --- Navigation & Tab Controls ---
  const [activeTab, setActiveTab] = useState<'requisitions' | 'external_orders' | 'branches' | 'bulk_loader'>('requisitions');

  // --- Quick Status/Metrics calculations ---
  const totalPendingReqs = requisitions.filter((r) => r.status === 'Pendiente' || r.status === 'En Tránsito').length;

  const getStatusBadge = () => {
    switch (dbStatus) {
      case 'connecting':
        return (
          <span className="bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/60 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            CONECTANDO CLOUD...
          </span>
        );
      case 'connected':
        return (
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/60 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-550"></span>
            FIRESTORE ONLINE
          </span>
        );
      case 'resetting':
        return (
          <span className="bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/60 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-spin"></span>
            RESTABLECIENDO...
          </span>
        );
      case 'error':
        return (
          <span className="bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/60 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
            FIRESTORE OFFLINE
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#1e293b] dark:bg-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-blue-150 transition-colors duration-250">
      {/* Upper header segment */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 sticky top-0 z-40 shadow-sm transition-colors duration-250">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          {/* Brand Logo & Info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-md">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-slate-900 dark:text-slate-50 font-bold text-lg tracking-tight">Centro de Requisición & Pedidos</h1>
                <span className="hidden sm:inline bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/60 px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold">
                  SISTEMA INTERNO
                </span>
                {getStatusBadge()}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Gestión de órdenes de pedidos internas entre tiendas y externas con proveedores (Cloud Sync)
              </p>
            </div>
          </div>

          {/* User profile & controls */}
          <div className="flex items-center gap-3">
            {/* Dark Mode Toggle Button */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-1.5 border border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-105 transition-all cursor-pointer bg-white dark:bg-slate-950"
              title={darkMode ? "Activar Modo Claro" : "Activar Modo Oscuro"}
            >
              {darkMode ? <Sun className="w-4.5 h-4.5 text-amber-500 animate-pulse" /> : <Moon className="w-4.5 h-4.5 text-slate-500" />}
            </button>

            <div className="hidden md:block text-right">
              <span className="text-xs font-semibold text-slate-850 dark:text-slate-200 block">Pablo Piché</span>
              <span className="text-[10px] text-blue-600 dark:text-blue-450 font-mono">pablopiche1g3@gmail.com</span>
            </div>
            <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 dark:bg-slate-900 dark:border-slate-800 flex items-center justify-center" title="Perfil de Usuario">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">PP</span>
            </div>
            
            <button
              onClick={() => setShowResetModal(true)}
              disabled={dbStatus === 'resetting' || dbStatus === 'connecting'}
              className="p-1 px-2.5 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 dark:border-slate-800 dark:hover:bg-slate-900 dark:hover:border-slate-700 rounded-lg text-xs text-slate-650 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-all cursor-pointer bg-white dark:bg-slate-950 disabled:opacity-50 flex items-center gap-1 font-medium"
              title="Opciones de Base de Datos (Limpiar o Restablecer)"
            >
              <RefreshCw className="w-3 h-3" />
              Base de Datos
            </button>
          </div>
        </div>
      </header>

      {/* Main Container Wrapper */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        
        {/* Navigation Tabs Bar */}
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1.5 rounded-xl flex flex-wrap sm:flex-nowrap items-center gap-1.5 shadow-sm transition-colors duration-250">
          <button
            onClick={() => setActiveTab('requisitions')}
            className={`flex-1 py-3 px-4 rounded-lg text-xs font-medium cursor-pointer flex items-center justify-center gap-2 transition-all ${
              activeTab === 'requisitions'
                ? 'bg-blue-600 text-white shadow-sm font-semibold'
                : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900 dark:hover:bg-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            Pedidos Internos (Tiendas)
            {totalPendingReqs > 0 && (
              <span className="bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900/60 font-mono text-[10px] font-bold px-1.5 rounded-full min-w-4 h-4 flex items-center justify-center leading-none">
                {totalPendingReqs}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('external_orders')}
            className={`flex-1 py-3 px-4 rounded-lg text-xs font-medium cursor-pointer flex items-center justify-center gap-2 transition-all ${
              activeTab === 'external_orders'
                ? 'bg-blue-600 text-white shadow-sm font-semibold'
                : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900 dark:hover:bg-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
            }`}
          >
            <Truck className="w-4 h-4" />
            Pedidos Externos (Proveedores)
          </button>

          <button
            onClick={() => setActiveTab('branches')}
            className={`flex-1 py-3 px-4 rounded-lg text-xs font-medium cursor-pointer flex items-center justify-center gap-2 transition-all ${
              activeTab === 'branches'
                ? 'bg-blue-600 text-white shadow-sm font-semibold'
                : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900 dark:hover:bg-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
            }`}
            title="Nueva Opción: Registrar Sucursales, asignar Centros de Distribución y rastrear procedencias"
          >
            <Building className="w-4 h-4" />
            Sucursales & CD
            <span className="bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-450 dark:border-blue-900/60 text-[9px] font-bold px-1.5 py-0.5 rounded font-mono">
              NUEVO
            </span>
          </button>

          <button
            onClick={() => setActiveTab('bulk_loader')}
            className={`flex-1 py-3 px-4 rounded-lg text-xs font-medium cursor-pointer flex items-center justify-center gap-2 transition-all ${
              activeTab === 'bulk_loader'
                ? 'bg-blue-600 text-white shadow-sm font-semibold'
                : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900 dark:hover:bg-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            Cargar Códigos (Excel)
          </button>
        </div>

        {/* Dynamic Tab Panel */}
        <div className="bg-transparent rounded-2xl animate-fade-in relative min-h-[500px]">
          {activeTab === 'requisitions' && (
            <InternalRequisitions
              branches={branches}
              products={products}
              requisitions={requisitions}
              setRequisitions={handleSetRequisitions}
            />
          )}

          {activeTab === 'external_orders' && (
            <ExternalOrders
              branches={branches}
              products={products}
              suppliers={suppliers}
              requisitions={requisitions}
              externalOrders={externalOrders}
              setExternalOrders={handleSetExternalOrders}
            />
          )}

          {activeTab === 'branches' && (
            <BranchManagement
              branches={branches}
              setBranches={handleSetBranches}
              requisitions={requisitions}
            />
          )}

          {activeTab === 'bulk_loader' && (
            <BulkProductLoader
              products={products}
              setProducts={handleSetProducts}
            />
          )}
        </div>
      </main>

      {/* Elegant minimalist footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-4 mt-12 text-center text-xs text-slate-500 dark:text-slate-400 font-mono transition-colors duration-250">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>
            © 2026 Centro de Requisición & Pedidos internos de El Salvador. todos los derechos reservados.
          </span>
          <span className="text-slate-600 dark:text-slate-400">
            Usuario Activo: <strong className="text-slate-500 dark:text-slate-300 font-medium">{fromEmail}</strong>
          </span>
        </div>
      </footer>

      {/* Database Options Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in animate-duration-150">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full shadow-2xl p-6 relative">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-900 pb-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                <RefreshCw className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50">Gestión de Base de Datos</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Selecciona la acción para los datos sincronizados en la nube.
                </p>
              </div>
            </div>

            <div className="space-y-3 my-4">
              <button
                onClick={() => {
                  if (confirm('¿Estás seguro de que deseas limpiar la base de datos? Se eliminarán permanentemente todos los productos, sucursales, proveedores y pedidos para comenzar en blanco.')) {
                    handleClearDatabase();
                  }
                }}
                className="w-full text-left p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 bg-slate-50 dark:bg-slate-900/40 hover:bg-blue-50/10 dark:hover:bg-blue-950/10 transition-all cursor-pointer group flex items-start gap-3"
              >
                <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-350 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-all text-xs font-bold font-mono">
                  V
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    Comenzar con Base de Datos Vacía (Limpiar todo)
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Borra productos, sucursales y requisiciones. <strong>Útil para cargar tus propios códigos desde Excel</strong> y registrar tus sucursales reales sin registros ficticios.
                  </p>
                </div>
              </button>

              <button
                onClick={() => {
                  if (confirm('¿Estás seguro de que deseas restablecer los datos? Se borrarán los datos actuales y se cargarán los productos y sucursales de demostración.')) {
                    handleRestoreDemoDatabase();
                  }
                }}
                className="w-full text-left p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-amber-500 dark:hover:border-amber-500 bg-slate-50 dark:bg-slate-900/40 hover:bg-amber-50/10 dark:hover:bg-amber-950/10 transition-all cursor-pointer group flex items-start gap-3"
              >
                <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-350 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-500 group-hover:text-white transition-all text-xs font-bold font-mono">
                  D
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    Restablecer con Datos de Demostración (Fábrica)
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Borra la información actual y vuelve a cargar los productos, sucursales (CEDIs, sucursales de prueba) y pedidos iniciales para demostraciones.
                  </p>
                </div>
              </button>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-slate-900 pt-3">
              <button
                onClick={() => setShowResetModal(false)}
                className="px-3.5 py-1.5 border border-slate-250 dark:border-slate-850 hover:bg-slate-55 dark:hover:bg-slate-900 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-350 cursor-pointer transition-all bg-white dark:bg-slate-950"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
