import React, { useEffect, useState, useRef } from "react";
import { getSliderSlides } from "../../api/slider";
import Spinner from "../Common/Spinner";

function AuthSlider() {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Default slides as fallback
  const defaultSlides = [
    {
      title: "Managing Tickets is easier now",
      description:
        "Easily create, assign, and resolve support tickets in one centralized system. Stay organized and save time.",
      image: "/assets/images/slider1.png",
    },
    {
      title: "Track all your Tickets efficiently",
      description:
        "Get real-time updates and monitor the status of every ticket from submission to resolution with full transparency.",
      image: "/assets/images/slider2.png",
    },
    {
      title: "Manage your time with precision",
      description:
        "Prioritize tasks, set deadlines, and stay on top of your schedule with our intuitive time management tools.",
      image: "/assets/images/slider3.png",
    },
  ];

  // Fetch slides from backend
  useEffect(() => {
    const fetchSlides = async () => {
      try {
        setLoading(true);
        const response = await getSliderSlides();
        
        if (response && response.length > 0) {
          // Transform backend data to match frontend format
          const transformedSlides = response.map(slide => ({
            title: slide.title,
            description: slide.description,
            image: slide.image_url || slide.image,
          }));
          setSlides(transformedSlides);
        } else {
          // Use default slides if no slides from backend
          setSlides(defaultSlides);
        }
      } catch (err) {
        console.error('Error fetching slider slides:', err);
        setError(err);
        // Use default slides on error
        setSlides(defaultSlides);
      } finally {
        setLoading(false);
      }
    };

    fetchSlides();
  }, []);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50, isHovering: false });
  const [circles, setCircles] = useState([
    { x: 30, y: 40, targetX: 70, targetY: 60, speed: 0.5, size: 30 },
    { x: 70, y: 60, targetX: 20, targetY: 30, speed: 0.7, size: 25 }
  ]);
  const containerRef = useRef(null);
  const animationRef = useRef(null);

  // Handle automatic slide transitions
  useEffect(() => {
    if (slides.length === 0) return; // Don't start interval if no slides
    
    const slideInterval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(slideInterval);
  }, [slides.length]);

  // Smoothly animate gradient circles
  useEffect(() => {
    const animateCircles = () => {
      if (mousePosition.isHovering) return;
      
      setCircles(prevCircles => prevCircles.map(circle => {
        // Calculate distance to target
        const dx = circle.targetX - circle.x;
        const dy = circle.targetY - circle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // If close to target, set new random target
        if (distance < 1) {
          // Generate new target that could be outside the container
          return {
            ...circle,
            targetX: Math.random() * 140 - 20, // -20% to 120% of container width
            targetY: Math.random() * 140 - 20  // -20% to 120% of container height
          };
        }
        
        // Move circle toward target
        const newX = circle.x + (dx / distance) * circle.speed;
        const newY = circle.y + (dy / distance) * circle.speed;
        
        return {
          ...circle,
          x: newX,
          y: newY
        };
      }));
      
      animationRef.current = requestAnimationFrame(animateCircles);
    };
    
    animationRef.current = requestAnimationFrame(animateCircles);
    
    // Periodically change direction of one random circle
    const directionInterval = setInterval(() => {
      if (mousePosition.isHovering) return;
      
      setCircles(prevCircles => {
        const newCircles = [...prevCircles];
        const randomIndex = Math.floor(Math.random() * newCircles.length);
        
        // Set new random target
        newCircles[randomIndex] = {
          ...newCircles[randomIndex],
          targetX: Math.random() * 140 - 20,
          targetY: Math.random() * 140 - 20
        };
        
        return newCircles;
      });
    }, 3000);
    
    return () => {
      cancelAnimationFrame(animationRef.current);
      clearInterval(directionInterval);
    };
  }, [mousePosition.isHovering]);

  // Track mouse position for hover effect
  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setMousePosition({ x, y, isHovering: true });
    
    // When hovering, set both circles to follow mouse but at different distances
    setCircles(prevCircles => [
      { ...prevCircles[0], x: x, y: y, targetX: x, targetY: y },
      { ...prevCircles[1], x: (x + 40) % 100, y: (y + 40) % 100, targetX: (x + 40) % 100, targetY: (y + 40) % 100 }
    ]);
  };

  const handleMouseLeave = () => {
    setMousePosition({ ...mousePosition, isHovering: false });
  };

  // Show loading state
  if (loading) {
    return (
      <Spinner />
    );
  }

  // Show error state or no slides
  if (error || slides.length === 0) {
    return (
      <div className="w-full h-full relative overflow-hidden flex flex-col gap-8 justify-center items-center">
        <img src="/assets/images/logo.png" alt="ttincnc" className="z-10 w-30"/>
        <div className="text-center">
          <h1 className="text-xl font-semibold text-primary">Welcome to TTINCNC</h1>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="w-full h-full relative overflow-hidden flex flex-col gap-8 justify-center items-center"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Moving Gradient Background */}
      <div 
        className="absolute inset-0 opacity-70"
        style={{
          background: `
            radial-gradient(circle at ${circles[0].x}% ${circles[0].y}%, #0060AC 0%, transparent 30%),
            radial-gradient(circle at ${circles[1].x}% ${circles[1].y}%, #0060AC 0%, transparent 25%)
          `,
          transition: mousePosition.isHovering ? 'background 0.3s ease-out' : 'none'
        }}
      />

      <img src="/assets/images/logo.png" alt="ttincnc" className="z-10 w-30"/>

      {/* Slider */}
      <div className="w-full h-[60%] relative flex flex-col items-center">
        {/* Slider Image */}
        <div className="p-3 border border-primary rounded-xl w-[55%] h-[60%]">
          <img
            src={slides[currentSlide]?.image || "/assets/images/slider1.png"}
            alt="slider"
            className="h-full w-full rounded-lg shadow-xl"
          />
        </div>

        {/* Slider Text Content */}
        <div className="relative z-10 text-white text-center mt-6 w-[75%]">
          <h1 className="text-xl font-semibold text-primary">
            {slides[currentSlide]?.title || "Welcome"}
          </h1>
          <p className="mt-2 text-primary break-all">
            {slides[currentSlide]?.description || "Your ticket management solution"}
          </p>
        </div>

        {/* Pagination Dots */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-2">
          {slides.map((_, index) => (
            <button
              type="button"
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-3 h-3 cursor-pointer rounded-full ${
                currentSlide === index ? "bg-[#0060AC]" : "bg-gray-400"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default AuthSlider;