import { 
  Waves, 
  Mountain, 
  Wind, 
  Sun, 
  Zap,
  Cloud,
  CloudRain,
  Thermometer,
  AlertTriangle,
  Flame
} from "lucide-react";

export type DisasterType = 'flood' | 'earthquake' | 'cyclone' | 'heatwave' | 'tsunami' | 'storm' | 'fire' | 'drought';

interface DisasterIconProps {
  type: DisasterType;
  size?: number;
  className?: string;
}

export const DisasterIcon = ({ type, size = 24, className = "" }: DisasterIconProps) => {
  const iconProps = {
    size,
    className: `${className} stroke-2`
  };

  const getIcon = () => {
    switch (type) {
      case 'flood':
        return <Waves {...iconProps} className={`${iconProps.className} text-flood`} />;
      case 'earthquake':
        return <Mountain {...iconProps} className={`${iconProps.className} text-earthquake`} />;
      case 'cyclone':
        return <Wind {...iconProps} className={`${iconProps.className} text-cyclone`} />;
      case 'heatwave':
        return <Sun {...iconProps} className={`${iconProps.className} text-heatwave`} />;
      case 'tsunami':
        return <Waves {...iconProps} className={`${iconProps.className} text-tsunami`} />;
      case 'storm':
        return <Zap {...iconProps} className={`${iconProps.className} text-primary`} />;
      case 'fire':
        return <Flame {...iconProps} className={`${iconProps.className} text-destructive`} />;
      case 'drought':
        return <Thermometer {...iconProps} className={`${iconProps.className} text-heatwave`} />;
      default:
        return <AlertTriangle {...iconProps} className={`${iconProps.className} text-muted-foreground`} />;
    }
  };

  return getIcon();
};

export const getDisasterInfo = (type: DisasterType) => {
  const info = {
    flood: {
      name: 'Flood',
      description: 'Overflow of water onto normally dry land',
      color: 'flood',
      severity: 'High risk of property damage and life threat'
    },
    earthquake: {
      name: 'Earthquake',
      description: 'Sudden shaking of the ground caused by tectonic movements',
      color: 'earthquake',
      severity: 'Immediate danger to structures and lives'
    },
    cyclone: {
      name: 'Cyclone',
      description: 'Rotating storm system with high winds',
      color: 'cyclone',
      severity: 'Severe wind damage and flooding possible'
    },
    heatwave: {
      name: 'Heatwave',
      description: 'Prolonged period of excessively hot weather',
      color: 'heatwave',
      severity: 'Health risks, especially for vulnerable populations'
    },
    tsunami: {
      name: 'Tsunami',
      description: 'Large ocean waves caused by underwater disturbances',
      color: 'tsunami',
      severity: 'Extreme danger to coastal areas'
    },
    storm: {
      name: 'Storm',
      description: 'Severe weather with heavy rain, wind, and lightning',
      color: 'primary',
      severity: 'Risk of flooding and property damage'
    },
    fire: {
      name: 'Wildfire',
      description: 'Uncontrolled fire spreading through vegetation',
      color: 'destructive',
      severity: 'Rapid spread with immediate evacuation needs'
    },
    drought: {
      name: 'Drought',
      description: 'Extended period of water shortage',
      color: 'heatwave',
      severity: 'Long-term agricultural and water supply impacts'
    }
  };

  return info[type] || info.flood;
};