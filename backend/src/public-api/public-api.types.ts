export type PublicApiContext = {
  tenantId: string;
  apiKeyId: string;
  keyName: string;
};

export type PaginatedResponse<T> = {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
};
