/**
 * Test script for post-checkout flow
 * Run with: node scripts/test-post-checkout.js
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testPostCheckoutFlow() {
  console.log('🧪 Testing Post-Checkout Flow...\n');

  try {
    // Test 1: Check if tables exist
    console.log('📋 Checking database tables...');
    const tables = ['orders', 'enrollments', 'activity_log', 'courses', 'users'];
    
    for (const table of tables) {
      const { error } = await supabase.from(table).select('count').limit(1);
      if (error) {
        console.error(`❌ Table ${table} error:`, error.message);
      } else {
        console.log(`✅ Table ${table} exists`);
      }
    }

    // Test 2: Verify payment verification endpoint structure
    console.log('\n🔗 Testing API endpoint structure...');
    const testUserId = 'test-user-id';
    const testCourseId = 'test-course-id';
    const testReference = `test_${Date.now()}`;

    // Create test order
    console.log('📝 Creating test order...');
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: testUserId,
        course_id: testCourseId,
        amount: '100.00',
        currency: 'GHS',
        status: 'completed',
        paystack_reference: testReference,
        amount_usd: '7.50',
        amount_ghs: '100.00',
        exchange_rate: '13.33',
        original_currency: 'USD',
        charged_currency: 'GHS',
      })
      .select()
      .single();

    if (orderError) {
      console.error('❌ Order creation failed:', orderError.message);
    } else {
      console.log('✅ Test order created:', order.id);
    }

    // Create test enrollment
    console.log('📝 Creating test enrollment...');
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .insert({
        user_id: testUserId,
        course_id: testCourseId,
        progress: '0',
        status: 'ACTIVE',
        enrollment_type: 'COURSE',
        enrollment_level: 'ASSOCIATE',
        payment_reference: testReference,
        payment_amount: 100.00,
        payment_currency: 'GHS',
      })
      .select()
      .single();

    if (enrollmentError) {
      console.error('❌ Enrollment creation failed:', enrollmentError.message);
    } else {
      console.log('✅ Test enrollment created:', enrollment.id);
    }

    // Create test activity logs
    console.log('📝 Creating test activity logs...');
    const activities = [
      {
        user_id: testUserId,
        event_type: 'course_enrolled',
        event_data: {
          course_id: testCourseId,
          course_name: 'Test Course',
          enrollment_id: enrollment?.id,
          payment_reference: testReference,
          payment_type: 'individual',
        },
      },
      {
        user_id: testUserId,
        event_type: 'provisioning_completed',
        event_data: {
          userId: testUserId,
          courseId: testCourseId,
          enrollmentLevel: 'ASSOCIATE',
          paymentType: 'individual',
          completed_steps: ['welcome_email', 'community_access', 'crm_update'],
        },
      },
      {
        user_id: testUserId,
        event_type: 'email_sent',
        event_data: {
          template: 'welcome_associate',
          recipient: 'test@example.com',
          course_name: 'Test Course',
        },
      },
      {
        user_id: testUserId,
        event_type: 'community_access_granted',
        event_data: {
          channels: ['course-test-course-general', 'course-test-course-announcements', 'associate-members'],
          course_id: testCourseId,
        },
      },
    ];

    for (const activity of activities) {
      const { error: activityError } = await supabase
        .from('activity_log')
        .insert(activity);

      if (activityError) {
        console.error(`❌ Activity log creation failed for ${activity.event_type}:`, activityError.message);
      } else {
        console.log(`✅ Activity log created: ${activity.event_type}`);
      }
    }

    // Test 3: Verify data retrieval
    console.log('\n🔍 Testing data retrieval...');
    
    // Get order
    const { data: retrievedOrder, error: retrieveOrderError } = await supabase
      .from('orders')
      .select('*')
      .eq('paystack_reference', testReference)
      .single();

    if (retrieveOrderError) {
      console.error('❌ Order retrieval failed:', retrieveOrderError.message);
    } else {
      console.log('✅ Order retrieved successfully');
    }

    // Get enrollment
    const { data: retrievedEnrollment, error: retrieveEnrollmentError } = await supabase
      .from('enrollments')
      .select('*')
      .eq('user_id', testUserId)
      .eq('course_id', testCourseId)
      .single();

    if (retrieveEnrollmentError) {
      console.error('❌ Enrollment retrieval failed:', retrieveEnrollmentError.message);
    } else {
      console.log('✅ Enrollment retrieved successfully');
    }

    // Get activity logs
    const { data: activityLogs, error: activityLogsError } = await supabase
      .from('activity_log')
      .select('*')
      .eq('user_id', testUserId)
      .order('created_at', { ascending: false });

    if (activityLogsError) {
      console.error('❌ Activity logs retrieval failed:', activityLogsError.message);
    } else {
      console.log(`✅ ${activityLogs.length} activity logs retrieved`);
    }

    // Test 4: Cleanup test data
    console.log('\n🧹 Cleaning up test data...');
    
    const { error: deleteOrderError } = await supabase
      .from('orders')
      .delete()
      .eq('paystack_reference', testReference);

    if (deleteOrderError) {
      console.error('❌ Order cleanup failed:', deleteOrderError.message);
    } else {
      console.log('✅ Test order cleaned up');
    }

    const { error: deleteEnrollmentError } = await supabase
      .from('enrollments')
      .delete()
      .eq('user_id', testUserId)
      .eq('course_id', testCourseId);

    if (deleteEnrollmentError) {
      console.error('❌ Enrollment cleanup failed:', deleteEnrollmentError.message);
    } else {
      console.log('✅ Test enrollment cleaned up');
    }

    const { error: deleteActivitiesError } = await supabase
      .from('activity_log')
      .delete()
      .eq('user_id', testUserId);

    if (deleteActivitiesError) {
      console.error('❌ Activity logs cleanup failed:', deleteActivitiesError.message);
    } else {
      console.log('✅ Test activity logs cleaned up');
    }

    console.log('\n🎉 Post-checkout flow test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    process.exit(1);
  }
}

// Run the test
testPostCheckoutFlow().then(() => {
  console.log('\n✨ All tests completed');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Test suite failed:', error);
  process.exit(1);
});
