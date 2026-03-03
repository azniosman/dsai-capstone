import React from "react";

export type AWSIconType =
  | "S3"
  | "CloudFront"
  | "APIGateway"
  | "Lambda"
  | "RDS"
  | "Bedrock"
  | "EventBridge"
  | "SecretsManager"
  | "ECR"
  | "VPC";

interface AWSIconProps {
  type: AWSIconType;
  className?: string;
  size?: number;
}

export const AWSIcon: React.FC<AWSIconProps> = ({
  type,
  className = "",
  size = 32,
}) => {
  const color = "#FF9900"; // AWS Orange base

  switch (type) {
    case "S3":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className={className}
        >
          <path
            d="M50 5 L10 25 V75 L50 95 L90 75 V25 L50 5 Z"
            fill="none"
            stroke={color}
            strokeWidth="4"
          />
          <path
            d="M50 25 V75 M30 35 H70 M30 50 H70 M30 65 H70"
            fill="none"
            stroke={color}
            strokeWidth="4"
          />
        </svg>
      );
    case "CloudFront":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className={className}
        >
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke={color}
            strokeWidth="4"
          />
          <path
            d="M30 50 Q50 10 70 50 Q50 90 30 50 Z"
            fill="none"
            stroke={color}
            strokeWidth="4"
          />
          <path
            d="M50 10 V90 M10 50 H90"
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeDasharray="4 4"
          />
        </svg>
      );
    case "APIGateway":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className={className}
        >
          <rect
            x="10"
            y="10"
            width="80"
            height="80"
            fill="none"
            stroke={color}
            strokeWidth="4"
          />
          <path
            d="M30 30 H70 M30 50 H70 M30 70 H70"
            fill="none"
            stroke={color}
            strokeWidth="4"
          />
          <path d="M50 10 V90" fill="none" stroke={color} strokeWidth="4" />
        </svg>
      );
    case "Lambda":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className={className}
        >
          <path
            d="M30 20 L70 50 L30 80"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M25 50 H45" fill="none" stroke={color} strokeWidth="4" />
        </svg>
      );
    case "RDS":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className={className}
        >
          <path
            d="M20 30 Q50 10 80 30 V70 Q50 90 20 70 V30 Z"
            fill="none"
            stroke={color}
            strokeWidth="4"
          />
          <path
            d="M20 30 Q50 50 80 30"
            fill="none"
            stroke={color}
            strokeWidth="4"
          />
          <path
            d="M20 50 Q50 70 80 50"
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeDasharray="4 4"
          />
        </svg>
      );
    case "Bedrock":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className={className}
        >
          <path
            d="M50 10 L85 30 V70 L50 90 L15 70 V30 Z"
            fill="none"
            stroke={color}
            strokeWidth="4"
          />
          <circle
            cx="50"
            cy="50"
            r="15"
            fill="none"
            stroke={color}
            strokeWidth="4"
          />
          <path
            d="M50 10 V35 M50 65 V90 M15 30 L38 42 M62 58 L85 70 M85 30 L62 42 M38 58 L15 70"
            fill="none"
            stroke={color}
            strokeWidth="2"
          />
        </svg>
      );
    case "EventBridge":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className={className}
        >
          <rect
            x="20"
            y="20"
            width="60"
            height="60"
            fill="none"
            stroke={color}
            strokeWidth="4"
          />
          <circle cx="50" cy="50" r="10" fill={color} />
          <path
            d="M50 10 V20 M50 80 V90 M10 50 H20 M80 50 H90"
            fill="none"
            stroke={color}
            strokeWidth="4"
          />
        </svg>
      );
    case "SecretsManager":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className={className}
        >
          <rect
            x="25"
            y="40"
            width="50"
            height="45"
            rx="5"
            fill="none"
            stroke={color}
            strokeWidth="4"
          />
          <path
            d="M35 40 V25 Q50 10 65 25 V40"
            fill="none"
            stroke={color}
            strokeWidth="4"
          />
          <circle cx="50" cy="62" r="5" fill={color} />
        </svg>
      );
    case "ECR":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className={className}
        >
          <path
            d="M20 30 L50 15 L80 30 V70 L50 85 L20 70 V30 Z"
            fill="none"
            stroke={color}
            strokeWidth="4"
          />
          <path
            d="M50 15 V85 M20 30 L80 30 M20 70 L80 70"
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeDasharray="4 4"
          />
          <rect
            x="40"
            y="40"
            width="20"
            height="20"
            fill="none"
            stroke={color}
            strokeWidth="4"
          />
        </svg>
      );
    case "VPC":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className={className}
        >
          <rect
            x="5"
            y="5"
            width="90"
            height="90"
            rx="10"
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeDasharray="8 4"
          />
          <path
            d="M20 20 H80 V80 H20 Z"
            fill="none"
            stroke={color}
            strokeWidth="1"
            opacity="0.3"
          />
        </svg>
      );
    default:
      return null;
  }
};
