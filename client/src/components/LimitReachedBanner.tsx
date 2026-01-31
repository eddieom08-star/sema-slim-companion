import { AlertTriangle, X, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/contexts/SubscriptionContext";

interface LimitReachedBannerProps {
  type: 'ai_recipe' | 'barcode_scan' | 'export' | 'general';
  onDismiss: () => void;
  onUpgrade?: () => void;
}

const bannerMessages: Record<string, { title: string; description: string }> = {
  ai_recipe: {
    title: "Recipe limit reached",
    description: "You've used all your free AI recipe generations this month.",
  },
  barcode_scan: {
    title: "Scan limit reached",
    description: "You've reached your daily barcode scan limit.",
  },
  export: {
    title: "Export limit reached",
    description: "You've used all your PDF exports this month.",
  },
  general: {
    title: "Feature limit reached",
    description: "Upgrade to Pro to continue using this feature.",
  },
};

export function LimitReachedBanner({ type, onDismiss, onUpgrade }: LimitReachedBannerProps) {
  const { openCheckout, purchaseTokens, isLoading } = useSubscription();
  const { title, description } = bannerMessages[type] || bannerMessages.general;

  const handleUpgrade = async () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      try {
        await openCheckout('monthly');
      } catch (error) {
        console.error('Failed to open checkout:', error);
      }
    }
  };

  const handleBuyTokens = async () => {
    try {
      if (type === 'ai_recipe') {
        await purchaseTokens('ai_tokens_5');
      } else if (type === 'export') {
        await purchaseTokens('export_single');
      }
    } catch (error) {
      console.error('Failed to purchase tokens:', error);
    }
  };

  const showTokenOption = ['ai_recipe', 'export'].includes(type);

  return (
    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
            {title}
          </h3>
          <p className="text-sm text-amber-700 dark:text-amber-300 mt-0.5">
            {description}
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <Button
              size="sm"
              onClick={handleUpgrade}
              disabled={isLoading}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white h-8 text-xs"
            >
              <Sparkles className="h-3 w-3 mr-1.5" />
              Upgrade to Pro
            </Button>
            {showTokenOption && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleBuyTokens}
                disabled={isLoading}
                className="border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 h-8 text-xs"
              >
                <Zap className="h-3 w-3 mr-1.5" />
                {type === 'ai_recipe' ? 'Buy 5 Tokens' : 'Buy 1 Export'}
              </Button>
            )}
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="flex-shrink-0 text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
