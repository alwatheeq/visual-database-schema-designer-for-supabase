import { Table, Relationship } from './schema';

export interface Design {
  id: string;
  name: string;
  description?: string;
  schema: {
    tables: Table[];
    relationships: Relationship[];
    viewport?: {
      x: number;
      y: number;
      zoom: number;
    };
    metadata?: {
      version: string;
      lastModified: string;
    };
  };
  created_at: string;
  updated_at: string;
  user_id?: string;
}

export interface CreateDesignRequest {
  name: string;
  description?: string;
  schema: {
    tables: Table[];
    relationships: Relationship[];
    viewport?: {
      x: number;
      y: number;
      zoom: number;
    };
  };
}
