export type Category = '전체' | '한식' | '일식' | '중식' | '양식' | '아시안' | '카페·디저트' | '기타';
export type SortType = 'distance' | 'rating';
export type SourceType = 'blueribbon' | 'michelin' | 'sikshin';

export interface MichelinRating {
  grade: number | null;
  grade_type: 'star' | 'bib';
}

export interface BlueribbonRating {
  grade: number;
  grade_type: 'ribbon';
}

export interface SikshinRating {
  score: number;
  grade_type: 'score';
}

export interface Source {
  source_type: SourceType;
  grade?: number | null;
  grade_type?: string;
  score?: number;
  source_url?: string;
}

export interface Dish {
  name: string;
  price?: string;
}

export interface Hours {
  mon?: string;
  tue?: string;
  wed?: string;
  thu?: string;
  fri?: string;
  sat?: string;
  sun?: string;
  breakTime?: string;
  holiday?: string;
}

export interface Restaurant {
  id: string;
  name: string;
  category: Exclude<Category, '전체'>;
  address: string;
  phone?: string;
  location: { lat: number; lng: number };
  description?: string;
  images: string[];
  thumbnail_url?: string;
  sources: Source[];
  signature_dishes: Dish[];
  hours?: Hours;
  distance_m?: number;
  is_open?: boolean;
}

export interface FilterState {
  category: Category;
  sources: SourceType[];
  sortBy: SortType;
  radius: number;
  searchQuery: string;
  location: { lat: number; lng: number } | null;
  minRating: number | null;
}

export interface GeoLocation {
  lat: number;
  lng: number;
}

export interface RestaurantsResponse {
  items: Restaurant[];
  next_cursor: string | null;
  total_count: number;
}
