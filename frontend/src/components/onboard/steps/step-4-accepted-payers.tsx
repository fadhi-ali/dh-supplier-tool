"use client";

import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { StepNavigation } from "@/components/onboard/step-navigation";
import { useSupplier } from "@/hooks/use-supplier";
import { api } from "@/lib/api";
import { Search, Plus, X, Loader2 } from "lucide-react";

const PREPOPULATED_PAYERS = [
  // National Payers
  "Aetna",
  "UnitedHealthcare",
  "Humana",
  "Cigna",
  "Anthem",
  "Centene",
  "Molina Healthcare",
  "Kaiser Permanente",
  "WellCare",
  "Carefirst",
  "Highmark",
  "Health Net",
  // Government
  "Medicare",
  "Medicaid",
  "Tricare",
  "VA (Veterans Affairs)",
  // Regional BCBS Plans
  "BlueCross BlueShield",
  "BCBS of Texas",
  "BCBS of Illinois",
  "BCBS of Florida (Florida Blue)",
  "BCBS of Michigan",
  "BCBS of North Carolina",
  "BCBS of Tennessee",
  "BCBS of Georgia",
  "BCBS of Minnesota",
  "BCBS of Massachusetts",
  "BCBS of Alabama",
  "BCBS of South Carolina",
  "BCBS of Louisiana",
  "BCBS of Kansas City",
  "Independence Blue Cross (PA)",
  "Horizon BCBS (NJ)",
  "Regence BCBS (OR/WA)",
  "Premera Blue Cross (WA)",
  // Other National / Large Regional
  "Amerigroup",
  "Magellan Health",
  "Oscar Health",
  "Ambetter",
  "Bright Health",
  "Clover Health",
  "EmblemHealth",
  "Tufts Health Plan",
  "Priority Health",
  "SelectHealth",
  "UPMC Health Plan",
  "Geisinger Health Plan",
  "Medical Mutual of Ohio",
  "Blue KC",
  "AvMed",
  "Capital Blue Cross",
];

const NETWORK_TYPES = [
  "HMO",
  "PPO",
  "EPO",
  "POS",
  "Medicare Advantage",
  "Medicaid Managed Care",
  "Other",
];

export function Step4AcceptedPayers() {
  const { supplier, payers, refreshPayers } = useSupplier();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPayer, setSelectedPayer] = useState<string | null>(null);
  const [selectedNetworks, setSelectedNetworks] = useState<string[]>([]);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customPayerName, setCustomPayerName] = useState("");
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Filter suggestions based on search query (show all when empty)
  const filteredSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return PREPOPULATED_PAYERS;
    const query = searchQuery.toLowerCase();
    return PREPOPULATED_PAYERS.filter((payer) =>
      payer.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const handleSelectSuggestion = (payerName: string) => {
    setSelectedPayer(payerName);
    setSearchQuery(payerName);
    setSelectedNetworks([]);
    setIsCustomMode(false);
  };

  const handleNetworkToggle = (networkType: string) => {
    setSelectedNetworks((prev) =>
      prev.includes(networkType)
        ? prev.filter((n) => n !== networkType)
        : [...prev, networkType]
    );
  };

  const handleAddPayer = async () => {
    if (!supplier?.id) return;

    const payerName = isCustomMode ? customPayerName.trim() : selectedPayer;
    if (!payerName || selectedNetworks.length === 0) return;

    setAdding(true);
    try {
      // Add one entry per network type selected
      const payerEntries = selectedNetworks.map((network_type) => ({
        payer_name: payerName,
        network_type,
      }));
      await api.addPayers(supplier.id, payerEntries);
      await refreshPayers();

      // Reset form
      setSelectedPayer(null);
      setSearchQuery("");
      setSelectedNetworks([]);
      setCustomPayerName("");
      setIsCustomMode(false);
    } catch {
      // Handle error silently
    } finally {
      setAdding(false);
    }
  };

  const handleRemovePayer = async (payerId: string) => {
    setRemovingId(payerId);
    try {
      await api.deletePayer(payerId);
      await refreshPayers();
    } catch {
      // Handle error silently
    } finally {
      setRemovingId(null);
    }
  };

  const handleStartCustom = () => {
    setIsCustomMode(true);
    setSelectedPayer(null);
    setSearchQuery("");
    setSelectedNetworks([]);
  };

  const handleCancelSelection = () => {
    setSelectedPayer(null);
    setSearchQuery("");
    setSelectedNetworks([]);
    setIsCustomMode(false);
    setCustomPayerName("");
  };

  // Group payers by name for display
  const groupedPayers = useMemo(() => {
    const groups: Record<string, { ids: string[]; networks: string[] }> = {};
    for (const payer of payers) {
      if (!groups[payer.payer_name]) {
        groups[payer.payer_name] = { ids: [], networks: [] };
      }
      groups[payer.payer_name].ids.push(payer.id);
      groups[payer.payer_name].networks.push(payer.network_type);
    }
    return groups;
  }, [payers]);

  const onValidate = useCallback((): boolean => {
    return payers.length > 0;
  }, [payers.length]);

  const showNetworkSelector = selectedPayer !== null || isCustomMode;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Accepted Payers
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Add the insurance payers and network types you accept.
        </p>
      </div>

      {/* Search and Add Section */}
      <Card>
        <CardHeader>
          <CardTitle>Add Payers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showNetworkSelector ? (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for a payer..."
                  className="pl-9"
                />
              </div>

              {/* Suggestions */}
              {filteredSuggestions.length > 0 ? (
                <div className="rounded-md border max-h-[300px] overflow-y-auto">
                  {filteredSuggestions.map((payer, idx) => (
                    <button
                      key={payer}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors ${
                        idx !== filteredSuggestions.length - 1
                          ? "border-b"
                          : ""
                      }`}
                      onClick={() => handleSelectSuggestion(payer)}
                    >
                      {payer}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-2">
                  No matching payers found.
                </p>
              )}

              <Separator />

              <Button variant="outline" onClick={handleStartCustom}>
                <Plus className="h-4 w-4 mr-2" />
                Add Custom Payer
              </Button>
            </>
          ) : (
            <>
              {/* Selected payer / custom input */}
              <div className="space-y-3">
                {isCustomMode ? (
                  <div className="space-y-2">
                    <Label htmlFor="custom_payer_name">Custom Payer Name</Label>
                    <Input
                      id="custom_payer_name"
                      value={customPayerName}
                      onChange={(e) => setCustomPayerName(e.target.value)}
                      placeholder="Enter payer name"
                      autoFocus
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-sm py-1 px-3">
                      {selectedPayer}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={handleCancelSelection}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                <Separator />

                {/* Network type checkboxes */}
                <div className="space-y-2">
                  <Label>
                    Select Network Types{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {NETWORK_TYPES.map((networkType) => (
                      <label
                        key={networkType}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedNetworks.includes(networkType)}
                          onCheckedChange={() =>
                            handleNetworkToggle(networkType)
                          }
                        />
                        <span className="text-sm">{networkType}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    onClick={handleAddPayer}
                    disabled={
                      adding ||
                      selectedNetworks.length === 0 ||
                      (isCustomMode && !customPayerName.trim())
                    }
                  >
                    {adding && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Add
                  </Button>
                  <Button variant="outline" onClick={handleCancelSelection}>
                    Cancel
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Added Payers Table */}
      {Object.keys(groupedPayers).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Added Payers ({Object.keys(groupedPayers).length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payer Name</TableHead>
                  <TableHead>Network Types</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(groupedPayers).map(
                  ([payerName, { ids, networks }]) => (
                    <TableRow key={payerName}>
                      <TableCell className="font-medium">{payerName}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {networks.map((network, idx) => (
                            <Badge
                              key={`${network}-${idx}`}
                              variant="secondary"
                              className="text-xs"
                            >
                              {network}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          disabled={ids.some((id) => id === removingId)}
                          onClick={async () => {
                            // Remove all entries for this payer
                            for (const id of ids) {
                              await handleRemovePayer(id);
                            }
                          }}
                        >
                          {ids.some((id) => id === removingId) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {payers.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No payers added yet. Search above to add your accepted payers.
        </p>
      )}

      <StepNavigation onValidate={onValidate} />
    </div>
  );
}
