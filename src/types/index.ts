export type Category = '전체' | '한식' | '중식' | '일식' | '양식' | '아시안' | '카페·디저트' | '기타';
export type SortType = 'rating' | 'distance' | 'reviews';
export type Source = 'michelin' | 'blueribbon' | 'sikshin';

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

export interface MichelinRating {
  grade: number;
  type: 'star' | 'bib';
}

export interface Ratings {
  michelin?: MichelinRating;
  blueribbon?: { grade: number };
  sikshin?: { score: number };
}

export interface Restaurant {
  id: string;
  name: string;
  category: Exclude<Category, '전체'>;
  address: string;
  phone: string;
  location: { lat: number; lng: number };
  hours: Hours;
  signatureDishes: { name: string; price?: string }[];
  ratings: Ratings;
  averageRating: number;
  reviewCount: number;
  images: string[];
  description?: string;
}

export interface FilterState {
  category: Category;
  sources: Source[];
  sortBy: SortType;
  radius: number;
  searchQuery: string;
}
