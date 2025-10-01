import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, Search } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4 shadow-lg">
        <CardContent className="pt-8 pb-6 text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
              <Search className="h-10 w-10 text-primary" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Page Not Found</h1>
            <p className="text-muted-foreground">
              The page you're looking for doesn't exist or has been moved.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Link href="/">
              <Button className="w-full sm:w-auto" data-testid="button-home">
                <Home className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <Link href="/food-tracking">
              <Button variant="outline" className="w-full sm:w-auto" data-testid="button-food-tracking">
                Food Tracking
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
