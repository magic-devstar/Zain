import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const AUTO_LOGOUT_MINUTES = 60;

function AutoLogout() {
  const navigate = useNavigate();
  const timer = useRef(null);
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("access"));

  // Check for login state changes (polling every 2s)
  useEffect(() => {
    const interval = setInterval(() => {
      const hasAccess = !!localStorage.getItem("access");
      setIsLoggedIn(hasAccess);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;

    const resetTimer = () => {
      clearTimeout(timer.current);

      // Check if NoSleep is active (set manually when enabling it)
      const isNoSleepActive = window.noSleepActive === true;
      if (isNoSleepActive) return;

      timer.current = setTimeout(() => {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        setIsLoggedIn(false);
        navigate("/");
      }, AUTO_LOGOUT_MINUTES * 60 * 1000);
    };

    const events = ["mousemove", "keydown", "click", "scroll"];
    events.forEach((event) => window.addEventListener(event, resetTimer));

    resetTimer();

    return () => {
      events.forEach((event) => window.removeEventListener(event, resetTimer));
      clearTimeout(timer.current);
    };
  }, [isLoggedIn, navigate]);

  return null;
}

export default AutoLogout;
