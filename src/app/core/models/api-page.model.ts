export interface ApiPage<T> {
  pageSize: number;
  pageNumber: number;
  numberOfElements: number;
  totalPages: number;
  totalNumberOfElements: number;
  content: T[];
  last: boolean;
  first: boolean;
}