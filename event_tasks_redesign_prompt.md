# Event Tasks Redesign Prompt - Match Recurring Tasks Style

## Overview
Transform the Event-Based Tasks interface to match the exact visual style, layout, and interaction patterns of the Recurring Tasks interface shown in Image 1.

---

## Current State (Image 2 - Event Tasks)
- Purple header with stats (14 Total, 0 Completed, 14 Pending)
- Grouped by trigger events ("On Installation", "On Purchase")
- Simple list of tasks with "Complete Task" buttons
- Minimal information display
- No data entry or evidence upload capabilities

## Target State (Image 1 - Recurring Tasks)
Match this exact design and functionality.

---

## Required Changes

### 1. **Remove the Purple Header Stats Section**
- Delete the purple banner showing "Event-Based Tasks", "14 Total", "0 Completed", "14 Pending"
- Keep only the tab switcher at the top

### 2. **Add Progress Dashboard (Two Cards Side-by-Side)**
Create two progress cards exactly like the recurring tasks:

**Left Card: "Overall Event Tasks Progress"**
- Title: "Overall Event Tasks Progress" or "All-Time Progress"
- Two progress bars:
  - **Data Entry Progress**: Blue bar with percentage (e.g., "6%")
  - **Evidence Upload**: Green bar with percentage (e.g., "0%")
- Bottom section: 
  - Large number: "X / Y" (completed tasks / total tasks)
  - Subtitle: "Tasks Completed (Data + Evidence)"
  - Small text: "Data Entries: X | Evidence Files: Y"

**Right Card: "Current Pending Tasks" or "Active Tasks"**
- Similar structure to monthly progress in recurring tasks
- Show progress for currently active/pending event tasks
- Same two progress bars (Data Entry, Evidence Upload)
- Bottom section with tasks remaining count

### 3. **Add Filter Controls Section**
Below progress cards, add a white card with border containing:

**Left side:**
- "View by:" dropdown (All, Missing, Partial, Complete, By Event Type)
- "Group by:" dropdown (Event Type, Status, Category, Frequency)
- "Assignment:" dropdown (All Tasks, Assigned, Unassigned)

**Right side:**
- Search bar: "Search event tasks..."
- "Refresh" button (orange)
- "Upload Multiple Files" button (blue)
- "Export Data" button (green) - if applicable for view-only users

### 4. **Transform Task Cards to Match Recurring Tasks Style**

**For each event task, create a card with:**

**Header Section:**
- Status indicator dot (red/orange/green circle)
- Task name as bold title
- Badges below name:
  - Event trigger type badge (e.g., "On Installation", "On Purchase") - blue background
  - Frequency/requirement badge (e.g., "Required", "One-time") - gray background
  - Category badge (e.g., "Environmental", "Governance") - purple background
- Right side:
  - Assignment info: "Assigned: [username]" or "Unassigned"
  - "Assign" or "Reassign" button (blue, small)
  - Status indicator: "Complete", "Partial", or "Missing" with icon

**Main Content Section (Split Left/Right):**

**Left Half - Data Entry:**
- Icon + label: "📊 Data Entry"
- Large input field with:
  - Number input (or appropriate input type)
  - Unit label on the right side inside the input
  - Gray background when empty
  - For view-only users: display value in read-only field with eye icon
- Auto-save functionality (show "Auto-saving..." when typing)

**Right Half - Evidence Upload:**
- Icon + label: "📎 Evidence"
- Clear file button (trash icon) in top-right if file exists
- File upload area:
  - Dashed border box
  - "Drop file or click" text when empty
  - File icon and filename when uploaded
  - "File uploaded" confirmation when complete
  - For view-only: show filename with "View only" text

**Mobile Responsive:**
- On mobile, stack left/right sections vertically
- Add horizontal divider between data entry and evidence sections

### 5. **Group Tasks by Event Type**
If "Group by: Event Type" is selected:
- Create collapsible sections for each event type
- Section headers:
  - Event type name (e.g., "On Installation")
  - Horizontal line
  - Badge showing count (e.g., "6 items")
- List all tasks under each section

### 6. **Color-Coded Card Backgrounds**
Match the recurring tasks status colors:
- **Complete**: `bg-green-50 border-green-200`
- **Partial**: `bg-orange-50 border-orange-200`
- **Missing**: `bg-red-50 border-red-200`

### 7. **Add Action Footer**
At the bottom, add a white card with:
- Left: "Back" button (gray outline)
- Right: "Save & Continue" button (blue-purple gradient)

### 8. **Empty State**
If no event tasks exist:
```
Icon: Bolt icon (fa-bolt) in gray
Heading: "No event-based tasks found"
Description: "Event tasks are triggered by specific actions like installations, purchases, or upgrades."
Button: "Configure Event Tasks" (links to settings)
```

### 9. **Role-Based Permissions**
Apply the same permission badges as recurring tasks:
- View Only users: Show eye icon badge, read-only inputs
- Uploaders: "Assigned Tasks Only" badge, can edit assigned tasks
- Meter Managers: "Meter Data Only" badge (if applicable)
- Site Managers: "Review Mode" badge

### 10. **Assignment Modal**
When clicking "Assign" button, show the same modal as recurring tasks:
- White modal with rounded corners
- Title: "Assign Event Task"
- Task details in blue info box
- List of available users with:
  - User avatar/icon
  - Name and role
  - Email
  - Site count badge
  - Chevron right icon
- Role-based filtering (same as recurring tasks)
- Cancel button at bottom

---

## Technical Implementation Notes

### Data Structure
Event tasks should have the same fields as recurring tasks:
```javascript
{
  id, name, description, 
  event_type, // e.g., "On Installation", "On Purchase"
  category, unit, value, 
  status, // 'missing', 'partial', 'complete'
  evidence_file,
  assignedTo, assignedUserId, assignedAt,
  required, // boolean for Required badge
}
```

### State Management
Add the same state variables as recurring tasks:
- `entryValues` - track input changes
- `entryFiles` - track file uploads
- `savingEntries` - track auto-save status
- `searchTerm`, `viewFilter`, `groupBy`, `assignmentFilter`

### Auto-Save
Implement the same auto-save with 1.5 second debounce as recurring tasks

### Progress Calculation
Calculate progress based on:
- Total event tasks (consider only "Required" tasks or all tasks)
- Data entry completion (tasks with values entered)
- Evidence upload completion (tasks with files uploaded)
- Overall = (data_completed + evidence_completed) / (total_tasks * 2)

### API Integration
Create/use endpoints:
- `GET /api/event-tasks/` - fetch all event tasks
- `GET /api/event-tasks/progress/` - get completion stats
- `PATCH /api/event-tasks/{id}/` - save data/evidence
- `POST /api/event-tasks/assign/` - assign tasks

---

## Visual Reference Checklist

From Image 1 (Recurring Tasks), ensure you replicate:
- ✅ Month selector (replace with event type selector or remove if not needed)
- ✅ Two-card progress dashboard layout
- ✅ Blue and green progress bars
- ✅ Filter dropdowns with icons
- ✅ Search bar styling
- ✅ Button group (Refresh, Upload, Export)
- ✅ Grouped sections with headers and item counts
- ✅ Task card with status dot
- ✅ Badge styling (blue for meters, gray for frequency, purple for location)
- ✅ Split layout (data entry left, evidence right)
- ✅ Input field with unit label inside
- ✅ Dashed border file upload area
- ✅ Assignment section with Assign/Reassign button
- ✅ Status indicator (Complete/Partial/Missing with icons)
- ✅ Auto-saving indicator
- ✅ Card background colors based on status
- ✅ Action footer with Back and Save & Continue buttons

---

## Summary
The goal is to make Event Tasks look **identical** to Recurring Tasks, with the only differences being:
1. Task data comes from event-based triggers instead of monthly/annual schedules
2. No month selector (unless you add an event timeline/history view)
3. Progress cards show "Overall" and "Active" instead of "Annual" and "Monthly"

Everything else - layout, styling, interactions, filters, cards, inputs, modals - should be **exactly the same**.