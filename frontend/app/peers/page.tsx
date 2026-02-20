"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import SkeletonCard from "@/components/skeleton-card";
import EmptyState from "@/components/empty-state";
import api from "@/lib/api-client";

interface PeerInsight {
  role_title: string;
  avg_skills_count: number;
  avg_experience_years: number;
  most_common_skills: string[];
  most_common_education: string;
  career_switcher_pct: number;
  total_peers: number;
}

interface PeerData {
  your_skills_count: number;
  your_experience: number;
  peer_insights: PeerInsight[];
}

function CompareBar({
  yours,
  avg,
  label,
}: {
  yours: number;
  avg: number;
  label: string;
}) {
  const max = Math.max(yours, avg, 1);
  const youPct = Math.min((yours / max) * 100, 100);
  const avgPct = Math.min((avg / max) * 100, 100);
  const ahead = yours >= avg;

  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="section-label">{label}</span>
        <span className="text-xs text-muted-foreground data-num">
          You:{" "}
          <span
            className={`font-bold ${ahead ? "text-primary" : "text-amber-500"}`}
          >
            {yours}
          </span>{" "}
          · Avg: {avg}
        </span>
      </div>
      <div className="space-y-1">
        <div className="score-bar-track w-full">
          <div
            className={`score-bar-fill ${ahead ? "bg-primary" : "bg-amber-500"}`}
            style={{ width: `${youPct}%` }}
          />
        </div>
        <div className="score-bar-track w-full">
          <div
            className="score-bar-fill bg-muted-foreground/40"
            style={{ width: `${avgPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default function PeerComparison() {
  const [data, setData] = useState<PeerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const profileId =
    typeof window !== "undefined" ? localStorage.getItem("profileId") : null;

  useEffect(() => {
    if (!profileId) {
      setTimeout(() => setLoading(false), 0);
      return;
    }
    api
      .get(`/api/peer-comparison/${profileId}`)
      .then((res) => setData(res.data))
      .catch((err) =>
        setError(err.response?.data?.detail || "Failed to load peer data"),
      )
      .finally(() => setLoading(false));
  }, [profileId]);

  if (loading) return <SkeletonCard count={3} />;
  if (error)
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );

  if (!data) {
    return (
      <EmptyState
        icon={<Users />}
        title="No peer data available"
        description="Create a profile to see how you compare to others targeting similar roles."
      />
    );
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="section-label mb-1">Benchmarking</p>
        <h1 className="text-2xl font-extrabold tracking-tight">
          Peer Comparison
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Anonymised comparison with professionals targeting similar roles.
        </p>
      </header>

      {/* Your stats */}
      <Card variant="metric">
        <CardContent className="p-5">
          <p className="section-label mb-3">Your Profile</p>
          <div className="flex gap-6">
            <div>
              <div className="kpi-number-accent" style={{ fontSize: "2rem" }}>
                {data.your_skills_count}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Skills</p>
            </div>
            <div>
              <div className="kpi-number" style={{ fontSize: "2rem" }}>
                {data.your_experience}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Years exp.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data.peer_insights.map((peer) => (
          <Card key={peer.role_title} variant="elevated" className="h-full">
            <CardContent className="p-5">
              <h2 className="font-bold text-sm mb-4 leading-tight">
                {peer.role_title}
              </h2>

              <div className="space-y-4 mb-4">
                <CompareBar
                  label="Skills Count"
                  yours={data.your_skills_count}
                  avg={peer.avg_skills_count}
                />
                <CompareBar
                  label="Experience (yrs)"
                  yours={data.your_experience}
                  avg={peer.avg_experience_years}
                />
              </div>

              <p className="section-label mb-2">Most Common Peer Skills</p>
              <div className="flex flex-wrap gap-1 mb-4">
                {peer.most_common_skills.map((s) => (
                  <Badge key={s} variant="outline" className="text-xs">
                    {s}
                  </Badge>
                ))}
              </div>

              <div className="border-t border-border pt-3 space-y-1">
                <p className="text-xs text-muted-foreground">
                  Typical education:{" "}
                  <span className="text-foreground font-medium">
                    {peer.most_common_education}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  <span className="data-num font-semibold">
                    {Math.round(peer.career_switcher_pct * 100)}%
                  </span>{" "}
                  are career switchers
                </p>
                {peer.total_peers > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Based on{" "}
                    <span className="data-num font-semibold">
                      {peer.total_peers}
                    </span>{" "}
                    similar profiles
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
