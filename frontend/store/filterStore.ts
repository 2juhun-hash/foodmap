import { create } from 'zustand';
import type { FilterState, GeoLocation, Category, SourceType, SortType } from '@/types';

interface FilterStore extends FilterState {
  isLocating: boolean;
  setLocation: (loc: GeoLocation | null) => void;
  setIsLocating: (v: boolean) => void;
  setCategory: (cat: Category) => void;
  toggleSource: (src: SourceType) => void;
  setRadius: (r: number) => void;
  setSortBy: (s: SortType) => void;
  setSearchQuery: (q: string) => void;
  setMinRating: (r: number | null) => void;
  resetFilters: () => void;
}

const initialState: FilterState = {
  category: '전체',
  sources: [],
  sortBy: 'distance',
  radius: 1000,
  searchQuery: '',
  location: null,
  minRating: null,
};

export const useFilterStore = create<FilterStore>(set => ({
  ...initialState,
  isLocating: true, // 마운트 시 즉시 위치 감지 시작하므로 true로 초기화
  setLocation: loc => set({ location: loc }),
  setIsLocating: v => set({ isLocating: v }),
  setCategory: category => set({ category }),
  toggleSource: src =>
    set(s => ({
      sources: s.sources.includes(src)
        ? s.sources.filter(x => x !== src)
        : [...s.sources, src],
    })),
  setRadius: radius => set({ radius }),
  setSortBy: sortBy => set({ sortBy }),
  setSearchQuery: searchQuery => set({ searchQuery }),
  setMinRating: minRating => set({ minRating }),
  resetFilters: () => set({ ...initialState }),
}));
