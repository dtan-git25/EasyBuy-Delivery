import { useState, useEffect, useRef } from "react";
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
import { MapPin, Plus, Edit, Trash2, Star } from "lucide-react";
import type { SavedAddress } from "@shared/schema";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const addressSchema = z.object({
  label: z.string().optional(),
  lotHouseNo: z.string().min(1, "Lot/House number is required"),
  street: z.string().min(1, "Street is required"),
  barangay: z.string().min(1, "Barangay is required"),
  cityMunicipality: z.string().min(1, "City/Municipality is required"),
  province: z.string().min(1, "Province is required"),
  landmark: z.string().optional(),
  latitude: z.string(),
  longitude: z.string(),
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
  const [mapLocation, setMapLocation] = useState<{ lat: number; lng: number }>({ lat: 14.5995, lng: 120.9842 }); // Manila
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (isModalOpen && mapContainerRef.current && !mapRef.current) {
      // Add a small delay to ensure the dialog is fully rendered
      const timeoutId = setTimeout(() => {
        if (!mapContainerRef.current) return;

        // Initialize map
        const map = L.map(mapContainerRef.current).setView([mapLocation.lat, mapLocation.lng], 13);
        
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);

        // Force map to recalculate size after initialization
        setTimeout(() => map.invalidateSize(), 100);

        // Add marker
        const marker = L.marker([mapLocation.lat, mapLocation.lng], {
          draggable: true,
        }).addTo(map);

        marker.on("dragend", () => {
          const position = marker.getLatLng();
          setMapLocation({ lat: position.lat, lng: position.lng });
          form.setValue("latitude", position.lat.toString());
          form.setValue("longitude", position.lng.toString());
        });

        map.on("click", (e) => {
          const { lat, lng } = e.latlng;
          marker.setLatLng([lat, lng]);
          setMapLocation({ lat, lng });
          form.setValue("latitude", lat.toString());
          form.setValue("longitude", lng.toString());
        });

        mapRef.current = map;
        markerRef.current = marker;

        // Request user's location
        if (navigator.geolocation && !editingAddress) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const { latitude, longitude } = position.coords;
              map.setView([latitude, longitude], 15);
              marker.setLatLng([latitude, longitude]);
              setMapLocation({ lat: latitude, lng: longitude });
              form.setValue("latitude", latitude.toString());
              form.setValue("longitude", longitude.toString());
            },
            (error) => {
              console.error("Error getting location:", error);
            }
          );
        }
      }, 100);

      return () => clearTimeout(timeoutId);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, [isModalOpen]);

  const handleOpenModal = (address?: SavedAddress) => {
    if (address) {
      setEditingAddress(address);
      const lat = parseFloat(address.latitude);
      const lng = parseFloat(address.longitude);
      setMapLocation({ lat, lng });
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
      form.reset({
        label: "",
        lotHouseNo: "",
        street: "",
        barangay: "",
        cityMunicipality: "",
        province: "",
        landmark: "",
        latitude: "14.5995",
        longitude: "120.9842",
      });
      setMapLocation({ lat: 14.5995, lng: 120.9842 });
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

            <div>
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Pin Your Location on Map
              </Label>
              <p className="text-sm text-muted-foreground mb-2">
                Click on the map or drag the marker to set your precise location
              </p>
              <div
                ref={mapContainerRef}
                className="h-[300px] w-full rounded-md border"
                data-testid="map-container"
              />
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
