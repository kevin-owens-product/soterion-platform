import { create } from "zustand";
import type {
  FacilityConfig,
  Zone,
  ZoneTypeDefinition,
  KpiDefinition,
  ComplianceFramework,
  FullFacilityConfig,
} from "@/types";
import { getFacilityConfig } from "@/lib/api";

interface FacilityState {
  facility: FacilityConfig | null;
  facilityType: string;
  zones: Zone[];
  selectedZoneId: string | null;
  zoneTypes: ZoneTypeDefinition[];
  anomalyTypes: string[];
  kpiDefinitions: KpiDefinition[];
  complianceFrameworks: ComplianceFramework[];
  journeyStages: string[];
  subtitle: string;
  loading: boolean;
  error: string | null;

  setFacility: (facility: FacilityConfig) => void;
  setZones: (zones: Zone[]) => void;
  selectZone: (id: string | null) => void;
  fetchConfig: () => Promise<void>;
  setFullConfig: (config: FullFacilityConfig) => void;
}

export const useFacilityStore = create<FacilityState>((set) => ({
  facility: null,
  facilityType: "AIRPORT",
  zones: [],
  selectedZoneId: null,
  zoneTypes: [],
  anomalyTypes: [],
  kpiDefinitions: [],
  complianceFrameworks: [],
  journeyStages: [],
  subtitle: "Intelligence Platform",
  loading: false,
  error: null,

  setFacility: (facility) => set({ facility, zones: facility.zones }),
  setZones: (zones) => set({ zones }),
  selectZone: (id) => set({ selectedZoneId: id }),

  fetchConfig: async () => {
    set({ loading: true, error: null });
    try {
      const config = await getFacilityConfig();
      set({
        facility: config.facility,
        facilityType: config.facilityType ?? config.facility?.type ?? "AIRPORT",
        zones: Array.isArray(config.facility?.zones) ? config.facility.zones : [],
        zoneTypes: Array.isArray(config.zoneTypes) ? config.zoneTypes : [],
        anomalyTypes: Array.isArray(config.anomalyTypes) ? config.anomalyTypes : [],
        kpiDefinitions: Array.isArray(config.kpiDefinitions) ? config.kpiDefinitions : [],
        complianceFrameworks: Array.isArray(config.complianceFrameworks) ? config.complianceFrameworks : [],
        journeyStages: Array.isArray(config.journeyStages) ? config.journeyStages : [],
        subtitle: config.subtitle ?? "Intelligence Platform",
        loading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to fetch facility config",
        loading: false,
      });
    }
  },

  setFullConfig: (config: FullFacilityConfig) =>
    set({
      facility: config.facility,
      facilityType: config.facilityType ?? config.facility?.type ?? "AIRPORT",
      zones: Array.isArray(config.facility?.zones) ? config.facility.zones : [],
      zoneTypes: Array.isArray(config.zoneTypes) ? config.zoneTypes : [],
      anomalyTypes: Array.isArray(config.anomalyTypes) ? config.anomalyTypes : [],
      kpiDefinitions: Array.isArray(config.kpiDefinitions) ? config.kpiDefinitions : [],
      complianceFrameworks: Array.isArray(config.complianceFrameworks) ? config.complianceFrameworks : [],
      journeyStages: Array.isArray(config.journeyStages) ? config.journeyStages : [],
      subtitle: config.subtitle ?? "Intelligence Platform",
    }),
}));
