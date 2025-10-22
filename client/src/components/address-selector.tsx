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
import { MapPin, Plus, Edit, Trash2, Star, Navigation, Search } from "lucide-react";
import type { SavedAddress } from "@shared/schema";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const addressSchema = z.object({
  label: z.string().optional(),
  lotHouseNo: z.string().min(1, "Lot/House number is required"),
  street: z.string().min(1, "Street is required"),
  barangay: z.string().min(1, "Barangay is required"),
  cityMunicipality: z.string().min(1, "City/Municipality is required"),
  province: z.string().min(1, "Province is required"),
  landmark: z.string().optional(),
  latitude: z.string().min(1, "Please pin your location on the map"),
  longitude: z.string().min(1, "Please pin your location on the map"),
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
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const { toast } = useToast();
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

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
      latitude: "",
      longitude: "",
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

  // Initialize map when modal opens
  useEffect(() => {
    if (!isModalOpen) {
      // Cleanup map when modal closes
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
      return;
    }

    // Wait for modal animation and container to be ready
    const initMap = setTimeout(() => {
      if (mapContainerRef.current && !mapRef.current) {
        try {
          // Get initial coordinates from form or use Philippines default (Manila)
          const latValue = form.watch("latitude");
          const lngValue = form.watch("longitude");
          const lat = latValue && latValue.trim() ? parseFloat(latValue) : 14.5995;
          const lng = lngValue && lngValue.trim() ? parseFloat(lngValue) : 120.9842;
          
          // Create map instance with higher zoom for better view
          const map = L.map(mapContainerRef.current, {
            center: [lat, lng],
            zoom: 15,
            zoomControl: true,
          });
          
          // Add OpenStreetMap tiles
          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
          }).addTo(map);
          
          // Create draggable marker only if coordinates exist
          let marker: L.Marker | null = null;
          if (latValue && lngValue && latValue.trim() && lngValue.trim()) {
            marker = L.marker([lat, lng], { 
              draggable: true,
              autoPan: true,
            }).addTo(map);
            
            // Update coordinates when marker is dragged
            marker.on("dragend", () => {
              const position = marker!.getLatLng();
              form.setValue("latitude", position.lat.toFixed(6));
              form.setValue("longitude", position.lng.toFixed(6));
            });
          }
          
          // Allow clicking on map to place/move marker
          map.on("click", (e) => {
            if (!marker) {
              // Create marker if it doesn't exist
              marker = L.marker(e.latlng, { 
                draggable: true,
                autoPan: true,
              }).addTo(map);
              
              // Add drag listener
              marker.on("dragend", () => {
                const position = marker!.getLatLng();
                form.setValue("latitude", position.lat.toFixed(6));
                form.setValue("longitude", position.lng.toFixed(6));
              });
              
              markerRef.current = marker;
            } else {
              // Move existing marker
              marker.setLatLng(e.latlng);
            }
            
            // Update form values
            form.setValue("latitude", e.latlng.lat.toFixed(6));
            form.setValue("longitude", e.latlng.lng.toFixed(6));
          });
          
          mapRef.current = map;
          markerRef.current = marker;
          
          // Fix layout after render - important for proper display
          setTimeout(() => {
            map.invalidateSize();
          }, 250);
        } catch (error) {
          console.error("Error initializing map:", error);
        }
      }
    }, 150); // Small delay to ensure modal is fully rendered

    return () => {
      clearTimeout(initMap);
    };
  }, [isModalOpen, form]);

  // Use current location via browser geolocation
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Not Supported",
        description: "Geolocation is not supported by your browser",
        variant: "destructive",
      });
      return;
    }

    setIsSearchingAddress(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        form.setValue("latitude", latitude.toFixed(6));
        form.setValue("longitude", longitude.toFixed(6));

        // Update map view and marker position
        if (mapRef.current) {
          mapRef.current.setView([latitude, longitude], 17);
          
          if (markerRef.current) {
            // Update existing marker
            markerRef.current.setLatLng([latitude, longitude]);
          } else {
            // Create new marker if it doesn't exist
            const marker = L.marker([latitude, longitude], {
              draggable: true,
              autoPan: true,
            }).addTo(mapRef.current);
            
            marker.on("dragend", () => {
              const position = marker.getLatLng();
              form.setValue("latitude", position.lat.toFixed(6));
              form.setValue("longitude", position.lng.toFixed(6));
            });
            
            markerRef.current = marker;
          }
        }

        toast({
          title: "Location Found",
          description: "Map centered to your current location. Drag the pin to adjust.",
        });
        setIsSearchingAddress(false);
      },
      (error) => {
        let message = "Could not get your location. Please enable location access.";
        if (error.code === error.PERMISSION_DENIED) {
          message = "Location access denied. Please enable it in your browser settings.";
        }
        toast({
          title: "Location Error",
          description: message,
          variant: "destructive",
        });
        setIsSearchingAddress(false);
      }
    );
  };

  // Search address on map using geocoding
  const handleSearchAddressOnMap = async () => {
    const address = `${form.watch("lotHouseNo")} ${form.watch("street")}, ${form.watch("barangay")}, ${form.watch("cityMunicipality")}, ${form.watch("province")}`;
    
    if (!address.trim()) {
      toast({
        title: "No Address",
        description: "Please fill in the address fields first",
        variant: "destructive",
      });
      return;
    }

    setIsSearchingAddress(true);
    try {
      const response = await fetch(`/api/geocode?address=${encodeURIComponent(address)}`);
      const data = await response.json();
      
      if (data.coordinates) {
        const { latitude, longitude } = data.coordinates;
        form.setValue("latitude", latitude);
        form.setValue("longitude", longitude);
        
        // Update map view and marker position
        if (mapRef.current) {
          const lat = parseFloat(latitude);
          const lng = parseFloat(longitude);
          mapRef.current.setView([lat, lng], 15);
          
          if (markerRef.current) {
            // Update existing marker
            markerRef.current.setLatLng([lat, lng]);
          } else {
            // Create new marker if it doesn't exist
            const marker = L.marker([lat, lng], {
              draggable: true,
              autoPan: true,
            }).addTo(mapRef.current);
            
            marker.on("dragend", () => {
              const position = marker.getLatLng();
              form.setValue("latitude", position.lat.toFixed(6));
              form.setValue("longitude", position.lng.toFixed(6));
            });
            
            markerRef.current = marker;
          }
        }
        
        toast({
          title: "Address Found",
          description: "Map centered to your address. Drag the pin to adjust.",
        });
      } else {
        toast({
          title: "Address Not Found",
          description: "Could not find location. Please drag the pin manually.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Search Error",
        description: "Failed to search address. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearchingAddress(false);
    }
  };

  const handleOpenModal = (address?: SavedAddress) => {
    if (address) {
      setEditingAddress(address);
      form.reset({
        label: address.label || "",
        lotHouseNo: address.lotHouseNo,
        street: address.street,
        barangay: address.barangay,
        cityMunicipality: address.cityMunicipality,
        province: address.province,
        landmark: address.landmark || "",
        latitude: address.latitude || "",
        longitude: address.longitude || "",
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
                <MapPin className="h-4 w-4 text-primary" />
                Pin Your Location on Map *
              </Label>
              <p className="text-sm text-muted-foreground">
                <strong>Required:</strong> Click anywhere on the map or drag the pin to your exact location for accurate delivery fees.
              </p>
              
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleUseCurrentLocation}
                  disabled={isSearchingAddress}
                  data-testid="button-use-current-location"
                >
                  <Navigation className="h-4 w-4 mr-2" />
                  {isSearchingAddress ? "Getting Location..." : "Use Current Location"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSearchAddressOnMap}
                  disabled={isSearchingAddress}
                  data-testid="button-search-address-map"
                >
                  <Search className="h-4 w-4 mr-2" />
                  {isSearchingAddress ? "Searching..." : "Search Address"}
                </Button>
              </div>
              
              {/* Leaflet Map Container */}
              <div 
                ref={mapContainerRef} 
                className="h-80 w-full rounded-lg border-2 border-border overflow-hidden"
                style={{ minHeight: '320px', position: 'relative', zIndex: 1 }}
                data-testid="map-container"
              />
              
              {/* Display current coordinates */}
              <div className="flex items-center gap-2 p-3 bg-muted rounded-md border">
                <MapPin className="h-4 w-4 text-primary" />
                <div className="flex-1 text-sm">
                  {form.watch("latitude") && form.watch("longitude") ? (
                    <>
                      <span className="font-medium">Pin Location: </span>
                      <span className="text-muted-foreground">
                        Lat: {form.watch("latitude")}, Lng: {form.watch("longitude")}
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground italic">
                      No location pinned yet. Click the map or use the buttons above to set your location.
                    </span>
                  )}
                </div>
              </div>
              
              {/* Validation error display */}
              {(form.formState.errors.latitude || form.formState.errors.longitude) && (
                <p className="text-sm text-destructive font-medium">
                  {form.formState.errors.latitude?.message || form.formState.errors.longitude?.message}
                </p>
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
