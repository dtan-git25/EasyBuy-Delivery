import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Minus, ShoppingCart } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  image?: string;
}

interface OptionValue {
  id: string;
  menuItemId: string;
  optionTypeId: string;
  value: string;
  price: string;
  optionType: {
    id: string;
    name: string;
    description: string;
    isActive: boolean;
  };
}

interface SelectedOption {
  optionTypeId: string;
  optionTypeName: string;
  valueId: string;
  valueName: string;
  price: number;
}

interface MenuItemOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  menuItem: MenuItem | null;
  onAddToCart: (quantity: number, selectedOptions: SelectedOption[], totalPrice: number) => void;
}

export function MenuItemOptionsModal({ isOpen, onClose, menuItem, onAddToCart }: MenuItemOptionsModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<SelectedOption[]>([]);

  const { data: optionValues = [], isLoading } = useQuery<OptionValue[]>({
    queryKey: ['/api/menu-items', menuItem?.id, 'options'],
    enabled: !!menuItem?.id && isOpen,
  });

  // Group options by option type and add "None" option to each
  const optionsByType = optionValues.reduce((acc, option) => {
    const typeName = option.optionType.name;
    if (!acc[typeName]) {
      acc[typeName] = {
        typeId: option.optionTypeId,
        typeName: typeName,
        typeDescription: option.optionType.description,
        values: [
          // Add "None" as the first option with ₱0 price
          {
            id: `none-${option.optionTypeId}`,
            value: "None",
            price: 0
          }
        ]
      };
    }
    acc[typeName].values.push({
      id: option.id,
      value: option.value,
      price: parseFloat(option.price)
    });
    return acc;
  }, {} as Record<string, { typeId: string; typeName: string; typeDescription: string; values: { id: string; value: string; price: number }[] }>);

  // Reset state when modal opens with new item and pre-select "None" for all options
  useEffect(() => {
    if (isOpen && menuItem && !isLoading) {
      setQuantity(1);
      // Pre-select "None" for all option types
      const noneOptions: SelectedOption[] = Object.values(optionsByType).map(optionType => ({
        optionTypeId: optionType.typeId,
        optionTypeName: optionType.typeName,
        valueId: `none-${optionType.typeId}`,
        valueName: "None",
        price: 0
      }));
      setSelectedOptions(noneOptions);
    }
  }, [isOpen, menuItem, isLoading]);

  const handleOptionSelect = (optionTypeId: string, optionTypeName: string, valueId: string, valueName: string, price: number) => {
    setSelectedOptions(prev => {
      // Remove any previous selection for this option type
      const filtered = prev.filter(opt => opt.optionTypeId !== optionTypeId);
      // Add new selection
      return [...filtered, { optionTypeId, optionTypeName, valueId, valueName, price }];
    });
  };

  const handleOptionDeselect = (optionTypeId: string) => {
    setSelectedOptions(prev => prev.filter(opt => opt.optionTypeId !== optionTypeId));
  };

  const calculateTotalPrice = () => {
    if (!menuItem) return 0;
    const basePrice = parseFloat(menuItem.price.toString());
    const optionsPrice = selectedOptions.reduce((sum, opt) => sum + opt.price, 0);
    return (basePrice + optionsPrice) * quantity;
  };

  const handleAddToCart = () => {
    if (!menuItem) return;
    const totalPrice = calculateTotalPrice();
    onAddToCart(quantity, selectedOptions, totalPrice);
    onClose();
  };

  const incrementQuantity = () => {
    setQuantity(prev => prev + 1);
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  if (!menuItem) return null;

  const basePrice = parseFloat(menuItem.price.toString());
  const optionsTotal = selectedOptions.reduce((sum, opt) => sum + opt.price, 0);
  const totalPrice = calculateTotalPrice();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-menu-options">
        <DialogHeader>
          <DialogTitle className="text-2xl" data-testid="text-item-name">{menuItem.name}</DialogTitle>
          {menuItem.description && (
            <p className="text-muted-foreground" data-testid="text-item-description">{menuItem.description}</p>
          )}
        </DialogHeader>

        <div className="space-y-6">
          {/* Base Price Display */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Base Price:</span>
              <span className="text-lg font-bold text-green-600" data-testid="text-base-price">₱{basePrice.toFixed(2)}</span>
            </div>
          </div>

          {/* Options Selection */}
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading options...</p>
            </div>
          ) : Object.keys(optionsByType).length > 0 ? (
            <div className="space-y-6">
              <h3 className="font-semibold text-lg">Customize Your Order</h3>
              {Object.values(optionsByType).map((optionType) => (
                <div key={optionType.typeId} className="space-y-3" data-testid={`section-option-${optionType.typeName.toLowerCase()}`}>
                  <div>
                    <h4 className="font-medium">{optionType.typeName}</h4>
                    {optionType.typeDescription && (
                      <p className="text-sm text-muted-foreground">{optionType.typeDescription}</p>
                    )}
                  </div>
                  <RadioGroup
                    value={selectedOptions.find(opt => opt.optionTypeId === optionType.typeId)?.valueId || ""}
                    onValueChange={(valueId) => {
                      const value = optionType.values.find(v => v.id === valueId);
                      if (value) {
                        handleOptionSelect(optionType.typeId, optionType.typeName, valueId, value.value, value.price);
                      }
                    }}
                  >
                    <div className="space-y-2">
                      {optionType.values.map((value) => (
                        <div
                          key={value.id}
                          className="flex items-center space-x-3 border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                          data-testid={`option-${optionType.typeName.toLowerCase()}-${value.value.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          <RadioGroupItem value={value.id} id={value.id} />
                          <Label htmlFor={value.id} className="flex-1 flex justify-between items-center cursor-pointer">
                            <span>{value.value}</span>
                            {value.price === 0 ? (
                              <span className="font-semibold text-muted-foreground">(₱0)</span>
                            ) : (
                              <span className="font-semibold text-green-600">+₱{value.price.toFixed(2)}</span>
                            )}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground">No customization options available</p>
            </div>
          )}

          <Separator />

          {/* Quantity Selector */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Quantity</h3>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="icon"
                onClick={decrementQuantity}
                disabled={quantity <= 1}
                data-testid="button-decrease-quantity"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="text-2xl font-bold min-w-[3rem] text-center" data-testid="text-quantity">{quantity}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={incrementQuantity}
                data-testid="button-increase-quantity"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Separator />

          {/* Price Summary */}
          <div className="space-y-2 bg-muted/50 p-4 rounded-lg">
            <div className="flex justify-between text-sm">
              <span>Base Price × {quantity}:</span>
              <span data-testid="text-base-total">₱{(basePrice * quantity).toFixed(2)}</span>
            </div>
            {selectedOptions.filter(opt => opt.valueName !== "None" && opt.price > 0).length > 0 && (
              <>
                {selectedOptions.filter(opt => opt.valueName !== "None" && opt.price > 0).map((opt) => (
                  <div key={opt.valueId} className="flex justify-between text-sm">
                    <span>{opt.valueName} × {quantity}:</span>
                    <span data-testid={`text-option-price-${opt.valueName.toLowerCase().replace(/\s+/g, '-')}`}>₱{(opt.price * quantity).toFixed(2)}</span>
                  </div>
                ))}
              </>
            )}
            <Separator className="my-2" />
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Total:</span>
              <span className="text-green-600 text-2xl" data-testid="text-total-price">₱{totalPrice.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto" data-testid="button-cancel">
            Cancel
          </Button>
          <Button onClick={handleAddToCart} className="w-full sm:w-auto" data-testid="button-confirm-add-to-cart">
            <ShoppingCart className="mr-2 h-4 w-4" />
            Add {quantity} to Cart - ₱{totalPrice.toFixed(2)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
