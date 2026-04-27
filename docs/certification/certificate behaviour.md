Certificate Behavior:

A user gets only ONE certificate per track per level
When they complete their first course at a level (e.g., Arbitration Associate), the system checks if they already have a certificate for that track/level
If no certificate exists: Creates the certificate (e.g., ACIMArb)
If certificate already exists: Marks the course completion as "supplementary training" - recorded in course_completion_records but no new certificate issued
So if a user takes multiple Arbitration Associate courses:

First course completion: Issues ACIMArb certificate, updates track_progress to ASSOCIATE
Second+ course completions: Marked as supplementary training, no new certificate, but completion is recorded
Enrollment:

Users can enroll in multiple courses at the same level
They can complete all of them
All completions are recorded in course_completion_records
But only the first completion per track/level triggers certificate issuance
Maximum Certificates:

Arbitration: ACIMArb, MCIMArb, FCIMArb (3 max)
Mediation: ACIMed, MCIMed, FCIMed (3 max)
Total: 6 certificates per user
This prevents duplicate certificates while allowing users to take additional courses for learning purposes.