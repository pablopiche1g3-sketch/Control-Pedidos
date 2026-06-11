export interface Product {
  sku: string;
  name: string;
  description: string;
  category?: string;
  price?: number; // Internal cost
}

export type PointType = 'sucursal' | 'cedi';

export interface Branch {
  id: string;
  name: string;
  type: PointType;
  address: string;
  manager: string;
  email: string;
  phone: string;
  defaultCediId?: string; // Binds a branch to its default Distribution Center
}

export interface RequisitionItem {
  id: string;
  sku: string;
  description: string;
  quantity: number;
}

export type RequisitionStatus = 'Pendiente' | 'Procesado' | 'En Tránsito' | 'Entregado' | 'Cancelado';

export interface Requisition {
  id: string; // REQ-YYYY-XXXX
  date: string;
  originId: string; // From warehouse/CEDI
  destinationId: string; // Requesting warehouse/branch
  managerName: string;
  items: RequisitionItem[];
  status: RequisitionStatus;
}

export interface ExternalOrderItem {
  id: string;
  sku: string;
  description: string;
  quantity: number;
  cost: number;
  quotationNo?: string;
}

export type ExternalOrderStatus = 'Borrador' | 'Enviado a Proveedor' | 'Recibido' | 'Cancelado';

export interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
}

export interface ExternalOrder {
  id: string; // ORD-YYYY-XXXX
  date: string;
  supplierId: string;
  destinationId: string; // Reception warehouse
  managerName: string;
  shippingConfig: {
    sendToEmail: string;
    fromEmail: string;
    phone: string;
    authorizedBy: string;
    digitizedBy: string;
    isLocked: boolean;
  };
  items: ExternalOrderItem[];
  status: ExternalOrderStatus;
}
