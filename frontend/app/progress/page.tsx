"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { toast } from "sonner";
import api from "@/lib/api-client";

interface ProgressEntry {
  skill: string;
  level: number;
  recorded_at: string;
}

interface ProgressData {
  skills_acquired: number;
  skills_in_progress: number;
  skills_total: number;
  entries: ProgressEntry[];
}

interface TimelinePoint {
  date: string;
  skill: string;
  level: number;
}

export default function ProgressDashboard() {
  const router = useRouter();
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newSkill, setNewSkill] = useState("");
  const [newLevel, setNewLevel] = useState("0.5");

  const profileId = typeof window !== "undefined" ? localStorage.getItem("profileId") : null;

  useEffect(() => {
    if (!profileId) { router.push("/"); return; }
    loadData();
  }, [profileId, router]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [progRes, timeRes] = await Promise.all([
        api.get(`/api/progress/${profileId}`),
        api.get(`/api/progress/${profileId}/timeline`),
      ]);
      setProgress(progRes.data);
      setTimeline(timeRes.data.timeline);
    } catch (err: unknown) {
      setError((err as { response?: { data?: { detail?: string } } }).response?.data?.detail || "Failed to load progress");
    } finally {
      setLoading(false);
    }
  };

  const recordProgress = async () => {
    if (!newSkill.trim()) return;
    try {
      await api.post("/api/progress", {
        profile_id: parseInt(profileId!),
        skill: newSkill.trim(),
        level: parseFloat(newLevel),
      });
      toast.success(`Recorded progress for "${newSkill.trim()}"!`);
      setNewSkill("");
      loadData();
    } catch {
      toast.error("Failed to record progress");
    }
  };

  if (loading) return <div className="flex justify-center mt-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (error) return <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>;

  const dateMap: Record<string, Record<string, number>> = {};
  timeline.forEach((t) => {
    if (!t.date) return;
    if (!dateMap[t.date]) dateMap[t.date] = { date: t.date } as unknown as Record<string, number>;
    (dateMap[t.date] as Record<string, unknown>)[t.skill] = t.level;
  });
  const chartData = Object.values(dateMap);
  const allSkills = [...new Set(timeline.map((t) => t.skill))];

  const COLORS = ["#1565c0", "#00897b", "#4caf50", "#ff9800", "#f44336", "#00bcd4"];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Progress Tracking</h1>

      <div className="grid grid-cols-3 gap-6 mb-6">
        <Card className="p-6 text-center">
          <CardContent className="p-0">
            <p className="text-4xl font-bold text-green-600">{progress?.skills_acquired || 0}</p>
            <p className="text-sm text-muted-foreground">Skills Acquired</p>
          </CardContent>
        </Card>
        <Card className="p-6 text-center">
          <CardContent className="p-0">
            <p className="text-4xl font-bold text-orange-500">{progress?.skills_in_progress || 0}</p>
            <p className="text-sm text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card className="p-6 text-center">
          <CardContent className="p-0">
            <p className="text-4xl font-bold text-primary">{progress?.skills_total || 0}</p>
            <p className="text-sm text-muted-foreground">Total Tracked</p>
          </CardContent>
        </Card>
      </div>

      <Card className="p-6 mb-6">
        <CardContent className="p-0">
          <h2 className="text-lg font-bold mb-3">Record Skill Progress</h2>
          <div className="flex gap-4 items-end flex-wrap">
            <div className="flex-1 min-w-[150px]">
              <Label htmlFor="skill-name">Skill Name</Label>
              <Input id="skill-name" value={newSkill} onChange={(e) => setNewSkill(e.target.value)} />
            </div>
            <div className="min-w-[150px]">
              <Label>Level</Label>
              <Select value={newLevel} onValueChange={setNewLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Missing (0%)</SelectItem>
                  <SelectItem value="0.5">Partial (50%)</SelectItem>
                  <SelectItem value="1">Strong (100%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={recordProgress}>Record</Button>
          </div>
        </CardContent>
      </Card>

      {chartData.length > 0 && (
        <Card className="p-6 mb-6">
          <CardContent className="p-0">
            <h2 className="text-lg font-bold mb-3">Skill Progress Over Time</h2>
            <div className="h-[300px]" role="img" aria-label="Line chart showing skill progress over time">
              <ResponsiveContainer>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 1]} ticks={[0, 0.5, 1]} />
                  <Tooltip />
                  <Legend />
                  {allSkills.map((skill, i) => (
                    <Line
                      key={skill}
                      type="monotone"
                      dataKey={skill}
                      stroke={COLORS[i % COLORS.length]}
                      strokeWidth={2}
                      dot
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {progress?.entries && progress.entries.length > 0 && (
        <Card className="p-6">
          <CardContent className="p-0">
            <h2 className="text-lg font-bold mb-3">Recent Activity</h2>
            {progress.entries.slice(0, 20).map((e, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <Badge
                  className={
                    e.level >= 1.0
                      ? "bg-green-100 text-green-800 hover:bg-green-100"
                      : e.level >= 0.5
                        ? "bg-orange-100 text-orange-800 hover:bg-orange-100"
                        : ""
                  }
                >
                  {e.skill}
                </Badge>
                <span className="text-sm">
                  {e.level >= 1.0 ? "Strong" : e.level >= 0.5 ? "Partial" : "Started"}
                </span>
                <span className="text-xs text-muted-foreground">{e.recorded_at}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
