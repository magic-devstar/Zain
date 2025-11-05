import SkeletonLine from "./SkeletonLine";

const TableSkeleton = ({ columns, rows = 15 }) => {
  return (
    <div className="max-h-[60svh] overflow-hidden animate-pulse">
      <table className="min-w-full table-fixed">
        <thead className="bg-gray-200 sticky top-0 z-10">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="py-3 px-6 text-left w-[200px]">
                {col.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>

          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex}
              className="border-b border-black-400"
            >
              {columns.map((_, colIndex) => (
                <td key={`${rowIndex}-${colIndex}`} className="py-3 px-6 text-left w-[200px]">
                  <SkeletonLine height={15} width="60%" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TableSkeleton;
