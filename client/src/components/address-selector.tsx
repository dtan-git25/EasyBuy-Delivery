import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Plus, Edit, Trash2, Star, Navigation, CheckCircle } from "lucide-react";
import type { SavedAddress } from "@shared/schema";

const addressSchema = z.object({
  label: z.string().optional(),
  lotHouseNo: z.string().min(1, "Lot/House number is required"),
  street: z.string().min(1, "Street is required"),
  barangay: z.string().min(1, "Barangay is required"),
  cityMunicipality: z.string().min(1, "City/Municipality is required"),
  province: z.string().min(1, "Province is required"),
  landmark: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
});

type AddressFormData = z.infer<typeof addressSchema>;

interface AddressSelectorProps {
  value?: SavedAddress | null;
  onChange: (address: SavedAddress | null) => void;
  disabled?: boolean;
}

export function AddressSelector({ value, onChange, disabled }: AddressSelectorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);
  const [locationShared, setLocationShared] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const { toast } = useToast();

  const { data: addresses = [], isLoading } = useQuery<SavedAddress[]>({
    queryKey: ["/api/saved-addresses"],
  });

  const form = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      label: "",
      lotHouseNo: "",
      street: "",
      barangay: "",
      cityMunicipality: "",
      province: "",
      landmark: "",
      latitude: "14.5995",
      longitude: "120.9842",
    },
  });

  const createAddressMutation = useMutation({
    mutationFn: async (data: AddressFormData) => {
      const response = await apiRequest("POST", "/api/saved-addresses", data);
      return response.json();
    },
    onSuccess: (newAddress: SavedAddress) => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-addresses"] });
      setIsModalOpen(false);
      onChange(newAddress);
      toast({
        title: "Success",
        description: "Address saved successfully",
      });
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save address",
        variant: "destructive",
      });
    },
  });

  const updateAddressMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: AddressFormData }) => {
      const response = await apiRequest("PUT", `/api/saved-addresses/${id}`, data);
      return response.json();
    },
    onSuccess: (updatedAddress: SavedAddress) => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-addresses"] });
      setIsModalOpen(false);
      setEditingAddress(null);
      onChange(updatedAddress);
      toast({
        title: "Success",
        description: "Address updated successfully",
      });
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update address",
        variant: "destructive",
      });
    },
  });

  const deleteAddressMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/saved-addresses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-addresses"] });
      if (value && addresses.find((a) => a.id === value.id)) {
        onChange(null);
      }
      toast({
        title: "Success",
        description: "Address deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete address",
        variant: "destructive",
      });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("PATCH", `/api/saved-addresses/${id}/set-default`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-addresses"] });
      toast({
        title: "Success",
        description: "Default address set successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to set default address",
        variant: "destructive",
      });
    },
  });

  const handleShareLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Location Not Supported",
        description: "Your browser doesn't support location services",
        variant: "destructive",
      });
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        form.setValue("latitude", latitude.toString());
        form.setValue("longitude", longitude.toString());
        setLocationShared(true);
        setIsGettingLocation(false);
        toast({
          title: "Location Captured",
          description: "Your precise location has been saved",
        });
      },
      (error) => {
        setIsGettingLocation(false);
        toast({
          title: "Location Error",
          description: "Unable to get your location. Your address will be geocoded instead.",
          variant: "destructive",
        });
      }
    );
  };

  const handleOpenModal = (address?: SavedAddress) => {
    if (address) {
      setEditingAddress(address);
      setLocationShared(!!address.latitude && !!address.longitude);
      form.reset({
        label: address.label || "",
        lotHouseNo: address.lotHouseNo,
        street: address.street,
        barangay: address.barangay,
        cityMunicipality: address.cityMunicipality,
        province: address.province,
        landmark: address.landmark || "",
        latitude: address.latitude,
        longitude: address.longitude,
      });
    } else {
      setEditingAddress(null);
      setLocationShared(false);
      form.reset({
        label: "",
        lotHouseNo: "",
        street: "",
        barangay: "",
        cityMunicipality: "",
        province: "",
        landmark: "",
        latitude: "",
        longitude: "",
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (data: AddressFormData) => {
    if (editingAddress) {
      updateAddressMutation.mutate({ id: editingAddress.id, data });
    } else {
      createAddressMutation.mutate(data);
    }
  };

  const formatAddress = (address: SavedAddress) => {
    const parts = [
      address.lotHouseNo,
      address.street,
      address.barangay,
      address.cityMunicipality,
      address.province,
    ];
    return parts.filter(Boolean).join(", ");
  };

  const defaultAddress = addresses.find((a) => a.isDefault);

  useEffect(() => {
    if (!value && defaultAddress) {
      onChange(defaultAddress);
    }
  }, [defaultAddress, value, onChange]);

  return (
    <div className="space-y-2">
      <Label>Delivery Address *</Label>
      <div className="flex gap-2">
        <Select
          value={value?.id || ""}
          onValueChange={(id) => {
            const selected = addresses.find((a) => a.id === id);
            onChange(selected || null);
          }}
          disabled={disabled || isLoading}
        >
          <SelectTrigger data-testid="select-saved-address" className="flex-1">
            <SelectValue placeholder="Select a saved address" />
          </SelectTrigger>
          <SelectContent>
            {addresses.map((address) => (
              <SelectItem key={address.id} value={address.id} data-testid={`option-address-${address.id}`}>
                <div className="flex items-center gap-2">
                  {address.isDefault && <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />}
                  <div>
                    {address.label && <span className="font-medium">{address.label} - </span>}
                    {formatAddress(address)}
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => handleOpenModal()}
          data-testid="button-add-address"
          disabled={disabled}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {value && (
        <div className="flex gap-2 text-sm text-muted-foreground">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleOpenModal(value)}
            data-testid="button-edit-address"
            disabled={disabled}
          >
            <Edit className="h-3 w-3 mr-1" />
            Edit
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => deleteAddressMutation.mutate(value.id)}
            data-testid="button-delete-address"
            disabled={disabled || deleteAddressMutation.isPending}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Delete
          </Button>
          {!value.isDefault && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDefaultMutation.mutate(value.id)}
              data-testid="button-set-default-address"
              disabled={disabled || setDefaultMutation.isPending}
            >
              <Star className="h-3 w-3 mr-1" />
              Set as Default
            </Button>
          )}
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAddress ? "Edit Address" : "Add New Address"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="label">Label (Optional)</Label>
              <Input
                id="label"
                {...form.register("label")}
                placeholder="e.g., Home, Office, Mom's House"
                data-testid="input-address-label"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="lotHouseNo">Lot/House No. *</Label>
                <Input
                  id="lotHouseNo"
                  {...form.register("lotHouseNo")}
                  placeholder="e.g., 123"
                  data-testid="input-lot-house-no"
                />
                {form.formState.errors.lotHouseNo && (
                  <p className="text-sm text-destructive mt-1">{form.formState.errors.lotHouseNo.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="street">Street *</Label>
                <Input
                  id="street"
                  {...form.register("street")}
                  placeholder="e.g., Rizal Street"
                  data-testid="input-street"
                />
                {form.formState.errors.street && (
                  <p className="text-sm text-destructive mt-1">{form.formState.errors.street.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="barangay">Barangay *</Label>
                <Input
                  id="barangay"
                  {...form.register("barangay")}
                  placeholder="e.g., Barangay 1"
                  data-testid="input-barangay"
                />
                {form.formState.errors.barangay && (
                  <p className="text-sm text-destructive mt-1">{form.formState.errors.barangay.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="cityMunicipality">City/Municipality *</Label>
                <Input
                  id="cityMunicipality"
                  {...form.register("cityMunicipality")}
                  placeholder="e.g., Manila"
                  data-testid="input-city-municipality"
                />
                {form.formState.errors.cityMunicipality && (
                  <p className="text-sm text-destructive mt-1">{form.formState.errors.cityMunicipality.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="province">Province *</Label>
                <Input
                  id="province"
                  {...form.register("province")}
                  placeholder="e.g., Metro Manila"
                  data-testid="input-province"
                />
                {form.formState.errors.province && (
                  <p className="text-sm text-destructive mt-1">{form.formState.errors.province.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="landmark">Landmark (Optional)</Label>
                <Input
                  id="landmark"
                  {...form.register("landmark")}
                  placeholder="e.g., Near SM Mall"
                  data-testid="input-landmark"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Navigation className="h-4 w-4" />
                Share Your Location (Optional)
              </Label>
              <p className="text-sm text-muted-foreground">
                Share your precise location for accurate delivery fees, or skip this and we'll estimate based on your address.
              </p>
              
              {!locationShared ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleShareLocation}
                  disabled={isGettingLocation}
                  data-testid="button-share-location"
                  className="w-full"
                >
                  <Navigation className="h-4 w-4 mr-2" />
                  {isGettingLocation ? "Getting Location..." : "Share My Location"}
                </Button>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-900 dark:text-green-100">
                      Location Captured
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-300">
                      Coordinates: {form.watch("latitude")}, {form.watch("longitude")}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setLocationShared(false);
                      form.setValue("latitude", "");
                      form.setValue("longitude", "");
                    }}
                    data-testid="button-clear-location"
                  >
                    Clear
                  </Button>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingAddress(null);
                  form.reset();
                }}
                data-testid="button-cancel-address"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                data-testid="button-save-address"
                disabled={createAddressMutation.isPending || updateAddressMutation.isPending}
              >
                {editingAddress ? "Update Address" : "Save Address"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
