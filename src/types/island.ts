export type LocationCategory =
  | 'shelter'
  | 'survival'
  | 'sea'
  | 'encounter'
  | 'landmark'
  | 'monument';

export type TimeOfDay = 'day' | 'sunset' | 'night';
export type MapMode = 'chronology' | 'all';
export type QualityMode = 'balanced' | 'high';

export interface IslandLocation {
  id: string;
  name: string;
  shortName: string;
  category: LocationCategory;
  /** Координаты [x, z] на 3D-сцене острова */
  coords: [number, number];
  /** Смещение маркера по высоте над рельефом/уровнем моря */
  yOffset?: number;
  cameraPos: [number, number, number];
  cameraTarget: [number, number, number];
  /** Этап хронологии (1..20), с которого локация открывается на карте */
  firstStage: number;
  summary: string;
  details: string;
  facts: string[];
  isWater?: boolean;
}

export interface ChronologyEvent {
  id: string;
  stage: number;
  year: number;
  dateLabel: string;
  islandYearLabel: string;
  chapter: string;
  title: string;
  locationId: string;
  summary: string;
  quote: string;
  facts: string[];
  cameraPos?: [number, number, number];
  cameraTarget?: [number, number, number];
}

export interface RouteDefinition {
  id: string;
  name: string;
  fromStage: number;
  toStage?: number;
  color: string;
  isSea: boolean;
  points: Array<[number, number]>;
}

export interface EncyclopediaArticle {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  body: string;
  bullets: string[];
}

export interface ProjectedMarker {
  id: string;
  x: number;
  y: number;
  visible: boolean;
  distance: number;
}

export const CATEGORY_LABELS: Record<LocationCategory, string> = {
  shelter: 'Жилище и защита',
  survival: 'Хозяйство и ремёсла',
  sea: 'Море и судоходство',
  encounter: 'Встречи и события',
  landmark: 'Ориентиры острова',
  monument: 'Знак клуба',
};
