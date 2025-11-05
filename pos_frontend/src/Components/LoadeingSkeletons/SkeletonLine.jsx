import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

const SkeletonLine = ({ height, width }) => {
  const isDarkMode = document.body.classList.contains("mode-dark");

  return (
    <Skeleton
      baseColor={isDarkMode ? "#4F73A336" : "#e0e0e0"}
      highlightColor={isDarkMode ? "#4F73A336" : "#f5f5f5"}
      height={height || 20}
      width={width || "80%"}
    />
  );
};

export default SkeletonLine;
