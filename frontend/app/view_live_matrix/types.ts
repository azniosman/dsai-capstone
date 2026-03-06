export interface Dataset {
  id: number;
  datasetName: string;
  datasetVersion: string;
  sourceUrl?: string;
  checksum: string;
  recordCount: number;
  downloadedAt: string;
  processedAt?: string;
  status: string;
}

export interface LiveMatrixData {
  id: number;
  year: number;
  sector: string;
  jobRole: string;
  skillCategory: string;
  demandIndex: number;
  supplyIndex: number;
  growthRate: number;
  createdAt: string;
}

export interface DatasetDiff {
  id: number;
  fieldName: string;
  oldValue?: string;
  newValue?: string;
  changeType: 'NEW_RECORD' | 'UPDATED_RECORD' | 'REMOVED_RECORD' | 'VALUE_CHANGE';
  detectedAt: string;
  datasetNew: { id: number };
  datasetPrevious: { id: number };
}

export interface TrendSignal {
  id: number;
  sector: string;
  jobRole: string;
  trendType: string;
  trendScore: number;
  confidence: number;
  createdAt: string;
}
