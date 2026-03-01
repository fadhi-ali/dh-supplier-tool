"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { StepNavigation } from "@/components/onboard/step-navigation";
import { useSupplier } from "@/hooks/use-supplier";
import { api } from "@/lib/api";

const US_STATES = [
  { abbr: "AL", name: "Alabama" },
  { abbr: "AK", name: "Alaska" },
  { abbr: "AZ", name: "Arizona" },
  { abbr: "AR", name: "Arkansas" },
  { abbr: "CA", name: "California" },
  { abbr: "CO", name: "Colorado" },
  { abbr: "CT", name: "Connecticut" },
  { abbr: "DE", name: "Delaware" },
  { abbr: "DC", name: "District of Columbia" },
  { abbr: "FL", name: "Florida" },
  { abbr: "GA", name: "Georgia" },
  { abbr: "HI", name: "Hawaii" },
  { abbr: "ID", name: "Idaho" },
  { abbr: "IL", name: "Illinois" },
  { abbr: "IN", name: "Indiana" },
  { abbr: "IA", name: "Iowa" },
  { abbr: "KS", name: "Kansas" },
  { abbr: "KY", name: "Kentucky" },
  { abbr: "LA", name: "Louisiana" },
  { abbr: "ME", name: "Maine" },
  { abbr: "MD", name: "Maryland" },
  { abbr: "MA", name: "Massachusetts" },
  { abbr: "MI", name: "Michigan" },
  { abbr: "MN", name: "Minnesota" },
  { abbr: "MS", name: "Mississippi" },
  { abbr: "MO", name: "Missouri" },
  { abbr: "MT", name: "Montana" },
  { abbr: "NE", name: "Nebraska" },
  { abbr: "NV", name: "Nevada" },
  { abbr: "NH", name: "New Hampshire" },
  { abbr: "NJ", name: "New Jersey" },
  { abbr: "NM", name: "New Mexico" },
  { abbr: "NY", name: "New York" },
  { abbr: "NC", name: "North Carolina" },
  { abbr: "ND", name: "North Dakota" },
  { abbr: "OH", name: "Ohio" },
  { abbr: "OK", name: "Oklahoma" },
  { abbr: "OR", name: "Oregon" },
  { abbr: "PA", name: "Pennsylvania" },
  { abbr: "RI", name: "Rhode Island" },
  { abbr: "SC", name: "South Carolina" },
  { abbr: "SD", name: "South Dakota" },
  { abbr: "TN", name: "Tennessee" },
  { abbr: "TX", name: "Texas" },
  { abbr: "UT", name: "Utah" },
  { abbr: "VT", name: "Vermont" },
  { abbr: "VA", name: "Virginia" },
  { abbr: "WA", name: "Washington" },
  { abbr: "WV", name: "West Virginia" },
  { abbr: "WI", name: "Wisconsin" },
  { abbr: "WY", name: "Wyoming" },
] as const;

interface StateFormData {
  cities: string;
  zipCodes: string;
  standardDays: string;
  expeditedDays: string;
}

const ALPHA_GROUPS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function Step6ServiceAreas() {
  const { supplier, serviceAreas, refreshServiceAreas } = useSupplier();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [expandedState, setExpandedState] = useState<string | null>(null);
  const [stateFormData, setStateFormData] = useState<
    Record<string, StateFormData>
  >({});
  const [savingState, setSavingState] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const filteredStates = US_STATES.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.abbr.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedStates = ALPHA_GROUPS.map((letter) => ({
    letter,
    states: filteredStates.filter((s) => s.name.startsWith(letter)),
  })).filter((g) => g.states.length > 0);

  const toggleState = (abbr: string) => {
    setSelectedStates((prev) => {
      if (prev.includes(abbr)) {
        if (expandedState === abbr) setExpandedState(null);
        const next = prev.filter((s) => s !== abbr);
        return next;
      }
      return [...prev, abbr];
    });
  };

  const getFormData = (abbr: string): StateFormData =>
    stateFormData[abbr] ?? {
      cities: "",
      zipCodes: "",
      standardDays: "",
      expeditedDays: "",
    };

  const updateFormData = (abbr: string, patch: Partial<StateFormData>) => {
    setStateFormData((prev) => ({
      ...prev,
      [abbr]: { ...getFormData(abbr), ...patch },
    }));
  };

  const handleSaveState = async (abbr: string) => {
    if (!supplier) return;
    const data = getFormData(abbr);
    setSavingState(abbr);
    try {
      const cities = data.cities
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
      const zipCodes = data.zipCodes
        .split(",")
        .map((z) => z.trim())
        .filter(Boolean);

      await api.addServiceArea(supplier.id, {
        state: abbr,
        cities: cities.length > 0 ? cities : undefined,
        zip_codes: zipCodes.length > 0 ? zipCodes : undefined,
        standard_delivery_days: data.standardDays
          ? Number(data.standardDays)
          : undefined,
        expedited_delivery_days: data.expeditedDays
          ? Number(data.expeditedDays)
          : undefined,
      });
      await refreshServiceAreas();
      setSelectedStates((prev) => prev.filter((s) => s !== abbr));
      setExpandedState(null);
      setStateFormData((prev) => {
        const next = { ...prev };
        delete next[abbr];
        return next;
      });
    } catch (error) {
      console.error("Failed to save service area:", error);
    } finally {
      setSavingState(null);
    }
  };

  const handleRemoveArea = async (areaId: string) => {
    setRemovingId(areaId);
    try {
      await api.deleteServiceArea(areaId);
      await refreshServiceAreas();
    } catch (error) {
      console.error("Failed to remove service area:", error);
    } finally {
      setRemovingId(null);
    }
  };

  const stateNameFromAbbr = (abbr: string) =>
    US_STATES.find((s) => s.abbr === abbr)?.name ?? abbr;

  const alreadyConfiguredStates = serviceAreas.map((sa) => sa.state);

  const validate = () => {
    return serviceAreas.length > 0;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Geographic Service Area & Delivery Timeframes
        </h2>
        <p className="text-muted-foreground mt-1">
          Select the states you serve and configure delivery details for each.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select States</CardTitle>
          <CardDescription>
            Check the states where you can fulfill orders. Already configured
            states are shown in the summary below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Search states..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <div className="max-h-[400px] overflow-y-auto border rounded-md p-4 space-y-4">
            {groupedStates.map((group) => (
              <div key={group.letter}>
                <p className="text-sm font-semibold text-muted-foreground mb-2">
                  {group.letter}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {group.states.map((state) => {
                    const alreadyConfigured = alreadyConfiguredStates.includes(
                      state.abbr
                    );
                    return (
                      <label
                        key={state.abbr}
                        className={`flex items-center gap-2 rounded-md border p-2 text-sm cursor-pointer hover:bg-muted/50 ${
                          alreadyConfigured
                            ? "opacity-50 pointer-events-none"
                            : ""
                        }`}
                      >
                        <Checkbox
                          checked={
                            selectedStates.includes(state.abbr) ||
                            alreadyConfigured
                          }
                          onCheckedChange={() => {
                            if (!alreadyConfigured) toggleState(state.abbr);
                          }}
                          disabled={alreadyConfigured}
                        />
                        <span>
                          {state.abbr} - {state.name}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {selectedStates.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedStates.map((abbr) => (
                <Badge
                  key={abbr}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => setExpandedState(abbr)}
                >
                  {abbr} - {stateNameFromAbbr(abbr)}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedStates.map((abbr) => {
        const data = getFormData(abbr);
        const isExpanded = expandedState === abbr;
        return (
          <Card
            key={abbr}
            className={isExpanded ? "border-primary" : "cursor-pointer"}
            onClick={() => {
              if (!isExpanded) setExpandedState(abbr);
            }}
          >
            <CardHeader
              className="cursor-pointer"
              onClick={() =>
                setExpandedState(isExpanded ? null : abbr)
              }
            >
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {abbr} - {stateNameFromAbbr(abbr)}
                </CardTitle>
                <Badge variant="outline">
                  {isExpanded ? "Collapse" : "Configure"}
                </Badge>
              </div>
            </CardHeader>
            {isExpanded && (
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Cities (comma-separated, optional)</Label>
                  <Input
                    placeholder="e.g. Austin, Dallas, Houston"
                    value={data.cities}
                    onChange={(e) =>
                      updateFormData(abbr, { cities: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Zip Codes (comma-separated, optional)</Label>
                  <Input
                    placeholder="e.g. 73301, 75201, 77001"
                    value={data.zipCodes}
                    onChange={(e) =>
                      updateFormData(abbr, { zipCodes: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Standard Delivery (business days) <span className="text-destructive">*</span></Label>
                    <Input
                      type="number"
                      min={1}
                      placeholder="e.g. 5"
                      value={data.standardDays}
                      onChange={(e) =>
                        updateFormData(abbr, { standardDays: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Expedited Delivery (business days)</Label>
                    <Input
                      type="number"
                      min={1}
                      placeholder="e.g. 2"
                      value={data.expeditedDays}
                      onChange={(e) =>
                        updateFormData(abbr, { expeditedDays: e.target.value })
                      }
                    />
                  </div>
                </div>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSaveState(abbr);
                  }}
                  disabled={savingState === abbr || !data.standardDays}
                >
                  {savingState === abbr ? "Saving..." : "Save"}
                </Button>
              </CardContent>
            )}
          </Card>
        );
      })}

      <Card>
        <CardHeader>
          <CardTitle>Configured Service Areas</CardTitle>
        </CardHeader>
        <CardContent>
          {serviceAreas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No service areas configured yet. Select states above to get
              started.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>State</TableHead>
                  <TableHead>Cities</TableHead>
                  <TableHead>Zip Codes</TableHead>
                  <TableHead>Standard Days</TableHead>
                  <TableHead>Expedited Days</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {serviceAreas.map((area) => (
                  <TableRow key={area.id}>
                    <TableCell className="font-medium">
                      {area.state} - {stateNameFromAbbr(area.state)}
                    </TableCell>
                    <TableCell>
                      {area.cities && area.cities.length > 0
                        ? area.cities.join(", ")
                        : "All"}
                    </TableCell>
                    <TableCell>
                      {area.zip_codes && area.zip_codes.length > 0
                        ? area.zip_codes.join(", ")
                        : "All"}
                    </TableCell>
                    <TableCell>{area.standard_delivery_days ?? "---"}</TableCell>
                    <TableCell>
                      {area.expedited_delivery_days ?? "---"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveArea(area.id)}
                        disabled={removingId === area.id}
                        className="text-destructive hover:text-destructive"
                      >
                        {removingId === area.id ? "Removing..." : "Remove"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <StepNavigation onValidate={validate} />
    </div>
  );
}
