"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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

export default function PeerComparison() {
  const [data, setData] = useState<PeerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const profileId = localStorage.getItem("profileId");
    if (!profileId) { setLoading(false); return; }
    api.get(`/api/peer-comparison/${profileId}`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.detail || "Failed to load peer data"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <SkeletonCard count={3} />;
  if (error) return <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>;

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
    <div>
      <h1 className="text-2xl font-bold mb-2">Peer Comparison</h1>
      <p className="text-sm text-muted-foreground mb-6">
        See how your profile compares to others targeting similar roles.
      </p>

      <Card className="p-6 mb-6">
        <CardContent className="p-0">
          <p className="text-sm font-semibold">Your Profile</p>
          <p>Skills: {data.your_skills_count} &middot; Experience: {data.your_experience} years</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {data.peer_insights.map((peer) => (
          <Card key={peer.role_title} className="p-6 h-full">
            <CardContent className="p-0">
              <h2 className="text-lg font-bold mb-4">{peer.role_title}</h2>

              <div className="mb-4">
                <p className="text-xs text-muted-foreground mb-1">Skills Count (You vs Peers)</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">{data.your_skills_count}</span>
                  <Progress
                    value={Math.min((data.your_skills_count / Math.max(peer.avg_skills_count, 1)) * 100, 100)}
                    className={`flex-1 h-2 ${
                      data.your_skills_count >= peer.avg_skills_count
                        ? "[&>div]:bg-green-500"
                        : "[&>div]:bg-orange-500"
                    }`}
                  />
                  <span className="text-sm text-muted-foreground">{peer.avg_skills_count} avg</span>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-xs text-muted-foreground mb-1">Experience (You vs Peers)</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">{data.your_experience}yr</span>
                  <Progress
                    value={Math.min((data.your_experience / Math.max(peer.avg_experience_years, 1)) * 100, 100)}
                    className={`flex-1 h-2 ${
                      data.your_experience >= peer.avg_experience_years
                        ? "[&>div]:bg-green-500"
                        : "[&>div]:bg-orange-500"
                    }`}
                  />
                  <span className="text-sm text-muted-foreground">{peer.avg_experience_years}yr avg</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground mb-1">Most Common Skills Among Peers</p>
              <div className="flex flex-wrap gap-1 mb-4">
                {peer.most_common_skills.map((s) => (
                  <Badge key={s} variant="outline">{s}</Badge>
                ))}
              </div>

              <p className="text-xs text-muted-foreground">
                Typical education: {peer.most_common_education} &middot;{" "}
                {Math.round(peer.career_switcher_pct * 100)}% are career switchers
              </p>
              {peer.total_peers > 0 && (
                <p className="text-xs text-muted-foreground">
                  Based on {peer.total_peers} similar profiles
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
