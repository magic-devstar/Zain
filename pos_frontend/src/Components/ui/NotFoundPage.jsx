import { useState, useEffect } from 'react';
import { Home, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useBasePath from '../../utils/useBasePath ';
import PrimaryBtn from '../Common/PrimaryBtn';

export default function NotFoundPage() {
  const basePath = useBasePath();
  const navigate = useNavigate();
  const [count, setCount] = useState(10);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const timer = count > 0 && setInterval(() => setCount(count - 1), 1000);
    if (count === 0) {
      navigate(`${basePath}/`); // Redirect to home when countdown ends
    }
    return () => clearInterval(timer);
  }, [count]);

  const handleAnimation = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setIsAnimating(false);
    }, 1000);
  };

  return (
    <div className="h-full flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-xl overflow-hidden">
        <div className="p-5 sm:p-10">
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              <div className="text-9xl font-bold text-primary opacity-10">
                404
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <h1 className="text-4xl font-bold text-primary">
                  4<span className={`inline-block ${isAnimating ? 'animate-spin' : ''}`}>0</span>4
                </h1>
              </div>
            </div>

            <h2 className="mt-5 text-2xl font-bold text-gray-800">Page Not Found</h2>

            <p className="mt-3 text-gray-600">
              The page you're looking for doesn't exist or has been moved.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <PrimaryBtn
                onClick={() => navigate(`${basePath}/`)}
              >
                <Home size={18} />
                Go Home
              </PrimaryBtn>

              <PrimaryBtn
                onClick={handleAnimation}
              >
                <RefreshCw size={18} className={isAnimating ? 'animate-spin' : ''} />
                Try Again
              </PrimaryBtn>
            </div>

            {count > 0 && (
              <p className="mt-6 text-sm text-gray-500">
                Redirecting to homepage in {count} seconds...
              </p>
            )}
          </div>

          <div className="mt-10 pt-6 border-t border-gray-100">
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <span className="h-3 w-3 rounded-full bg-red-400"></span>
                <span className="h-3 w-3 rounded-full bg-yellow-400"></span>
                <span className="h-3 w-3 rounded-full bg-green-400"></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}