import { Product, Branch, Supplier, Requisition, ExternalOrder } from '../types';

export const DEFAULT_PRODUCTS: Product[] = [
  { sku: 'SKU-7721', name: 'Cable de Red Cat6 15m', description: 'Cable ethernet azul blindado de alta velocidad para conexiones estables', price: 12.50 },
  { sku: 'SKU-3104', name: 'Teclado Mecánico RGB Pro', description: 'Teclado mecánico con switches red, silencioso y retroiluminado', price: 45.00 },
  { sku: 'SKU-9942', name: 'Monitor LED 24" Full HD', description: 'Monitor para oficina con protección de luz azul y entrada HDMI/VGA', price: 110.00 },
  { sku: 'SKU-1085', name: 'Ratón Óptico Ergonómico USB', description: 'Mouse cableado ultra fino con selector de DPI y agarre antideslizante', price: 8.99 },
  { sku: 'SKU-4402', name: 'Auriculares con Cancelación Activa de Ruido', description: 'Audífonos inalámbricos de diadema con micrófono incorporado', price: 55.00 },
  { sku: 'SKU-8851', name: 'Memoria USB 3.2 de 128GB', description: 'Unidad de almacenamiento rápido metálica de alta durabilidad', price: 14.50 },
  { sku: 'SKU-5520', name: 'Cargador Carga Rápida USB-C 45W', description: 'Adaptador de pared con doble salida USB-A y Tipo C', price: 19.99 },
];

export const DEFAULT_BRANCHES: Branch[] = [
  // Centros de Distribución (CEDIs)
  {
    id: 'cedi-central',
    name: 'CEDI Central San Salvador',
    type: 'cedi',
    address: 'Zona Industrial Plan de la Laguna, Antiguo Cuscatlán',
    manager: 'Carlos Eduardo Romero',
    email: 'carlos.romero@requisiciones.com',
    phone: '2243-9000',
  },
  {
    id: 'cedi-oriente',
    name: 'CEDI Regional San Miguel',
    type: 'cedi',
    address: 'Carretera Ruta Militar Km 140, San Miguel',
    manager: 'Marta Lorena Benítez',
    email: 'marta.benitez@requisiciones.com',
    phone: '2661-4500',
  },
  // Sucursales / Tiendas
  {
    id: 'suc-escalon',
    name: 'Sucursal Paseo General Escalón',
    type: 'sucursal',
    address: 'Paseo Gral. Escalón y 79 Av. Norte, San Salvador',
    manager: 'Alejandra María Torres',
    email: 'ale.torres@requisiciones.com',
    phone: '2263-1200',
    defaultCediId: 'cedi-central',
  },
  {
    id: 'suc-santa-tecla',
    name: 'Sucursal Santa Tecla Centro',
    type: 'sucursal',
    address: '2a Calle Poniente y 4a Avenida Norte, Santa Tecla',
    manager: 'Francisco Javier Zelaya',
    email: 'javier.zelaya@requisiciones.com',
    phone: '2511-3400',
    defaultCediId: 'cedi-central',
  },
  {
    id: 'suc-lourdes',
    name: 'Sucursal Lourdes Colón',
    type: 'sucursal',
    address: 'Centro Comercial El Encuentro, Lourdes',
    manager: 'Julio Roberto Merlos',
    email: 'julio.merlos@requisiciones.com',
    phone: '2318-7700',
    defaultCediId: 'cedi-central',
  },
  {
    id: 'suc-san-miguel-centro',
    name: 'Sucursal San Miguel Plaza',
    type: 'sucursal',
    address: 'Avenida Gerardo Barrios, San Miguel',
    manager: 'Oscar Alfredo Martínez',
    email: 'oscar.martinez@requisiciones.com',
    phone: '2605-8800',
    defaultCediId: 'cedi-oriente',
  },
];

export const DEFAULT_SUPPLIERS: Supplier[] = [
  { id: 'prov-tech', name: 'Distribuidora Tecnológica Limitada', email: 'ventas@techdist.com', phone: '2289-4455', address: 'Bulevar de los Héroes, San Salvador' },
  { id: 'prov-office', name: 'Suministros de Oficina Global S.A.', email: 'pedidos@globaloffice.com', phone: '2545-1234', address: 'Calle Circunvalación, San Salvador' },
  { id: 'prov-electra', name: 'Electrónica e Integraciones Cuscatlán', email: 'contacto@eleccusca.com', phone: '2209-7711', address: 'Paseo Independencia, Santa Ana' },
];

export const DEFAULT_REQUISITIONS: Requisition[] = [
  {
    id: 'REQ-2026-0001',
    date: '2026-06-08',
    originId: 'cedi-central',
    destinationId: 'suc-escalon',
    managerName: 'Alejandra María Torres',
    status: 'Entregado',
    items: [
      { id: 'item-1', sku: 'SKU-7721', description: 'Cable de Red Cat6 15m', quantity: 15 },
      { id: 'item-2', sku: 'SKU-1085', description: 'Ratón Óptico Ergonómico USB', quantity: 10 },
    ]
  },
  {
    id: 'REQ-2026-0002',
    date: '2026-06-09',
    originId: 'cedi-central',
    destinationId: 'suc-santa-tecla',
    managerName: 'Francisco Javier Zelaya',
    status: 'En Tránsito',
    items: [
      { id: 'item-3', sku: 'SKU-9942', description: 'Monitor LED 24" Full HD', quantity: 4 },
      { id: 'item-4', sku: 'SKU-3104', description: 'Teclado Mecánico RGB Pro', quantity: 5 },
    ]
  },
  {
    id: 'REQ-2026-0003',
    date: '2026-06-10',
    originId: 'cedi-oriente',
    destinationId: 'suc-san-miguel-centro',
    managerName: 'Oscar Alfredo Martínez',
    status: 'Pendiente',
    items: [
      { id: 'item-5', sku: 'SKU-8851', description: 'Memoria USB 3.2 de 128GB', quantity: 20 },
      { id: 'item-6', sku: 'SKU-5520', description: 'Cargador Carga Rápida USB-C 45W', quantity: 12 },
    ]
  },
];

export const DEFAULT_EXTERNAL_ORDERS: ExternalOrder[] = [
  {
    id: 'ORD-2026-0001',
    date: '2026-06-05',
    supplierId: 'prov-tech',
    destinationId: 'cedi-central',
    managerName: 'Carlos Eduardo Romero',
    shippingConfig: {
      sendToEmail: 'ventas@techdist.com',
      fromEmail: 'pablopiche1g3@gmail.com',
      phone: '74503973',
      authorizedBy: 'JULIO NEFTALI CAÑAS ZELA',
      digitizedBy: 'RENE LANGLOIS',
      isLocked: true
    },
    status: 'Recibido',
    items: [
      { id: 'ord-item-1', sku: 'SKU-9942', description: 'Monitor LED 24" Full HD', quantity: 50, cost: 95.00, quotationNo: 'COT-501' },
      { id: 'ord-item-2', sku: 'SKU-3104', description: 'Teclado Mecánico RGB Pro', quantity: 100, cost: 35.00, quotationNo: 'COT-501' },
    ]
  },
  {
    id: 'ORD-2026-0002',
    date: '2026-06-10',
    supplierId: 'prov-office',
    destinationId: 'cedi-oriente',
    managerName: 'Marta Lorena Benítez',
    shippingConfig: {
      sendToEmail: 'pedidos@globaloffice.com',
      fromEmail: 'pablopiche1g3@gmail.com',
      phone: '71120034',
      authorizedBy: 'JULIO NEFTALI CAÑAS ZELA',
      digitizedBy: 'MARTA LORENA BENÍTEZ',
      isLocked: false
    },
    status: 'Enviado a Proveedor',
    items: [
      { id: 'ord-item-3', sku: 'SKU-1085', description: 'Ratón Óptico Ergonómico USB', quantity: 150, cost: 6.20, quotationNo: 'COT-772' },
    ]
  }
];
