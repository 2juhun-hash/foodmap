import { create } from 'zustand';
import type { FilterState, Restaurant, Category, Source, SortType } from '../types';
import { restaurants } from '../data/restaurants';
import { getDistance } from '../utils/distance';

interface AppState {
  userLocation: { lat: number; lng: number } | null;
  selectedRestaurant: Restaurant | null;
  filters: FilterState;
  locationLoading: boolean;
  setUserLocation: (loc: { lat: number; lng: number } | null) => void;
  setSelectedRestaurant: (r: Restaurant | null) => void;
  setCategory: (c: Category) => void;
  toggleSource: (s: Source) => void;
  setSortBy: (sort: SortType) => void;
  setRadius: (r: number) => void;
  setSearchQuery: (q: string) => void;
  setLocationLoading: (v: boolean) => void;
  getFilteredRestaurants: () => (Restaurant & { distance?: number })[];
}

export const useStore = create<AppState>((set, get) => ({
  userLocation: null,
  selectedRestaurant: null,
  locationLoading: false,
  filters: {
    category: '전체',
    sources: ['michelin', 'blueribbon', 'sikshin'],
    sortBy: 'rating',
    radius: 5000,
    searchQuery: '',
  },

  setUserLocation: (loc) => set({ userLocation: loc }),
  setSelectedRestaurant: (r) => set({ selectedRestaurant: r }),
  setCategory: (c) => set(s => ({ filters: { ...s.filters, category: c } })),
  toggleSource: (source) =>
    set(s => {
      const current = s.filters.sources;
      const next = current.includes(source)
        ? current.filter(x => x !== source)
        : [...current, source];
      return { filters: { ...s.filters, sources: next.length ? next : current } };
    }),
  setSortBy: (sort) => set(s => ({ filters: { ...s.filters, sortBy: sort } })),
  setRadius: (r) => set(s => ({ filters: { ...s.filters, radius: r } })),
  setSearchQuery: (q) => set(s => ({ filters: { ...s.filters, searchQuery: q } })),
  setLocationLoading: (v) => set({ locationLoading: v }),

  getFilteredRestaurants: () => {
    const { userLocation, filters } = get();
    let list = restaurants.map(r => ({
      ...r,
      distance: userLocation
        ? getDistance(userLocation.lat, userLocation.lng, r.location.lat, r.location.lng)
        : undefined,
    }));

    if (userLocation && filters.radius) {
      list = list.filter(r => r.distance !== undefined && r.distance <= filters.radius);
    }

    if (filters.category !== '전체') {
      list = list.filter(r => r.category === filters.category);
    }

    list = list.filter(r =>
      filters.sources.some(src => {
        if (src === 'michelin') return !!r.ratings.michelin;
        if (src === 'blueribbon') return !!r.ratings.blueribbon;
        if (src === 'sikshin') return !!r.ratings.sikshin;
        return false;
      })
    );

    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      list = list.filter(
        r =>
          r.name.toLowerCase().includes(q) ||
          r.address.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      if (filters.sortBy === 'rating') return b.averageRating - a.averageRating;
      if (filters.sortBy === 'reviews') return b.reviewCount - a.reviewCount;
      if (filters.sortBy === 'distance') {
        if (a.distance === undefined) return 1;
        if (b.distance === undefined) return -1;
        return a.distance - b.distance;
      }
      return 0;
    });

    return list;
  },
}));
