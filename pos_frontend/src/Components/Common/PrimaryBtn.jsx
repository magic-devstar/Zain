import { Loader } from "lucide-react";
import React, { useState, useEffect } from "react";

function PrimaryBtn({ children, onClick, disabled = false, type = "button" }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [shimmerPosition, setShimmerPosition] = useState(0);

  // Continuous shimmer animation
  useEffect(() => {
    let animationFrame;

    const animate = () => {
      setShimmerPosition(prev => (prev + 2) % 200);
      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <>
      <button
        onClick={onClick}
        disabled={disabled}
        type={type}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
            relative min-w-20 px-3 py-1.5 
            text-sm font-medium text-white 
            cursor-pointer overflow-hidden
            transition-all duration-700 ease-out
            transform-gpu
            ${disabled ? 'opacity-60 cursor-not-allowed' : ''}
          `}
        style={{
          borderRadius: isHovered ? '24px' : '12px',
          background: isHovered
            ? 'linear-gradient(45deg, #49789e, #4ECDC4, #45B7D1, #96CEB4)'
            : 'linear-gradient(135deg, #0060AC, #0060AC)',
          backgroundSize: '300% 300%',
          animation: isHovered ? 'gradientShift 2s ease infinite' : 'none',
        }}
      >

        {/* Button content */}
        {disabled ? (
          <div className="relative flex justify-center items-center w-full h-full">
                  <Loader className="h-4 w-4 animate-spin text-white" />
          </div>
        ) : (
          <div className="relative flex items-center justify-center gap-1 z-10">
            {children || "Morph Me"}
          </div>
        )}
      </button>



      <style jsx>{`
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        @keyframes ripple {
          0% {
            transform: scale(0);
            opacity: 1;
          }
          100% {
            transform: scale(4);
            opacity: 0;
          }
        }
        
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 0.5;
          }
          50% {
            opacity: 0.8;
          }
        }
      `}</style>
    </>
  );
}

export default PrimaryBtn;