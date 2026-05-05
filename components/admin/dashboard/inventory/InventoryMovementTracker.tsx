"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, TrendingUp, TrendingDown, Package, Calendar, Filter, Download, Eye } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface InventoryMovement {
  id: string;
  product_id: string;
  product_variant_id: string | null;
  movement_type: 'purchase' | 'sale' | 'adjustment' | 'return_in' | 'return_out' | 'damage' | 'void';
  reference_type: 'transaction' | 'purchase_order' | 'refund' | 'manual' | null;
  reference_id: string | null;
  qty_before: number;
  qty_change: number;
  qty_after: number;
  unit_cost: number;
  notes: string | null;
  created_by: string;
  created_at: string;
  products?: {
    name: string;
    barcode: string;
  };
  product_variants?: {
    name: string;
    barcode: string;
  };
  profiles?: {
    full_name: string;
  };
}

interface MovementSummary {
  total_movements: number;
  total_in: number;
  total_out: number;
  net_change: number;
  total_cost: number;
}

export function InventoryMovementTracker() {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [summary, setSummary] = useState<MovementSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [movementFilter, setMovementFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("7days");
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedMovement, setSelectedMovement] = useState<InventoryMovement | null>(null);

  useEffect(() => {
    fetchMovements();
  }, [dateFilter]);

  const fetchMovements = async () => {
    try {
      const response = await fetch(`/api/stock/movements?period=${dateFilter}`);
      if (!response.ok) throw new Error('Failed to fetch movements');
      const data = await response.json();
      setMovements(data);
      calculateSummary(data);
    } catch (error) {
      toast.error('Error loading inventory movements');
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = (data: InventoryMovement[]) => {
    const summary = data.reduce(
      (acc, movement) => {
        acc.total_movements++;
        
        if (movement.qty_change > 0) {
          acc.total_in += movement.qty_change;
        } else {
          acc.total_out += Math.abs(movement.qty_change);
        }
        
        acc.net_change += movement.qty_change;
        acc.total_cost += Math.abs(movement.qty_change * movement.unit_cost);
        
        return acc;
      },
      {
        total_movements: 0,
        total_in: 0,
        total_out: 0,
        net_change: 0,
        total_cost: 0,
      }
    );
    
    setSummary(summary);
  };

  const filteredMovements = movements.filter(movement => {
    const matchesSearch = 
      movement.products?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.products?.barcode?.includes(searchTerm) ||
      movement.product_variants?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesMovementType = true;
    if (movementFilter === "in") {
      matchesMovementType = movement.qty_change > 0;
    } else if (movementFilter === "out") {
      matchesMovementType = movement.qty_change < 0;
    }
    
    return matchesSearch && matchesMovementType;
  });

  const getMovementTypeColor = (type: string) => {
    switch (type) {
      case 'purchase':
      case 'return_in':
        return 'bg-green-100 text-green-800';
      case 'sale':
      case 'adjustment':
      case 'return_out':
      case 'damage':
      case 'void':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const exportToCSV = () => {
    const headers = [
      'Date', 'Product', 'Variant', 'Type', 'Reference', 'Qty Change', 
      'Before', 'After', 'Unit Cost', 'Total Cost', 'Notes', 'Created By'
    ];
    
    const csvData = filteredMovements.map(movement => [
      format(new Date(movement.created_at), 'dd/MM/yyyy HH:mm', { locale: id }),
      movement.products?.name || '',
      movement.product_variants?.name || '',
      movement.movement_type,
      `${movement.reference_type}:${movement.reference_id || 'N/A'}`,
      movement.qty_change.toString(),
      movement.qty_before.toString(),
      movement.qty_after.toString(),
      movement.unit_cost.toString(),
      (Math.abs(movement.qty_change * movement.unit_cost)).toString(),
      movement.notes || '',
      movement.profiles?.full_name || ''
    ]);
    
    const csv = [headers, ...csvData].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory_movements_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory Movement Tracker</h1>
          <p className="text-muted-foreground">Track and analyze all inventory movements</p>
        </div>
        <Button onClick={exportToCSV} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Movements</p>
                  <p className="text-2xl font-bold">{summary.total_movements}</p>
                </div>
                <Package className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Stock In</p>
                  <p className="text-2xl font-bold text-green-600">{summary.total_in}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Stock Out</p>
                  <p className="text-2xl font-bold text-red-600">{summary.total_out}</p>
                </div>
                <TrendingDown className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Net Change</p>
                  <p className={`text-2xl font-bold ${summary.net_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {summary.net_change >= 0 ? '+' : ''}{summary.net_change}
                  </p>
                </div>
                <Package className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Value</p>
                  <p className="text-2xl font-bold">{formatCurrency(summary.total_cost)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products, variants, notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={movementFilter} onValueChange={setMovementFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Movement Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Movements</SelectItem>
                <SelectItem value="in">Stock In Only</SelectItem>
                <SelectItem value="out">Stock Out Only</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1day">Last 24 Hours</SelectItem>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="90days">Last 90 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" onClick={() => {
              setSearchTerm("");
              setMovementFilter("all");
              setDateFilter("7days");
            }}>
              <Filter className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Movements Table */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Movements</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Product</th>
                    <th className="text-left p-2">Variant</th>
                    <th className="text-left p-2">Type</th>
                    <th className="text-left p-2">Reference</th>
                    <th className="text-center p-2">Change</th>
                    <th className="text-center p-2">Before</th>
                    <th className="text-center p-2">After</th>
                    <th className="text-right p-2">Value</th>
                    <th className="text-left p-2">Notes</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMovements.map((movement) => (
                    <tr key={movement.id} className="border-b hover:bg-muted/50">
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="text-sm">
                              {format(new Date(movement.created_at), 'dd/MM/yyyy', { locale: id })}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(movement.created_at), 'HH:mm', { locale: id })}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-2">
                        <div>
                          <div className="font-medium">{movement.products?.name}</div>
                          <div className="text-sm text-muted-foreground font-mono">
                            {movement.products?.barcode}
                          </div>
                        </div>
                      </td>
                      <td className="p-2">
                        {movement.product_variants ? (
                          <div>
                            <div className="font-medium">{movement.product_variants.name}</div>
                            <div className="text-sm text-muted-foreground font-mono">
                              {movement.product_variants.barcode}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-2">
                        <Badge className={getMovementTypeColor(movement.movement_type)}>
                          {movement.movement_type.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <div className="text-sm">
                          <div className="font-medium">{movement.reference_type}</div>
                          <div className="text-muted-foreground">
                            {movement.reference_id ? movement.reference_id.substring(0, 8) + '...' : 'N/A'}
                          </div>
                        </div>
                      </td>
                      <td className="p-2 text-center">
                        <span className={`font-bold ${
                          movement.qty_change > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {movement.qty_change > 0 ? '+' : ''}{movement.qty_change}
                        </span>
                      </td>
                      <td className="p-2 text-center">{movement.qty_before}</td>
                      <td className="p-2 text-center font-medium">{movement.qty_after}</td>
                      <td className="p-2 text-right">
                        {formatCurrency(Math.abs(movement.qty_change * movement.unit_cost))}
                      </td>
                      <td className="p-2 text-sm text-muted-foreground max-w-xs truncate">
                        {movement.notes || '-'}
                      </td>
                      <td className="p-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedMovement(movement);
                            setShowDetailsModal(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredMovements.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No inventory movements found matching your filters
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Modal */}
      {showDetailsModal && selectedMovement && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Movement Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Date & Time</Label>
                  <p className="font-medium">
                    {format(new Date(selectedMovement.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: id })}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Movement Type</Label>
                  <Badge className={getMovementTypeColor(selectedMovement.movement_type)}>
                    {selectedMovement.movement_type.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Product</Label>
                  <p className="font-medium">{selectedMovement.products?.name}</p>
                  <p className="text-sm text-muted-foreground font-mono">
                    {selectedMovement.products?.barcode}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Variant</Label>
                  <p className="font-medium">
                    {selectedMovement.product_variants?.name || 'N/A'}
                  </p>
                  <p className="text-sm text-muted-foreground font-mono">
                    {selectedMovement.product_variants?.barcode || '-'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Quantity Change</Label>
                  <p className={`font-bold text-lg ${
                    selectedMovement.qty_change > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {selectedMovement.qty_change > 0 ? '+' : ''}{selectedMovement.qty_change}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Stock Levels</Label>
                  <p className="font-medium">
                    {selectedMovement.qty_before} → {selectedMovement.qty_after}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Unit Cost</Label>
                  <p className="font-medium">{formatCurrency(selectedMovement.unit_cost)}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Total Value</Label>
                  <p className="font-bold">
                    {formatCurrency(Math.abs(selectedMovement.qty_change * selectedMovement.unit_cost))}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Reference</Label>
                  <p className="font-medium">
                    {selectedMovement.reference_type}:{selectedMovement.reference_id || 'N/A'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Created By</Label>
                  <p className="font-medium">{selectedMovement.profiles?.full_name || 'Unknown'}</p>
                </div>
              </div>
              
              {selectedMovement.notes && (
                <div>
                  <Label className="text-sm text-muted-foreground">Notes</Label>
                  <p className="font-medium">{selectedMovement.notes}</p>
                </div>
              )}
              
              <div className="flex gap-2 pt-4">
                <Button onClick={() => setShowDetailsModal(false)} className="flex-1">
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
