import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function seedDatabase() {
  try {
    console.log("Starting database seeding...");

    // Clear existing data
    await supabase.from('quiz_answers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('quiz_questions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('quizzes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('lessons').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('modules').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('course_enrollments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('reviews').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('courses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('categories').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Create sample users
    const { data: sampleUsers, error: usersError } = await supabase
      .from('users')
      .insert([
        {
          id: "user-1",
          email: "john.instructor@example.com",
          first_name: "John",
          last_name: "Smith",
          role: "instructor",
          bio: "Experienced mediator with 15+ years in conflict resolution",
          country: "United States",
          profile_image_url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150"
        },
        {
          id: "user-2", 
          email: "jane.student@example.com",
          first_name: "Jane",
          last_name: "Doe",
          role: "student",
          bio: "Law student interested in alternative dispute resolution",
          country: "Canada",
          profile_image_url: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150"
        },
        {
          id: "user-3",
          email: "admin@cimalearn.com",
          first_name: "CIMA",
          last_name: "Admin",
          role: "admin",
          bio: "Administrator for CIMA Learn platform",
          country: "United Kingdom",
          profile_image_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"
        }
      ])
      .select();
    if (usersError) throw usersError;

    // Create categories based on real CIMA offerings
    const { data: sampleCategories, error: categoriesError } = await supabase
      .from('categories')
      .insert([
        {
          name: "International Arbitration",
          description: "Advanced training in domestic and international arbitration law and practice",
          slug: "international-arbitration"
        },
        {
          name: "Mediation & ADR", 
          description: "Comprehensive mediation training and alternative dispute resolution methods",
          slug: "mediation-adr"
        },
        {
          name: "Professional Membership",
          description: "Fast-track pathways to MCIMArb membership and professional certification",
          slug: "professional-membership"
        },
        {
          name: "Specialized Training",
          description: "Specialized courses in maritime mediation, AI tools, and practical skills",
          slug: "specialized-training"
        }
      ])
      .select();
    if (categoriesError) throw categoriesError;

    // Create courses based on real CIMA offerings
    const { data: sampleCourses, error: coursesError } = await supabase
      .from('courses')
      .insert([
        {
          title: "Advanced Law, Practice & Procedure in Domestic and International Arbitration",
          description: "Welcome to the 2025 Autumn Academy! We are delighted to have you join the Global Arbitration Programme at the Center for International Mediators and Arbitrators (CIMA). This comprehensive course covers advanced arbitration law, practice, and procedures for both domestic and international disputes.",
          instructor_id: sampleUsers![0].id,
          category_id: sampleCategories![0].id,
          price: "2950.00",
          level: "fellow",
          duration_hours: 72,
          is_featured: true,
          thumbnail_url: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400",
          avg_rating: "4.9",
          enrollment_count: 89,
          is_published: true
        },
        {
          title: "Law, Practice and Procedure in Domestic and International Mediation",
          description: "Law, Practice and Procedure in Domestic and International Mediation - Empowering the Next Generation of International Mediators. Are you eager to enhance your mediation skills and become a recognized international mediator? This comprehensive course provides in-depth training in mediation law, practice, and procedures.",
          instructor_id: sampleUsers![0].id,
          category_id: sampleCategories![1].id,
          price: "1850.00",
          level: "member",
          duration_hours: 60,
          is_featured: true,
          thumbnail_url: "https://images.unsplash.com/photo-1556157382-97eda2d62296?w=400",
          avg_rating: "4.8",
          enrollment_count: 156,
          is_published: true
        },
        {
          title: "Expedited Route to Membership (MCIMArb) – On Demand",
          description: "We are pleased to announce the Expedited Route to MCIMArb Membership—a fast-track pathway designed for legal professionals, ADR practitioners, and qualified individuals seeking to advance their careers in international arbitration and mediation.",
          instructor_id: sampleUsers![0].id,
          category_id: sampleCategories![2].id,
          price: "1200.00",
          level: "member",
          duration_hours: 40,
          is_featured: true,
          thumbnail_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
          avg_rating: "4.7",
          enrollment_count: 234,
          is_published: true
        },
        {
          title: "Online Course on Maritime Mediation",
          description: "Are you passionate about conflict resolution at sea? Are you eager to understand how maritime disputes are mediated across international waters? This specialized course provides comprehensive training in maritime mediation techniques and international maritime law.",
          instructor_id: sampleUsers![0].id,
          category_id: sampleCategories![3].id,
          price: "950.00",
          level: "member",
          duration_hours: 35,
          is_featured: false,
          thumbnail_url: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400",
          avg_rating: "4.6",
          enrollment_count: 67,
          is_published: true
        },
        {
          title: "AI Tools for ADR Practitioners",
          description: "2-Day Course: AI Tools for ADR Practitioners - Enhance Efficiency. Unlock Insight. Stay Ahead. Are you curious about how artificial intelligence can revolutionize your ADR practice? This cutting-edge course explores practical AI applications for mediators and arbitrators.",
          instructor_id: sampleUsers![0].id,
          category_id: sampleCategories![3].id,
          price: "750.00",
          level: "associate",
          duration_hours: 16,
          is_featured: false,
          thumbnail_url: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400",
          avg_rating: "4.8",
          enrollment_count: 198,
          is_published: true
        },
        {
          title: "Mock Arbitrations",
          description: "The hallmark of success in any discipline is preparation. As the great Muhammad Ali once observed: 'The fight is won or lost far away from witnesses—behind the lines, in the gym, and out there on the road, long before I dance under those lights.' This intensive practical course provides hands-on arbitration experience through realistic case simulations.",
          instructor_id: sampleUsers![0].id,
          category_id: sampleCategories![0].id,
          price: "1500.00",
          level: "fellow",
          duration_hours: 48,
          is_featured: true,
          thumbnail_url: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=400",
          avg_rating: "4.9",
          enrollment_count: 123,
          is_published: true
        }
      ])
      .select();
    if (coursesError) throw coursesError;

    // Create modules and lessons for the first course
    const { data: module1, error: module1Error } = await supabase
      .from('modules')
      .insert({
        title: "Mediation Fundamentals",
        description: "Understanding the basic principles of mediation",
        course_id: sampleCourses![0].id,
        order: 1
      })
      .select()
      .single();
    if (module1Error) throw module1Error;

    const { data: module2, error: module2Error } = await supabase
      .from('modules')
      .insert({
        title: "Communication Techniques",
        description: "Advanced communication skills for mediators",
        course_id: sampleCourses![0].id,
        order: 2
      })
      .select()
      .single();
    if (module2Error) throw module2Error;

    // Create lessons for module 1
    const { error: lessons1Error } = await supabase
      .from('lessons')
      .insert([
        {
          title: "What is Mediation?",
          description: "Introduction to mediation concepts and principles",
          module_id: module1.id,
          order: 1,
          content_type: "video",
          duration_seconds: 900,
          video_url: "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4",
          content: "In this lesson, we explore the fundamental concepts of mediation..."
        },
        {
          title: "The Role of the Mediator",
          description: "Understanding mediator responsibilities and ethics",
          module_id: module1.id,
          order: 2,
          content_type: "video",
          duration_seconds: 1200,
          video_url: "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_2mb.mp4",
          content: "The mediator plays a crucial role in facilitating dialogue..."
        },
        {
          title: "Mediation Process Overview",
          description: "Step-by-step guide to the mediation process",
          module_id: module1.id,
          order: 3,
          content_type: "text",
          duration_seconds: 600,
          content: "The mediation process typically consists of several key stages..."
        }
      ]);
    if (lessons1Error) throw lessons1Error;

    // Create lessons for module 2
    const { error: lessons2Error } = await supabase
      .from('lessons')
      .insert([
        {
          title: "Active Listening Techniques",
          description: "Master the art of active listening in mediation",
          module_id: module2.id,
          order: 1,
          content_type: "video",
          duration_seconds: 1500,
          video_url: "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4",
          content: "Active listening is one of the most important skills for mediators..."
        },
        {
          title: "Managing Emotional Conversations",
          description: "Techniques for handling high-emotion situations",
          module_id: module2.id,
          order: 2,
          content_type: "video",
          duration_seconds: 1800,
          video_url: "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_2mb.mp4",
          content: "When emotions run high, mediators must know how to..."
        }
      ]);
    if (lessons2Error) throw lessons2Error;

    // Create sample enrollment
    const { error: enrollmentError } = await supabase
      .from('course_enrollments')
      .insert({
        user_id: sampleUsers![1].id,
        course_id: sampleCourses![0].id,
        enrolled_at: new Date().toISOString(),
        progress: "25"
      });
    if (enrollmentError) throw enrollmentError;

    // Create sample reviews
    const { error: reviewsError } = await supabase
      .from('reviews')
      .insert([
        {
          user_id: sampleUsers![1].id,
          course_id: sampleCourses![0].id,
          rating: 5,
          comment: "This course provided a solid foundation in mediation principles. The instructor is knowledgeable and the content is well-structured."
        },
        {
          user_id: sampleUsers![1].id,
          course_id: sampleCourses![1].id,
          rating: 4,
          comment: "Great course for anyone looking to advance their arbitration skills. The case studies were particularly helpful."
        }
      ]);
    if (reviewsError) throw reviewsError;

    // Create a sample quiz for the first course
    const { data: sampleQuiz, error: quizError } = await supabase
      .from('quizzes')
      .insert({
        title: "Mediation Fundamentals Quiz",
        description: "Test your understanding of basic mediation concepts",
        course_id: sampleCourses![0].id,
        time_limit_minutes: 30,
        passing_score: 70,
        max_attempts: 3,
        is_required: true
      })
      .select()
      .single();
    if (quizError) throw quizError;

    // Create quiz questions
    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .insert([
        {
          quiz_id: sampleQuiz.id,
          question: "What is the primary role of a mediator?",
          question_type: "multiple_choice",
          points: 10,
          order: 1
        },
        {
          quiz_id: sampleQuiz.id,
          question: "Which of the following is NOT a principle of mediation?",
          question_type: "multiple_choice",
          points: 10,
          order: 2
        },
        {
          quiz_id: sampleQuiz.id,
          question: "Describe the difference between mediation and arbitration.",
          question_type: "essay",
          points: 20,
          order: 3
        }
      ])
      .select();
    if (questionsError) throw questionsError;

    // Create multiple choice answers
    const { error: answersError } = await supabase
      .from('quiz_answers')
      .insert([
        // Question 1 answers
        {
          question_id: questions![0].id,
          answer: "To make decisions for the parties",
          is_correct: false,
          order: 1
        },
        {
          question_id: questions![0].id,
          answer: "To facilitate communication between parties",
          is_correct: true,
          order: 2
        },
        {
          question_id: questions![0].id,
          answer: "To advocate for one party",
          is_correct: false,
          order: 3
        },
        {
          question_id: questions![0].id,
          answer: "To impose a solution",
          is_correct: false,
          order: 4
        },
        // Question 2 answers
        {
          question_id: questions![1].id,
          answer: "Neutrality",
          is_correct: false,
          order: 1
        },
        {
          question_id: questions![1].id,
          answer: "Confidentiality",
          is_correct: false,
          order: 2
        },
        {
          question_id: questions![1].id,
          answer: "Binding decisions",
          is_correct: true,
          order: 3
        },
        {
          question_id: questions![1].id,
          answer: "Voluntary participation",
          is_correct: false,
          order: 4
        }
      ]);
    if (answersError) throw answersError;

    console.log("Database seeding completed successfully!");
    console.log(`Created ${sampleUsers?.length || 0} users`);
    console.log(`Created ${sampleCategories?.length || 0} categories`);
    console.log(`Created ${sampleCourses?.length || 0} courses`);
    console.log("Created modules, lessons, enrollments, and reviews");

  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }
}

// Run the seeding function
seedDatabase()
  .then(() => {
    console.log("Seeding complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  });