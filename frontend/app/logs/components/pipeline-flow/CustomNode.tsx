import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { motion } from "framer-motion";

export function CustomNode({
  data,
  isConnectable,
}: {
  data: { label: string; isActive: boolean; icon?: string };
  isConnectable: boolean;
}) {
  const isActive = data.isActive;

  return (
    <motion.div
      animate={{
        scale: isActive ? 1.05 : 1,
        boxShadow: isActive
          ? "0 0 20px 5px rgba(59, 130, 246, 0.5)"
          : "0 0 0px 0px rgba(59, 130, 246, 0)",
        borderColor: isActive
          ? "rgba(96, 165, 250, 1)"
          : "rgba(75, 85, 99, 0.4)",
      }}
      transition={{ duration: 0.3 }}
      className={`px-4 py-3 rounded-xl border bg-gray-900/80 backdrop-blur-md relative min-w-[140px] flex items-center justify-center`}
    >
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="w-2 h-2 bg-slate-500 border-none"
      />
      <div className="flex flex-col items-center gap-2">
        {data.icon && <span className="text-xl">{data.icon}</span>}
        <span
          className={`text-sm font-semibold tracking-wide ${isActive ? "text-blue-300" : "text-gray-400"}`}
        >
          {data.label}
        </span>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        className="w-2 h-2 bg-slate-500 border-none"
      />
    </motion.div>
  );
}

export default memo(CustomNode);
