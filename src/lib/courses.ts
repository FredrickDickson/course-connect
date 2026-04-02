export interface Course {
  id: string;
  title: string;
  description: string;
  instructor: string;
  category: string;
  duration: string;
  lessons: number;
  level: "Beginner" | "Intermediate" | "Advanced";
  image: string;
  price: number;
  rating: number;
  students: number;
  syllabus: string[];
}

export const courses: Course[] = [
  {
    id: "design-fundamentals",
    title: "Design Fundamentals",
    description: "Master the core principles of visual design including typography, color theory, layout composition, and visual hierarchy. Build a strong foundation for any creative career.",
    instructor: "Sarah Chen",
    category: "Design",
    duration: "8 weeks",
    lessons: 24,
    level: "Beginner",
    image: "",
    price: 79,
    rating: 4.8,
    students: 2340,
    syllabus: ["Introduction to Visual Design", "Typography Essentials", "Color Theory & Psychology", "Layout & Composition", "Visual Hierarchy", "Design Systems", "Portfolio Project"],
  },
  {
    id: "fullstack-development",
    title: "Full-Stack Web Development",
    description: "Go from zero to deploying production applications. Learn React, Node.js, databases, and modern deployment strategies in this comprehensive course.",
    instructor: "Marcus Webb",
    category: "Development",
    duration: "12 weeks",
    lessons: 48,
    level: "Intermediate",
    image: "",
    price: 129,
    rating: 4.9,
    students: 5120,
    syllabus: ["HTML & CSS Mastery", "JavaScript Deep Dive", "React Fundamentals", "State Management", "Node.js & Express", "Databases & SQL", "Authentication & Security", "Deployment & DevOps"],
  },
  {
    id: "data-science-python",
    title: "Data Science with Python",
    description: "Analyze real-world datasets, build predictive models, and create stunning visualizations. Perfect for aspiring data scientists and analysts.",
    instructor: "Dr. Aisha Patel",
    category: "Data Science",
    duration: "10 weeks",
    lessons: 36,
    level: "Intermediate",
    image: "",
    price: 99,
    rating: 4.7,
    students: 3890,
    syllabus: ["Python for Data Science", "Pandas & NumPy", "Data Visualization", "Statistical Analysis", "Machine Learning Basics", "Deep Learning Intro", "Capstone Project"],
  },
  {
    id: "digital-marketing",
    title: "Digital Marketing Mastery",
    description: "Learn SEO, content strategy, social media marketing, and paid advertising to grow any business online. Real campaigns, real results.",
    instructor: "James Rodriguez",
    category: "Marketing",
    duration: "6 weeks",
    lessons: 18,
    level: "Beginner",
    image: "",
    price: 59,
    rating: 4.6,
    students: 4210,
    syllabus: ["Digital Marketing Landscape", "SEO Fundamentals", "Content Strategy", "Social Media Marketing", "Paid Advertising", "Analytics & Optimization"],
  },
  {
    id: "creative-writing",
    title: "Creative Writing Workshop",
    description: "Develop your unique voice through fiction, non-fiction, and poetry. Weekly workshops with published authors and peer feedback sessions.",
    instructor: "Elena Marsh",
    category: "Writing",
    duration: "8 weeks",
    lessons: 16,
    level: "Beginner",
    image: "",
    price: 69,
    rating: 4.8,
    students: 1560,
    syllabus: ["Finding Your Voice", "Character Development", "World Building", "Dialogue & Pacing", "Narrative Structure", "Editing & Revision", "Publishing Paths"],
  },
  {
    id: "machine-learning-advanced",
    title: "Advanced Machine Learning",
    description: "Dive deep into neural networks, reinforcement learning, and cutting-edge AI techniques. Requires solid Python and math foundations.",
    instructor: "Dr. Kenji Tanaka",
    category: "Data Science",
    duration: "14 weeks",
    lessons: 42,
    level: "Advanced",
    image: "",
    price: 149,
    rating: 4.9,
    students: 1890,
    syllabus: ["Neural Network Architectures", "Convolutional Networks", "Recurrent Networks", "Transformers & Attention", "Reinforcement Learning", "GANs & Generative Models", "MLOps & Deployment", "Research Paper Implementation"],
  },
];

export const categories = [...new Set(courses.map((c) => c.category))];

export function getEnrolledCourses(): string[] {
  const stored = localStorage.getItem("enrolled-courses");
  return stored ? JSON.parse(stored) : [];
}

export function enrollInCourse(courseId: string): void {
  const enrolled = getEnrolledCourses();
  if (!enrolled.includes(courseId)) {
    enrolled.push(courseId);
    localStorage.setItem("enrolled-courses", JSON.stringify(enrolled));
  }
}

export function unenrollFromCourse(courseId: string): void {
  const enrolled = getEnrolledCourses().filter((id) => id !== courseId);
  localStorage.setItem("enrolled-courses", JSON.stringify(enrolled));
}

export function isEnrolled(courseId: string): boolean {
  return getEnrolledCourses().includes(courseId);
}
