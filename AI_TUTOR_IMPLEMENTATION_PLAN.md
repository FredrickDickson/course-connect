# 🤖 CIMA AI Tutor - Implementation Architecture

## Executive Summary

**Vision**: Transform CIMA Learn into an AI-first, human-governed institution by integrating an intelligent AI Tutor directly into the learning experience.

**Strategic Positioning**: "CIMA is an AI-first, human-governed dispute resolution and professional learning institution."

---

## 🎯 Three-Product Architecture

### 1. **CIMA Learn** (Foundation - Existing)
- Courses, lessons, modules
- Video lectures, articles, quizzes
- Progress tracking, certificates
- **Status**: ✅ Built and operational

### 2. **CIMA AI Tutor** (Core Intelligence - NEW)
- Context-aware lesson assistant
- Simplifies complex ADR concepts
- Interactive questioning and drafting
- Personalized feedback
- **Status**: 🔨 To be implemented

### 3. **CIMA Arbitrator Simulator** (Advanced Practice - FUTURE)
- Mock arbitrations/mediations
- AI opponents and witnesses
- Tribunal simulations
- Award drafting practice
- **Status**: 📅 Phase 2 (post-Tutor)

---

## 📊 Current Architecture Analysis

### **Existing Learning Flow**:

```
User → Dashboard → Course Detail → Enrollment → Checkout → Payment
   → Video Player Page → Lessons (Video/Article/Quiz/Assignment/Presentation)
   → Progress Tracking → Completion → Certificate
```

### **Key Components** (Currently Built):

1. **`/learn/:courseId/:lessonId`** - Main learning interface
2. **Video Player** (`video-player.tsx`) - Orchestrates the learning experience
3. **Lesson Types**:
   - `article-stage.tsx` - Text/HTML content
   - `quiz-stage.tsx` - Assessments
   - `assignment-stage.tsx` - Submissions
   - `presentation-stage.tsx` - Slide decks
   - Video lessons (via Mux or embedded)

4. **Supporting Components**:
   - `course-sidebar.tsx` - Navigation
   - `content-tabs.tsx` - Notes, resources, discussions
   - `course-top-bar.tsx` - Course header

### **Missing**:
- ❌ No AI integration
- ❌ No contextual help
- ❌ No interactive Q&A
- ❌ No intelligent feedback system

---

## 🏗️ Implementation Strategy

### **Phase 1: Foundation** (Week 1-2)
**Goal**: Add AI Tutor UI and basic infrastructure

#### 1.1 Environment Setup
```env
# Add to .env.example and .env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
# Choose one: OpenAI GPT-4 or Anthropic Claude

# AI Configuration
AI_PROVIDER=openai  # or 'anthropic'
AI_MODEL=gpt-4-turbo-preview  # or 'claude-3-sonnet-20240229'
AI_MAX_TOKENS=2000
AI_TEMPERATURE=0.7
```

#### 1.2 Database Schema
```sql
-- Create AI conversations table
CREATE TABLE IF NOT EXISTS ai_tutor_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create AI messages table
CREATE TABLE IF NOT EXISTS ai_tutor_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai_tutor_conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  lesson_context JSONB,  -- Stores lesson content snapshot for context
  tokens_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ai_conversations_user ON ai_tutor_conversations(user_id);
CREATE INDEX idx_ai_conversations_lesson ON ai_tutor_conversations(lesson_id);
CREATE INDEX idx_ai_messages_conversation ON ai_tutor_messages(conversation_id);
CREATE INDEX idx_ai_messages_created_at ON ai_tutor_messages(created_at DESC);

-- RLS Policies
ALTER TABLE ai_tutor_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_tutor_messages ENABLE ROW LEVEL SECURITY;

-- Users can only see their own conversations
CREATE POLICY "Users can view own conversations"
  ON ai_tutor_conversations FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can create own conversations"
  ON ai_tutor_conversations FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Users can view messages in their conversations
CREATE POLICY "Users can view own messages"
  ON ai_tutor_messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM ai_tutor_conversations WHERE user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can create messages in own conversations"
  ON ai_tutor_messages FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM ai_tutor_conversations WHERE user_id = auth.uid()::text
    )
  );
```

#### 1.3 UI Component Structure
```
client/src/components/ai-tutor/
├── AITutorButton.tsx          # Floating button to open tutor
├── AITutorPanel.tsx           # Main chat interface
├── AITutorMessage.tsx         # Individual message bubble
├── AITutorInput.tsx           # Input with suggestions
├── AITutorContext.tsx         # React context for state
├── AITutorSuggestions.tsx     # Quick action buttons
└── types.ts                   # TypeScript types
```

---

### **Phase 2: Core AI Integration** (Week 3-4)
**Goal**: Implement AI chat functionality

#### 2.1 Backend API Structure
```
api/ai-tutor/
├── chat.ts                    # Main chat endpoint
├── generate-suggestions.ts    # Context-aware suggestions
├── analyze-draft.ts           # Draft clause analysis
└── utils/
    ├── openai-client.ts      # OpenAI integration
    ├── anthropic-client.ts   # Anthropic integration
    ├── prompt-templates.ts   # System prompts
    └── context-builder.ts    # Build lesson context
```

#### 2.2 System Prompt Engineering
```typescript
// Base system prompt for CIMA AI Tutor
const CIMA_TUTOR_SYSTEM_PROMPT = `
You are CIMA AI Tutor, an expert in Alternative Dispute Resolution (ADR), 
specializing in international arbitration and mediation.

Your role is to help students understand complex ADR concepts, practice 
drafting clauses, and prepare for professional practice.

Guidelines:
1. Be concise yet thorough
2. Use real-world examples from international arbitration/mediation
3. Reference ICC, LCIA, UNCITRAL, and other major institutions when relevant
4. Help students think critically - ask guiding questions
5. When reviewing drafts, provide constructive feedback with specific improvements
6. Adapt your language level to the student's progress (Associate/Member/Fellow)
7. Always ground your answers in established ADR principles and best practices

Current Context:
- Course: {{courseName}}
- Lesson: {{lessonTitle}}
- Student Level: {{studentLevel}}
- Lesson Content: {{lessonContent}}
`;
```

#### 2.3 Context-Aware Features

**Automatically include**:
- Current lesson title and content
- Course name and level (Associate/Member/Fellow)
- Student's profile (experience level, track)
- Previous 5-10 messages in conversation
- Related lesson materials

---

### **Phase 3: Advanced Features** (Week 5-6)
**Goal**: Add intelligent tutoring capabilities

#### 3.1 Quick Actions (Contextual Buttons)
```typescript
// Dynamic suggestions based on lesson type and content
const getSuggestions = (lessonType: string, lessonContent: string) => {
  if (lessonType === 'article' && lessonContent.includes('arbitration agreement')) {
    return [
      "Explain the key elements of an arbitration agreement",
      "Show me a sample arbitration clause",
      "What makes an arbitration clause pathological?",
      "Help me draft a basic arbitration clause"
    ];
  }
  
  if (lessonType === 'video' && lessonContent.includes('mediation')) {
    return [
      "Summarize the key points from this lesson",
      "What are the stages of mediation?",
      "Give me a practice scenario",
      "Quiz me on this topic"
    ];
  }
  
  // Generic suggestions
  return [
    "Explain this in simpler terms",
    "Give me a real-world example",
    "What should I remember most?",
    "How does this apply in practice?"
  ];
};
```

#### 3.2 Intelligent Features

**1. Concept Simplification**
```
User: "Explain kompetenz-kompetenz"
AI: Breaks down complex concepts using analogies, examples, and layered explanations
```

**2. Interactive Questioning**
```
AI: "Let's test your understanding. In a dispute between a UK company 
     and a Chinese supplier, which arbitration rules might apply? Why?"
```

**3. Draft Review & Feedback**
```
User: [Pastes arbitration clause]
AI: Analyzes for:
  - Completeness (seat, rules, number of arbitrators)
  - Clarity and enforceability
  - Potential pathologies
  - Improvements with specific suggestions
```

**4. Practice Scenarios**
```
User: "Give me a practice negotiation scenario"
AI: Creates realistic ADR scenario with:
  - Parties and background
  - Dispute details
  - Your role and objectives
  - Guided negotiation practice
```

---

### **Phase 4: UI/UX Integration** (Week 7-8)
**Goal**: Seamless user experience

#### 4.1 Placement Options

**Option A: Floating Button (Recommended for MVP)**
```tsx
// Sticky button in bottom-right corner
<AITutorButton 
  position="bottom-right"
  courseId={courseId}
  lessonId={lessonId}
  lessonContent={currentLessonContent}
/>
```

**Option B: Sidebar Tab**
```tsx
// Add as tab in ContentTabs component
<ContentTabs 
  tabs={['Overview', 'Resources', 'Notes', 'AI Tutor']}
/>
```

**Option C: Split View (Advanced)**
```tsx
// Resizable split between lesson content and AI Tutor
<SplitPane>
  <LessonContent />
  <AITutorPanel />
</SplitPane>
```

#### 4.2 Mobile Optimization
- Slide-up drawer for AI Tutor
- Voice input for questions (future)
- Haptic feedback for interactions
- Offline mode with cached conversations

---

## 💻 Technical Implementation Details

### **Frontend Stack**:
```typescript
// React + TypeScript
// State Management: React Context + TanStack Query
// UI: Shadcn/ui components
// Markdown: react-markdown for formatted responses
// Syntax Highlighting: prism-react-renderer for code
```

### **Backend Stack**:
```typescript
// Node.js + Express (existing)
// AI Providers: OpenAI SDK or Anthropic SDK
// Rate Limiting: express-rate-limit
// Caching: Redis (optional, for conversation history)
```

### **API Endpoints**:
```typescript
POST /api/ai-tutor/chat
  Body: { conversationId?, lessonId, message, context }
  Response: { message, conversationId, suggestions? }

GET /api/ai-tutor/conversations
  Query: { courseId?, lessonId? }
  Response: { conversations: [...] }

GET /api/ai-tutor/conversation/:id
  Response: { conversation, messages: [...] }

DELETE /api/ai-tutor/conversation/:id
  Response: { success: true }

POST /api/ai-tutor/analyze-draft
  Body: { draft, type: 'clause' | 'award' | 'submission' }
  Response: { feedback, suggestions, score }
```

---

## 🔒 Security & Privacy

### **1. Rate Limiting**
```typescript
// Per user: 50 messages per hour
// Per lesson: 100 messages per day
// Token limits: 10,000 tokens per conversation
```

### **2. Content Moderation**
```typescript
// Filter inappropriate content
// Block attempts to jailbreak the AI
// Monitor for academic integrity violations
```

### **3. Data Privacy**
```typescript
// Conversations stored securely
// Users can delete conversation history
// GDPR-compliant data handling
// No PII in AI provider logs
```

### **4. Cost Management**
```typescript
// Set max tokens per request
// Cache common responses
// Implement conversation pruning (keep last N messages)
// Monitor API usage and costs
```

---

## 📈 Success Metrics

### **Student Engagement**:
- AI Tutor usage rate (% of students using it)
- Average messages per session
- Time spent with AI Tutor vs lesson content
- Return rate (students coming back to AI Tutor)

### **Learning Outcomes**:
- Quiz performance improvement (before/after using AI Tutor)
- Course completion rates
- Time to complete lessons
- Student satisfaction scores

### **Technical Metrics**:
- Response time (target: <3 seconds)
- AI accuracy/relevance (human evaluation)
- Error rate
- API costs per student

---

## 🚀 Rollout Strategy

### **Phase 1: Beta (Weeks 1-4)**
- Enable for admin and select instructors
- Test with 20-50 beta students
- Gather feedback and iterate
- Monitor costs and performance

### **Phase 2: Soft Launch (Weeks 5-8)**
- Rollout to Associate-level courses first
- Limited to text-based lessons initially
- Add contextual help for video lessons
- Expand to Member and Fellow levels

### **Phase 3: Full Launch (Week 9+)**
- All courses and lesson types
- Advanced features (draft analysis, scenarios)
- Mobile app optimization
- Marketing and promotion

---

## 💰 Cost Estimation

### **AI API Costs** (per student per month):
```
Assumptions:
- Average 50 messages per month
- Average 500 tokens per response
- OpenAI GPT-4 Turbo: $0.01/1K input tokens, $0.03/1K output tokens

Calculation:
Input: 50 messages × 200 tokens avg × $0.01/1K = $0.10
Output: 50 messages × 500 tokens avg × $0.03/1K = $0.75
Total: ~$0.85 per student per month

For 1,000 active students: ~$850/month
For 10,000 active students: ~$8,500/month
```

### **Infrastructure Costs**:
```
Database storage: ~$50/month (PostgreSQL)
API hosting: Covered by existing Vercel deployment
Monitoring: ~$25/month (optional)
Total additional: ~$75-100/month + AI costs
```

---

## 🎓 Future Enhancements (Phase 2)

### **CIMA Arbitrator Simulator**:
1. **Mock Arbitrations**
   - AI plays opposing counsel
   - AI witness that can be cross-examined
   - AI tribunal that makes rulings

2. **Mediation Simulations**
   - AI mediator or opposing party
   - Negotiation practice with feedback
   - Settlement drafting assistance

3. **Award Drafting**
   - Step-by-step award writing
   - AI reviews draft awards
   - Suggests improvements for clarity and enforceability

4. **Professional Tools** (for practitioners):
   - Clause library and drafting assistant
   - Arbitrator research and matching
   - Case management assistance
   - Document organization

---

## 📝 Next Steps

1. **Get API Keys**:
   - OpenAI API key or
   - Anthropic API key
   - Choose based on preference/testing

2. **Database Migration**:
   - Run the SQL to create tables
   - Test with sample data

3. **Build MVP Components**:
   - AITutorButton (floating)
   - AITutorPanel (chat interface)
   - Backend API endpoint

4. **Test & Iterate**:
   - Start with one course
   - Gather feedback
   - Refine prompts and features

---

**Ready to build the future of ADR education? Let's get those API keys and start coding!** 🚀
