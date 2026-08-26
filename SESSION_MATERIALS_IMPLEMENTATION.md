# 🎯 Live Session Assignments & Resources - Implementation Guide

## Overview
I've implemented the **backend and display** for session assignments and resources. Now I need to add the **creation/upload UI**.

## ✅ What's Already Done

### 1. **Database Schema** (SQL Ready)
- `ADD_SESSION_ASSIGNMENTS_AND_RESOURCES.sql` - Adds `session_id` to assignments and resources tables
- `CREATE_SESSION_RESOURCES_BUCKET.sql` - Creates storage bucket for session files
- RLS policies configured

### 2. **API Endpoints** (Working)
- `POST /api/sessions/{id}/assignments` - Create assignment
- `GET /api/sessions/{id}/assignments` - List assignments
- `DELETE /api/sessions/{id}/assignments` - Delete assignments
- `POST /api/sessions/{id}/resources` - Upload resource file
- `GET /api/sessions/{id}/resources` - List resources  
- `DELETE /api/sessions/{id}/resources` - Delete resource

### 3. **Display Component** (Working)
- `client/src/components/live-sessions/session-materials.tsx`
- Shows assignments and resources on session detail page
- Only visible to registered students + instructors
- Downloads, due dates, file info all working

### 4. **Session Detail Page** (Updated)
- `client/src/pages/session-detail.tsx`
- Displays SessionMaterials component
- Students see materials after registering

### 5. **Past Sessions Tab** (Already Exists)
- Sessions page already has "Past" tab
- Shows completed sessions
- They remain visible (your requirement is already met!)

---

## ❌ What's Missing - THE CREATION UI

You want to be able to:

### **Scenario 1: When Creating a New Session**
1. Admin clicks "Schedule Live Session"
2. Dialog opens with tabs:
   - **Session Details** (basic info - already exists)
   - **Assignments** (add assignments - NEED TO BUILD)
   - **Resources** (upload files - NEED TO BUILD)
3. Fill in optional assignments/resources
4. Click "Schedule Session" → Everything saves together

### **Scenario 2: When Editing an Existing Session**
1. Admin clicks "Edit" on session detail page
2. Same dialog opens in edit mode
3. Can add/edit/delete assignments
4. Can upload/delete resources
5. Click "Update Session" → Changes saved

---

## 🚀 Implementation Plan

### Step 1: Modify CreateSessionDialog Component
Add these sections:

```tsx
<Tabs>
  <TabsList>
    <TabsTrigger>Session Details</TabsTrigger>
    <TabsTrigger>Assignments (Optional)</TabsTrigger>
    <TabsTrigger>Resources (Optional)</TabsTrigger>
  </TabsList>

  <TabsContent value="details">
    {/* Existing form fields */}
  </TabsContent>

  <TabsContent value="assignments">
    {/* Assignment builder */}
    <Button onClick={addAssignment}>Add Assignment</Button>
    {assignments.map(assignment => (
      <AssignmentForm 
        data={assignment}
        onChange={updateAssignment}
        onDelete={removeAssignment}
      />
    ))}
  </TabsContent>

  <TabsContent value="resources">
    {/* File uploader */}
    <Input type="file" onChange={handleFileSelect} />
    {resources.map(resource => (
      <ResourceItem 
        data={resource}
        onDelete={removeResource}
      />
    ))}
  </TabsContent>
</Tabs>
```

### Step 2: Save Flow
1. User fills session form + optionally adds materials
2. Click "Schedule Session"
3. **First**: Create the session (existing logic)
4. **Then**: If assignments exist, POST each to `/api/sessions/{id}/assignments`
5. **Then**: If resources exist, POST each to `/api/sessions/{id}/resources`
6. **Finally**: Show success toast and refresh

---

## 🎨 UI Components Needed

### AssignmentForm (inline component)
```tsx
<Card>
  <Input label="Assignment Title" />
  <Textarea label="Instructions" />
  <Input type="datetime-local" label="Due Date (optional)" />
  <Input type="number" label="Max Points" defaultValue={100} />
  <Switch label="Allow late submission" />
  <Button variant="destructive" onClick={onDelete}>Remove</Button>
</Card>
```

### ResourceUploadForm (inline component)
```tsx
<Card>
  <Input label="Resource Title" />
  <Input type="file" accept=".pdf,.doc,.docx" />
  <Button onClick={upload}>Upload</Button>
</Card>

{/* After upload */}
<div>
  <File icon />
  <span>{filename}</span>
  <Badge>{filesize}</Badge>
  <Button onClick={onDelete}>Remove</Button>
</div>
```

---

## 🔧 Technical Details

### State Management
```tsx
const [assignments, setAssignments] = useState<Assignment[]>([]);
const [resources, setResources] = useState<Resource[]>([]);

const addAssignment = () => {
  setAssignments([...assignments, {
    id: crypto.randomUUID(),
    title: '',
    instructions: '',
    due_date: null,
    max_score: 100,
    allow_late_submission: true,
  }]);
};

const updateAssignment = (id, data) => {
  setAssignments(prev => prev.map(a => a.id === id ? {...a, ...data} : a));
};

const removeAssignment = (id) => {
  setAssignments(prev => prev.filter(a => a.id !== id));
};
```

### Resource Upload
```tsx
const handleFileSelect = async (file: File) => {
  setUploadingResource(true);
  
  const formData = new FormData();
  formData.append('resource', file);
  formData.append('title', file.name);

  // Temporarily store in state until session is created
  setResources([...resources, {
    id: crypto.randomUUID(),
    title: file.name,
    file: file, // Store file object
    size: file.size,
  }]);
  
  setUploadingResource(false);
};
```

### Save Logic Update
```tsx
const createSessionMutation = useMutation({
  mutationFn: async (data) => {
    // 1. Create session (existing logic)
    const response = await apiRequest('POST', '/api/sessions', sessionData);
    const session = await response.json();
    
    // 2. Create assignments if any
    for (const assignment of assignments) {
      await apiRequest('POST', `/api/sessions/${session.id}/assignments`, {
        title: assignment.title,
        instructions: assignment.instructions,
        due_date: assignment.due_date,
        max_score: assignment.max_score,
        allow_late_submission: assignment.allow_late_submission,
      });
    }
    
    // 3. Upload resources if any
    for (const resource of resources) {
      const formData = new FormData();
      formData.append('resource', resource.file);
      formData.append('title', resource.title);
      
      await fetch(`/api/sessions/${session.id}/resources`, {
        method: 'POST',
        body: formData,
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    
    return session;
  },
});
```

---

## 🎯 Final Result

### Creating a Session:
1. Click "Schedule Live Session"
2. **Tab 1 (Session Details)**: Fill title, date, time, instructor
3. **Tab 2 (Assignments)**: Click "Add Assignment" → Fill form → Repeat if needed
4. **Tab 3 (Resources)**: Upload PDF/DOCX files → Repeat if needed
5. Click "Schedule Session" → Done!

### Editing a Session:
1. On session detail page, click "Edit"
2. Same dialog opens with **existing data pre-filled**
3. Existing assignments/resources shown
4. Can add new ones or delete existing
5. Click "Update Session" → Done!

### For Students:
1. Register for session
2. View session details
3. See "Session Assignments" section with tasks
4. See "Session Resources" section with downloads
5. Session remains visible in "Past" tab even after it ends (so they can complete assignments)

---

## 🚀 Next Steps

Should I:
1. ✅ Complete the CreateSessionDialog with tabs and forms
2. ✅ Add assignment builder inline
3. ✅ Add resource uploader inline
4. ✅ Update save logic to handle materials
5. ✅ Test the full flow

**This will take about 30-45 minutes to implement properly.**

Ready to proceed? 🔥
