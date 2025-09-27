import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Star, Search, Filter, Navigation } from "lucide-react";

interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  image: string;
  deliveryFee: number;
  address: string;
}

export default function CustomerPortal() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("distance");
  const [selectedCategory, setSelectedCategory] = useState("");

  const { data: restaurants = [], isLoading } = useQuery({
    queryKey: ["/api/restaurants"],
  });

  const categories = [
    { id: "burgers", name: "Burgers", image: "🍔" },
    { id: "pizza", name: "Pizza", image: "🍕" },
    { id: "asian", name: "Asian", image: "🍜" },
    { id: "mexican", name: "Mexican", image: "🌮" },
    { id: "healthy", name: "Healthy", image: "🥗" },
    { id: "desserts", name: "Desserts", image: "🍰" },
  ];

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log("Current location:", position.coords);
          // Handle location update
        },
        (error) => {
          console.error("Location error:", error);
        }
      );
    }
  };

  const filteredRestaurants = restaurants.filter((restaurant: Restaurant) => {
    const matchesSearch = restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         restaurant.cuisine.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || restaurant.cuisine.toLowerCase().includes(selectedCategory);
    return matchesSearch && matchesCategory;
  });

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary to-secondary text-primary-foreground py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Delicious Food, Delivered Fast</h2>
            <p className="text-lg opacity-90 mb-8">Order from your favorite restaurants in your area</p>
            
            {/* Location Input */}
            <div className="max-w-md mx-auto bg-card rounded-xl p-4 shadow-lg">
              <div className="flex items-center space-x-3">
                <MapPin className="text-primary" />
                <Input
                  type="text"
                  placeholder="Enter delivery address"
                  className="flex-1 border-none bg-transparent text-foreground placeholder-muted-foreground"
                  data-testid="input-delivery-address"
                />
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleUseCurrentLocation}
                  data-testid="button-use-location"
                >
                  <Navigation className="mr-2 h-4 w-4" />
                  Use Current Location
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-8 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-2xl font-bold text-foreground mb-6">Browse by Category</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {categories.map((category) => (
              <Card
                key={category.id}
                className={`cursor-pointer transition-transform hover:scale-105 ${
                  selectedCategory === category.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedCategory(selectedCategory === category.id ? "" : category.id)}
                data-testid={`category-${category.id}`}
              >
                <CardContent className="p-4 text-center">
                  <div className="text-4xl mb-2">{category.image}</div>
                  <p className="font-medium text-foreground">{category.name}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Filters and Search */}
      <section className="py-6 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48" data-testid="select-sort">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="distance">Sort by Distance</SelectItem>
                  <SelectItem value="nearest">Nearest First</SelectItem>
                  <SelectItem value="farthest">Farthest First</SelectItem>
                  <SelectItem value="rating">Highest Rated</SelectItem>
                  <SelectItem value="delivery-fee">Lowest Delivery Fee</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" size="sm" data-testid="button-filters">
                <Filter className="mr-2 h-4 w-4" />
                Filters
              </Button>
            </div>
            
            <div className="w-full sm:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search restaurants..."
                  className="w-full sm:w-80 pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-search-restaurants"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Restaurant Listings */}
      <section className="py-8 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <div className="w-full h-48 bg-muted"></div>
                  <CardContent className="p-4">
                    <div className="h-4 bg-muted rounded mb-2"></div>
                    <div className="h-3 bg-muted rounded mb-3 w-3/4"></div>
                    <div className="flex justify-between">
                      <div className="h-3 bg-muted rounded w-16"></div>
                      <div className="h-3 bg-muted rounded w-16"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredRestaurants.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground">No restaurants found matching your criteria.</p>
              <Button 
                variant="outline" 
                className="mt-4" 
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("");
                }}
                data-testid="button-clear-filters"
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredRestaurants.map((restaurant: Restaurant) => (
                <Card 
                  key={restaurant.id} 
                  className="cursor-pointer transition-transform hover:scale-105 hover:shadow-lg"
                  data-testid={`restaurant-${restaurant.id}`}
                >
                  <div className="w-full h-48 bg-muted rounded-t-lg overflow-hidden">
                    {restaurant.image && (
                      <img 
                        src={restaurant.image} 
                        alt={restaurant.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-lg font-semibold text-foreground">{restaurant.name}</h4>
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm text-muted-foreground">{restaurant.rating}</span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{restaurant.cuisine}</p>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center text-muted-foreground">
                        <Clock className="mr-1 h-4 w-4" />
                        <span>25-35 min</span>
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <span>₱{restaurant.deliveryFee} delivery</span>
                      </div>
                      <Badge variant="secondary">
                        1.2 km
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
