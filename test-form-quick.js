// Quick test for personal notes form endpoint
// Run with: node test-form-quick.js

const FormData = require('form-data');
const fetch = require('node-fetch');

async function testFormSubmission() {
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

  try {
    console.log('Testing form submission...');
    const response = await fetch('http://localhost:5000/api/personal-notes-forms', {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });

    console.log('Status:', response.status);
    const data = await response.text();
    console.log('Response:', data);

    if (response.ok) {
      console.log('✅ SUCCESS! Form submitted successfully');
    } else {
      console.log('❌ ERROR! Form submission failed');
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

testFormSubmission();
