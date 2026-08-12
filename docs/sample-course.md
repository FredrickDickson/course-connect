# Sample Course Draft

This sample course is shaped around the existing course model in the app: title, subtitle, description, category, programme type, level, track, pricing, publishing flags, and a curriculum with modules and lessons.

## Suggested Course Details

```json
{
  "title": "Foundations of International Commercial Arbitration",
  "subtitle": "Learn the essentials of arbitration from agreement to award",
  "description": "This course introduces learners to the core principles of international commercial arbitration, including arbitration agreements, tribunal formation, procedural strategy, evidence, and the drafting of enforceable awards. It is designed for early-career professionals and aspiring practitioners who want a clear, practical foundation in the field.",
  "categoryId": "arbitration",
  "programmeType": "PROFESSIONAL_PROGRAMME",
  "level": "associate",
  "track": "ARBITRATION",
  "price": "199",
  "currency": "USD",
  "requiresApproval": false,
  "thumbnailUrl": "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80",
  "promoVideoUrl": "",
  "duration": 12,
  "isPublished": true,
  "isFeatured": true,
  "tags": ["arbitration", "international-law", "commercial-disputes", "professional-development"],
  "curriculum": {
    "modules": [
      {
        "title": "Module 1: Introduction to Arbitration",
        "description": "Understand what arbitration is, why parties choose it, and how it differs from litigation.",
        "lessons": [
          {
            "title": "What Is International Commercial Arbitration?",
            "contentType": "video",
            "duration": 900,
            "isFree": true
          },
          {
            "title": "Arbitration Clauses and Their Drafting",
            "contentType": "text",
            "duration": 600,
            "isFree": false
          }
        ]
      },
      {
        "title": "Module 2: Procedure and Practice",
        "description": "Explore the procedural stages of arbitration from the Notice of Arbitration to the final award.",
        "lessons": [
          {
            "title": "Commencing Proceedings",
            "contentType": "video",
            "duration": 1200,
            "isFree": false
          },
          {
            "title": "Evidence, Hearings, and Interim Measures",
            "contentType": "video",
            "duration": 1100,
            "isFree": false
          }
        ]
      },
      {
        "title": "Module 3: Award Writing and Strategy",
        "description": "Practice essential drafting and decision-making skills for arbitration practitioners.",
        "lessons": [
          {
            "title": "Drafting an Effective Award",
            "contentType": "video",
            "duration": 1000,
            "isFree": false
          },
          {
            "title": "Final Assessment and Reflection",
            "contentType": "quiz",
            "duration": 600,
            "isFree": false
          }
        ]
      }
    ]
  }
}
```

## Shorter Version for the Course Form

- Title: Foundations of International Commercial Arbitration
- Subtitle: Learn the essentials of arbitration from agreement to award
- Description: A practical introduction to arbitration for learners who want a strong foundation in dispute resolution practice.
- Course Type: Professional Programme
- Difficulty Level: Associate
- Qualification Track: Arbitration
- Price: 199
- Currency: USD
- Publish: Yes
- Featured: Yes
