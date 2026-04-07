export type CategoryType = 'Desarrollo Web' | 'Aplicaciones Web' | 'Social Media' | 'Branding';

export interface SubPackage {
  id: string;
  name: string;
  price: string;
  description: string;
  features: string[];
  deliveryTime: string;
  revisions: string;
  paymentTerms: string;
}

export interface Project {
  id: string;
  clientName: string;
  projectName: string;
  extraInfo: string;
  category: CategoryType;
  subPackageId: string;
  images: string[];
  status: 'pending' | 'processing' | 'completed';
  createdAt: number;
  result?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
