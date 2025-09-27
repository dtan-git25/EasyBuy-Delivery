import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Bike, Store, Users, Settings } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  role: z.enum(['customer', 'rider', 'merchant']),
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [activeTab, setActiveTab] = useState("login");

  // Redirect if already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      phone: "",
      role: "customer",
    },
  });

  const onLogin = (data: LoginForm) => {
    loginMutation.mutate(data);
  };

  const onRegister = (data: RegisterForm) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8 items-center min-h-screen">
          {/* Hero Section */}
          <div className="text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start mb-6">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mr-4">
                <Bike className="text-primary-foreground text-2xl" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Easy Buy Delivery</h1>
                <p className="text-muted-foreground">Pabilir Padala Delivery Services</p>
              </div>
            </div>
            
            <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-foreground">
              Delicious Food, <span className="text-primary">Delivered Fast</span>
            </h2>
            
            <p className="text-xl text-muted-foreground mb-8">
              Join our comprehensive food delivery platform with multiple user portals for customers, riders, merchants, and administrators.
            </p>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
              <div className="text-center p-4 bg-card rounded-lg border">
                <Settings className="mx-auto mb-2 text-primary" size={32} />
                <p className="text-sm font-medium">Admins</p>
              </div>
            </div>

            <div className="text-left space-y-3">
              <div className="flex items-center text-muted-foreground">
                <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                Real-time order tracking and chat system
              </div>
              <div className="flex items-center text-muted-foreground">
                <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                GPS location services for accurate delivery
              </div>
              <div className="flex items-center text-muted-foreground">
                <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                Wallet system with secure transactions
              </div>
              <div className="flex items-center text-muted-foreground">
                <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                Comprehensive admin dashboard and analytics
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
                    </form>
                  </TabsContent>

                  <TabsContent value="register">
                    <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="register-firstName">First Name</Label>
                          <Input
                            id="register-firstName"
                            data-testid="input-register-firstName"
                            {...registerForm.register("firstName")}
                            type="text"
                            placeholder="First name"
                          />
                          {registerForm.formState.errors.firstName && (
                            <p className="text-sm text-destructive mt-1">
                              {registerForm.formState.errors.firstName.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="register-lastName">Last Name</Label>
                          <Input
                            id="register-lastName"
                            data-testid="input-register-lastName"
                            {...registerForm.register("lastName")}
                            type="text"
                            placeholder="Last name"
                          />
                          {registerForm.formState.errors.lastName && (
                            <p className="text-sm text-destructive mt-1">
                              {registerForm.formState.errors.lastName.message}
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="register-username">Username</Label>
                        <Input
                          id="register-username"
                          data-testid="input-register-username"
                          {...registerForm.register("username")}
                          type="text"
                          placeholder="Choose a username"
                        />
                        {registerForm.formState.errors.username && (
                          <p className="text-sm text-destructive mt-1">
                            {registerForm.formState.errors.username.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="register-email">Email</Label>
                        <Input
                          id="register-email"
                          data-testid="input-register-email"
                          {...registerForm.register("email")}
                          type="email"
                          placeholder="Enter your email"
                        />
                        {registerForm.formState.errors.email && (
                          <p className="text-sm text-destructive mt-1">
                            {registerForm.formState.errors.email.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="register-phone">Phone (Optional)</Label>
                        <Input
                          id="register-phone"
                          data-testid="input-register-phone"
                          {...registerForm.register("phone")}
                          type="tel"
                          placeholder="Enter your phone number"
                        />
                      </div>

                      <div>
                        <Label htmlFor="register-password">Password</Label>
                        <Input
                          id="register-password"
                          data-testid="input-register-password"
                          {...registerForm.register("password")}
                          type="password"
                          placeholder="Create a password"
                        />
                        {registerForm.formState.errors.password && (
                          <p className="text-sm text-destructive mt-1">
                            {registerForm.formState.errors.password.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="register-role">Role</Label>
                        <Select
                          value={registerForm.watch("role")}
                          onValueChange={(value) => registerForm.setValue("role", value as any)}
                        >
                          <SelectTrigger data-testid="select-register-role">
                            <SelectValue placeholder="Select your role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="customer">Customer</SelectItem>
                            <SelectItem value="rider">Rider</SelectItem>
                            <SelectItem value="merchant">Merchant</SelectItem>
                          </SelectContent>
                        </Select>
                        {registerForm.formState.errors.role && (
                          <p className="text-sm text-destructive mt-1">
                            {registerForm.formState.errors.role.message}
                          </p>
                        )}
                      </div>

                      <Button
                        type="submit"
                        data-testid="button-register"
                        className="w-full"
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending ? "Creating Account..." : "Create Account"}
                      </Button>
                    </form>
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
