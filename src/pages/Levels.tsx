
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Puzzle, Trophy, Star, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

const Levels = () => {
  const levels = [
    { id: 1, name: "Beginner", status: "unlocked", stars: 3 },
    { id: 2, name: "Intermediate", status: "unlocked", stars: 1 },
    { id: 3, name: "Advanced", status: "locked", stars: 0 },
    { id: 4, name: "Expert", status: "locked", stars: 0 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Puzzle Levels</h1>
        <p className="text-muted-foreground">
          Complete challenges to unlock new levels and earn badges.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {levels.map((level) => (
          <Card key={level.id} className={level.status === "locked" ? "opacity-60" : ""}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Level {level.id}
              </CardTitle>
              {level.status === "locked" ? (
                <Lock className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Puzzle className="h-4 w-4 text-primary" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{level.name}</div>
              <div className="mt-2 flex items-center space-x-1">
                {[...Array(3)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < level.stars ? "fill-primary text-primary" : "text-muted-foreground"
                    }`}
                  />
                ))}
              </div>
              <Button
                className="mt-4 w-full"
                variant={level.status === "locked" ? "outline" : "default"}
                disabled={level.status === "locked"}
              >
                {level.status === "locked" ? "Locked" : "Play"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Your Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Complete levels to earn achievements and showcase your skills!
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Levels;
