export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  role: 'admin' | 'engineer';
}

export interface Work {
  id?: string;
  name: string;
  financialYear: string;
  classification: 'Fresh' | 'Spillover';
  estimateYear?: string;
  estimateStatus: 'Submitted' | 'Sanctioned';
  estimatedCost?: number;
  sanctionRefNo?: string;
  sanctionDate?: string;
  headOfAccount?: string;
  agencyName?: string;
  agreementNo?: string;
  agreementDate?: string;
  physicalProgress?: number;
  progressRemarks?: string;
  status: 'Completed' | 'To be started' | 'In progress';
  district?: string;
  thaluk?: string;
  createdBy: string;
  createdAt: string;
}

export interface Bill {
  id?: string;
  billNo: string;
  amount: number;
  submissionDate: string;
  status: 'Paid' | 'Pending';
  paymentDate?: string;
  workId: string;
}

export interface Photo {
  id?: string;
  url: string;
  description?: string;
  date: string;
  workId: string;
}

export interface HeadOfAccount {
  id?: string;
  code: string;
  name: string;
}

export interface District {
  id?: string;
  name: string;
  thaluks: string[];
}
