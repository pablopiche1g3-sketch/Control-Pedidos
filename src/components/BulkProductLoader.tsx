import React, { useState, useRef } from 'react';
import { Product } from '../types';
import { FileUp, Download, Eye, CheckCircle2, Clipboard, Trash2, HelpCircle, X, Check } from 'lucide-react';

interface BulkProductLoaderProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
}

export default function BulkProductLoader({ products, setProducts }: BulkProductLoaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [pastedData, setPastedData] = useState('');
  const [parsedPreviewList, setParsedPreviewList] = useState<{ sku: string; name: string; description: string }[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showNotice = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
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
      parseUploadedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      parseUploadedFile(e.target.files[0]);
    }
  };

  // Custom text-file / CSV parser
  const parseUploadedFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      processTextContent(text, file.name);
    };
    reader.readAsText(file);
  };

  // Parse lines (CSV, TSV, or comma/semicolon/tab split)
  const processTextContent = (text: string, filename: string) => {
    try {
      const lines = text.split(/\r?\n/);
      if (lines.length < 2) {
        showNotice('El archivo parece estar vacío o no tiene el formato correcto.');
        return;
      }

      const tempProducts: { sku: string; name: string; description: string }[] = [];
      let skippedHeader = false;

      // Simple heuristic based comma/semicolon/tab parser
      for (const line of lines) {
        if (!line.trim()) continue;

        // Skip CSV headers if standard CSV
        if (!skippedHeader) {
          const lower = line.toLowerCase();
          if (lower.includes('sku') || lower.includes('código') || lower.includes('descripcion') || lower.includes('nombre')) {
            skippedHeader = true;
            continue;
          }
        }

        // Split by comma, tab, or semicolon
        let parts = line.split(',');
        if (parts.length < 2) parts = line.split('\t');
        if (parts.length < 2) parts = line.split(';');

        if (parts.length >= 2) {
          const sku = parts[0].trim().toUpperCase().replace(/"/g, '');
          const name = parts[1].trim().replace(/"/g, '');
          const desc = parts[2] ? parts[2].trim().replace(/"/g, '') : name;

          if (sku && name) {
            tempProducts.push({ sku, name, description: desc });
          }
        }
      }

      if (tempProducts.length > 0) {
        setParsedPreviewList((prev) => [...prev, ...tempProducts]);
        showNotice(`Se cargaron ${tempProducts.length} registros del archivo "${filename}" a la vista previa.`);
      } else {
        showNotice('No se pudieron extraer columnas con el formato Código/SKU y Descripción.');
      }
    } catch (err) {
      showNotice('Error al procesar el archivo. Compruebe que es un archivo legible (.csv o .txt).');
    }
  };

  // Parsing pasted clipboard text
  const handleParsePaste = () => {
    if (!pastedData.trim()) {
      showNotice('Pegue columnas tabuladas desde Excel en el cuadro de texto.');
      return;
    }

    const lines = pastedData.split('\n');
    const tempProducts: { sku: string; name: string; description: string }[] = [];

    for (const line of lines) {
      if (!line.trim()) continue;
      
      // Split primarily by tabs (standard copy-paste from Excel spreadsheet)
      const parts = line.split('\t');
      if (parts.length >= 2) {
        const sku = parts[0].trim().toUpperCase();
        const name = parts[1].trim();
        const desc = parts[2] ? parts[2].trim() : name;

        if (sku && name) {
          tempProducts.push({ sku, name, description: desc });
        }
      } else {
        // Fallback split by commas
        const commaParts = line.split(',');
        if (commaParts.length >= 2) {
          const sku = commaParts[0].trim().toUpperCase();
          const name = commaParts[1].trim();
          const desc = commaParts[2] ? commaParts[2].trim() : name;
          tempProducts.push({ sku, name, description: desc });
        }
      }
    }

    if (tempProducts.length > 0) {
      setParsedPreviewList((prev) => [...prev, ...tempProducts]);
      setPastedData('');
      showNotice(`Se importaron ${tempProducts.length} productos de Excel con éxito a la vista previa.`);
    } else {
      showNotice('No se encontraron columnas tabuladas correctas. Pruebe copiando filas desde una celda de Excel.');
    }
  };

  // Downloads a template .csv
  const downloadSampleCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,SKU,PRODUCTO,DESCRIPCION\n' +
      'SKU-9091,Laptop Core i7,Computadora portátil corporativa de 16GB RAM\n' +
      'SKU-4155,Adaptador HDMI multi,Conector de aluminio para múltiples pantallas\n' +
      'SKU-1120,Papel Bond Carta,Fardo de papel bond de 500 hojas de 75 gramos\n';
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'plantilla_codigos_requisicion.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Remove preview item
  const handleRemovePreviewItem = (index: number) => {
    setParsedPreviewList((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Confirm loading preview items to state
  const handleConfirmBulkSave = () => {
    if (parsedPreviewList.length === 0) {
      showNotice('La vista previa está vacía. Cargue un archivo Excel o pegue columnas para poder guardarlas.');
      return;
    }

    // Filter duplicates SKU to overwrite or append
    setProducts((prev) => {
      const filteredPrev = prev.filter(
        (prevItem) => !parsedPreviewList.some((newItem) => newItem.sku === prevItem.sku)
      );
      
      const newImported: Product[] = parsedPreviewList.map((item) => ({
        sku: item.sku,
        name: item.name,
        description: item.description,
        price: 15.00, // Defaut set price to 10
      }));

      return [...newImported, ...filteredPrev];
    });

    showNotice(`¡Se agregaron ${parsedPreviewList.length} códigos al catálogo consolidado de la empresa!`);
    setParsedPreviewList([]);
  };

  return (
    <div className="space-y-6 text-[#1e293b]">
      {/* Notice */}
      {notification && (
        <div className="p-4 bg-blue-50 border border-blue-200 text-blue-850 rounded-xl shadow-xs animate-fade-in flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium">{notification}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-blue-500 hover:text-blue-700 cursor-pointer bg-transparent border-0 outline-none">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Loader Upload Control (Span 5) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col">
          <div className="bg-slate-50 p-4 border-b border-slate-200">
            <h2 className="text-[#0f172a] font-semibold text-sm flex items-center gap-2">
              <FileUp className="w-4 h-4 text-blue-600" />
              Carga Masiva de Productos y Códigos
            </h2>
            <p className="text-xs text-slate-550 mt-1">Registre ítems de forma colectiva en el catálogo de almacén.</p>
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
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-55'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt,.xls,.xlsx"
                onChange={handleFileChange}
                className="hidden"
              />
              <FileUp className="w-9 h-9 text-blue-500 mb-2 h-auto" />
              <p className="text-xs font-semibold text-slate-700">Arrastra o selecciona un archivo (XLSX, CSV)</p>
              <p className="text-[10px] text-slate-505 mt-1 font-sans">El archivo debe contener las columnas: Código/SKU y Descripción</p>
            </div>

            {/* Paste data zone from Excel */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold flex items-center gap-1">
                  <Clipboard className="w-3.5 h-3.5 text-blue-600" />
                  Copiar & Pegar desde Excel / Hojas de Cálculo
                </label>
                <button
                  onClick={downloadSampleCSV}
                  className="text-[10px] text-blue-600 hover:text-blue-805 hover:underline font-bold font-mono flex items-center gap-1 cursor-pointer bg-transparent border-0 outline-none"
                >
                  <Download className="w-3 h-3" /> Descargar Plantilla
                </button>
              </div>

              <textarea
                rows={4}
                value={pastedData}
                onChange={(e) => setPastedData(e.target.value)}
                placeholder="Pega las celdas directamente desde tu hoja Excel...&#10;Ejemplo:&#10;SKU-9912	Suministro A	Descripción del producto"
                className="w-full bg-white border border-slate-200 text-xs text-slate-700 rounded-lg p-2.5 outline-none focus:border-blue-500 font-mono resize-none leading-relaxed"
              />

              <button
                type="button"
                onClick={handleParsePaste}
                className="w-full py-2.5 px-3 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Procesar Elementos Pegados
              </button>
            </div>

            {/* Suggested format specification */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2 text-xs">
              <h4 className="font-mono uppercase text-slate-700 text-[10px] tracking-wider font-bold flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-blue-650" /> FORMATO SUGERIDO DE COLUMNAS:
              </h4>
              <ul className="space-y-1 text-slate-550 text-[11px] list-disc pl-4 font-mono font-medium">
                <li><strong className="text-blue-650">Código / SKU</strong> (Obligatorio)</li>
                <li><strong className="text-blue-650">Descripción / Nombre</strong> (Obligatorio)</li>
              </ul>
              <p className="text-[10px] text-slate-500 mt-2 font-mono">
                Los productos se guardarán con cantidad 0 en el inventario consolidado. Luego podrás abastecerlos desde los módulos de stock o compras.
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Preview imports layout (Span 7) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col text-slate-800">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="text-slate-805 font-bold text-sm">Vista Previa de Importación</h3>
              <p className="text-xs text-slate-550 mt-0.5">Valide los datos antes de guardarlos en el catálogo.</p>
            </div>
            <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full font-mono font-bold">
              {parsedPreviewList.length} productos listos
            </span>
          </div>

          {/* Preview list */}
          <div className="flex-1 overflow-y-auto max-h-[360px] divide-y divide-slate-100 bg-white">
            {parsedPreviewList.map((item, index) => (
              <div key={index} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors group">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded text-[10px] font-bold">
                      {item.sku}
                    </span>
                    <span className="font-semibold text-slate-800">{item.name}</span>
                  </div>
                  <p className="text-[10px] text-slate-505">{item.description}</p>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleRemovePreviewItem(index)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 border-0 rounded cursor-pointer transition-colors bg-transparent outline-none"
                    title="Eliminar de la vista previa"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {parsedPreviewList.length === 0 && (
              <div className="h-64 flex flex-col items-center justify-center text-center text-slate-400 px-4">
                <Eye className="w-8 h-8 text-slate-300 mb-2 h-auto" />
                <p className="text-xs text-slate-500">Sube un archivo de Excel o copia códigos para previsualizarlos aquí.</p>
              </div>
            )}
          </div>

          {/* Save trigger */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
            <span className="text-[10px] text-slate-500 font-mono">
              Total catálogo actual: {products.length} productos
            </span>
            <button
              onClick={handleConfirmBulkSave}
              disabled={parsedPreviewList.length === 0}
              className={`px-5 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs ${
                parsedPreviewList.length > 0
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer active:scale-95'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-60'
              }`}
            >
              <Check className="w-4 h-4" /> Confirmar Carga Masiva
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
