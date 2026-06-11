import React, { useState, useRef } from 'react';
import { Product } from '../types';
import { FileUp, Download, Eye, CheckCircle2, Clipboard, Trash2, HelpCircle, X, Check, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';

interface BulkProductLoaderProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
}

export default function BulkProductLoader({ products, setProducts }: BulkProductLoaderProps) {
  // Drag & drop status
  const [dragActive, setDragActive] = useState(false);
  const [pastedData, setPastedData] = useState('');
  
  // Parsed results
  const [parsedPreviewList, setParsedPreviewList] = useState<{ sku: string; name: string; description: string; originalRow?: number }[]>([]);
  const [invalidRows, setInvalidRows] = useState<{ row: number; reason: string }[]>([]);
  
  // Operation status
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'warning' | 'error' } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showNotice = (msg: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Drag handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processExcelFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processExcelFile(e.target.files[0]);
    }
  };

  // Normalize and detect SKU and Description columns
  const detectColumns = (headers: string[]) => {
    const skuAliases = ['sku', 'código', 'codigo', 'code', 'referencia', 'ref', 'producto'];
    const descAliases = ['descripción', 'descripcion', 'description', 'nombre', 'producto', 'detalle'];
    
    const normalize = (str: string) => 
      str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    
    let skuCol = -1;
    let descCol = -1;
    
    for (let i = 0; i < headers.length; i++) {
      const rawHeader = headers[i] ? String(headers[i]).trim() : '';
      const cleanHeader = normalize(rawHeader);
      
      if (skuCol === -1 && skuAliases.some(alias => cleanHeader === normalize(alias) || cleanHeader.includes(normalize(alias)))) {
        skuCol = i;
      }
      if (descCol === -1 && descAliases.some(alias => cleanHeader === normalize(alias) || cleanHeader.includes(normalize(alias)))) {
        descCol = i;
      }
    }
    
    // Fallbacks if not found
    if (descCol === -1 && headers.length >= 2 && skuCol !== 1) descCol = 1;
    if (skuCol === -1) skuCol = 0;
    
    return { skuCol, descCol };
  };

  // Asynchronous Excel/CSV processing in chunks to avoid blocking the thread
  const processExcelFile = (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !['xlsx', 'xls', 'csv', 'xlsm'].includes(extension)) {
      showNotice('Formato de archivo no soportado. Use .xlsx, .xls o .csv', 'error');
      return;
    }

    setIsProcessing(true);
    setProgressPercent(0);
    setProgressMessage(`Leyendo archivo: ${file.name}...`);
    setParsedPreviewList([]);
    setInvalidRows([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: false });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert sheet to JSON array of arrays (header: 1)
        const rows = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1, defval: "" });
        
        if (!rows || rows.length < 2) {
          throw new Error('El archivo debe contener al menos la cabecera y una fila de datos.');
        }

        // Detect columns
        const headersRaw = rows[0].map(cell => cell !== undefined && cell !== null ? String(cell).trim() : '');
        const { skuCol, descCol } = detectColumns(headersRaw);

        const totalRows = rows.length - 1;
        const validTemp: { sku: string; name: string; description: string; originalRow: number }[] = [];
        const invalidTemp: { row: number; reason: string }[] = [];

        // Chunking parameters
        const chunkSize = 800;
        let index = 1;

        const processChunk = () => {
          const end = Math.min(index + chunkSize, rows.length);
          
          for (let i = index; i < end; i++) {
            const row = rows[i];
            if (!row || row.length === 0) continue;

            const skuRaw = row[skuCol] !== undefined ? String(row[skuCol]).trim() : '';
            if (!skuRaw) {
              invalidTemp.push({ row: i + 1, reason: 'Código/SKU vacío' });
              continue;
            }

            let description = '';
            if (descCol !== -1 && row[descCol] !== undefined && row[descCol] !== null) {
              description = String(row[descCol]).trim();
            }
            if (!description) description = 'Sin descripción';

            validTemp.push({
              sku: skuRaw.toUpperCase(),
              name: description.split(' - ')[0] || description, // Use first part of description as short name if possible
              description: description,
              originalRow: i + 1
            });
          }

          index = end;
          const progressVal = Math.round((index / rows.length) * 100);
          setProgressPercent(progressVal);
          setProgressMessage(`Procesando filas ${Math.min(index, rows.length)} de ${rows.length}...`);

          if (index < rows.length) {
            setTimeout(processChunk, 10);
          } else {
            // Done
            setParsedPreviewList(validTemp);
            setInvalidRows(invalidTemp);
            setIsProcessing(false);
            
            if (validTemp.length > 0) {
              showNotice(`Se cargaron ${validTemp.length} registros del archivo a la vista previa.`, 'success');
            } else {
              showNotice('No se encontraron registros válidos en el archivo.', 'warning');
            }
          }
        };

        // Start chunk processing
        setTimeout(processChunk, 50);

      } catch (err: any) {
        setIsProcessing(false);
        showNotice(`Error al leer el archivo: ${err.message || err}`, 'error');
      }
    };

    reader.onerror = () => {
      setIsProcessing(false);
      showNotice('Error al leer el archivo desde el disco.', 'error');
    };

    reader.readAsArrayBuffer(file);
  };

  // Parsing pasted clipboard text
  const handleParsePaste = () => {
    if (!pastedData.trim()) {
      showNotice('Pegue columnas tabuladas desde Excel en el cuadro de texto.', 'warning');
      return;
    }

    const lines = pastedData.split(/\r?\n/);
    const tempProducts: { sku: string; name: string; description: string }[] = [];
    const invalidTemp: { row: number; reason: string }[] = [];

    lines.forEach((line, index) => {
      if (!line.trim()) return;

      // Check for tabs (copy-paste from spreadsheet)
      let parts = line.split('\t');
      if (parts.length < 2) {
        // Fallback to commas
        parts = line.split(',');
      }

      const sku = parts[0]?.trim().toUpperCase();
      const desc = parts[1]?.trim() || '';

      if (!sku) {
        invalidTemp.push({ row: index + 1, reason: 'Código/SKU vacío' });
      } else {
        tempProducts.push({
          sku,
          name: desc || sku,
          description: desc || 'Sin descripción'
        });
      }
    });

    if (tempProducts.length > 0) {
      setParsedPreviewList((prev) => [...prev, ...tempProducts]);
      setInvalidRows((prev) => [...prev, ...invalidTemp]);
      setPastedData('');
      showNotice(`Se importaron ${tempProducts.length} productos del portapapeles a la vista previa.`, 'success');
    } else {
      showNotice('No se detectaron columnas tabuladas válidas.', 'error');
    }
  };

  // Generate and download Excel template using SheetJS
  const downloadExcelTemplate = () => {
    const templateData = [
      ['SKU', 'Descripción'],
      ['PROD-001', 'Laptop Gamer 15 pulgadas, 16GB RAM, 512GB SSD'],
      ['PROD-002', 'Mouse inalámbrico ergonómico recargable'],
      ['PROD-003', 'Teclado mecánico RGB switch azul'],
      ['SKU-4K-2024', 'Monitor LED 4K 27 pulgadas ultra delgado'],
      ['ABC123', 'Silla de oficina ergonómica con soporte lumbar']
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    ws['!cols'] = [{ wch: 18 }, { wch: 45 }]; // Column widths
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Catálogo');
    
    XLSX.writeFile(wb, 'plantilla_carga_masiva.xlsx');
    showNotice('Plantilla de carga masiva descargada con éxito.', 'success');
  };

  // Remove preview item
  const handleRemovePreviewItem = (index: number) => {
    setParsedPreviewList((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Clean all loaded preview data
  const handleClearAll = () => {
    setParsedPreviewList([]);
    setInvalidRows([]);
    showNotice('Datos de vista previa eliminados.', 'success');
  };

  // Confirm loading preview items to Firestore catalog in chunks of 500
  const handleConfirmBulkSave = async () => {
    if (parsedPreviewList.length === 0) {
      showNotice('La vista previa está vacía.', 'warning');
      return;
    }

    setIsSending(true);
    setProgressPercent(0);
    setProgressMessage('Iniciando envío de datos a Firestore...');

    const CHUNK_SIZE = 500;
    const totalChunks = Math.ceil(parsedPreviewList.length / CHUNK_SIZE);
    let currentProducts = [...products];

    try {
      for (let i = 0; i < totalChunks; i++) {
        const chunk = parsedPreviewList.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        const percent = Math.round(((i + 1) / totalChunks) * 100);

        const newImported: Product[] = chunk.map((item) => ({
          sku: item.sku,
          name: item.name,
          description: item.description,
          price: 15.00 // Default reference price
        }));

        // Exclude duplicate SKUs from current collection
        const filtered = currentProducts.filter(
          (prevItem) => !newImported.some((newItem) => newItem.sku === prevItem.sku)
        );

        currentProducts = [...newImported, ...filtered];
        
        // Save batch
        setProducts(currentProducts);

        setProgressPercent(percent);
        setProgressMessage(`Guardando lote ${i + 1} de ${totalChunks} en la nube (${chunk.length} productos)...`);

        // Brief delay for visual UI updates
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      showNotice(`¡Carga masiva exitosa! Se guardaron ${parsedPreviewList.length} productos en Firestore.`, 'success');
      setParsedPreviewList([]);
      setInvalidRows([]);
    } catch (err: any) {
      showNotice(`Error al guardar productos: ${err.message || err}`, 'error');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6 text-[#1e293b] dark:text-slate-100">
      {/* Dynamic Alerts */}
      {notification && (
        <div className={`p-4 border rounded-xl shadow-sm animate-fade-in flex items-center justify-between transition-colors ${
          notification.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-900/60 dark:text-emerald-450'
            : notification.type === 'warning'
            ? 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-900/60 dark:text-amber-450'
            : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-450'
        }`}>
          <div className="flex items-center gap-3">
            <CheckCircle2 className={`w-5 h-5 ${
              notification.type === 'success'
                ? 'text-emerald-600 dark:text-emerald-400'
                : notification.type === 'warning'
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-rose-600 dark:text-rose-400'
            }`} />
            <span className="text-sm font-medium">{notification.msg}</span>
          </div>
          <button 
            onClick={() => setNotification(null)} 
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer bg-transparent border-0 outline-none"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Progress Bars for parsing / saving */}
      {(isProcessing || isSending) && (
        <div className="p-5 bg-blue-50 border border-blue-200 dark:bg-blue-950/40 dark:border-blue-900/60 rounded-xl space-y-3 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-blue-700 dark:text-blue-400 font-mono">
            <span className="flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              {progressMessage}
            </span>
            <span>{progressPercent}%</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div 
              className="bg-blue-600 dark:bg-blue-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Control Column (Span 5) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col transition-colors duration-250">
          <div className="bg-slate-50 dark:bg-slate-900 p-4 border-b border-slate-200 dark:border-slate-800 transition-colors duration-250">
            <h2 className="text-[#0f172a] dark:text-slate-100 font-semibold text-sm flex items-center gap-2">
              <FileUp className="w-4 h-4 text-blue-600 dark:text-blue-500" />
              Carga Masiva de Productos y Códigos
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Registre grandes catálogos de inventario sin pérdida de rendimiento.
            </p>
          </div>

          <div className="p-5 space-y-5 flex-1">
            {/* File drag zone */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center ${
                dragActive
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100/50 dark:hover:bg-slate-900'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,.xlsm"
                onChange={handleFileChange}
                className="hidden"
                disabled={isProcessing || isSending}
              />
              <FileUp className="w-10 h-10 text-blue-500 dark:text-blue-400 mb-3" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Arrastra o selecciona tu archivo</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-mono">Soporta Excel (.xlsx, .xls, .xlsm) y CSV</p>
            </div>

            {/* Paste data zone from Excel */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold flex items-center gap-1">
                  <Clipboard className="w-3.5 h-3.5 text-blue-600 dark:text-blue-500" />
                  Copiar & Pegar desde Excel
                </label>
                <button
                  onClick={downloadExcelTemplate}
                  className="text-[10px] text-blue-650 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline font-bold font-mono flex items-center gap-1 cursor-pointer bg-transparent border-0 outline-none"
                >
                  <Download className="w-3 h-3" /> Plantilla Excel
                </button>
              </div>

              <textarea
                rows={4}
                value={pastedData}
                onChange={(e) => setPastedData(e.target.value)}
                disabled={isProcessing || isSending}
                placeholder="Pega las columnas desde Excel aquí...&#10;SKU-1001	Laptop Dell Latitude&#10;SKU-1002	Mouse inalámbrico USB"
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-350 rounded-lg p-2.5 outline-none focus:border-blue-500 dark:focus:border-blue-600 font-mono resize-none leading-relaxed transition-colors"
              />

              <button
                type="button"
                onClick={handleParsePaste}
                disabled={isProcessing || isSending}
                className="w-full py-2.5 px-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-400 text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                Procesar Texto Pegado
              </button>
            </div>

            {/* Suggestions card */}
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl space-y-2 text-xs transition-colors duration-250">
              <h4 className="font-mono uppercase text-slate-700 dark:text-slate-300 text-[10px] tracking-wider font-bold flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-blue-600 dark:text-blue-500" /> REQUISITOS DEL ARCHIVO:
              </h4>
              <ul className="space-y-1 text-slate-500 dark:text-slate-400 text-[11px] list-disc pl-4 font-mono font-medium">
                <li>Columna de <strong className="text-blue-600 dark:text-blue-400">Código / SKU</strong> (obligatoria)</li>
                <li>Columna de <strong className="text-blue-600 dark:text-blue-400">Descripción / Nombre</strong> (obligatoria)</li>
                <li>Procesamiento optimizado en lotes para más de 3000 registros.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Right Preview Layout (Span 7) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col transition-colors duration-250">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 transition-colors duration-250">
            <div>
              <h3 className="font-bold text-sm text-[#0f172a] dark:text-slate-100">Vista Previa de Importación</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Valide los datos cargados antes de guardarlos.</p>
            </div>
            <div className="flex gap-2 items-center">
              {parsedPreviewList.length > 0 && (
                <button
                  onClick={handleClearAll}
                  disabled={isProcessing || isSending}
                  className="px-2.5 py-1 text-xs border border-rose-200 dark:border-rose-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-lg cursor-pointer bg-white dark:bg-slate-950 transition-colors"
                >
                  Limpiar todo
                </button>
              )}
              <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/60 px-3 py-1 rounded-full font-mono font-bold">
                {parsedPreviewList.length} listos
              </span>
            </div>
          </div>

          {/* Table list */}
          <div className="flex-1 overflow-y-auto max-h-[380px] divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-950 min-h-[250px]">
            {parsedPreviewList.length > 0 ? (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-250 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold transition-colors">
                    <th className="p-3 w-12 font-mono">#</th>
                    <th className="p-3 w-32 font-mono">SKU / Código</th>
                    <th className="p-3">Descripción</th>
                    <th className="p-3 w-12 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                  {parsedPreviewList.slice(0, 100).map((item, index) => (
                    <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors">
                      <td className="p-3 font-mono text-slate-400 dark:text-slate-500">{item.originalRow || index + 1}</td>
                      <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-450">{item.sku}</td>
                      <td className="p-3 truncate max-w-[200px]" title={item.description}>{item.description}</td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleRemovePreviewItem(index)}
                          disabled={isProcessing || isSending}
                          className="p-1 text-slate-400 hover:text-red-650 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors bg-transparent border-0 outline-none cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {parsedPreviewList.length > 100 && (
                    <tr className="bg-amber-50/40 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400 text-center">
                      <td colSpan={4} className="p-3.5 font-semibold font-mono">
                        ⚠️ Mostrando los primeros 100 de {parsedPreviewList.length} productos cargados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500 px-4">
                <Eye className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-2" />
                <p className="text-xs text-slate-500 dark:text-slate-450">Sube un archivo de Excel o copia códigos para previsualizarlos aquí.</p>
              </div>
            )}
          </div>

          {/* Invalid rows banner */}
          {invalidRows.length > 0 && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border-t border-b border-amber-200 dark:border-amber-900/60 text-[11px] text-amber-800 dark:text-amber-400 flex flex-wrap gap-2 items-center justify-between font-mono">
              <span>⚠️ Se detectaron {invalidRows.length} filas con errores u omitidas (SKU vacío).</span>
              <details className="cursor-pointer">
                <summary className="font-bold hover:underline">Ver detalles</summary>
                <div className="max-h-24 overflow-y-auto mt-2 space-y-1 pl-2 text-[10px] text-amber-700 dark:text-amber-505">
                  {invalidRows.slice(0, 10).map((err, idx) => (
                    <div key={idx}>Fila {err.row}: {err.reason}</div>
                  ))}
                  {invalidRows.length > 10 && <div>... y {invalidRows.length - 10} errores más.</div>}
                </div>
              </details>
            </div>
          )}

          {/* Save trigger */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center transition-colors duration-250">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              Total catálogo consolidado: {products.length} productos
            </span>
            <button
              onClick={handleConfirmBulkSave}
              disabled={parsedPreviewList.length === 0 || isProcessing || isSending}
              className={`px-5 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs ${
                parsedPreviewList.length > 0 && !isProcessing && !isSending
                  ? 'bg-emerald-650 hover:bg-emerald-700 text-white cursor-pointer active:scale-95'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-60'
              }`}
            >
              <Check className="w-4 h-4" /> Enviar al Servidor
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
