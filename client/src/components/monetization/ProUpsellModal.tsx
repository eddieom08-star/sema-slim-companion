import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Sparkles, Zap, Crown, Check } from 'lucide-react';

interface ProUpsellModalProps {
  isOpen: boolean;
  onClose: () => void;
  trigger?: {
    type: 'ai_limit' | 'barcode_limit' | 'history_limit' | 'streak_risk' | 'export' | 'general';
    context?: {
      used?: number;
      limit?: number;
      streakLength?: number;
    };
  };
}

const triggerMessages: Record<string, { title: string; description: string }> = {
  ai_limit: {
    title: "You've used your free AI meal plans",
    description: "Upgrade to Pro for 30 AI meal plans per month, or buy tokens for instant access.",
  },
  barcode_limit: {
    title: "Daily barcode scan limit reached",
    description: "Pro members get unlimited barcode scanning. Never manually enter food again!",
  },
  history_limit: {
    title: "Unlock your complete journey",
    description: "Free accounts only show 2 weeks of history. Pro gives you access to your full progress.",
  },
  streak_risk: {
    title: "Protect your streak!",
    description: "Life happens. Pro members get 2 streak shields per month to protect hard-earned progress.",
  },
  export: {
    title: "Share your progress with your doctor",
    description: "Generate professional PDF reports for your healthcare provider with detailed insights.",
  },
  general: {
    title: "Upgrade to SemaSlim Pro",
    description: "Get the most out of your GLP-1 journey with premium features.",
  },
};

const proFeatures = [
  "Unlimited barcode scanning",
  "30 AI meal plans per month",
  "Unlimited history & trends",
  "Advanced analytics & predictions",
  "5 PDF exports per month",
  "2 streak shields per month",
  "Priority support",
];

export function ProUpsellModal({ isOpen, onClose, trigger }: ProUpsellModalProps) {
  const { openCheckout, purchaseTokens, isLoading } = useSubscription();

  const triggerType = trigger?.type || 'general';
  const { title, description } = triggerMessages[triggerType];

  const handleMonthlyUpgrade = async () => {
    try {
      await openCheckout('monthly');
    } catch (error) {
      console.error('Failed to open checkout:', error);
    }
  };

  const handleAnnualUpgrade = async () => {
    try {
      await openCheckout('annual');
    } catch (error) {
      console.error('Failed to open checkout:', error);
    }
  };

  const handleBuyTokens = async () => {
    try {
      if (triggerType === 'ai_limit') {
        await purchaseTokens('ai_tokens_5');
      } else if (triggerType === 'export') {
        await purchaseTokens('export_single');
      }
    } catch (error) {
      console.error('Failed to purchase tokens:', error);
    }
  };

  const showTokenOption = ['ai_limit', 'export'].includes(triggerType);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            <Badge variant="secondary" className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
              Pro
            </Badge>
          </div>
          <DialogTitle className="text-xl">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Pro Features List */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Pro includes:</p>
            <ul className="space-y-1.5">
              {proFeatures.slice(0, 5).map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Pricing Options */}
          <div className="space-y-2">
            <Button
              onClick={handleAnnualUpgrade}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Go Pro Annual - $79.99/year
              <Badge variant="outline" className="ml-2 text-xs">
                Save 33%
              </Badge>
            </Button>

            <Button
              onClick={handleMonthlyUpgrade}
              disabled={isLoading}
              variant="outline"
              className="w-full"
            >
              Go Pro Monthly - $9.99/month
            </Button>

            {showTokenOption && (
              <>
                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">or</span>
                  </div>
                </div>

                <Button
                  onClick={handleBuyTokens}
                  disabled={isLoading}
                  variant="secondary"
                  className="w-full"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  {triggerType === 'ai_limit' ? 'Buy 5 AI Tokens - $4.99' : 'Buy 1 Export - $1.99'}
                </Button>
              </>
            )}
          </div>

          <p className="text-xs text-center text-muted-foreground">
            7-day free trial included. Cancel anytime.
          </p>
        </div>

        <Button variant="ghost" onClick={onClose} className="w-full">
          Maybe Later
        </Button>
      </DialogContent>
    </Dialog>
  );
}
