import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNotifications } from "@/contexts/NotificationContext";
import { useToast } from "@/hooks/use-toast";
import { Settings, Bell, Mail, Smartphone, Clock, User } from "lucide-react";
import Header from "@/components/header";
import Footer from "@/components/footer";

export default function NotificationSettings() {
  const { preferences, updatePreferences, loading } = useNotifications();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("email");

  useEffect(() => {
    if (loading) return;
  }, [loading]);

  const handleSave = async () => {
    if (!preferences) return;
    
    try {
      await updatePreferences(preferences);
      toast({
        title: "Settings Saved",
        description: "Your notification preferences have been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save notification settings. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <Header />
      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Notification Settings</h1>
          <p className="text-gray-600 mb-8">
            Manage how you receive notifications and emails from CIMA Learn.
          </p>
        </div>

        <div className="grid gap-6">
          {/* Email Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="email">Email</TabsTrigger>
                  <TabsTrigger value="in-app">In-App</TabsTrigger>
                </TabsList>

                <TabsContent value="email" className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="email-academic">Academic Notifications</Label>
                      <Switch
                        id="email-academic"
                        checked={preferences?.email_academic || false}
                        onCheckedChange={(checked) => 
                          updatePreferences({ email_academic: checked })
                        }
                      />
                    </div>
                    <p className="text-sm text-gray-600">
                      Course updates, assignments, grades, and certificates
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="email-social">Social Notifications</Label>
                      <Switch
                        id="email-social"
                        checked={preferences?.email_social || false}
                        onCheckedChange={(checked) => 
                          updatePreferences({ email_social: checked })
                        }
                      />
                    </div>
                    <p className="text-sm text-gray-600">
                      Mentions, replies, community updates, and digests
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="email-administrative">Administrative Notifications</Label>
                      <Switch
                        id="email-administrative"
                        checked={preferences?.email_administrative || false}
                        onCheckedChange={(checked) => 
                          updatePreferences({ email_administrative: checked })
                        }
                      />
                    </div>
                    <p className="text-sm text-gray-600">
                      Account approvals, payments, renewals, and system updates
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="email-system">System Notifications</Label>
                      <Switch
                        id="email-system"
                        checked={preferences?.email_system || false}
                        onCheckedChange={(checked) => 
                          updatePreferences({ email_system: checked })
                        }
                      />
                    </div>
                    <p className="text-sm text-gray-600">
                      Security alerts, maintenance, and platform updates
                    </p>
                  </div>
                </div>
              </TabsContent>

                <TabsContent value="in-app" className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="in-app-academic">Academic Notifications</Label>
                      <Switch
                        id="in-app-academic"
                        checked={preferences?.in_app_academic || false}
                        onCheckedChange={(checked) => 
                          updatePreferences({ in_app_academic: checked })
                        }
                      />
                    </div>
                    <p className="text-sm text-gray-600">
                      Real-time course updates and assignment alerts
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="in-app-social">Social Notifications</Label>
                      <Switch
                        id="in-app-social"
                        checked={preferences?.in_app_social || false}
                        onCheckedChange={(checked) => 
                          updatePreferences({ in_app_social: checked })
                        }
                      />
                    </div>
                    <p className="text-sm text-gray-600">
                      Instant mentions and community interactions
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="in-app-administrative">Administrative Notifications</Label>
                      <Switch
                        id="in-app-administrative"
                        checked={preferences?.in_app_administrative || false}
                        onCheckedChange={(checked) => 
                          updatePreferences({ in_app_administrative: checked })
                        }
                      />
                    </div>
                    <p className="text-sm text-gray-600">
                      Account status and payment confirmations
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="in-app-system">System Notifications</Label>
                      <Switch
                        id="in-app-system"
                        checked={preferences?.in_app_system || false}
                        onCheckedChange={(checked) => 
                          updatePreferences({ in_app_system: checked })
                        }
                      />
                    </div>
                    <p className="text-sm text-gray-600">
                      Platform updates and security alerts
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

        {/* Quiet Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Quiet Hours
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="quiet-hours-enabled">Enable Quiet Hours</Label>
              <Switch
                id="quiet-hours-enabled"
                checked={preferences?.quiet_hours_enabled || false}
                onCheckedChange={(checked) => 
                  updatePreferences({ quiet_hours_enabled: checked })
                }
              />
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Temporarily pause non-urgent notifications during specified hours
            </p>

            <div className={`grid grid-cols-2 gap-4 ${!preferences?.quiet_hours_enabled ? 'opacity-50' : ''}`}>
              <div>
                <Label htmlFor="quiet-hours-start">Start Time</Label>
                <Input
                  id="quiet-hours-start"
                  type="time"
                  value={preferences?.quiet_hours_start || "22:00"}
                  onChange={(e) => 
                    updatePreferences({ quiet_hours_start: e.target.value })
                  }
                  disabled={!preferences?.quiet_hours_enabled}
                />
              </div>
              <div>
                <Label htmlFor="quiet-hours-end">End Time</Label>
                <Input
                  id="quiet-hours-end"
                  type="time"
                  value={preferences?.quiet_hours_end || "08:00"}
                  onChange={(e) => 
                    updatePreferences({ quiet_hours_end: e.target.value })
                  }
                  disabled={!preferences?.quiet_hours_enabled}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Frequency Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Email Frequency
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="email-frequency">Email Digest Frequency</Label>
              <Select
                value="immediate"
                onValueChange={() => {}}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediate</SelectItem>
                  <SelectItem value="daily">Daily Digest</SelectItem>
                  <SelectItem value="weekly">Weekly Digest</SelectItem>
                  <SelectItem value="never">Never</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-gray-600">
              Choose how often you receive email notifications
            </p>
          </CardContent>
        </Card>

        {/* Push Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Push Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="push-enabled">Enable Push Notifications</Label>
              <Switch
                id="push-enabled"
                checked={false}
                onCheckedChange={() => {
                  toast({
                    title: "Coming Soon",
                    description: "Push notifications will be available in a future update.",
                    variant: "default",
                  });
                }}
                disabled={true}
              />
            </div>
            <p className="text-sm text-gray-600">
              Get instant notifications on your mobile device (Coming soon)
            </p>
          </CardContent>
        </Card>
      </div>

        {/* Save Button */}
        <div className="flex justify-end mt-8">
          <Button onClick={handleSave} className="px-8">
            <Settings className="h-4 w-4 mr-2" />
            Save Settings
          </Button>
        </div>
      </main>
      <Footer />
    </>
  );
}
