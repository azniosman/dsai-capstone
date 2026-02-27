import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function SkeletonCard({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="p-6">
          <CardContent className="p-0">
            <Skeleton className="h-6 w-2/5 mb-3" />
            <Skeleton className="h-4 w-[90%] mb-1.5" />
            <Skeleton className="h-4 w-3/4 mb-1.5" />
            <Skeleton className="h-4 w-3/5 mb-3" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-15 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-18 rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
