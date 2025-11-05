import React, { useState, useEffect } from "react";

function SecondaryBtn({ children, onClick, disabled = false, type = "button" }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [borderAnimation, setBorderAnimation] = useState(0);

  // Animated border effect
  useEffect(() => {
    let animationFrame;

    const animate = () => {
      if (isHovered && !disabled) {
        setBorderAnimation(prev => (prev + 2) % 360);
      }
      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [isHovered, disabled]);

  return (
    <>
      {/* Option 2: Ghost Morph */}
      <button
        onClick={onClick}
        disabled={disabled}
        type={type}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
              relative min-w-20 px-3 py-1.5 
              text-sm font-medium cursor-pointer overflow-hidden
              transition-all duration-700 ease-out transform-gpu
              ${disabled ? 'opacity-60 cursor-not-allowed' : ''}
            `}
        style={{
          borderRadius: isHovered ? '24px' : '12px',
          background: isHovered
            ? 'linear-gradient(135deg, rgba(0, 96, 172, 0.1), rgba(46, 139, 192, 0.1))'
            : 'transparent',
          color: '#0060AC',
          border: `2px solid ${isHovered ? 'rgba(0, 96, 172, 0.3)' : 'rgba(0, 96, 172, 0.2)'}`,
        }}
      >
        {/* Subtle shimmer effect */}
        {isHovered && !disabled && (
          <div
            className="absolute inset-0 opacity-20"
            style={{
              background: 'linear-gradient(45deg, transparent 30%, rgba(0, 96, 172, 0.3) 50%, transparent 70%)',
              animation: 'shimmer 2s infinite',
              borderRadius: isHovered ? '24px' : '12px'
            }}
          />
        )}

        {/* Button content */}
        {disabled ? (
          <div className="relative flex justify-center items-center w-full h-full">
            <span className="truncate">{children || "Ghost Button"}</span>
          </div>
        ) : (
          <div className="relative flex items-center justify-center gap-1 z-10">
            <span className="truncate">{children || "Ghost Button"}</span>
          </div>
        )}
      </button>


      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
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
      `}</style>
    </>
  );
}

export default SecondaryBtn;