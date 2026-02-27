"use client";

import { useProfileBuilderStore } from "@/store/profileBuilderStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight } from "lucide-react";

export default function StepPersonalInfo() {
  const { personalInfo, setPersonalInfo, nextStep, prevStep } =
    useProfileBuilderStore();

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    nextStep(); // Advance form upon submit
  };

  return (
    <form onSubmit={handleNext} className="flex flex-col h-full space-y-6">
      <div className="space-y-2">
        <h3 className="text-xl font-bold">Personal Information</h3>
        <p className="text-sm text-muted-foreground">
          Confirm or update your basic details.
        </p>
      </div>

      <div className="flex-1 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name">
            Full Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            required
            value={personalInfo.name}
            onChange={(e) => setPersonalInfo({ name: e.target.value })}
            placeholder="Jane Doe"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              required
              value={personalInfo.email}
              onChange={(e) => setPersonalInfo({ email: e.target.value })}
              placeholder="jane@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={personalInfo.phone}
              onChange={(e) => setPersonalInfo({ phone: e.target.value })}
              placeholder="+65 9123 4567"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={personalInfo.location || "Singapore"}
            onChange={(e) => setPersonalInfo({ location: e.target.value })}
            placeholder="Singapore"
          />
        </div>
      </div>

      <div className="pt-6 border-t flex justify-between items-center shrink-0">
        <Button type="button" variant="outline" onClick={prevStep}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button
          type="submit"
          disabled={!personalInfo.name || !personalInfo.email}
        >
          Next Step <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}
