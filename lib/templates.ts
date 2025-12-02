/**
 * Document Templates for Students
 * Pre-configured document structures to save time
 */

export interface Template {
  id: string;
  name: string;
  icon: string;
  description: string;
  title: string;
  content: string; // BlockNote JSON string
}

/**
 * Convert template content to BlockNote JSON format
 */
const createBlock = (
  type: string,
  content: string,
  props: any = {}
): any => {
  return {
    id: `block-${Math.random().toString(36).substr(2, 9)}`,
    type,
    props,
    content: [
      {
        type: "text",
        text: content,
        styles: {},
      },
    ],
    children: [],
  };
};

const createHeading = (level: number, text: string): any => {
  return createBlock("heading", text, { level });
};

const createParagraph = (text: string): any => {
  return createBlock("paragraph", text);
};

const createBulletListItem = (text: string): any => {
  return createBlock("bulletListItem", text);
};

const createNumberedListItem = (text: string): any => {
  return createBlock("numberedListItem", text);
};

/**
 * Template 1: Lecture Notes (Ghi chú bài giảng)
 */
export const lectureNotesTemplate: Template = {
  id: "lecture-notes",
  name: "Lecture Notes",
  icon: "📚",
  description: "Ghi chú bài giảng với sections: Summary, Key Points, Questions",
  title: "Lecture Notes",
  content: JSON.stringify([
    createHeading(1, "Lecture Notes"),
    createParagraph("Date: "),
    createHeading(2, "Summary"),
    createParagraph("Tóm tắt nội dung bài giảng..."),
    createHeading(2, "Key Points"),
    createBulletListItem("Điểm quan trọng 1"),
    createBulletListItem("Điểm quan trọng 2"),
    createBulletListItem("Điểm quan trọng 3"),
    createHeading(2, "Questions"),
    createParagraph("Câu hỏi cần làm rõ:"),
    createBulletListItem("Câu hỏi 1"),
    createBulletListItem("Câu hỏi 2"),
    createHeading(2, "Additional Notes"),
    createParagraph("Ghi chú thêm..."),
  ]),
};

/**
 * Template 2: Essay Planner (Lập dàn ý tiểu luận)
 */
export const essayPlannerTemplate: Template = {
  id: "essay-planner",
  name: "Essay Planner",
  icon: "📝",
  description: "Lập dàn ý tiểu luận với Introduction, Body, Conclusion",
  title: "Essay Planner",
  content: JSON.stringify([
    createHeading(1, "Essay Title"),
    createParagraph("Topic: "),
    createHeading(2, "Introduction"),
    createParagraph("Hook: "),
    createParagraph("Thesis statement: "),
    createParagraph("Overview: "),
    createHeading(2, "Body Paragraph 1"),
    createParagraph("Topic sentence: "),
    createParagraph("Supporting evidence: "),
    createParagraph("Analysis: "),
    createHeading(2, "Body Paragraph 2"),
    createParagraph("Topic sentence: "),
    createParagraph("Supporting evidence: "),
    createParagraph("Analysis: "),
    createHeading(2, "Body Paragraph 3"),
    createParagraph("Topic sentence: "),
    createParagraph("Supporting evidence: "),
    createParagraph("Analysis: "),
    createHeading(2, "Conclusion"),
    createParagraph("Restate thesis: "),
    createParagraph("Summary of main points: "),
    createParagraph("Final thought: "),
    createHeading(2, "References"),
    createBulletListItem("Source 1"),
    createBulletListItem("Source 2"),
  ]),
};

/**
 * Template 3: Grade Tracker (Theo dõi điểm số)
 */
export const gradeTrackerTemplate: Template = {
  id: "grade-tracker",
  name: "Grade Tracker",
  icon: "📊",
  description: "Theo dõi điểm số với bảng: Subject, Assignment, Grade, Weight",
  title: "Grade Tracker",
  content: JSON.stringify([
    createHeading(1, "Grade Tracker"),
    createParagraph("Semester: "),
    createHeading(2, "Subjects"),
    createHeading(3, "Subject 1"),
    createParagraph("Assignment | Grade | Weight | Total"),
    createParagraph("Assignment 1 | - | - | -"),
    createParagraph("Assignment 2 | - | - | -"),
    createParagraph("Final Exam | - | - | -"),
    createParagraph("Overall Grade: "),
    createHeading(3, "Subject 2"),
    createParagraph("Assignment | Grade | Weight | Total"),
    createParagraph("Assignment 1 | - | - | -"),
    createParagraph("Assignment 2 | - | - | -"),
    createParagraph("Final Exam | - | - | -"),
    createParagraph("Overall Grade: "),
    createHeading(2, "Summary"),
    createParagraph("GPA: "),
    createParagraph("Total Credits: "),
  ]),
};

/**
 * Template 4: Lab Report (Báo cáo thí nghiệm)
 */
export const labReportTemplate: Template = {
  id: "lab-report",
  name: "Lab Report",
  icon: "🔬",
  description: "Báo cáo thí nghiệm với Objective, Materials, Procedure, Results",
  title: "Lab Report",
  content: JSON.stringify([
    createHeading(1, "Lab Report"),
    createParagraph("Experiment: "),
    createParagraph("Date: "),
    createParagraph("Group Members: "),
    createHeading(2, "Objective"),
    createParagraph("Mục tiêu của thí nghiệm:"),
    createBulletListItem("Mục tiêu 1"),
    createBulletListItem("Mục tiêu 2"),
    createHeading(2, "Materials"),
    createParagraph("Danh sách vật liệu và dụng cụ:"),
    createBulletListItem("Vật liệu 1"),
    createBulletListItem("Vật liệu 2"),
    createBulletListItem("Dụng cụ 1"),
    createHeading(2, "Procedure"),
    createParagraph("Các bước thực hiện:"),
    createNumberedListItem("Bước 1"),
    createNumberedListItem("Bước 2"),
    createNumberedListItem("Bước 3"),
    createHeading(2, "Results"),
    createParagraph("Kết quả thu được:"),
    createParagraph("Data/Measurements:"),
    createParagraph("Observations:"),
    createHeading(2, "Analysis"),
    createParagraph("Phân tích kết quả:"),
    createHeading(2, "Conclusion"),
    createParagraph("Kết luận:"),
  ]),
};

/**
 * Template 5: Study Guide (Tài liệu ôn tập)
 */
export const studyGuideTemplate: Template = {
  id: "study-guide",
  name: "Study Guide",
  icon: "💡",
  description: "Tài liệu ôn tập với Topics, Flashcards, Practice questions",
  title: "Study Guide",
  content: JSON.stringify([
    createHeading(1, "Study Guide"),
    createParagraph("Subject: "),
    createParagraph("Exam Date: "),
    createHeading(2, "Topics to Review"),
    createBulletListItem("Topic 1"),
    createBulletListItem("Topic 2"),
    createBulletListItem("Topic 3"),
    createHeading(2, "Key Concepts"),
    createHeading(3, "Concept 1"),
    createParagraph("Definition: "),
    createParagraph("Example: "),
    createHeading(3, "Concept 2"),
    createParagraph("Definition: "),
    createParagraph("Example: "),
    createHeading(2, "Flashcards"),
    createHeading(3, "Card 1"),
    createParagraph("Question: "),
    createParagraph("Answer: "),
    createHeading(3, "Card 2"),
    createParagraph("Question: "),
    createParagraph("Answer: "),
    createHeading(2, "Practice Questions"),
    createNumberedListItem("Question 1: "),
    createParagraph("Answer: "),
    createNumberedListItem("Question 2: "),
    createParagraph("Answer: "),
    createHeading(2, "Important Formulas"),
    createParagraph("Formula 1: "),
    createParagraph("Formula 2: "),
  ]),
};

/**
 * Template 6: Assignment Tracker (Theo dõi bài tập)
 */
export const assignmentTrackerTemplate: Template = {
  id: "assignment-tracker",
  name: "Assignment Tracker",
  icon: "📅",
  description: "Theo dõi bài tập với Deadline, Status, Priority",
  title: "Assignment Tracker",
  content: JSON.stringify([
    createHeading(1, "Assignment Tracker"),
    createParagraph("Semester: "),
    createHeading(2, "Upcoming Assignments"),
    createHeading(3, "Assignment 1"),
    createParagraph("Subject: "),
    createParagraph("Title: "),
    createParagraph("Deadline: "),
    createParagraph("Status: Not Started"),
    createParagraph("Priority: High/Medium/Low"),
    createParagraph("Notes: "),
    createHeading(3, "Assignment 2"),
    createParagraph("Subject: "),
    createParagraph("Title: "),
    createParagraph("Deadline: "),
    createParagraph("Status: In Progress"),
    createParagraph("Priority: High/Medium/Low"),
    createParagraph("Notes: "),
    createHeading(2, "Completed Assignments"),
    createHeading(3, "Assignment 1"),
    createParagraph("Subject: "),
    createParagraph("Title: "),
    createParagraph("Completed Date: "),
    createParagraph("Grade: "),
    createHeading(2, "Summary"),
    createParagraph("Total Assignments: "),
    createParagraph("Completed: "),
    createParagraph("Pending: "),
  ]),
};

/**
 * All available templates
 */
export const templates: Template[] = [
  lectureNotesTemplate,
  essayPlannerTemplate,
  gradeTrackerTemplate,
  labReportTemplate,
  studyGuideTemplate,
  assignmentTrackerTemplate,
];

/**
 * Get template by ID
 */
export const getTemplateById = (id: string): Template | undefined => {
  return templates.find((template) => template.id === id);
};

