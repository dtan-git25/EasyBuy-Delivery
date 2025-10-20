import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Bike, Store, Users, Settings, Upload, Camera } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { 
  customerRegistrationSchema, 
  riderRegistrationSchema, 
  merchantRegistrationSchema,
  type CustomerRegistration,
  type RiderRegistration,
  type MerchantRegistration
} from "@shared/schema";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function AuthPage() {
  const { user, loginMutation, registerMutation, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("login");
  const [registerRole, setRegisterRole] = useState<"customer" | "rider" | "merchant">("customer");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState("");

  // Fetch system settings for app logo
  const { data: settings } = useQuery({
    queryKey: ['/api/settings'],
  });

  // Redirect to dashboard when user is authenticated
  useEffect(() => {
    if (user && !isLoading) {
      setLocation("/");
    }
  }, [user, isLoading, setLocation]);

  // Initialize login form
  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const forgotPasswordForm = useForm<{ email: string }>({
    resolver: zodResolver(z.object({
      email: z.string().email("Invalid email address")
    })),
    defaultValues: {
      email: "",
    },
  });

  // Initialize role-specific registration forms
  const customerForm = useForm<CustomerRegistration>({
    resolver: zodResolver(customerRegistrationSchema),
    defaultValues: {
      firstName: "",
      middleName: "",
      lastName: "",
      age: 18,
      gender: "Prefer not to say",
      email: "",
      phone: "",
      username: "",
      password: "",
    },
  });

  const riderForm = useForm<RiderRegistration>({
    resolver: zodResolver(riderRegistrationSchema),
    defaultValues: {
      prefix: "",
      firstName: "",
      middleName: "",
      lastName: "",
      lotHouseNo: "",
      street: "",
      barangay: "",
      cityMunicipality: "",
      province: "",
      email: "",
      phone: "",
      driversLicenseNo: "",
      licenseValidityDate: "",
      username: "",
      password: "",
    },
  });

  const merchantForm = useForm<MerchantRegistration>({
    resolver: zodResolver(merchantRegistrationSchema),
    defaultValues: {
      firstName: "",
      middleName: "",
      lastName: "",
      storeName: "",
      storeAddress: "",
      storeContactNo: "",
      email: "",
      username: "",
      password: "",
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: { email: string }) => {
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to send reset email");
      }
      return result;
    },
    onSuccess: (data) => {
      setForgotPasswordMessage(data.message);
      forgotPasswordForm.reset();
    },
    onError: (error: Error) => {
      setForgotPasswordMessage(error.message);
    },
  });

  // Show loading state during auth transitions or while redirecting
  if (isLoading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <Bike className="text-primary-foreground text-2xl animate-pulse" />
          </div>
          <p className="text-muted-foreground">{user ? "Redirecting to dashboard..." : "Loading..."}</p>
        </div>
      </div>
    );
  }

  const onLogin = (data: LoginForm) => {
    loginMutation.mutate(data);
  };

  const onForgotPassword = (data: { email: string }) => {
    forgotPasswordMutation.mutate(data);
  };

  const onRegister = async (data: CustomerRegistration | RiderRegistration | MerchantRegistration) => {
    try {
      // Add role to registration data and handle date conversion
      const registrationData: any = {
        ...data,
        role: registerRole,
      };
      
      // Convert licenseValidityDate string to Date if it exists (for rider registration)
      if ('licenseValidityDate' in data && data.licenseValidityDate) {
        registrationData.licenseValidityDate = new Date(data.licenseValidityDate);
      }
      
      await registerMutation.mutateAsync(registrationData);
    } catch (error) {
      console.error("Registration failed:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8 items-center min-h-screen">
          {/* Hero Section */}
          <div className="text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start mb-6">
              {settings?.logo ? (
                <img
                  src={settings.logo}
                  alt="App Logo"
                  className="w-16 h-16 object-contain mr-4"
                />
              ) : (
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mr-4">
                  <Bike className="text-primary-foreground text-2xl" />
                </div>
              )}
              <div>
                <h1 className="text-3xl font-bold text-foreground">Easy Buy Delivery</h1>
                <p className="text-muted-foreground">Online Food Delivery Services</p>
              </div>
            </div>
            
            <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-foreground">
              Delicious Food, <span className="text-primary">Delivered Fast</span>
            </h2>
            
            <p className="text-xl text-muted-foreground mb-8">
              Join our comprehensive food delivery platform with multiple user portals for customers, riders and merchants.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
              <div className="text-center p-4 bg-card rounded-lg border">
                <Users className="mx-auto mb-2 text-primary" size={32} />
                <p className="text-sm font-medium">Customers</p>
              </div>
              <div className="text-center p-4 bg-card rounded-lg border">
                <Bike className="mx-auto mb-2 text-primary" size={32} />
                <p className="text-sm font-medium">Riders</p>
              </div>
              <div className="text-center p-4 bg-card rounded-lg border">
                <Store className="mx-auto mb-2 text-primary" size={32} />
                <p className="text-sm font-medium">Merchants</p>
              </div>
            </div>
          </div>

          {/* Auth Forms */}
          <div className="w-full max-w-md mx-auto">
            <Card>
              <CardHeader className="text-center">
                <CardTitle>Welcome Back</CardTitle>
                <CardDescription>Sign in to your account or create a new one</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="login" data-testid="tab-login">Login</TabsTrigger>
                    <TabsTrigger value="register" data-testid="tab-register">Register</TabsTrigger>
                  </TabsList>

                  <TabsContent value="login">
                    <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                      <div>
                        <Label htmlFor="login-username">Username</Label>
                        <Input
                          id="login-username"
                          data-testid="input-login-username"
                          {...loginForm.register("username")}
                          type="text"
                          placeholder="Enter your username"
                        />
                        {loginForm.formState.errors.username && (
                          <p className="text-sm text-destructive mt-1">
                            {loginForm.formState.errors.username.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="login-password">Password</Label>
                        <Input
                          id="login-password"
                          data-testid="input-login-password"
                          {...loginForm.register("password")}
                          type="password"
                          placeholder="Enter your password"
                        />
                        {loginForm.formState.errors.password && (
                          <p className="text-sm text-destructive mt-1">
                            {loginForm.formState.errors.password.message}
                          </p>
                        )}
                      </div>

                      <Button
                        type="submit"
                        data-testid="button-login"
                        className="w-full"
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? "Signing in..." : "Sign In"}
                      </Button>

                      <div className="text-center">
                        <Button
                          type="button"
                          variant="link"
                          className="text-sm"
                          data-testid="link-forgot-password"
                          onClick={() => setShowForgotPassword(true)}
                        >
                          Forgot your password?
                        </Button>
                      </div>
                    </form>

                    {/* Forgot Password Modal/Form */}
                    {showForgotPassword && (
                      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <Card className="w-full max-w-md mx-4">
                          <CardHeader>
                            <CardTitle>Reset Password</CardTitle>
                            <CardDescription>
                              Enter your email address and we'll send you a link to reset your password.
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <form onSubmit={forgotPasswordForm.handleSubmit(onForgotPassword)} className="space-y-4">
                              <div>
                                <Label htmlFor="forgot-email">Email Address</Label>
                                <Input
                                  id="forgot-email"
                                  data-testid="input-forgot-email"
                                  {...forgotPasswordForm.register("email")}
                                  type="email"
                                  placeholder="Enter your email"
                                />
                                {forgotPasswordForm.formState.errors.email && (
                                  <p className="text-sm text-destructive mt-1">
                                    {forgotPasswordForm.formState.errors.email.message}
                                  </p>
                                )}
                              </div>

                              {forgotPasswordMessage && (
                                <div className="text-sm p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                                  {forgotPasswordMessage}
                                </div>
                              )}

                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="w-full"
                                  data-testid="button-cancel-forgot-password"
                                  onClick={() => {
                                    setShowForgotPassword(false);
                                    setForgotPasswordMessage("");
                                    forgotPasswordForm.reset();
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  type="submit"
                                  className="w-full"
                                  data-testid="button-send-reset-email"
                                  disabled={forgotPasswordMutation.isPending}
                                >
                                  {forgotPasswordMutation.isPending ? "Sending..." : "Send Reset Link"}
                                </Button>
                              </div>
                            </form>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="register">
                    <div className="space-y-4">
                      {/* Role Selection */}
                      <div>
                        <Label htmlFor="role-selection">Select Account Type</Label>
                        <Select
                          value={registerRole}
                          onValueChange={(value) => setRegisterRole(value as any)}
                        >
                          <SelectTrigger data-testid="select-register-role">
                            <SelectValue placeholder="Choose account type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="customer">Customer - Order food delivery</SelectItem>
                            <SelectItem value="rider">Rider - Deliver orders and earn income</SelectItem>
                            <SelectItem value="merchant">Merchant - Sell food through our platform</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Customer Registration Form */}
                      {registerRole === 'customer' && (
                        <form onSubmit={customerForm.handleSubmit(onRegister)} className="space-y-4">
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <Label htmlFor="customer-firstName">First Name *</Label>
                              <Input
                                id="customer-firstName"
                                data-testid="input-customer-firstName"
                                {...customerForm.register("firstName")}
                                placeholder="Juan"
                              />
                              {customerForm.formState.errors.firstName && (
                                <p className="text-sm text-destructive mt-1">
                                  {customerForm.formState.errors.firstName.message}
                                </p>
                              )}
                            </div>
                            <div>
                              <Label htmlFor="customer-middleName">Middle Name</Label>
                              <Input
                                id="customer-middleName"
                                data-testid="input-customer-middleName"
                                {...customerForm.register("middleName")}
                                placeholder="Santos"
                              />
                            </div>
                            <div>
                              <Label htmlFor="customer-lastName">Last Name *</Label>
                              <Input
                                id="customer-lastName"
                                data-testid="input-customer-lastName"
                                {...customerForm.register("lastName")}
                                placeholder="Dela Cruz"
                              />
                              {customerForm.formState.errors.lastName && (
                                <p className="text-sm text-destructive mt-1">
                                  {customerForm.formState.errors.lastName.message}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="customer-age">Age *</Label>
                              <Input
                                id="customer-age"
                                data-testid="input-customer-age"
                                {...customerForm.register("age", { valueAsNumber: true })}
                                type="number"
                                placeholder="18"
                              />
                              {customerForm.formState.errors.age && (
                                <p className="text-sm text-destructive mt-1">
                                  {customerForm.formState.errors.age.message}
                                </p>
                              )}
                            </div>
                            <div>
                              <Label htmlFor="customer-gender">Gender</Label>
                              <Select
                                value={customerForm.watch("gender")}
                                onValueChange={(value) => customerForm.setValue("gender", value as any)}
                              >
                                <SelectTrigger data-testid="select-customer-gender">
                                  <SelectValue placeholder="Select gender" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Male">Male</SelectItem>
                                  <SelectItem value="Female">Female</SelectItem>
                                  <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="customer-email">Email Address *</Label>
                              <Input
                                id="customer-email"
                                data-testid="input-customer-email"
                                {...customerForm.register("email")}
                                type="email"
                                placeholder="juan@email.com"
                              />
                              {customerForm.formState.errors.email && (
                                <p className="text-sm text-destructive mt-1">
                                  {customerForm.formState.errors.email.message}
                                </p>
                              )}
                            </div>
                            <div>
                              <Label htmlFor="customer-phone">Phone Number *</Label>
                              <Input
                                id="customer-phone"
                                data-testid="input-customer-phone"
                                {...customerForm.register("phone")}
                                type="tel"
                                placeholder="09171234567"
                              />
                              {customerForm.formState.errors.phone && (
                                <p className="text-sm text-destructive mt-1">
                                  {customerForm.formState.errors.phone.message}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="customer-username">Username *</Label>
                              <Input
                                id="customer-username"
                                data-testid="input-customer-username"
                                {...customerForm.register("username")}
                                placeholder="juandelacruz"
                              />
                              {customerForm.formState.errors.username && (
                                <p className="text-sm text-destructive mt-1">
                                  {customerForm.formState.errors.username.message}
                                </p>
                              )}
                            </div>
                            <div>
                              <Label htmlFor="customer-password">Password *</Label>
                              <Input
                                id="customer-password"
                                data-testid="input-customer-password"
                                {...customerForm.register("password")}
                                type="password"
                                placeholder="Strong password"
                              />
                              {customerForm.formState.errors.password && (
                                <p className="text-sm text-destructive mt-1">
                                  {customerForm.formState.errors.password.message}
                                </p>
                              )}
                            </div>
                          </div>

                          <Button
                            type="submit"
                            data-testid="button-register-customer"
                            className="w-full"
                            disabled={registerMutation.isPending}
                          >
                            {registerMutation.isPending ? "Creating Account..." : "Create Customer Account"}
                          </Button>
                        </form>
                      )}

                      {/* Rider Registration Form */}
                      {registerRole === 'rider' && (
                        <form onSubmit={riderForm.handleSubmit(onRegister)} className="space-y-4">
                          <div className="grid grid-cols-4 gap-2">
                            <div>
                              <Label htmlFor="rider-prefix">Prefix</Label>
                              <Input
                                id="rider-prefix"
                                data-testid="input-rider-prefix"
                                {...riderForm.register("prefix")}
                                placeholder="Mr."
                              />
                            </div>
                            <div>
                              <Label htmlFor="rider-firstName">First Name *</Label>
                              <Input
                                id="rider-firstName"
                                data-testid="input-rider-firstName"
                                {...riderForm.register("firstName")}
                                placeholder="Juan"
                              />
                              {riderForm.formState.errors.firstName && (
                                <p className="text-sm text-destructive mt-1">
                                  {riderForm.formState.errors.firstName.message}
                                </p>
                              )}
                            </div>
                            <div>
                              <Label htmlFor="rider-middleName">Middle Name</Label>
                              <Input
                                id="rider-middleName"
                                data-testid="input-rider-middleName"
                                {...riderForm.register("middleName")}
                                placeholder="Santos"
                              />
                            </div>
                            <div>
                              <Label htmlFor="rider-lastName">Last Name *</Label>
                              <Input
                                id="rider-lastName"
                                data-testid="input-rider-lastName"
                                {...riderForm.register("lastName")}
                                placeholder="Dela Cruz"
                              />
                              {riderForm.formState.errors.lastName && (
                                <p className="text-sm text-destructive mt-1">
                                  {riderForm.formState.errors.lastName.message}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Philippine Address for Rider */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="rider-lotHouseNo">Lot/House No. *</Label>
                              <Input
                                id="rider-lotHouseNo"
                                data-testid="input-rider-lotHouseNo"
                                {...riderForm.register("lotHouseNo")}
                                placeholder="123"
                              />
                              {riderForm.formState.errors.lotHouseNo && (
                                <p className="text-sm text-destructive mt-1">
                                  {riderForm.formState.errors.lotHouseNo.message}
                                </p>
                              )}
                            </div>
                            <div>
                              <Label htmlFor="rider-street">Street *</Label>
                              <Input
                                id="rider-street"
                                data-testid="input-rider-street"
                                {...riderForm.register("street")}
                                placeholder="Rizal Street"
                              />
                              {riderForm.formState.errors.street && (
                                <p className="text-sm text-destructive mt-1">
                                  {riderForm.formState.errors.street.message}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <Label htmlFor="rider-barangay">Barangay *</Label>
                              <Input
                                id="rider-barangay"
                                data-testid="input-rider-barangay"
                                {...riderForm.register("barangay")}
                                placeholder="Poblacion"
                              />
                              {riderForm.formState.errors.barangay && (
                                <p className="text-sm text-destructive mt-1">
                                  {riderForm.formState.errors.barangay.message}
                                </p>
                              )}
                            </div>
                            <div>
                              <Label htmlFor="rider-cityMunicipality">City/Municipality *</Label>
                              <Input
                                id="rider-cityMunicipality"
                                data-testid="input-rider-cityMunicipality"
                                {...riderForm.register("cityMunicipality")}
                                placeholder="Makati City"
                              />
                              {riderForm.formState.errors.cityMunicipality && (
                                <p className="text-sm text-destructive mt-1">
                                  {riderForm.formState.errors.cityMunicipality.message}
                                </p>
                              )}
                            </div>
                            <div>
                              <Label htmlFor="rider-province">Province *</Label>
                              <Input
                                id="rider-province"
                                data-testid="input-rider-province"
                                {...riderForm.register("province")}
                                placeholder="Metro Manila"
                              />
                              {riderForm.formState.errors.province && (
                                <p className="text-sm text-destructive mt-1">
                                  {riderForm.formState.errors.province.message}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="rider-email">Email Address *</Label>
                              <Input
                                id="rider-email"
                                data-testid="input-rider-email"
                                {...riderForm.register("email")}
                                type="email"
                                placeholder="rider@email.com"
                              />
                              {riderForm.formState.errors.email && (
                                <p className="text-sm text-destructive mt-1">
                                  {riderForm.formState.errors.email.message}
                                </p>
                              )}
                            </div>
                            <div>
                              <Label htmlFor="rider-phone">Phone Number *</Label>
                              <Input
                                id="rider-phone"
                                data-testid="input-rider-phone"
                                {...riderForm.register("phone")}
                                type="tel"
                                placeholder="09171234567"
                              />
                              {riderForm.formState.errors.phone && (
                                <p className="text-sm text-destructive mt-1">
                                  {riderForm.formState.errors.phone.message}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="rider-driversLicenseNo">Driver's License No. *</Label>
                              <Input
                                id="rider-driversLicenseNo"
                                data-testid="input-rider-driversLicenseNo"
                                {...riderForm.register("driversLicenseNo")}
                                placeholder="N01-12-123456"
                              />
                              {riderForm.formState.errors.driversLicenseNo && (
                                <p className="text-sm text-destructive mt-1">
                                  {riderForm.formState.errors.driversLicenseNo.message}
                                </p>
                              )}
                            </div>
                            <div>
                              <Label htmlFor="rider-licenseValidityDate">License Validity Date *</Label>
                              <Input
                                id="rider-licenseValidityDate"
                                data-testid="input-rider-licenseValidityDate"
                                {...riderForm.register("licenseValidityDate")}
                                type="date"
                              />
                              {riderForm.formState.errors.licenseValidityDate && (
                                <p className="text-sm text-destructive mt-1">
                                  {riderForm.formState.errors.licenseValidityDate.message}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="rider-username">Username *</Label>
                              <Input
                                id="rider-username"
                                data-testid="input-rider-username"
                                {...riderForm.register("username")}
                                placeholder="rideruser"
                              />
                              {riderForm.formState.errors.username && (
                                <p className="text-sm text-destructive mt-1">
                                  {riderForm.formState.errors.username.message}
                                </p>
                              )}
                            </div>
                            <div>
                              <Label htmlFor="rider-password">Password *</Label>
                              <Input
                                id="rider-password"
                                data-testid="input-rider-password"
                                {...riderForm.register("password")}
                                type="password"
                                placeholder="Strong password"
                              />
                              {riderForm.formState.errors.password && (
                                <p className="text-sm text-destructive mt-1">
                                  {riderForm.formState.errors.password.message}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                            <p className="text-sm text-yellow-800 dark:text-yellow-200">
                              <strong>Note:</strong> After registration, you'll need to upload required documents (driver's license, vehicle registration, ID) for admin approval before you can start accepting deliveries.
                            </p>
                          </div>

                          <Button
                            type="submit"
                            data-testid="button-register-rider"
                            className="w-full"
                            disabled={registerMutation.isPending}
                          >
                            {registerMutation.isPending ? "Submitting Application..." : "Apply as Rider"}
                          </Button>
                        </form>
                      )}

                      {/* Merchant Registration Form */}
                      {registerRole === 'merchant' && (
                        <form onSubmit={merchantForm.handleSubmit(onRegister)} className="space-y-4">
                          {/* Owner Personal Information */}
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <Label htmlFor="merchant-firstName">First Name *</Label>
                              <Input
                                id="merchant-firstName"
                                data-testid="input-merchant-firstName"
                                {...merchantForm.register("firstName")}
                                placeholder="Juan"
                              />
                              {merchantForm.formState.errors.firstName && (
                                <p className="text-sm text-destructive mt-1">
                                  {merchantForm.formState.errors.firstName.message}
                                </p>
                              )}
                            </div>
                            <div>
                              <Label htmlFor="merchant-middleName">Middle Name</Label>
                              <Input
                                id="merchant-middleName"
                                data-testid="input-merchant-middleName"
                                {...merchantForm.register("middleName")}
                                placeholder="Santos"
                              />
                            </div>
                            <div>
                              <Label htmlFor="merchant-lastName">Last Name *</Label>
                              <Input
                                id="merchant-lastName"
                                data-testid="input-merchant-lastName"
                                {...merchantForm.register("lastName")}
                                placeholder="Dela Cruz"
                              />
                              {merchantForm.formState.errors.lastName && (
                                <p className="text-sm text-destructive mt-1">
                                  {merchantForm.formState.errors.lastName.message}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Store Information */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="merchant-storeName">Store Name *</Label>
                              <Input
                                id="merchant-storeName"
                                data-testid="input-merchant-storeName"
                                {...merchantForm.register("storeName")}
                                placeholder="Juan's Lechon"
                              />
                              {merchantForm.formState.errors.storeName && (
                                <p className="text-sm text-destructive mt-1">
                                  {merchantForm.formState.errors.storeName.message}
                                </p>
                              )}
                            </div>
                            <div>
                              <Label htmlFor="merchant-storeContactNo">Store Contact No. *</Label>
                              <Input
                                id="merchant-storeContactNo"
                                data-testid="input-merchant-storeContactNo"
                                {...merchantForm.register("storeContactNo")}
                                type="tel"
                                placeholder="02-8123-4567"
                              />
                              {merchantForm.formState.errors.storeContactNo && (
                                <p className="text-sm text-destructive mt-1">
                                  {merchantForm.formState.errors.storeContactNo.message}
                                </p>
                              )}
                            </div>
                          </div>

                          <div>
                            <Label htmlFor="merchant-storeAddress">Store Address *</Label>
                            <Input
                              id="merchant-storeAddress"
                              data-testid="input-merchant-storeAddress"
                              {...merchantForm.register("storeAddress")}
                              placeholder="123 Rizal Street, Poblacion, Makati City, Metro Manila"
                            />
                            {merchantForm.formState.errors.storeAddress && (
                              <p className="text-sm text-destructive mt-1">
                                {merchantForm.formState.errors.storeAddress.message}
                              </p>
                            )}
                          </div>

                          {/* Contact Information */}
                          <div>
                            <Label htmlFor="merchant-email">Email Address *</Label>
                            <Input
                              id="merchant-email"
                              data-testid="input-merchant-email"
                              {...merchantForm.register("email")}
                              type="email"
                              placeholder="owner@restaurant.com"
                            />
                            {merchantForm.formState.errors.email && (
                              <p className="text-sm text-destructive mt-1">
                                {merchantForm.formState.errors.email.message}
                              </p>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="merchant-username">Username *</Label>
                              <Input
                                id="merchant-username"
                                data-testid="input-merchant-username"
                                {...merchantForm.register("username")}
                                placeholder="juanslechon"
                              />
                              {merchantForm.formState.errors.username && (
                                <p className="text-sm text-destructive mt-1">
                                  {merchantForm.formState.errors.username.message}
                                </p>
                              )}
                            </div>
                            <div>
                              <Label htmlFor="merchant-password">Password *</Label>
                              <Input
                                id="merchant-password"
                                data-testid="input-merchant-password"
                                {...merchantForm.register("password")}
                                type="password"
                                placeholder="Strong password"
                              />
                              {merchantForm.formState.errors.password && (
                                <p className="text-sm text-destructive mt-1">
                                  {merchantForm.formState.errors.password.message}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                            <p className="text-sm text-blue-800 dark:text-blue-200">
                              <strong>Note:</strong> After registration, your merchant account will be reviewed by our admin team. You'll receive an email notification once approved to start adding your menu items.
                            </p>
                          </div>

                          <Button
                            type="submit"
                            data-testid="button-register-merchant"
                            className="w-full"
                            disabled={registerMutation.isPending}
                          >
                            {registerMutation.isPending ? "Submitting Application..." : "Apply as Merchant"}
                          </Button>
                        </form>
                      )}

                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
