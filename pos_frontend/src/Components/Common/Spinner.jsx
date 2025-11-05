import { Loader } from "lucide-react";

const Spinner = () => {
  return (
    <div className="flex flex-col items-center justify-center py-12 h-full w-full">
      <Loader className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
};

export default Spinner;
