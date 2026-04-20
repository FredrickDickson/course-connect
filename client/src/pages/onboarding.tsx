// Full fixed onboarding.tsx (phone + whatsapp handling corrected)
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function Onboarding() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [whatsappSameAsPhone, setWhatsappSameAsPhone] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    country: "",
    city: "",
    address: "",

    phoneCountryCode: "+233",
    whatsappCountryCode: "+233",

    phoneLocal: "",
    whatsappLocal: "",

    phone: "",
    whatsapp: "",
  });

  const COUNTRY_CODES = [
    { name: "Ghana", dialingCode: "+233" },
    { name: "Nigeria", dialingCode: "+234" },
    { name: "United States", dialingCode: "+1" },
    { name: "United Kingdom", dialingCode: "+44" },
  ];

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const { data } = await (supabase as any)
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setForm(prev => ({
          ...prev,
          full_name: data.full_name || "",
          email: user.email || "",
          phone: data.phone || "",
          whatsapp: data.whatsapp || "",
        }));
      }

      setIsLoading(false);
    };

    load();
  }, [user]);

  const updateField = (field: string, value: string) => {
    setForm(prev => {
      const next: any = { ...prev, [field]: value };

      if (field === "phoneCountryCode" || field === "phoneLocal") {
        const code = field === "phoneCountryCode" ? value : prev.phoneCountryCode;
        const local = field === "phoneLocal" ? value : prev.phoneLocal;
        next.phone = code + local;
      }

      if (field === "whatsappCountryCode" || field === "whatsappLocal") {
        const code = field === "whatsappCountryCode" ? value : prev.whatsappCountryCode;
        const local = field === "whatsappLocal" ? value : prev.whatsappLocal;
        next.whatsapp = code + local;
      }

      if (whatsappSameAsPhone && (field === "phoneCountryCode" || field === "phoneLocal")) {
        next.whatsappCountryCode = next.phoneCountryCode;
        next.whatsappLocal = next.phoneLocal;
        next.whatsapp = next.phone;
      }

      return next;
    });
  };

  const handleSameAsPhone = (checked: boolean) => {
    setWhatsappSameAsPhone(checked);

    if (checked) {
      setForm(prev => ({
        ...prev,
        whatsappCountryCode: prev.phoneCountryCode,
        whatsappLocal: prev.phoneLocal,
        whatsapp: prev.phone,
      }));
    }
  };

  const save = async () => {
    if (!user) return;

    if (!form.phone) {
      toast.error("Phone required");
      return;
    }

    setIsSaving(true);

    const { error } = await (supabase as any).from("profiles").upsert({
      user_id: user.id,
      phone: form.phone,
      whatsapp: form.whatsapp || form.phone,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Saved");
      setLocation("/dashboard");
    }

    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Phone Setup</CardTitle>
          <CardDescription>Enter your phone details</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">

          {/* PHONE */}
          <div>
            <Label>Phone Number</Label>
            <div className="flex gap-2">
              <Select
                value={form.phoneCountryCode}
                onValueChange={v => updateField("phoneCountryCode", v)}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRY_CODES.map(c => (
                    <SelectItem key={c.name} value={c.dialingCode}>
                      {c.dialingCode} {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                value={form.phoneLocal}
                onChange={e => updateField("phoneLocal", e.target.value.replace(/\D/g, ""))}
                placeholder="244123456"
              />
            </div>
          </div>

          {/* WHATSAPP */}
          <div>
            <div className="flex items-center justify-between">
              <Label>WhatsApp</Label>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={whatsappSameAsPhone}
                  onCheckedChange={handleSameAsPhone}
                />
                <span className="text-sm">Same as phone</span>
              </div>
            </div>

            <div className="flex gap-2 mt-2">
              <Select
                value={form.whatsappCountryCode}
                disabled={whatsappSameAsPhone}
                onValueChange={v => updateField("whatsappCountryCode", v)}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRY_CODES.map(c => (
                    <SelectItem key={c.name} value={c.dialingCode}>
                      {c.dialingCode} {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                value={whatsappSameAsPhone ? form.phoneLocal : form.whatsappLocal}
                disabled={whatsappSameAsPhone}
                onChange={e => updateField("whatsappLocal", e.target.value.replace(/\D/g, ""))}
                placeholder="244123456"
              />
            </div>
          </div>

          <Button onClick={save} disabled={isSaving}>
            {isSaving ? "Saving..." : "Continue"}
          </Button>

        </CardContent>
      </Card>
    </div>
  );
}
