import { useState, useEffect } from "react";
import { Smartphone, Share, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    const isInStandaloneMode = () => {
      return (window.matchMedia('(display-mode: standalone)').matches) ||
             (window.navigator as any).standalone ||
             document.referrer.includes('android-app://');
    };

    setIsStandalone(isInStandaloneMode());

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // For iOS, show install button if not already installed
    if (isIOSDevice && !isInStandaloneMode()) {
      setShowInstallButton(true);
    }

    // Listen for beforeinstallprompt event (Android/Desktop)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallButton(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Hide install button after successful install
    window.addEventListener('appinstalled', () => {
      setShowInstallButton(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      // Show instructions for iOS users
      setShowInstructions(true);
    } else if (deferredPrompt) {
      // Trigger Android install prompt
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      }
      
      setDeferredPrompt(null);
      setShowInstallButton(false);
    } else {
      // Fallback: show instructions
      setShowInstructions(true);
    }
  };

  // Don't show if already installed
  if (isStandalone || !showInstallButton) {
    return null;
  }

  return (
    <>
      {/* Install Button */}
      <Card className="p-4 mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-foreground">Install EasyBuy App</h4>
              <p className="text-xs text-muted-foreground">Add to home screen for quick access</p>
            </div>
          </div>
          <Button
            onClick={handleInstallClick}
            size="sm"
            className="flex-shrink-0"
            data-testid="button-install-app"
          >
            <Download className="w-4 h-4 mr-2" />
            Install
          </Button>
        </div>
      </Card>

      {/* Instructions Modal */}
      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="sm:max-w-md" data-testid="modal-install-instructions">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-primary" />
              Add to Home Screen
            </DialogTitle>
            <DialogDescription>
              Follow these steps to install EasyBuy on your device
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {isIOS ? (
              // iOS Instructions
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-sm font-bold text-primary">1</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Tap the Share button</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Share className="w-4 h-4" />
                      Look for the square with an arrow pointing up
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-sm font-bold text-primary">2</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Scroll and tap "Add to Home Screen"</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      You may need to scroll down to find this option
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-sm font-bold text-primary">3</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Tap "Add" to confirm</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      The app icon will appear on your home screen
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              // Android Instructions
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-sm font-bold text-primary">1</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Tap the menu button</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Look for the three dots (⋮) in your browser
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-sm font-bold text-primary">2</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Select "Add to Home Screen" or "Install"</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      The option may vary depending on your browser
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-sm font-bold text-primary">3</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Tap "Install" or "Add"</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      The app will be added to your home screen
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-800 dark:text-blue-200">
                <strong>Benefits:</strong> Quick access from home screen, works like a native app, and faster performance!
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => setShowInstructions(false)}
              variant="default"
              data-testid="button-close-instructions"
            >
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
