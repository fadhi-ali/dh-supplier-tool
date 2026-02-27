import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
      <Card className="w-full max-w-lg text-center">
        <CardHeader>
          <CardTitle className="text-3xl font-bold tracking-tight">
            Supplier Self-Service Portal
          </CardTitle>
          <CardDescription className="text-base mt-2">
            Welcome to the DH Self-Service Supplier Tool. Manage your supplier
            information, submit documents, and track requests — all in one
            place.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button size="lg" className="mt-4">
            Get Started
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
