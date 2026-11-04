import type { CodegenTypes, TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

// Codegen needs concrete shapes, so enums travel as plain strings and are
// narrowed in `normalize`.
export type NativeReservedRegion = {
  kind: string;
  x: number;
  y: number;
  width: number;
  height: number;
  marginTop: number;
  marginLeft: number;
  marginBottom: number;
  marginRight: number;
  active: boolean;
};

export type NativeDuoState = {
  isSupported: boolean;
  verticalBarEdge: string;
  hingeStatus: string;
  // Radians, straight from UIHinge.angle. The JS layer converts to degrees.
  hingeAngle: number;
  regions: ReadonlyArray<NativeReservedRegion>;
};

export interface Spec extends TurboModule {
  getState(): NativeDuoState;
  readonly onChange: CodegenTypes.EventEmitter<NativeDuoState>;
}

// Null on Android and on builds without the native module.
export default TurboModuleRegistry.get<Spec>('IphoneDuo');
