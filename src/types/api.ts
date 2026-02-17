export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiResponse<T> {
  data: T;
  success: true;
}

export interface ApiErrorResponse {
  error: ApiError;
  success: false;
}

export type ApiResult<T> = ApiResponse<T> | ApiErrorResponse;

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface ApiListParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ApiFilterParams extends ApiListParams {
  search?: string;
}

export interface ApiSuccessResponse<T> {
  data: T;
  message?: string;
}

export interface ApiDeleteResponse {
  deleted: boolean;
  id: string;
}

export interface ApiStatusResponse {
  status: string;
  timestamp: string;
}
