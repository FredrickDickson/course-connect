# Certificate Layout Comparison: Old vs New

## Summary

The current certificate generator (`client/src/lib/certificate-generator.ts`) is based on the old implementation (`docs/certification/old certificate generator code.md`) with minimal changes. Both versions follow the same layout and design specifications based on the reference certificate (Abigail Nartey).

## Key Similarities

Both implementations share the following characteristics:

- **Layout**: A4 portrait format (210mm x 297mm)
- **Font**: Helvetica (Sans-Serif) throughout
- **Colors**:
  - Primary text: Dark gray (#3C3C3C)
  - Certificate title: Red (#BE2828)
  - Background: White
- **Structure**:
  - CREST at top center (55mm x 48mm)
  - Organization name with "England & Wales" subtitle
  - Large red "Certificate of Membership" title
  - Recipient name with post-nominal (28pt font)
  - Membership description (14pt font)
  - Validity date
  - Seal centered at bottom
  - Signature on left margin
  - Member ID and issue date on right
  - Footer with return policy and company number

## Key Differences

### 1. Pathway Support (NEW)

The current implementation adds support for different pathways (Arbitration, Mediation) to handle post-nominals correctly:

**Old Code:**
```typescript
const LEVEL_LABELS: Record<string, { title: string; description: string; postNominal: string }> = {
  associate: {
    title: "Certificate of\nMembership",
    description: "is an Associate Member of the Center",
    postNominal: "ACIMArb", // Fixed post-nominal
  },
  // ...
};
```

**New Code:**
```typescript
function getLevelLabels(level: string, pathway: PathwayType = PATHWAY_TYPES.ARBITRATION) {
  const config = PATHWAY_CONFIG[pathway];
  return {
    title: level === "fellow" ? "Certificate of\nFellowship" : "Certificate of\nMembership",
    description: level === "associate" ? "is an Associate Member of the Center" :
                 level === "member" ? "is a Member of the Center" :
                 "is a Fellow of the Center",
    postNominal: config.postNominals[level as keyof typeof config.postNominals]
    // Dynamic post-nominal based on pathway
  };
}
```

This allows the system to generate different post-nominals:
- Arbitration: ACIMArb, MCIMArb, FCIMArb
- Mediation: ACIMMed, MCIMMed, FCIMMed

### 2. TypeScript Interface

**Old Code:**
```typescript
export interface CertificateData {
  fullName: string;
  membershipLevel: "associate" | "member" | "fellow";
  memberId: string;
  issueDate: string;
  expiryDate: string;
}
```

**New Code:**
```typescript
export interface CertificateData {
  fullName: string;
  membershipLevel: "associate" | "member" | "fellow";
  memberId: string;
  issueDate: string;
  expiryDate: string;
  pathway?: PathwayType; // Optional pathway for post-nominals
}
```

## Layout Specifications (Both Versions)

### Coordinates and Dimensions

- **Page**: 210mm x 297mm (A4 portrait)
- **Center X**: 105mm (cx)

**Element Positions:**
- CREST: (77.5mm, 15mm), size 55mm x 48mm
- Org Name: y=72mm, y=80mm, y=86mm
- Certificate Title: y=110mm, y=128mm (48pt, red)
- "This is to certify that": y=148mm
- Recipient Name: y=165mm (28pt)
- Description: y=178mm
- Validity Date: y=195mm
- Seal Text: y=210mm, y=217mm
- Seal: (79mm, 225mm), size 52mm x 52mm
- Signature: (15mm, 230mm), size 40mm x 15mm
- Signature Name: y=235mm, y=240mm
- Member ID: y=245mm, y=251mm, y=262mm, y=268mm (at x=175mm)
- Footer: y=288mm, y=292mm

## Recommendation

**Use the Current Implementation**

The current certificate generator should be used because:
1. It maintains the exact same layout as the reference certificate
2. It adds pathway support for correct post-nominals (critical for dual-track system)
3. It's more maintainable with the centralized pathway configuration
4. The visual output is identical to the old implementation

The old code was preserved in documentation as a reference, but the current implementation is functionally superior due to pathway support while maintaining visual fidelity.
