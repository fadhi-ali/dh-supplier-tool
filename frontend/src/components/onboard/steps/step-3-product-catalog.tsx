"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StepNavigation } from "@/components/onboard/step-navigation";
import { useSupplier } from "@/hooks/use-supplier";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { DME_CATEGORY_NAMES } from "@/lib/constants";
import {
  Upload,
  FileSpreadsheet,
  Loader2,
  Plus,
  Sparkles,
  X,
  Check,
} from "lucide-react";
import type { Product } from "@/types/supplier";

type UploadStatus = "idle" | "uploading" | "processing" | "complete" | "error";

const ACCEPTED_TYPES = ".csv,.xlsx,.xls,.pdf,.jpg,.png";

const FULFILLMENT_OPTIONS = [
  "Mail Delivery",
  "Home Delivery",
  "Home Delivery + Setup",
  "In-Store Pickup",
];

function ConfidenceDot({ level }: { level: string }) {
  if (level === "high") {
    return (
      <span
        className="ml-1.5 inline-block h-2 w-2 shrink-0 rounded-full bg-green-500"
        title="High confidence"
      />
    );
  }
  if (level === "medium") {
    return (
      <span
        className="ml-1.5 inline-block h-2 w-2 shrink-0 rounded-full bg-yellow-500"
        title="Medium confidence"
      />
    );
  }
  return (
    <span
      className="ml-1.5 inline-block h-2 w-2 shrink-0 rounded-full bg-red-500"
      title="Low confidence"
    />
  );
}

interface EditableCellProps {
  value: string;
  onChange: (value: string) => void;
  confidence?: string;
}

function EditableCell({ value, onChange, confidence }: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleClick = () => {
    setEditValue(value);
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (editValue !== value) {
      onChange(editValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      (e.target as HTMLInputElement).blur();
    }
    if (e.key === "Escape") {
      setEditValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <Input
        className="h-7 text-sm"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        autoFocus
      />
    );
  }

  return (
    <div
      className="flex items-center cursor-pointer rounded px-1 py-0.5 hover:bg-muted min-h-[28px]"
      onClick={handleClick}
    >
      <span className="text-sm truncate">{value || "\u2014"}</span>
      {confidence && <ConfidenceDot level={confidence} />}
    </div>
  );
}

interface NewProductForm {
  product_name: string;
  hcpcs_code: string;
  category: string;
  retail_price: string;
  variant_size: string;
  sku: string;
  manufacturer: string;
  fulfillment_types: string[];
}

const emptyProductForm: NewProductForm = {
  product_name: "",
  hcpcs_code: "",
  category: "",
  retail_price: "",
  variant_size: "",
  sku: "",
  manufacturer: "",
  fulfillment_types: [],
};

export function Step3ProductCatalog() {
  const { supplier, products, refreshProducts } = useSupplier();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [approving, setApproving] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newProduct, setNewProduct] = useState<NewProductForm>(emptyProductForm);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const startPolling = useCallback(() => {
    if (!supplier?.id) return;
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      try {
        const status = await api.getUploadStatus(supplier.id);

        if (status.processing_status === "completed") {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          setUploadStatus("complete");
          await refreshProducts();
        } else if (status.processing_status === "failed") {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          setUploadStatus("error");
          setUploadError("AI processing failed. Please try uploading again.");
        }
      } catch {
        // continue polling
      }
    }, 2000);

    // Timeout after 120 seconds
    setTimeout(() => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
        setUploadStatus("error");
        setUploadError("Processing timed out. Please try again.");
      }
    }, 120000);
  }, [supplier?.id, refreshProducts]);

  const handleFile = useCallback(
    async (file: File) => {
      if (!supplier?.id) return;

      setUploadStatus("uploading");
      setUploadError(null);

      try {
        await api.uploadCatalog(supplier.id, file);
        setUploadStatus("processing");
        startPolling();
      } catch (err) {
        setUploadStatus("error");
        setUploadError(
          err instanceof Error ? err.message : "Upload failed. Please try again."
        );
      }
    },
    [supplier?.id, startPolling]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const handleProductUpdate = async (
    product: Product,
    field: string,
    value: string
  ) => {
    try {
      const updateData: Record<string, unknown> = {};
      if (field === "retail_price") {
        updateData[field] = parseFloat(value) || 0;
      } else {
        updateData[field] = value;
      }
      await api.updateProduct(product.id, updateData);
      await refreshProducts();
    } catch {
      toast.error("Failed to update product. Please try again.");
    }
  };

  const handleFulfillmentToggle = async (
    product: Product,
    fulfillmentType: string
  ) => {
    const current = product.fulfillment_types ?? [];
    const updated = current.includes(fulfillmentType)
      ? current.filter((t) => t !== fulfillmentType)
      : [...current, fulfillmentType];

    try {
      await api.updateProduct(product.id, { fulfillment_types: updated });
      await refreshProducts();
    } catch {
      toast.error("Failed to update fulfillment type.");
    }
  };

  const handleApprove = async () => {
    if (!supplier?.id) return;
    setApproving(true);
    try {
      await api.approveProducts(supplier.id);
      await refreshProducts();
      toast.success("Catalog approved successfully.");
    } catch {
      toast.error("Failed to approve catalog. Please try again.");
    } finally {
      setApproving(false);
    }
  };

  const handleAddProduct = async () => {
    if (!supplier?.id || !newProduct.product_name.trim()) return;

    try {
      await api.addProduct(supplier.id, {
        product_name: newProduct.product_name,
        hcpcs_code: newProduct.hcpcs_code || null,
        category: newProduct.category || null,
        retail_price: newProduct.retail_price
          ? parseFloat(newProduct.retail_price)
          : null,
        variant_size: newProduct.variant_size || null,
        sku: newProduct.sku || null,
        manufacturer: newProduct.manufacturer || null,
        fulfillment_types:
          newProduct.fulfillment_types.length > 0
            ? newProduct.fulfillment_types
            : null,
      });
      await refreshProducts();
      setNewProduct(emptyProductForm);
      setAddDialogOpen(false);
    } catch {
      toast.error("Failed to add product. Please try again.");
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      await api.deleteProduct(productId);
      await refreshProducts();
    } catch {
      toast.error("Failed to delete product.");
    }
  };

  const onValidate = useCallback((): boolean => {
    if (products.length === 0) {
      toast.error("Please add at least one product to your catalog.");
      return false;
    }
    if (!products.some((p) => p.approved_by_supplier)) {
      toast.error("Please approve your catalog before continuing.");
      return false;
    }
    return true;
  }, [products]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Product Catalog & Pricing
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Upload your product catalog or add products manually.
        </p>
      </div>

      {/* Upload Zone */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Catalog</CardTitle>
        </CardHeader>
        <CardContent>
          {uploadStatus === "idle" || uploadStatus === "error" ? (
            <div
              className={cn(
                "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 transition-colors cursor-pointer",
                isDragOver
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
              )}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-sm font-medium">
                Drag and drop your catalog file here
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                or click to browse
              </p>
              <p className="text-xs text-muted-foreground mt-3">
                Accepted formats: CSV, XLSX, XLS, PDF, JPG, PNG
              </p>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept={ACCEPTED_TYPES}
                onChange={handleFileSelect}
              />
            </div>
          ) : uploadStatus === "uploading" ? (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-primary/50 p-10">
              <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
              <p className="text-sm font-medium">Uploading your catalog...</p>
            </div>
          ) : uploadStatus === "processing" ? (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-primary/50 bg-primary/5 p-10">
              <Sparkles className="h-10 w-10 text-primary animate-pulse mb-4" />
              <p className="text-sm font-medium">
                AI is analyzing your catalog...
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Extracting products, HCPCS codes, pricing, and categories. This
                may take a moment.
              </p>
              <div className="w-full max-w-xs mt-4 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full w-1/3 bg-primary rounded-full animate-indeterminate" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-green-500/50 bg-green-50 dark:bg-green-950/20 p-10">
              <FileSpreadsheet className="h-10 w-10 text-green-600 mb-4" />
              <p className="text-sm font-medium text-green-800 dark:text-green-300">
                Catalog processed successfully
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {products.length} product{products.length !== 1 ? "s" : ""}{" "}
                extracted. Review below.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => {
                  setUploadStatus("idle");
                  setUploadError(null);
                }}
              >
                Upload Another File
              </Button>
            </div>
          )}

          {uploadError && (
            <p className="text-sm text-destructive mt-3">{uploadError}</p>
          )}
        </CardContent>
      </Card>

      {/* Products Table */}
      {products.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>
              Products ({products.length})
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Row
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Name</TableHead>
                    <TableHead>HCPCS Code</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Retail Price</TableHead>
                    <TableHead>Variant/Size</TableHead>
                    <TableHead>Fulfillment Type</TableHead>
                    <TableHead className="hidden lg:table-cell">SKU</TableHead>
                    <TableHead className="hidden lg:table-cell">Manufacturer</TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <EditableCell
                          value={product.product_name}
                          onChange={(v) =>
                            handleProductUpdate(product, "product_name", v)
                          }
                          confidence={product.ai_confidence?.product_name}
                        />
                      </TableCell>
                      <TableCell>
                        <EditableCell
                          value={product.hcpcs_code ?? ""}
                          onChange={(v) =>
                            handleProductUpdate(product, "hcpcs_code", v)
                          }
                          confidence={product.ai_confidence?.hcpcs_code}
                        />
                      </TableCell>
                      <TableCell>
                        <EditableCell
                          value={product.category ?? ""}
                          onChange={(v) =>
                            handleProductUpdate(product, "category", v)
                          }
                          confidence={product.ai_confidence?.category}
                        />
                      </TableCell>
                      <TableCell>
                        <EditableCell
                          value={
                            product.retail_price != null
                              ? String(product.retail_price)
                              : ""
                          }
                          onChange={(v) =>
                            handleProductUpdate(product, "retail_price", v)
                          }
                          confidence={product.ai_confidence?.retail_price}
                        />
                      </TableCell>
                      <TableCell>
                        <EditableCell
                          value={product.variant_size ?? ""}
                          onChange={(v) =>
                            handleProductUpdate(product, "variant_size", v)
                          }
                          confidence={product.ai_confidence?.variant_size}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {FULFILLMENT_OPTIONS.map((type) => {
                            const isActive =
                              product.fulfillment_types?.includes(type) ??
                              false;
                            return (
                              <Badge
                                key={type}
                                variant={isActive ? "default" : "outline"}
                                className={cn(
                                  "cursor-pointer text-[11px]",
                                  isActive
                                    ? ""
                                    : "text-muted-foreground hover:bg-muted"
                                )}
                                onClick={() =>
                                  handleFulfillmentToggle(product, type)
                                }
                              >
                                {type}
                              </Badge>
                            );
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <EditableCell
                          value={product.sku ?? ""}
                          onChange={(v) =>
                            handleProductUpdate(product, "sku", v)
                          }
                          confidence={product.ai_confidence?.sku}
                        />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <EditableCell
                          value={product.manufacturer ?? ""}
                          onChange={(v) =>
                            handleProductUpdate(product, "manufacturer", v)
                          }
                          confidence={product.ai_confidence?.manufacturer}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteProduct(product.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 flex justify-end">
              {products.every((p) => p.approved_by_supplier) ? (
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 gap-1 px-3 py-1.5 text-sm">
                  <Check className="h-4 w-4" />
                  Catalog Approved
                </Badge>
              ) : (
                <Button
                  onClick={handleApprove}
                  disabled={products.length === 0 || approving}
                >
                  {approving && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Approve{products.some((p) => p.approved_by_supplier)
                    ? ` Remaining (${products.filter((p) => !p.approved_by_supplier).length})`
                    : " Catalog"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state when no products and no upload in progress */}
      {products.length === 0 &&
        uploadStatus !== "uploading" &&
        uploadStatus !== "processing" && (
          <div className="text-center py-6">
            <Button
              variant="outline"
              onClick={() => setAddDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Product Manually
            </Button>
          </div>
        )}

      {/* Add Product Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Product</DialogTitle>
            <DialogDescription>
              Manually add a product to your catalog.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new_product_name">
                Product Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="new_product_name"
                value={newProduct.product_name}
                onChange={(e) =>
                  setNewProduct((prev) => ({
                    ...prev,
                    product_name: e.target.value,
                  }))
                }
                placeholder="Enter product name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new_hcpcs">HCPCS Code</Label>
                <Input
                  id="new_hcpcs"
                  value={newProduct.hcpcs_code}
                  onChange={(e) =>
                    setNewProduct((prev) => ({
                      ...prev,
                      hcpcs_code: e.target.value,
                    }))
                  }
                  placeholder="e.g. E0601"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new_category">Category</Label>
                <Select
                  value={newProduct.category}
                  onValueChange={(v) =>
                    setNewProduct((prev) => ({ ...prev, category: v }))
                  }
                >
                  <SelectTrigger id="new_category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {DME_CATEGORY_NAMES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new_price">Retail Price</Label>
                <Input
                  id="new_price"
                  type="number"
                  value={newProduct.retail_price}
                  onChange={(e) =>
                    setNewProduct((prev) => ({
                      ...prev,
                      retail_price: e.target.value,
                    }))
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new_variant">Variant/Size</Label>
                <Input
                  id="new_variant"
                  value={newProduct.variant_size}
                  onChange={(e) =>
                    setNewProduct((prev) => ({
                      ...prev,
                      variant_size: e.target.value,
                    }))
                  }
                  placeholder="e.g. Large"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new_sku">SKU</Label>
                <Input
                  id="new_sku"
                  value={newProduct.sku}
                  onChange={(e) =>
                    setNewProduct((prev) => ({
                      ...prev,
                      sku: e.target.value,
                    }))
                  }
                  placeholder="SKU-001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new_manufacturer">Manufacturer</Label>
                <Input
                  id="new_manufacturer"
                  value={newProduct.manufacturer}
                  onChange={(e) =>
                    setNewProduct((prev) => ({
                      ...prev,
                      manufacturer: e.target.value,
                    }))
                  }
                  placeholder="Manufacturer name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Fulfillment Type</Label>
              <div className="flex flex-wrap gap-2">
                {FULFILLMENT_OPTIONS.map((type) => {
                  const isActive = newProduct.fulfillment_types.includes(type);
                  return (
                    <Badge
                      key={type}
                      variant={isActive ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer",
                        !isActive && "text-muted-foreground hover:bg-muted"
                      )}
                      onClick={() =>
                        setNewProduct((prev) => ({
                          ...prev,
                          fulfillment_types: isActive
                            ? prev.fulfillment_types.filter((t) => t !== type)
                            : [...prev.fulfillment_types, type],
                        }))
                      }
                    >
                      {type}
                    </Badge>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddProduct}
              disabled={!newProduct.product_name.trim()}
            >
              Add Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StepNavigation onValidate={onValidate} disabled={uploadStatus === "uploading" || uploadStatus === "processing"} />
    </div>
  );
}
