## Apply `formatCoursePrice` to remaining price displays

The earlier pass updated `courses.tsx`, `course-detail.tsx`, the lesson editor video-preservation fix, and instructor self-enroll. Three price locations still render raw numbers and need the same "Free" treatment.

### Files to update

1. **`client/src/pages/course-search.tsx`** — replace raw `${course.price}` / `course.price.toLocaleString()` displays with `formatCoursePrice(course.price)`.
2. **`client/src/pages/course-browser.tsx`** — same replacement on the course card price.
3. **`client/src/components/admin-courses-table.tsx`** — same replacement in the price column cell.

### Approach

- Import `formatCoursePrice` from `@/lib/format-price` in each file.
- Swap the inline price expression for `formatCoursePrice(course.price)`.
- Remove any now-unused currency prefix (`$`) around the call since the helper returns either `"Free"` or `"USD 1,234.00"`.
- No logic, props, or styling changes beyond the text node.

### Verification

- Build passes.
- Spot-check each surface in preview: a $0 course renders "Free"; a priced course renders the formatted amount.
