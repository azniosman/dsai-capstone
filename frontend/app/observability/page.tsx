"use client";

import { useState, useEffect } from "react";
import { Activity, AlertTriangle, CheckCircle, Database, Server, Clock, TrendingUp, Shield, Cpu } from "lucide-react";
import { apiClient } from "@/lib/api";

interface SystemHealth {
  status: "healthy" | "degraded" | "unhealthy" | "unknown";
  services: ServiceHealth[];
  metrics: MetricSnapshot[];
  alerts: Alert[];
  lastUpdated: string;
}

interface ServiceHealth {
  name: string;
  status: "HEALTHY" | "DEGRADED" | "UNHEALTHY" | "UNKNOWN";
  lastCheck: string;
}

interface MetricSnapshot {
  name: string;
  value: number;
  status: "HEALTHY" | "DEGRADED" | "UNHEALTHY";
  timestamp: string;
}

interface Alert {
  id: string;
  severity: "critical" | "warning" | "info";
  message: string;
  source: string;
  timestamp: string;
  acknowledged: boolean;
}

interface AuditReadiness {
  isReady: boolean;
  overallScore: number;
  status: string;
  criticalBlockers: number;
  lastAudit: string | null;
}

interface RagHealth {
  status: string;
  embeddingService: boolean;
  vectorSearch: boolean;
  crossEncoder: boolean;
  feedbackLoop: boolean;
  avgLatencyMs: number;
  errorRate: number;
  lastCheck: string;
}

export default function ObservabilityPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [auditReadiness, setAuditReadiness] = useState<AuditReadiness | null>(null);
  const [ragHealth, setRagHealth] = useState<RagHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [healthRes, auditRes, ragRes] = await Promise.all([
          apiClient.get("/api/production-assurance/health"),
          apiClient.get("/api/production-assurance/audit/readiness"),
          apiClient.get("/api/production-assurance/rag/health"),
        ]);

        setHealth(healthRes.data);
        setAuditReadiness(auditRes.data);
        setRagHealth(ragRes.data);
      } catch (err: unknown) {
        const axiosError = err as { response?: { data?: { message?: string } } };
        setError(
          axiosError.response?.data?.message || "Failed to fetch observability data"
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-12 h-12 text-cyan-500 animate-pulse mx-auto mb-4" />
          <p className="text-cyan-400 font-mono">Loading observability data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-400 font-mono">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-3 text-cyan-400 mb-2">
            <Activity className="w-8 h-8" />
            <h1 className="text-3xl font-bold font-mono tracking-tight uppercase">
              System Observability Dashboard
            </h1>
          </div>
          <p className="text-sm text-gray-400 ml-11">
            Real-time monitoring and production readiness metrics
          </p>
        </header>

        {/* Top Level Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Overall Health */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Activity className={`w-6 h-6 ${
                health?.status === "healthy" ? "text-green-500" :
                health?.status === "degraded" ? "text-yellow-500" : "text-red-500"
              }`} />
              <span className="text-sm text-gray-400">System Health</span>
            </div>
            <p className={`text-2xl font-bold uppercase ${
              health?.status === "healthy" ? "text-green-500" :
              health?.status === "degraded" ? "text-yellow-500" : "text-red-500"
            }`}>
              {health?.status || "unknown"}
            </p>
          </div>

          {/* Production Readiness Score */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-cyan-500" />
              <span className="text-sm text-gray-400">Readiness Score</span>
            </div>
            <p className={`text-2xl font-bold ${
              (auditReadiness?.overallScore || 0) >= 80 ? "text-green-500" :
              (auditReadiness?.overallScore || 0) >= 60 ? "text-yellow-500" : "text-red-500"
            }`}>
              {auditReadiness?.overallScore || 0}/100
            </p>
          </div>

          {/* Critical Blockers */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className={`w-6 h-6 ${
                (auditReadiness?.criticalBlockers || 0) > 0 ? "text-red-500" : "text-green-500"
              }`} />
              <span className="text-sm text-gray-400">Critical Issues</span>
            </div>
            <p className={`text-2xl font-bold ${
              (auditReadiness?.criticalBlockers || 0) > 0 ? "text-red-500" : "text-green-500"
            }`}>
              {auditReadiness?.criticalBlockers || 0}
            </p>
          </div>

          {/* RAG Pipeline Status */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Database className={`w-6 h-6 ${
                ragHealth?.status === "healthy" ? "text-green-500" : "text-yellow-500"
              }`} />
              <span className="text-sm text-gray-400">RAG Pipeline</span>
            </div>
            <p className={`text-2xl font-bold ${
              ragHealth?.status === "healthy" ? "text-green-500" : "text-yellow-500"
            }`}>
              {ragHealth?.status || "unknown"}
            </p>
          </div>
        </div>

        {/* Service Health Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Services Status */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-cyan-400 mb-4 flex items-center gap-2">
              <Server className="w-5 h-5" />
              Service Health
            </h2>
            <div className="space-y-3">
              {health?.services.map((service) => (
                <div key={service.name} className="flex items-center justify-between p-3 bg-gray-800 rounded">
                  <span className="text-gray-300 capitalize">{service.name.replace(/_/g, " ")}</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      service.status === "HEALTHY" ? "bg-green-500" :
                      service.status === "DEGRADED" ? "bg-yellow-500" : "bg-red-500"
                    }`} />
                    <span className={`text-sm font-mono ${
                      service.status === "HEALTHY" ? "text-green-500" :
                      service.status === "DEGRADED" ? "text-yellow-500" : "text-red-500"
                    }`}>
                      {service.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RAG Pipeline Details */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-cyan-400 mb-4 flex items-center gap-2">
              <Database className="w-5 h-5" />
              RAG Pipeline Details
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Embedding Service</span>
                {ragHealth?.embeddingService ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                )}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Vector Search</span>
                {ragHealth?.vectorSearch ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                )}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Cross-Encoder</span>
                {ragHealth?.crossEncoder ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                )}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Feedback Loop</span>
                {ragHealth?.feedbackLoop ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                )}
              </div>
              <div className="border-t border-gray-700 pt-4 mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Avg Latency</span>
                  <span className="text-cyan-400 font-mono">{ragHealth?.avgLatencyMs}ms</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-gray-400">Error Rate</span>
                  <span className={`font-mono ${(ragHealth?.errorRate || 0) < 0.05 ? "text-green-500" : "text-yellow-500"}`}>
                    {((ragHealth?.errorRate || 0) * 100).toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Metrics */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-cyan-400 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Recent Metrics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {health?.metrics?.slice(0, 8).map((metric, index) => (
              <div key={index} className="bg-gray-800 rounded p-4">
                <p className="text-xs text-gray-500 uppercase mb-1">{metric.name.replace(/_/g, " ")}</p>
                <p className="text-lg font-mono text-gray-200">{metric.value.toFixed(1)}</p>
                <p className={`text-xs mt-1 ${
                  metric.status === "HEALTHY" ? "text-green-500" :
                  metric.status === "DEGRADED" ? "text-yellow-500" : "text-red-500"
                }`}>
                  {metric.status}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Active Alerts */}
        {health?.alerts && health.alerts.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-cyan-400 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Active Alerts ({health.alerts.length})
            </h2>
            <div className="space-y-3">
              {health.alerts.map((alert) => (
                <div key={alert.id} className={`p-4 rounded border-l-4 ${
                  alert.severity === "critical" ? "bg-red-900/20 border-red-500" :
                  alert.severity === "warning" ? "bg-yellow-900/20 border-yellow-500" :
                  "bg-blue-900/20 border-blue-500"
                }`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className={`font-semibold ${
                        alert.severity === "critical" ? "text-red-400" :
                        alert.severity === "warning" ? "text-yellow-400" : "text-blue-400"
                      }`}>
                        [{alert.severity.toUpperCase()}] {alert.source}
                      </p>
                      <p className="text-gray-300 mt-1">{alert.message}</p>
                    </div>
                    <Clock className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  </div>
                  <p className="text-xs text-gray-500 mt-2 font-mono">
                    {new Date(alert.timestamp).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Last updated: {health?.lastUpdated ? new Date(health.lastUpdated).toLocaleString() : "N/A"}</p>
          <p className="mt-1">Auto-refresh every 30 seconds</p>
        </div>
      </div>
    </div>
  );
}
