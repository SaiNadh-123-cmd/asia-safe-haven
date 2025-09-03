import React, { useEffect, useState } from 'react';
import Lottie from 'lottie-react';
import { motion, AnimatePresence } from 'framer-motion';

// Import Lottie animation files
import rainAnimation from '@/assets/lottie/rain.json';
import fireAnimation from '@/assets/lottie/fire.json';
import droughtAnimation from '@/assets/lottie/drought.json';
import stormAnimation from '@/assets/lottie/storm.json';

interface DisasterAnimationsProps {
  weatherCondition?: string;
  precipitation?: number;
  temperature?: number;
  windSpeed?: number;
}

interface AnimationParticle {
  id: number;
  x: number;
  y: number;
  delay: number;
  duration: number;
  animation: any;
}

const DisasterAnimations: React.FC<DisasterAnimationsProps> = ({
  weatherCondition = '',
  precipitation = 0,
  temperature = 25,
  windSpeed = 0,
}) => {
  const [particles, setParticles] = useState<AnimationParticle[]>([]);
  const [disasterType, setDisasterType] = useState<string>('');

  useEffect(() => {
    // Determine disaster type based on weather conditions with enhanced detection
    let newDisasterType = '';
    
    if (precipitation > 10 || weatherCondition.toLowerCase().includes('rain') || weatherCondition.toLowerCase().includes('drizzle')) {
      newDisasterType = 'flood';
    } else if (windSpeed > 25 || weatherCondition.toLowerCase().includes('thunder') || weatherCondition.toLowerCase().includes('storm')) {
      newDisasterType = 'storm';
    } else if (temperature > 35 || (weatherCondition.toLowerCase().includes('clear') && temperature > 30)) {
      newDisasterType = 'wildfire';
    } else if (temperature > 30 && precipitation < 2 && windSpeed < 10) {
      newDisasterType = 'drought';
    }

    setDisasterType(newDisasterType);

    // Generate continuous particles based on disaster type
    if (newDisasterType) {
      const newParticles: AnimationParticle[] = [];
      const particleCount = newDisasterType === 'storm' ? 8 : 12; // More particles for continuous effect
      
      let animationData;
      switch (newDisasterType) {
        case 'flood':
          animationData = rainAnimation;
          break;
        case 'storm':
          animationData = stormAnimation;
          break;
        case 'wildfire':
          animationData = fireAnimation;
          break;
        case 'drought':
          animationData = droughtAnimation;
          break;
        default:
          animationData = rainAnimation;
      }
      
      for (let i = 0; i < particleCount; i++) {
        newParticles.push({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          delay: Math.random() * 4, // Staggered start times for continuous flow
          duration: 6 + Math.random() * 4, // Longer duration for smoother animation
          animation: animationData,
        });
      }
      
      setParticles(newParticles);
    } else {
      setParticles([]);
    }
  }, [weatherCondition, precipitation, temperature, windSpeed]);

  if (!disasterType || particles.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-10 overflow-hidden">
      <AnimatePresence>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ 
              opacity: [0, 0.6, 0.8, 0.6, 0], // Smooth opacity transitions
              scale: [0, 1, 1, 1, 0.2],
              y: disasterType === 'flood' ? [0, 200] : 
                 disasterType === 'storm' ? [0, 120] :
                 disasterType === 'wildfire' ? [0, -100] : [0, 80],
              x: disasterType === 'storm' ? [0, Math.random() * 50 - 25] : 
                 disasterType === 'drought' ? [0, Math.random() * 80 - 40] : 
                 disasterType === 'flood' ? [0, Math.random() * 20 - 10] : 0,
              rotate: disasterType === 'storm' ? [0, 360] : 
                     disasterType === 'drought' ? [0, 180] : 0,
            }}
            transition={{
              duration: particle.duration,
              delay: particle.delay,
              repeat: Infinity,
              ease: "linear", // Smooth continuous motion
              repeatType: "loop",
            }}
          >
            <div className="w-2 h-2 md:w-3 md:h-3 lg:w-4 lg:h-4">
              <Lottie
                animationData={particle.animation}
                loop={true}
                autoplay={true}
                style={{
                  width: '100%',
                  height: '100%',
                  opacity: 0.7, // Slightly transparent to not obstruct content
                  filter: disasterType === 'flood' ? 'hue-rotate(200deg) brightness(0.9) saturate(1.2)' : 
                         disasterType === 'storm' ? 'hue-rotate(180deg) brightness(0.8) contrast(1.2)' :
                         disasterType === 'wildfire' ? 'hue-rotate(20deg) brightness(1.3) saturate(1.5)' :
                         disasterType === 'drought' ? 'hue-rotate(40deg) brightness(1.1) sepia(0.3)' : 'none',
                }}
              />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default DisasterAnimations;