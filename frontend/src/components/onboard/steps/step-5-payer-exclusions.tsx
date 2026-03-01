"use client";

import { useMemo, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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

type ScopeMode = "product" | "category";

export function Step5PayerExclusions() {
  const {
    supplier,
    products,
    payers,
    exclusions,
    refreshExclusions,
  } = useSupplier();

  const [scopeMode, setScopeMode] = useState<ScopeMode>("product");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [categoryInput, setCategoryInput] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [selectedPayerIds, setSelectedPayerIds] = useState<string[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const productCategories = useMemo(() => {
    const cats = new Set<string>();
    for (const p of products) {
      if (p.category) cats.add(p.category);
    }
    return Array.from(cats).sort();
  }, [products]);

  const togglePayer = (payerId: string) => {
    setSelectedPayerIds((prev) =>
      prev.includes(payerId)
        ? prev.filter((id) => id !== payerId)
        : [...prev, payerId]
    );
  };

  const resolvedCategory =
    categoryInput === "__custom__" ? customCategory.trim() : categoryInput;

  const handleAddExclusions = async () => {
    if (!supplier) return;
    if (selectedPayerIds.length === 0) return;
    if (scopeMode === "product" && !selectedProductId) return;
    if (scopeMode === "category" && !resolvedCategory) return;

    setIsAdding(true);
    try {
      for (const payerId of selectedPayerIds) {
        await api.addExclusion(supplier.id, {
          payer_id: payerId,
          ...(scopeMode === "product"
            ? { product_id: selectedProductId }
            : { category: resolvedCategory }),
        });
      }
      await refreshExclusions();
      setSelectedPayerIds([]);
      setSelectedProductId("");
      setCategoryInput("");
      setCustomCategory("");
    } catch (error) {
      console.error("Failed to add exclusion:", error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveExclusion = async (exclusionId: string) => {
    setRemovingId(exclusionId);
    try {
      await api.deleteExclusion(exclusionId);
      await refreshExclusions();
    } catch (error) {
      console.error("Failed to remove exclusion:", error);
    } finally {
      setRemovingId(null);
    }
  };

  const resolvePayerName = (payerId: string) => {
    const payer = payers.find((p) => p.id === payerId);
    return payer ? payer.payer_name : payerId;
  };

  const resolveProductName = (productId: string | null) => {
    if (!productId) return null;
    const product = products.find((p) => p.id === productId);
    return product ? product.product_name : productId;
  };

  const canAdd =
    selectedPayerIds.length > 0 &&
    ((scopeMode === "product" && selectedProductId) ||
      (scopeMode === "category" && !!resolvedCategory));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Payer-Product Exclusions
        </h2>
        <p className="text-muted-foreground mt-1">
          Flag any exceptions to your accepted payer coverage.
        </p>
      </div>

      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <p className="text-sm text-blue-800">
            By default, all accepted payers apply to all products. Use this step
            to flag any exceptions.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add Exclusion</CardTitle>
          <CardDescription>
            Select a product or category and the payers to exclude.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Scope</Label>
            <Select
              value={scopeMode}
              onValueChange={(v) => {
                setScopeMode(v as ScopeMode);
                setSelectedProductId("");
                setCategoryInput("");
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="product">By Product</SelectItem>
                <SelectItem value="category">By Category</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {scopeMode === "product" ? (
            <div className="space-y-2">
              <Label>Product</Label>
              <Select
                value={selectedProductId}
                onValueChange={setSelectedProductId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.product_name}
                      {product.sku ? ` (${product.sku})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={categoryInput}
                onValueChange={(v) => {
                  setCategoryInput(v);
                  if (v !== "__custom__") setCustomCategory("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {productCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                  <SelectItem value="__custom__">Other (Custom)...</SelectItem>
                </SelectContent>
              </Select>
              {categoryInput === "__custom__" && (
                <Input
                  placeholder="Enter custom category name"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  autoFocus
                />
              )}
            </div>
          )}

          <Separator />

          <div className="space-y-2">
            <Label>Payers to Exclude</Label>
            {payers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No payers available. Add payers in Step 4 first.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {payers.map((payer) => (
                  <label
                    key={payer.id}
                    className="flex items-center gap-2 rounded-md border p-3 cursor-pointer hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={selectedPayerIds.includes(payer.id)}
                      onCheckedChange={() => togglePayer(payer.id)}
                    />
                    <span className="text-sm">{payer.payer_name}</span>
                    <Badge variant="outline" className="ml-auto text-xs">
                      {payer.network_type}
                    </Badge>
                  </label>
                ))}
              </div>
            )}
          </div>

          <Button
            onClick={handleAddExclusions}
            disabled={!canAdd || isAdding}
            className="w-full sm:w-auto"
          >
            {isAdding ? "Adding..." : "Add Exclusion"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Exclusions</CardTitle>
        </CardHeader>
        <CardContent>
          {exclusions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No exclusions needed — you can continue to the next step.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product / Category</TableHead>
                  <TableHead>Payer</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exclusions.map((exclusion) => (
                  <TableRow key={exclusion.id}>
                    <TableCell>
                      {exclusion.product_id ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            Product
                          </Badge>
                          <span>
                            {resolveProductName(exclusion.product_id)}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            Category
                          </Badge>
                          <span>{exclusion.category}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{resolvePayerName(exclusion.payer_id)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveExclusion(exclusion.id)}
                        disabled={removingId === exclusion.id}
                        className="text-destructive hover:text-destructive"
                      >
                        {removingId === exclusion.id ? "Removing..." : "Remove"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <StepNavigation />
    </div>
  );
}
