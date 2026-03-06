import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { motion } from "framer-motion";

export function CustomNode({
  data,
  isConnectable,
}: {
  data: {
    label: string;
    isActive: boolean;
    icon?: string;
    targetPosition?: Position;
    sourcePosition?: Position;
  };
  isConnectable: boolean;
}) {
  const isActive = data.isActive;

  return (
    <motion.div
      animate={{
        scale: isActive ? 1.05 : 1,
        boxShadow: isActive
          ? "0 0 20px 5px rgba(249, 115, 22, 0.5)"
          : "0 0 0px 0px rgba(249, 115, 22, 0)",
        borderColor: isActive
          ? "rgba(249, 115, 22, 1)"
          : "rgba(75, 85, 99, 0.4)",
        backgroundColor: isActive
          ? "rgba(249, 115, 22, 0.15)"
          : "rgba(17, 24, 39, 0.8)",
      }}
      transition={{ duration: 0.3 }}
      className={`px-4 py-3 rounded-xl border backdrop-blur-md relative min-w-[140px] flex items-center justify-center`}
    >
      <Handle
        type="target"
        position={data.targetPosition || Position.Left}
        isConnectable={isConnectable}
        className="w-2 h-2 bg-slate-500 border-none"
      />
      <div className="flex flex-col items-center gap-2">
        {data.icon && <span className="text-xl">{data.icon}</span>}
        <span
          className={`text-sm font-semibold tracking-wide ${isActive ? "text-orange-400" : "text-gray-400"}`}
        >
          {data.label}
        </span>
      </div>
      <Handle
        type="source"
        position={data.sourcePosition || Position.Right}
        isConnectable={isConnectable}
        className="w-2 h-2 bg-slate-500 border-none"
      />
    </motion.div>
  );
}

export default memo(CustomNode);
