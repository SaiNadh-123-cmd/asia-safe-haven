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
    // Determine disaster type based on weather conditions
    let newDisasterType = '';
    
    if (precipitation > 50 || weatherCondition.toLowerCase().includes('rain') || weatherCondition.toLowerCase().includes('storm')) {
      newDisasterType = 'flood';
    } else if (temperature > 40 || weatherCondition.toLowerCase().includes('clear') && temperature > 35) {
      newDisasterType = 'drought';
    } else if (windSpeed > 60 || weatherCondition.toLowerCase().includes('thunder') || weatherCondition.toLowerCase().includes('storm')) {
      newDisasterType = 'storm';
    } else if (temperature > 38 && precipitation < 5) {
      newDisasterType = 'wildfire';
    }

    setDisasterType(newDisasterType);

    // Generate particles based on disaster type
    if (newDisasterType) {
      const newParticles: AnimationParticle[] = [];
      const particleCount = newDisasterType === 'storm' ? 6 : 8;
      
      let animationData;
      switch (newDisasterType) {
        case 'flood':
        case 'storm':
          animationData = newDisasterType === 'storm' ? stormAnimation : rainAnimation;
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
          delay: Math.random() * 3,
          duration: 4 + Math.random() * 3,
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
              opacity: [0, 0.8, 0.8, 0],
              scale: [0, 1, 1, 0.3],
              y: disasterType === 'flood' ? [0, 150] : 
                 disasterType === 'storm' ? [0, 100] :
                 disasterType === 'wildfire' ? [0, -80] : [0, 50],
              x: disasterType === 'storm' ? [0, Math.random() * 40 - 20] : 
                 disasterType === 'drought' ? [0, Math.random() * 60 - 30] : 0,
            }}
            transition={{
              duration: particle.duration,
              delay: particle.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <div className="w-3 h-3 md:w-4 md:h-4 lg:w-5 lg:h-5">
              <Lottie
                animationData={particle.animation}
                loop={true}
                autoplay={true}
                style={{
                  width: '100%',
                  height: '100%',
                  filter: disasterType === 'flood' ? 'hue-rotate(200deg) brightness(0.9)' : 
                         disasterType === 'storm' ? 'hue-rotate(180deg) brightness(0.8)' :
                         disasterType === 'wildfire' ? 'hue-rotate(20deg) brightness(1.3)' :
                         disasterType === 'drought' ? 'hue-rotate(40deg) brightness(1.1)' : 'none',
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