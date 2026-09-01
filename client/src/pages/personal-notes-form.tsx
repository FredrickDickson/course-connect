/**
 * Personal Notes Form - Public Standalone Page
 * 
 * Confidential employee information collection form for CIMA
 * Accessible via direct link (not on student dashboard)
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle, Shield, Upload, FileText } from "lucide-react";
import { Separator } from "@/components/ui/separator";

// Form validation schema
const formSchema = z.object({
  // A. Personal Details
  fullName: z.string().min(2, "Full name is required"),
  otherNames: z.string().optional(),
  gender: z.enum(["male", "female"]),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  age: z.coerce.number().min(1).max(120),
  nationality: z.string().min(2, "Nationality is required"),
  hometown: z.string().min(2, "Hometown is required"),
  region: z.string().min(2, "Region is required"),
  languagesSpoken: z.string().min(1, "At least one language is required"),
  
  // B. Identification
  ghanaCardNo: z.string().optional(),
  passportNo: z.string().optional(),
  voterIdNo: z.string().optional(),
  nhisNo: z.string().optional(),
  tin: z.string().optional(),
  
  // C. Current Residential Address
  houseNo: z.string().optional(),
  streetArea: z.string().min(2, "Street/Area is required"),
  townCity: z.string().min(2, "Town/City is required"),
  gpsAddress: z.string().optional(),
  lengthOfStay: z.string().optional(),
  
  // E. Family Information
  fatherName: z.string().optional(),
  motherName: z.string().optional(),
  numberOfChildren: z.coerce.number().min(0).default(0),
  childrenNames: z.string().optional(),
  
  // F. Next of Kin
  nokName: z.string().min(2, "Next of kin name is required"),
  nokRelationship: z.string().min(2, "Relationship is required"),
  nokTelephone: z.string().min(10, "Valid phone number required"),
  nokAddress: z.string().min(5, "Address is required"),
  nokOccupation: z.string().optional(),
  
  // G. Emergency Contact
  emergencyName: z.string().min(2, "Emergency contact name is required"),
  emergencyRelationship: z.string().min(2, "Relationship is required"),
  emergencyTelephone: z.string().min(10, "Valid phone number required"),
  emergencyAddress: z.string().min(5, "Address is required"),
  
  // H. Education
  highestQualification: z.string().optional(),
  schoolAttended: z.string().optional(),
  yearCompleted: z.string().optional(),
  
  // K. Health Information
  bloodGroup: z.string().optional(),
  rhesusFactor: z.enum(["positive", "negative", "unknown"]).optional(),
  medicalConditions: z.array(z.string()).default([]),
  otherMedicalCondition: z.string().optional(),
  knownAllergies: z.string().optional(),
  currentMedication: z.string().optional(),
  previousIllnesses: z.string().optional(),
  physicalLimitations: z.boolean().default(false),
  physicalLimitationsDetails: z.string().optional(),
  doctorTelephone: z.string().optional(),
  vaccinations: z.array(z.string()).default([]),
  otherVaccination: z.string().optional(),
  
  // P. Social Media
  facebook: z.string().optional(),
  tiktok: z.string().optional(),
  twitterX: z.string().optional(),
  
  // R. Biometric
  height: z.string().optional(),
  distinguishingMarks: z.string().optional(),
  
  // S. Declaration
  employeeSignatureName: z.string().min(2, "Signature name is required"),
  declarationDate: z.string().min(1, "Declaration date is required"),
  declarationAgreed: z.boolean().refine((val) => val === true, {
    message: "You must agree to the declaration",
  }),
});

type FormData = z.infer<typeof formSchema>;

export default function PersonalNotesForm() {
  const { toast } = useToast();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File>>({});
  
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      gender: "male",
      numberOfChildren: 0,
      physicalLimitations: false,
      declarationAgreed: false,
      medicalConditions: [],
      vaccinations: [],
    },
  });
  
  const physicalLimitations = watch("physicalLimitations");
  const medicalConditions = watch("medicalConditions");
  const vaccinations = watch("vaccinations");

  const submitForm = useMutation({
    mutationFn: async (data: FormData) => {
      const formData = new FormData();
      
      // Add all text fields
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            formData.append(key, JSON.stringify(value));
          } else {
            formData.append(key, String(value));
          }
        }
      });
      
      // Add uploaded files
      Object.entries(uploadedFiles).forEach(([key, file]) => {
        formData.append(key, file);
      });
      
      const res = await apiRequest("POST", "/api/personal-notes-forms", formData);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to submit form");
      }
      return await res.json();
    },
    onSuccess: () => {
      setIsSubmitted(true);
      toast({
        title: "Form Submitted Successfully",
        description: "Your personal information has been securely recorded.",
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    onError: (error: Error) => {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (fieldName: string, file: File | null) => {
    if (file) {
      setUploadedFiles((prev) => ({ ...prev, [fieldName]: file }));
    } else {
      setUploadedFiles((prev) => {
        const newFiles = { ...prev };
        delete newFiles[fieldName];
        return newFiles;
      });
    }
  };

  const toggleMedicalCondition = (condition: string) => {
    const current = medicalConditions || [];
    if (current.includes(condition)) {
      setValue("medicalConditions", current.filter((c) => c !== condition));
    } else {
      setValue("medicalConditions", [...current, condition]);
    }
  };

  const toggleVaccination = (vaccination: string) => {
    const current = vaccinations || [];
    if (current.includes(vaccination)) {
      setValue("vaccinations", current.filter((v) => v !== vaccination));
    } else {
      setValue("vaccinations", [...current, vaccination]);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#faf9f6] to-[#f5f3ed] flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full border-[#d4c5b0] shadow-lg">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-[#2c2015] mb-4 font-sf-pro-display">
              Form Submitted Successfully
            </h2>
            <p className="text-[#6b5d4f] mb-6 font-sf-pro-text">
              Your personal notes form has been securely submitted and will be reviewed by the
              administration. Thank you for providing this information.
            </p>
            <p className="text-sm text-[#8b7d6b] italic">
              This information is confidential and will be used solely for household security,
              emergency response, and administrative purposes.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#faf9f6] to-[#f5f3ed] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header with CIMA Branding */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src="/uploads/logo.png" alt="CIMA Logo" className="h-16 w-auto" />
          </div>
          <h2 className="text-2xl font-bold text-[#2c2015] mb-2 font-sf-pro-display">
            Personal Notes Form (PN FORM)
          </h2>
          <p className="text-[#6b5d4f] font-sf-pro-text">
            Domestic Employee Security & Intelligence Record
          </p>
          <div className="mt-4 inline-flex items-center gap-2 bg-[#610000]/10 text-[#610000] px-4 py-2 rounded-full text-sm font-medium">
            <Shield className="w-4 h-4" />
            Confidential
          </div>
        </div>

        {/* Purpose Statement */}
        <Card className="mb-6 border-[#610000]/20 bg-[#610000]/5">
          <CardContent className="p-6">
            <p className="text-sm text-[#2c2015] leading-relaxed font-sf-pro-text">
              <strong>Purpose:</strong> This form is intended solely for household security,
              emergency response, identity verification, and administrative purposes. All information
              provided will be kept confidential in accordance with Ghana's Data Protection Act, 2012
              (Act 843).
            </p>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit((data) => submitForm.mutate(data))} className="space-y-6">
          {/* A. PERSONAL DETAILS */}
          <Card className="border-[#d4c5b0] shadow-sm">
            <CardHeader className="bg-[#610000] text-white">
              <CardTitle className="font-sf-pro-display">A. PERSONAL DETAILS</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <Label htmlFor="fullName" className="required">Full Name *</Label>
                <Input
                  id="fullName"
                  {...register("fullName")}
                  className="mt-1"
                  placeholder="Enter your full name as it appears on official documents"
                />
                {errors.fullName && (
                  <p className="text-sm text-red-600 mt-1">{errors.fullName.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="otherNames">Other Names Used</Label>
                <Input
                  id="otherNames"
                  {...register("otherNames")}
                  className="mt-1"
                  placeholder="Any other names, nicknames, or aliases"
                />
              </div>

              <div>
                <Label className="required">Gender *</Label>
                <RadioGroup
                  defaultValue="male"
                  onValueChange={(value) => setValue("gender", value as "male" | "female")}
                  className="flex gap-6 mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="male" id="male" />
                    <Label htmlFor="male" className="cursor-pointer font-normal">Male</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="female" id="female" />
                    <Label htmlFor="female" className="cursor-pointer font-normal">Female</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dateOfBirth" className="required">Date of Birth *</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    {...register("dateOfBirth")}
                    className="mt-1"
                  />
                  {errors.dateOfBirth && (
                    <p className="text-sm text-red-600 mt-1">{errors.dateOfBirth.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="age" className="required">Age *</Label>
                  <Input
                    id="age"
                    type="number"
                    {...register("age")}
                    className="mt-1"
                    placeholder="Your current age"
                  />
                  {errors.age && (
                    <p className="text-sm text-red-600 mt-1">{errors.age.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nationality" className="required">Nationality *</Label>
                  <Input
                    id="nationality"
                    {...register("nationality")}
                    className="mt-1"
                    placeholder="e.g., Ghanaian"
                  />
                  {errors.nationality && (
                    <p className="text-sm text-red-600 mt-1">{errors.nationality.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="hometown" className="required">Hometown *</Label>
                  <Input
                    id="hometown"
                    {...register("hometown")}
                    className="mt-1"
                    placeholder="Your hometown"
                  />
                  {errors.hometown && (
                    <p className="text-sm text-red-600 mt-1">{errors.hometown.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="region" className="required">Region *</Label>
                <Input
                  id="region"
                  {...register("region")}
                  className="mt-1"
                  placeholder="e.g., Greater Accra"
                />
                {errors.region && (
                  <p className="text-sm text-red-600 mt-1">{errors.region.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="languagesSpoken" className="required">Languages Spoken *</Label>
                <Input
                  id="languagesSpoken"
                  {...register("languagesSpoken")}
                  className="mt-1"
                  placeholder="e.g., English, Twi, Ga"
                />
                {errors.languagesSpoken && (
                  <p className="text-sm text-red-600 mt-1">{errors.languagesSpoken.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* B. IDENTIFICATION */}
          <Card className="border-[#d4c5b0] shadow-sm">
            <CardHeader className="bg-[#610000] text-white">
              <CardTitle className="font-sf-pro-display">B. IDENTIFICATION</CardTitle>
              <CardDescription className="text-white/80">
                Please provide at least one form of identification
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <Label htmlFor="ghanaCardNo">Ghana Card No.</Label>
                <Input
                  id="ghanaCardNo"
                  {...register("ghanaCardNo")}
                  className="mt-1"
                  placeholder="GHA-XXXXXXXXX-X"
                />
              </div>

              <div>
                <Label htmlFor="passportNo">Passport No. (if any)</Label>
                <Input
                  id="passportNo"
                  {...register("passportNo")}
                  className="mt-1"
                  placeholder="Passport number"
                />
              </div>

              <div>
                <Label htmlFor="voterIdNo">Voter ID No.</Label>
                <Input
                  id="voterIdNo"
                  {...register("voterIdNo")}
                  className="mt-1"
                  placeholder="Voter ID number"
                />
              </div>

              <div>
                <Label htmlFor="nhisNo">NHIS No.</Label>
                <Input
                  id="nhisNo"
                  {...register("nhisNo")}
                  className="mt-1"
                  placeholder="National Health Insurance Scheme number"
                />
              </div>

              <div>
                <Label htmlFor="tin">TIN (if any)</Label>
                <Input
                  id="tin"
                  {...register("tin")}
                  className="mt-1"
                  placeholder="Tax Identification Number"
                />
              </div>

              <div className="pt-4 border-t">
                <Label htmlFor="idDocuments">Attach photocopies of identification documents</Label>
                <div className="mt-2 flex items-center gap-3">
                  <Input
                    id="idDocuments"
                    type="file"
                    accept="image/*,.pdf"
                    multiple
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileUpload("idDocuments", e.target.files[0]);
                      }
                    }}
                    className="mt-1"
                  />
                  <FileText className="w-5 h-5 text-[#6b5d4f]" />
                </div>
                <p className="text-xs text-[#8b7d6b] mt-1">Accepted: Images or PDF files</p>
              </div>
            </CardContent>
          </Card>

          {/* C. CURRENT RESIDENTIAL ADDRESS */}
          <Card className="border-[#d4c5b0] shadow-sm">
            <CardHeader className="bg-[#610000] text-white">
              <CardTitle className="font-sf-pro-display">C. CURRENT RESIDENTIAL ADDRESS</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="houseNo">House No.</Label>
                  <Input
                    id="houseNo"
                    {...register("houseNo")}
                    className="mt-1"
                    placeholder="House number"
                  />
                </div>
                <div>
                  <Label htmlFor="streetArea" className="required">Street/Area *</Label>
                  <Input
                    id="streetArea"
                    {...register("streetArea")}
                    className="mt-1"
                    placeholder="Street name or area"
                  />
                  {errors.streetArea && (
                    <p className="text-sm text-red-600 mt-1">{errors.streetArea.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="townCity" className="required">Town/City *</Label>
                <Input
                  id="townCity"
                  {...register("townCity")}
                  className="mt-1"
                  placeholder="Town or city"
                />
                {errors.townCity && (
                  <p className="text-sm text-red-600 mt-1">{errors.townCity.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="gpsAddress">GPS Address</Label>
                <Input
                  id="gpsAddress"
                  {...register("gpsAddress")}
                  className="mt-1"
                  placeholder="e.g., GA-123-4567"
                />
              </div>

              <div>
                <Label htmlFor="lengthOfStay">Length of stay at current address</Label>
                <Input
                  id="lengthOfStay"
                  {...register("lengthOfStay")}
                  className="mt-1"
                  placeholder="e.g., 2 years"
                />
              </div>
            </CardContent>
          </Card>

          {/* E. FAMILY INFORMATION */}
          <Card className="border-[#d4c5b0] shadow-sm">
            <CardHeader className="bg-[#610000] text-white">
              <CardTitle className="font-sf-pro-display">E. FAMILY INFORMATION</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <Label htmlFor="fatherName">Father's Name</Label>
                <Input
                  id="fatherName"
                  {...register("fatherName")}
                  className="mt-1"
                  placeholder="Full name"
                />
              </div>

              <div>
                <Label htmlFor="motherName">Mother's Name</Label>
                <Input
                  id="motherName"
                  {...register("motherName")}
                  className="mt-1"
                  placeholder="Full name"
                />
              </div>

              <div>
                <Label htmlFor="numberOfChildren">Number of Children</Label>
                <Input
                  id="numberOfChildren"
                  type="number"
                  {...register("numberOfChildren")}
                  className="mt-1"
                  placeholder="0"
                />
              </div>

              <div>
                <Label htmlFor="childrenNames">Names and ages of children</Label>
                <Textarea
                  id="childrenNames"
                  {...register("childrenNames")}
                  className="mt-1"
                  placeholder="e.g., Kwame (10), Ama (8)"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* F. NEXT OF KIN */}
          <Card className="border-[#d4c5b0] shadow-sm">
            <CardHeader className="bg-[#610000] text-white">
              <CardTitle className="font-sf-pro-display">F. NEXT OF KIN</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <Label htmlFor="nokName" className="required">Name *</Label>
                <Input
                  id="nokName"
                  {...register("nokName")}
                  className="mt-1"
                  placeholder="Full name"
                />
                {errors.nokName && (
                  <p className="text-sm text-red-600 mt-1">{errors.nokName.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nokRelationship" className="required">Relationship *</Label>
                  <Input
                    id="nokRelationship"
                    {...register("nokRelationship")}
                    className="mt-1"
                    placeholder="e.g., Brother, Sister"
                  />
                  {errors.nokRelationship && (
                    <p className="text-sm text-red-600 mt-1">{errors.nokRelationship.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="nokTelephone" className="required">Telephone *</Label>
                  <Input
                    id="nokTelephone"
                    {...register("nokTelephone")}
                    className="mt-1"
                    placeholder="+233 XX XXX XXXX"
                  />
                  {errors.nokTelephone && (
                    <p className="text-sm text-red-600 mt-1">{errors.nokTelephone.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="nokAddress" className="required">Address *</Label>
                <Textarea
                  id="nokAddress"
                  {...register("nokAddress")}
                  className="mt-1"
                  placeholder="Full address"
                  rows={2}
                />
                {errors.nokAddress && (
                  <p className="text-sm text-red-600 mt-1">{errors.nokAddress.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="nokOccupation">Occupation</Label>
                <Input
                  id="nokOccupation"
                  {...register("nokOccupation")}
                  className="mt-1"
                  placeholder="Occupation"
                />
              </div>
            </CardContent>
          </Card>

          {/* G. EMERGENCY CONTACT */}
          <Card className="border-[#d4c5b0] shadow-sm">
            <CardHeader className="bg-[#610000] text-white">
              <CardTitle className="font-sf-pro-display">G. EMERGENCY CONTACT</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <Label htmlFor="emergencyName" className="required">Name *</Label>
                <Input
                  id="emergencyName"
                  {...register("emergencyName")}
                  className="mt-1"
                  placeholder="Full name"
                />
                {errors.emergencyName && (
                  <p className="text-sm text-red-600 mt-1">{errors.emergencyName.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="emergencyRelationship" className="required">Relationship *</Label>
                  <Input
                    id="emergencyRelationship"
                    {...register("emergencyRelationship")}
                    className="mt-1"
                    placeholder="e.g., Spouse, Parent"
                  />
                  {errors.emergencyRelationship && (
                    <p className="text-sm text-red-600 mt-1">{errors.emergencyRelationship.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="emergencyTelephone" className="required">Telephone *</Label>
                  <Input
                    id="emergencyTelephone"
                    {...register("emergencyTelephone")}
                    className="mt-1"
                    placeholder="+233 XX XXX XXXX"
                  />
                  {errors.emergencyTelephone && (
                    <p className="text-sm text-red-600 mt-1">{errors.emergencyTelephone.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="emergencyAddress" className="required">Address *</Label>
                <Textarea
                  id="emergencyAddress"
                  {...register("emergencyAddress")}
                  className="mt-1"
                  placeholder="Full address"
                  rows={2}
                />
                {errors.emergencyAddress && (
                  <p className="text-sm text-red-600 mt-1">{errors.emergencyAddress.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* H. EDUCATION */}
          <Card className="border-[#d4c5b0] shadow-sm">
            <CardHeader className="bg-[#610000] text-white">
              <CardTitle className="font-sf-pro-display">H. EDUCATION</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <Label htmlFor="highestQualification">Highest Educational Qualification</Label>
                <Input
                  id="highestQualification"
                  {...register("highestQualification")}
                  className="mt-1"
                  placeholder="e.g., WASSCE, Diploma, Degree"
                />
              </div>

              <div>
                <Label htmlFor="schoolAttended">School Attended</Label>
                <Input
                  id="schoolAttended"
                  {...register("schoolAttended")}
                  className="mt-1"
                  placeholder="Name of institution"
                />
              </div>

              <div>
                <Label htmlFor="yearCompleted">Year Completed</Label>
                <Input
                  id="yearCompleted"
                  {...register("yearCompleted")}
                  className="mt-1"
                  placeholder="e.g., 2020"
                />
              </div>
            </CardContent>
          </Card>

          {/* K. HEALTH INFORMATION */}
          <Card className="border-[#d4c5b0] shadow-sm">
            <CardHeader className="bg-[#610000] text-white">
              <CardTitle className="font-sf-pro-display">K. HEALTH INFORMATION</CardTitle>
              <CardDescription className="text-white/80">
                Voluntary - for emergency treatment and workplace safety
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bloodGroup">Blood Group (if known)</Label>
                  <Input
                    id="bloodGroup"
                    {...register("bloodGroup")}
                    className="mt-1"
                    placeholder="e.g., O+, A-, B+"
                  />
                </div>
                <div>
                  <Label htmlFor="rhesusFactor">Rhesus (Rh) Factor</Label>
                  <RadioGroup
                    onValueChange={(value) => setValue("rhesusFactor", value as "positive" | "negative" | "unknown")}
                    className="flex gap-4 mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="positive" id="rh-positive" />
                      <Label htmlFor="rh-positive" className="cursor-pointer font-normal">Positive</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="negative" id="rh-negative" />
                      <Label htmlFor="rh-negative" className="cursor-pointer font-normal">Negative</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="unknown" id="rh-unknown" />
                      <Label htmlFor="rh-unknown" className="cursor-pointer font-normal">Unknown</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              <div>
                <Label>Do you currently suffer from or have a history of any of the following?</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                  {[
                    "Hypertension (High Blood Pressure)",
                    "Diabetes",
                    "Asthma",
                    "Epilepsy/Seizures",
                    "Heart Disease",
                    "STDs",
                    "Sickle Cell Disease/Trait",
                    "Tuberculosis",
                    "Hepatitis",
                  ].map((condition) => (
                    <div key={condition} className="flex items-center space-x-2">
                      <Checkbox
                        id={condition}
                        checked={medicalConditions?.includes(condition)}
                        onCheckedChange={() => toggleMedicalCondition(condition)}
                      />
                      <Label htmlFor={condition} className="cursor-pointer font-normal text-sm">
                        {condition}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="otherMedicalCondition">Other (Specify)</Label>
                <Input
                  id="otherMedicalCondition"
                  {...register("otherMedicalCondition")}
                  className="mt-1"
                  placeholder="Any other medical conditions"
                />
              </div>

              <div>
                <Label htmlFor="knownAllergies">Known Allergies</Label>
                <Textarea
                  id="knownAllergies"
                  {...register("knownAllergies")}
                  className="mt-1"
                  placeholder="List any allergies"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="currentMedication">Current Medication</Label>
                <Textarea
                  id="currentMedication"
                  {...register("currentMedication")}
                  className="mt-1"
                  placeholder="List any medications you are currently taking"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="previousIllnesses">Previous Major Illnesses or Operations</Label>
                <Textarea
                  id="previousIllnesses"
                  {...register("previousIllnesses")}
                  className="mt-1"
                  placeholder="Describe any major illnesses or surgeries"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="physicalLimitations"
                    checked={physicalLimitations}
                    onCheckedChange={(checked) => setValue("physicalLimitations", !!checked)}
                  />
                  <Label htmlFor="physicalLimitations" className="cursor-pointer font-normal">
                    I have physical limitations that may affect my ability to perform household duties safely
                  </Label>
                </div>
                {physicalLimitations && (
                  <Textarea
                    id="physicalLimitationsDetails"
                    {...register("physicalLimitationsDetails")}
                    className="mt-2"
                    placeholder="Please provide details"
                    rows={2}
                  />
                )}
              </div>

              <div>
                <Label htmlFor="doctorTelephone">Doctor's Telephone</Label>
                <Input
                  id="doctorTelephone"
                  {...register("doctorTelephone")}
                  className="mt-1"
                  placeholder="+233 XX XXX XXXX"
                />
              </div>

              <div>
                <Label>Vaccination Status (Optional)</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                  {["Tetanus", "COVID-19", "Hepatitis B"].map((vaccination) => (
                    <div key={vaccination} className="flex items-center space-x-2">
                      <Checkbox
                        id={vaccination}
                        checked={vaccinations?.includes(vaccination)}
                        onCheckedChange={() => toggleVaccination(vaccination)}
                      />
                      <Label htmlFor={vaccination} className="cursor-pointer font-normal text-sm">
                        {vaccination}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="otherVaccination">Other Vaccination</Label>
                <Input
                  id="otherVaccination"
                  {...register("otherVaccination")}
                  className="mt-1"
                  placeholder="Specify other vaccinations"
                />
              </div>
            </CardContent>
          </Card>

          {/* P. SOCIAL MEDIA */}
          <Card className="border-[#d4c5b0] shadow-sm">
            <CardHeader className="bg-[#610000] text-white">
              <CardTitle className="font-sf-pro-display">P. SOCIAL MEDIA (Optional)</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <Label htmlFor="facebook">Facebook</Label>
                <Input
                  id="facebook"
                  {...register("facebook")}
                  className="mt-1"
                  placeholder="Facebook profile URL or username"
                />
              </div>

              <div>
                <Label htmlFor="tiktok">TikTok</Label>
                <Input
                  id="tiktok"
                  {...register("tiktok")}
                  className="mt-1"
                  placeholder="TikTok username"
                />
              </div>

              <div>
                <Label htmlFor="twitterX">X (formerly Twitter)</Label>
                <Input
                  id="twitterX"
                  {...register("twitterX")}
                  className="mt-1"
                  placeholder="X/Twitter handle"
                />
              </div>
            </CardContent>
          </Card>

          {/* R. BIOMETRIC RECORD */}
          <Card className="border-[#d4c5b0] shadow-sm">
            <CardHeader className="bg-[#610000] text-white">
              <CardTitle className="font-sf-pro-display">R. BIOMETRIC RECORD</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <Label htmlFor="height">Height</Label>
                <Input
                  id="height"
                  {...register("height")}
                  className="mt-1"
                  placeholder="e.g., 5'8&quot; or 173cm"
                />
              </div>

              <div>
                <Label htmlFor="distinguishingMarks">Distinguishing Marks</Label>
                <Textarea
                  id="distinguishingMarks"
                  {...register("distinguishingMarks")}
                  className="mt-1"
                  placeholder="Describe any scars, tattoos, birthmarks, etc."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="leftThumb">Left Thumb Impression</Label>
                  <Input
                    id="leftThumb"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileUpload("leftThumb", e.target.files[0]);
                      }
                    }}
                    className="mt-1"
                  />
                  <p className="text-xs text-[#8b7d6b] mt-1">Upload image of left thumb print</p>
                </div>

                <div>
                  <Label htmlFor="rightThumb">Right Thumb Impression</Label>
                  <Input
                    id="rightThumb"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileUpload("rightThumb", e.target.files[0]);
                      }
                    }}
                    className="mt-1"
                  />
                  <p className="text-xs text-[#8b7d6b] mt-1">Upload image of right thumb print</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* S. DECLARATION */}
          <Card className="border-[#610000] shadow-sm">
            <CardHeader className="bg-[#610000] text-white">
              <CardTitle className="font-sf-pro-display">S. DECLARATION</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="bg-[#faf9f6] border border-[#d4c5b0] rounded-lg p-4">
                <p className="text-sm text-[#2c2015] leading-relaxed">
                  I declare that the information provided in this Personal Notes Form is true and
                  complete to the best of my knowledge. I understand that any material false statement
                  or omission may result in the termination of my engagement. I consent to the collection
                  and retention of this information by my employer for lawful household administration,
                  identity verification, security management, emergency response, and related purposes.
                </p>
              </div>

              <div>
                <Label htmlFor="employeeSignatureName" className="required">Employee's Signature (Full Name) *</Label>
                <Input
                  id="employeeSignatureName"
                  {...register("employeeSignatureName")}
                  className="mt-1"
                  placeholder="Type your full name as signature"
                />
                {errors.employeeSignatureName && (
                  <p className="text-sm text-red-600 mt-1">{errors.employeeSignatureName.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="declarationDate" className="required">Date *</Label>
                <Input
                  id="declarationDate"
                  type="date"
                  {...register("declarationDate")}
                  className="mt-1"
                />
                {errors.declarationDate && (
                  <p className="text-sm text-red-600 mt-1">{errors.declarationDate.message}</p>
                )}
              </div>

              <div className="flex items-start space-x-2 pt-4">
                <Checkbox
                  id="declarationAgreed"
                  checked={watch("declarationAgreed")}
                  onCheckedChange={(checked) => setValue("declarationAgreed", !!checked)}
                  className="mt-1"
                />
                <Label htmlFor="declarationAgreed" className="cursor-pointer font-normal leading-relaxed">
                  I have read and agree to the above declaration. I understand that this information is
                  confidential and will be handled in accordance with Ghana's Data Protection Act, 2012
                  (Act 843). *
                </Label>
              </div>
              {errors.declarationAgreed && (
                <p className="text-sm text-red-600">{errors.declarationAgreed.message}</p>
              )}
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-center pt-6">
            <Button
              type="submit"
              disabled={submitForm.isPending}
              className="bg-[#610000] text-white hover:bg-[#7d0000] px-12 py-6 text-lg font-semibold shadow-lg"
            >
              {submitForm.isPending ? (
                <>
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 mr-2" />
                  Submit Form
                </>
              )}
            </Button>
          </div>

          <div className="text-center text-xs text-[#8b7d6b] italic pt-4">
            This form is confidential and for official use only in accordance with Ghana's Data
            Protection Act, 2012 (Act 843)
          </div>
        </form>
      </div>
    </div>
  );
}