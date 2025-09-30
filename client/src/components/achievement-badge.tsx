import { format, parseISO } from "date-fns";

interface AchievementBadgeProps {
  achievement: any;
}

export function AchievementBadge({ achievement }: AchievementBadgeProps) {
  const getAchievementIcon = (type: string) => {
    switch (type) {
      case 'streak':
        return 'fas fa-fire';
      case 'weight_loss':
        return 'fas fa-trophy';
      case 'consistency':
        return 'fas fa-calendar-check';
      case 'milestone':
        return 'fas fa-star';
      default:
        return 'fas fa-medal';
    }
  };

  const getAchievementColor = (type: string) => {
    switch (type) {
      case 'streak':
        return 'text-accent';
      case 'weight_loss':
        return 'text-secondary';
      case 'consistency':
        return 'text-primary';
      case 'milestone':
        return 'text-yellow-500';
      default:
        return 'text-muted-foreground';
    }
  };

  const getBadgeBackground = (type: string) => {
    switch (type) {
      case 'streak':
        return 'bg-accent/10';
      case 'weight_loss':
        return 'bg-secondary/10';
      case 'consistency':
        return 'bg-primary/10';
      case 'milestone':
        return 'bg-yellow-500/10';
      default:
        return 'bg-muted';
    }
  };

  return (
    <div 
      className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
      data-testid={`achievement-badge-${achievement.id}`}
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getBadgeBackground(achievement.type || 'default')}`}>
        <i className={`${getAchievementIcon(achievement.type || 'default')} ${getAchievementColor(achievement.type || 'default')}`}></i>
      </div>
      
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-foreground truncate">
          {achievement.name || 'Achievement Unlocked'}
        </h4>
        <p className="text-sm text-muted-foreground truncate">
          {achievement.description || 'Great job on your progress!'}
        </p>
        <p className="text-xs text-muted-foreground">
          Earned {format(parseISO(achievement.earnedAt), 'MMM d, yyyy')}
        </p>
      </div>

      {achievement.points && (
        <div className="text-right">
          <div className="text-sm font-bold text-primary">
            +{achievement.points}
          </div>
          <div className="text-xs text-muted-foreground">points</div>
        </div>
      )}
    </div>
  );
}
