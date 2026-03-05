"use client";

import { useEffect, useState } from "react";
import { useSpring, useTransform, motion } from "framer-motion";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  decimals?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export function AnimatedCounter({
  value,
  duration = 2000,
  decimals = 0,
  className = "",
  prefix = "",
  suffix = "",
}: AnimatedCounterProps) {
  const [hasMounted, setHasMounted] = useState(false);
  const springValue = useSpring(0, {
    bounce: 0,
    duration,
  });

  const displayValue = useTransform(springValue, (current) => {
    return prefix + current.toFixed(decimals) + suffix;
  });
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (hasMounted) {
      springValue.set(value);
    }
  }, [springValue, value, hasMounted]);

  if (!hasMounted) {
    return (
      <span className={className}>
        {prefix}
        {value.toFixed(decimals)}
        {suffix}
      </span>
    );
  }

  return <motion.span className={className}>{displayValue}</motion.span>;
}
