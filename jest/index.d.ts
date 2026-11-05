import type { DuoState, FoldOrientation, ReservedRegion } from '../src/types';

export type MockDuoState = DuoState;

export declare const DEFAULT_STATE: DuoState;

export declare function getState(): DuoState;

export declare function subscribe(listener: () => void): () => void;

export declare function useIphoneDuo(): DuoState;

export declare function useVerticalBarSide(): 'left' | 'right' | null;

export declare function useFoldRegion(): ReservedRegion | null;

export declare function getFoldOrientation(region: ReservedRegion): FoldOrientation;

export declare function __setState(partial: Partial<DuoState>): void;

export declare function __reset(): void;
