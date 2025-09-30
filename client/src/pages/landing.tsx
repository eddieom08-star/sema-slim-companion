import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/dev-login";
  };

  const handleSignup = () => {
    window.location.href = "/dev-login";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <i className="fas fa-heartbeat text-primary-foreground text-xl"></i>
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">SemaSlim</h1>
                <p className="text-xs text-muted-foreground">GLP-1 Weight Management</p>
              </div>
            </div>
            
            <Button onClick={handleLogin} data-testid="button-login">
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="gradient-bg text-primary-foreground py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h2 className="text-4xl lg:text-6xl font-bold leading-tight text-black">
                  Optimize Your<br />
                  <span className="text-black">GLP-1 Journey</span>
                </h2>
                <p className="text-xl text-black leading-relaxed">
                  The only weight management app designed specifically for semaglutide users. Track nutrition, manage medications, and achieve sustainable results.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  onClick={handleSignup}
                  className="bg-card text-primary px-8 py-4 rounded-lg font-semibold hover:bg-card/90 transition-colors"
                  data-testid="button-start-trial"
                >
                  Start Free Trial
                </Button>
                <Button 
                  variant="outline"
                  className="border-2 border-primary-foreground text-primary-foreground px-8 py-4 rounded-lg font-semibold hover:bg-primary-foreground hover:text-primary transition-colors"
                  data-testid="button-view-demo"
                >
                  View Demo
                </Button>
              </div>
              
              <div className="flex items-center space-x-8 pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-black" data-testid="text-users-count">500K+</div>
                  <div className="text-sm text-black">Active Users</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-black" data-testid="text-app-rating">4.9★</div>
                  <div className="text-sm text-black">App Rating</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-black" data-testid="text-avg-loss">18 lbs</div>
                  <div className="text-sm text-black">Avg. Loss</div>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="mx-auto w-80 h-160 bg-gray-900 rounded-3xl p-2 shadow-2xl">
                <div className="w-full h-full bg-card rounded-2xl overflow-hidden">
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-foreground">Today's Overview</h3>
                      <div className="w-6 h-6 bg-secondary rounded-full"></div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-muted rounded-lg p-3">
                        <div className="text-xs text-muted-foreground">Calories</div>
                        <div className="text-lg font-bold text-foreground">1,247</div>
                        <div className="text-xs text-secondary">-453 remaining</div>
                      </div>
                      <div className="bg-muted rounded-lg p-3">
                        <div className="text-xs text-muted-foreground">Weight</div>
                        <div className="text-lg font-bold text-foreground">162.4 lbs</div>
                        <div className="text-xs text-secondary">-2.1 this week</div>
                      </div>
                    </div>
                    
                    <div className="bg-accent/10 rounded-lg p-4">
                      <div className="flex items-center space-x-2">
                        <i className="fas fa-syringe text-accent"></i>
                        <span className="text-sm font-medium">Medication Reminder</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Ozempic injection due in 2 hours</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Medication Plans */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground">Plans for Every GLP-1 User</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Specialized tracking and support for your specific semaglutide medication
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: "fas fa-syringe",
                name: "Ozempic",
                description: "Weekly injection tracking with dosage escalation schedule",
                features: ["Weekly reminders", "Side effect tracking", "Dose progression"]
              },
              {
                icon: "fas fa-pills",
                name: "Mounjaro",
                description: "Dual-action GIP/GLP-1 medication management",
                features: ["Injection tracking", "Enhanced metabolism", "Appetite monitoring"]
              },
              {
                icon: "fas fa-weight",
                name: "Wegovy",
                description: "Higher-dose semaglutide for weight management",
                features: ["Weight-focused tracking", "Progress monitoring", "Lifestyle coaching"]
              },
              {
                icon: "fas fa-tablet-alt",
                name: "Rybelsus",
                description: "Oral semaglutide with daily tracking",
                features: ["Daily pill reminders", "Timing optimization", "Food interactions"]
              }
            ].map((plan, index) => (
              <Card key={index} className="card-hover" data-testid={`card-medication-${plan.name.toLowerCase()}`}>
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                    <i className={`${plan.icon} text-accent text-xl`}></i>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                  <ul className="space-y-2 text-xs text-muted-foreground">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center">
                        <i className="fas fa-check text-secondary w-4 mr-2"></i>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-3xl lg:text-5xl font-bold">Ready to Optimize Your GLP-1 Journey?</h2>
              <p className="text-xl text-primary-foreground/90 leading-relaxed">
                Join 500,000+ users who've transformed their weight loss journey with SemaSlim. 
                Start your free trial today and see the difference specialized GLP-1 support makes.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                onClick={handleSignup}
                className="bg-card text-primary px-8 py-4 rounded-lg font-semibold hover:bg-card/90 transition-colors min-w-48"
                data-testid="button-start-trial-cta"
              >
                Start Free 14-Day Trial
              </Button>
              <Button 
                variant="outline"
                className="border-2 border-primary-foreground text-primary-foreground px-8 py-4 rounded-lg font-semibold hover:bg-primary-foreground hover:text-primary transition-colors min-w-48"
                data-testid="button-watch-demo"
              >
                Watch Demo Video
              </Button>
            </div>
            
            <div className="flex items-center justify-center space-x-8 pt-4 text-sm text-primary-foreground/80">
              <div className="flex items-center space-x-2">
                <i className="fas fa-shield-alt"></i>
                <span>HIPAA Compliant</span>
              </div>
              <div className="flex items-center space-x-2">
                <i className="fas fa-mobile-alt"></i>
                <span>iOS & Android</span>
              </div>
              <div className="flex items-center space-x-2">
                <i className="fas fa-credit-card"></i>
                <span>No Credit Card Required</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <i className="fas fa-heartbeat text-primary-foreground"></i>
              </div>
              <div>
                <h3 className="font-bold text-foreground">SemaSlim</h3>
                <p className="text-xs text-muted-foreground">GLP-1 Weight Management</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              The comprehensive weight management platform designed specifically for semaglutide medication users.
            </p>
            <p className="text-xs text-muted-foreground">
              © 2024 SemaSlim. All rights reserved. FDA Disclaimer: This app is not intended to diagnose, treat, cure, or prevent any disease.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
