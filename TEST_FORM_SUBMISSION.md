# Test Form Submission After Fix

## Option 1: Test via Browser Console

Open your browser console on the form page and run:

```javascript
const formData = new FormData();

// Add required fields
formData.append('fullName', 'Test User');
formData.append('gender', 'male');
formData.append('age', '30');
formData.append('dateOfBirth', '1994-01-01');
formData.append('nationality', 'Ghanaian');
formData.append('hometown', 'Accra');
formData.append('region', 'Greater Accra');
formData.append('languagesSpoken', 'English, Twi');
formData.append('ghanaCardNo', 'GHA-123456789-0');
formData.append('houseNo', '123');
formData.append('streetArea', 'Test Street');
formData.append('townCity', 'Accra');
formData.append('gpsAddress', 'GA-123-4567');
formData.append('lengthOfStay', '5 years');
formData.append('fatherName', 'Test Father');
formData.append('motherName', 'Test Mother');
formData.append('numberOfChildren', '0');
formData.append('nokName', 'Test NOK');
formData.append('nokRelationship', 'Brother');
formData.append('nokTelephone', '0241234567');
formData.append('nokAddress', 'Test Address');
formData.append('nokOccupation', 'Engineer');
formData.append('emergencyName', 'Test Emergency');
formData.append('emergencyRelationship', 'Sister');
formData.append('emergencyTelephone', '0241234568');
formData.append('emergencyAddress', 'Test Emergency Address');
formData.append('highestQualification', 'Degree');
formData.append('schoolAttended', 'Test University');
formData.append('yearCompleted', '2020');
formData.append('bloodGroup', 'O');
formData.append('rhesusFactor', 'positive');
formData.append('medicalConditions', JSON.stringify([]));
formData.append('knownAllergies', 'None');
formData.append('currentMedication', 'None');
formData.append('previousIllnesses', 'None');
formData.append('physicalLimitations', 'false');
formData.append('doctorTelephone', '0241234569');
formData.append('vaccinations', JSON.stringify(['covid19']));
formData.append('height', '175cm');
formData.append('distinguishingMarks', 'None');
formData.append('employeeSignatureName', 'Test User');
formData.append('declarationDate', '2026-09-01');

// Submit
fetch('/api/personal-notes-forms', {
  method: 'POST',
  body: formData
})
  .then(res => res.json())
  .then(data => console.log('✅ Success:', data))
  .catch(err => console.error('❌ Error:', err));
```

## Option 2: Test via cURL

```bash
curl -X POST https://cimalearn.thecima.org/api/personal-notes-forms \
  -F "fullName=Test User" \
  -F "gender=male" \
  -F "age=30" \
  -F "dateOfBirth=1994-01-01" \
  -F "nationality=Ghanaian" \
  -F "hometown=Accra" \
  -F "region=Greater Accra" \
  -F "languagesSpoken=English, Twi" \
  -F "ghanaCardNo=GHA-123456789-0" \
  -F "houseNo=123" \
  -F "streetArea=Test Street" \
  -F "townCity=Accra" \
  -F "gpsAddress=GA-123-4567" \
  -F "lengthOfStay=5 years" \
  -F "fatherName=Test Father" \
  -F "motherName=Test Mother" \
  -F "numberOfChildren=0" \
  -F "nokName=Test NOK" \
  -F "nokRelationship=Brother" \
  -F "nokTelephone=0241234567" \
  -F "nokAddress=Test Address" \
  -F "nokOccupation=Engineer" \
  -F "emergencyName=Test Emergency" \
  -F "emergencyRelationship=Sister" \
  -F "emergencyTelephone=0241234568" \
  -F "emergencyAddress=Test Emergency Address" \
  -F "highestQualification=Degree" \
  -F "schoolAttended=Test University" \
  -F "yearCompleted=2020" \
  -F "bloodGroup=O" \
  -F "rhesusFactor=positive" \
  -F "medicalConditions=[]" \
  -F "knownAllergies=None" \
  -F "currentMedication=None" \
  -F "previousIllnesses=None" \
  -F "physicalLimitations=false" \
  -F "doctorTelephone=0241234569" \
  -F "vaccinations=[\"covid19\"]" \
  -F "height=175cm" \
  -F "distinguishingMarks=None" \
  -F "employeeSignatureName=Test User" \
  -F "declarationDate=2026-09-01"
```

## Expected Response

### Success (200)
```json
{
  "success": true,
  "message": "Form submitted successfully",
  "id": "uuid-here"
}
```

### Error (500)
```json
{
  "error": "Failed to save form data"
}
```

Check your server terminal for the detailed error message.

## What to Check If Still Failing

1. **Server Terminal**: Look for specific error messages
2. **Supabase Dashboard**: 
   - Check if table exists in Table Editor
   - Check if storage bucket exists in Storage
3. **Browser Network Tab**: Check the actual request/response
4. **Server Logs**: Run `npm run dev` and watch for errors
