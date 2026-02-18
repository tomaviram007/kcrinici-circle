import { useState, useEffect } from "react";

import heroBg from "@/assets/hero-bg.jpg";
import heroEvents from "@/assets/hero-events.jpg";
import heroGallery from "@/assets/hero-gallery.jpg";
import heroMembers from "@/assets/hero-members.jpg";
import heroRegister from "@/assets/hero-register.png";
import heroAnnouncements from "@/assets/hero-announcements.jpg";

const images = [heroRegister, heroBg, heroEvents, heroGallery, heroMembers, heroAnnouncements];

const RegisterBackground = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setPrevIndex(currentIndex);
      setTransitioning(true);
      setCurrentIndex((prev) => (prev + 1) % images.length);

      setTimeout(() => setTransitioning(false), 1500);
    }, 5000);

    return () => clearInterval(interval);
  }, [currentIndex]);

  return (
    <div className="fixed inset-0 -z-10">
      {/* Previous image (fading out) */}
      {transitioning && (
        <div
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-[1500ms] ease-in-out opacity-0"
          style={{ backgroundImage: `url(${images[prevIndex]})` }}
        />
      )}

      {/* Current image (fading in) */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-opacity duration-[1500ms] ease-in-out"
        style={{
          backgroundImage: `url(${images[currentIndex]})`,
          opacity: 1,
        }}
      />

      {/* Dark gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/85 via-background/70 to-background/90" />
    </div>
  );
};

export default RegisterBackground;
