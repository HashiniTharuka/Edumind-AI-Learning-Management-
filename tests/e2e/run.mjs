// End-to-end tests: real Next.js production server + in-memory MongoDB + mock Gemini.
// Usage: npm run build && npm run test:e2e
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient, ObjectId } from "mongodb";
import { startMockGemini } from "./mock-gemini.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PORT = 3210;
const BASE = `http://localhost:${PORT}`;

if (!existsSync(join(ROOT, ".next", "BUILD_ID"))) {
  console.error("No production build found. Run `npm run build` first.");
  process.exit(1);
}

/* ------------------------------ infrastructure ------------------------------ */

const mongo = await MongoMemoryServer.create();
const mongoUri = mongo.getUri();
const gemini = await startMockGemini();
const env = {
  ...process.env,
  NODE_ENV: "production",
  MONGODB_URI: mongoUri,
  SESSION_SECRET: "e2e-secret-e2e-secret-e2e-secret-123456",
  GEMINI_API_KEY: "test-key",
  GEMINI_BASE_URL: gemini.url,
  CLOUDINARY_CLOUD_NAME: "",
};

function run(args, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd: ROOT, env: { ...env, ...extraEnv }, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (out += d));
    child.on("exit", (code) => (code === 0 ? resolve(out) : reject(new Error(`${args.join(" ")} failed:\n${out}`))));
  });
}

let serverLog = "";
const server = spawn(process.execPath, [join(ROOT, "node_modules/next/dist/bin/next"), "start", "-p", String(PORT)], {
  cwd: ROOT,
  env,
  stdio: ["ignore", "pipe", "pipe"],
});
server.stdout.on("data", (d) => (serverLog += d));
server.stderr.on("data", (d) => (serverLog += d));

async function cleanup() {
  server.kill();
  gemini.close();
  await client?.close();
  await mongo.stop();
}

for (let i = 0; i < 60; i++) {
  try {
    await fetch(BASE);
    break;
  } catch {
    await new Promise((r) => setTimeout(r, 500));
  }
}

const client = await MongoClient.connect(mongoUri);
const db = client.db("edumind");

/* --------------------------------- helpers --------------------------------- */

const manifest = JSON.parse(readFileSync(join(ROOT, ".next/server/server-reference-manifest.json"), "utf8"));
const actionIds = Object.fromEntries(Object.entries(manifest.node).map(([id, v]) => [v.exportedName, id]));

let passed = 0;
const failures = [];
function check(name, cond, detail = "") {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failures.push(name);
    console.log(`  ✗ ${name}${detail ? `  — ${String(detail).slice(0, 300)}` : ""}`);
  }
}
const section = (title) => console.log(`\n${title}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Invokes a server action the way React's client does: FormData entries are prefixed "_1_"
 * and referenced as "$K1"; the JSON-encoded argument list goes in field "0" (appended last).
 */
async function action(name, { page = "/", args = [], form, cookie } = {}) {
  if (!actionIds[name]) throw new Error(`Unknown action ${name}`);
  const body = new FormData();
  if (form) for (const [k, v] of Object.entries(form)) body.append(`_1_${k}`, String(v));
  body.append("0", JSON.stringify(args.map((a) => (a === "FORM" ? "$K1" : a))));
  const res = await fetch(BASE + page, {
    method: "POST",
    headers: { "Next-Action": actionIds[name], Accept: "text/x-component", Origin: BASE, ...(cookie && { Cookie: cookie }) },
    body,
    redirect: "manual",
  });
  const setCookie = res.headers.get("set-cookie");
  return {
    status: res.status,
    text: await res.text(),
    redirect: res.headers.get("x-action-redirect"),
    cookie: setCookie?.startsWith("session=") ? setCookie.split(";")[0] : undefined,
  };
}

async function get(path, cookie) {
  const res = await fetch(BASE + path, { headers: cookie ? { Cookie: cookie } : {}, redirect: "manual" });
  return { status: res.status, location: res.headers.get("location"), type: res.headers.get("content-type"), res, text: await res.clone().text() };
}

async function register(name, email, role) {
  const r = await action("register", { page: "/register", args: [{}, "FORM"], form: { name, email, password: "secret123", role } });
  return r.cookie;
}
async function login(email, password) {
  const r = await action("login", { page: "/login", args: [{}, "FORM"], form: { email, password } });
  return r.cookie;
}
const oid = (id) => new ObjectId(id);

/* ================================== TESTS ================================== */

try {
  section("Auth");
  const teacher = await register("Ada Teacher", "ada@test.dev", "instructor");
  check("instructor can register", teacher?.startsWith("session="));
  const student = await register("Sam Student", "sam@test.dev", "student");
  check("student can register", student?.startsWith("session="));
  const dup = await action("register", { page: "/register", args: [{}, "FORM"], form: { name: "Dup", email: "ADA@test.dev", password: "secret123", role: "student" } });
  check("duplicate email rejected (case-insensitive)", dup.text.includes("already exists") && !dup.cookie);
  const asAdmin = await action("register", { page: "/register", args: [{}, "FORM"], form: { name: "Eve", email: "eve@test.dev", password: "secret123", role: "admin" } });
  check("cannot self-register as admin", !asAdmin.cookie && !(await db.collection("users").findOne({ email: "eve@test.dev" })));
  const weak = await action("register", { page: "/register", args: [{}, "FORM"], form: { name: "Weak", email: "weak@test.dev", password: "short", role: "student" } });
  check("weak password rejected", weak.text.includes("At least 8 characters") && !weak.cookie);
  const bad = await action("login", { page: "/login", args: [{}, "FORM"], form: { email: "ada@test.dev", password: "nope" } });
  check("wrong password rejected", bad.text.includes("Invalid email or password") && !bad.cookie);
  const evil = await action("login", { page: "/login", args: [{}, "FORM"], form: { email: "ada@test.dev", password: "secret123", next: "//evil.com" } });
  check("login ignores open-redirect targets", evil.cookie && evil.redirect?.startsWith("/dashboard"), evil.redirect);
  const passwordHash = (await db.collection("users").findOne({ email: "ada@test.dev" })).passwordHash;
  check("passwords are bcrypt-hashed", passwordHash?.startsWith("$2") && passwordHash !== "secret123");
  const tampered = await get("/dashboard", teacher.slice(0, -4) + "AAAA");
  check("tampered session cookie is rejected", tampered.status === 307 && tampered.location?.includes("/login"));

  section("Instructor Studio");
  const created = await action("createCourse", {
    cookie: teacher, page: "/instructor/courses/new", args: [{}, "FORM"],
    form: { title: "Intro to MongoDB", subtitle: "From zero to Atlas", category: "Data Science", level: "beginner" },
  });
  const courseId = created.redirect?.match(/courses\/([a-f0-9]{24})/)?.[1];
  check("createCourse redirects to the editor", !!courseId, created.text);
  let course = await db.collection("courses").findOne({ _id: oid(courseId) });
  check("course has slug, default section, zeroed stats", course?.slug === "intro-to-mongodb" && course.sections.length === 1 && course.stats.lessonCount === 0);
  const sectionA = course.sections[0]._id.toString();
  const editor = `/instructor/courses/${courseId}`;

  const mal = await register("Mallory", "mal@test.dev", "instructor");
  await db.collection("users").updateOne({ email: "mal@test.dev" }, { $set: { role: "student" } });
  const demoted = await action("createCourse", { cookie: mal, page: "/instructor/courses/new", args: [{}, "FORM"], form: { title: "Sneaky course", category: "Other", level: "beginner" } });
  check("demoted user with stale cookie cannot create courses", demoted.text.includes("permission") && (await db.collection("courses").countDocuments()) === 1);

  await action("updateCourse", {
    cookie: teacher, page: editor, args: [courseId, {}, "FORM"],
    form: {
      title: "Intro to MongoDB Atlas", category: "Data Science", level: "intermediate",
      description: "Learn document modeling, indexes, aggregation and Atlas Vector Search in this hands-on course.",
      tags: "MongoDB, atlas, mongodb", whatYouWillLearn: "Model data\n\nWrite aggregations\n",
    },
  });
  course = await db.collection("courses").findOne({ _id: oid(courseId) });
  check("updateCourse saves fields, dedupes tags, re-slugs drafts", course.level === "intermediate" && course.tags.join() === "mongodb,atlas" && course.whatYouWillLearn.length === 2 && course.slug === "intro-to-mongodb-atlas");
  const badUrl = await action("updateCourse", { cookie: teacher, page: editor, args: [courseId, {}, "FORM"], form: { title: "Intro to MongoDB Atlas", category: "Data Science", level: "beginner", thumbnailUrl: "not a url" } });
  check("invalid thumbnail URL rejected", badUrl.text.includes("Enter a valid URL"));

  const rival = await register("Rival Teacher", "rival@test.dev", "instructor");
  const hijack = await action("updateCourse", { cookie: rival, page: editor, args: [courseId, {}, "FORM"], form: { title: "Hijacked!!", category: "Other", level: "beginner" } });
  check("another instructor cannot edit the course", hijack.text.includes("don't have access"));
  const hijackDelete = await action("deleteCourse", { cookie: rival, page: editor, args: [courseId] });
  check("another instructor cannot delete the course", hijackDelete.text.includes("don't have access") && (await db.collection("courses").countDocuments({ _id: oid(courseId) })) === 1);
  check("another instructor gets 404 on the editor", (await get(editor, rival)).status === 404);
  check("students are redirected away from the studio", (await get("/instructor", student)).status === 307);

  const early = await action("setCoursePublished", { cookie: teacher, page: editor, args: [courseId, true] });
  check("publishing without lessons is blocked", early.text.includes("at least one lesson"));

  await action("addSection", { cookie: teacher, page: editor, args: [courseId, {}, "FORM"], form: { title: "Advanced topics" } });
  course = await db.collection("courses").findOne({ _id: oid(courseId) });
  const sectionB = course.sections.find((s) => s.title === "Advanced topics")?._id.toString();
  check("addSection", !!sectionB);

  const newLesson = `${editor}/lessons/new`;
  const noVideo = await action("saveLesson", { cookie: teacher, page: newLesson, args: [courseId, null, {}, "FORM"], form: { title: "Video lesson", section: sectionA, type: "video", content: "" } });
  check("video lesson without a URL is rejected", noVideo.text.includes("Add a video URL"));
  const aggregationNotes = "Aggregation pipelines process documents in stages. The $group stage groups documents by a key and computes accumulators such as $sum and $avg. The $match stage filters documents and should come early so it can use indexes. ".repeat(3);
  const l1 = await action("saveLesson", {
    cookie: teacher, page: newLesson, args: [courseId, null, {}, "FORM"],
    form: { title: "What is MongoDB?", section: sectionA, type: "video", videoUrl: "https://youtu.be/dQw4w9WgXcQ", content: "MongoDB is a document database that stores BSON documents in collections.", durationMinutes: 12, isPreview: "on" },
  });
  check("creating a lesson redirects back to the editor", l1.redirect?.includes(`${editor}?saved=lesson`), l1.redirect);
  await action("saveLesson", { cookie: teacher, page: newLesson, args: [courseId, null, {}, "FORM"], form: { title: "Aggregation pipelines", section: sectionA, type: "article", content: aggregationNotes, durationMinutes: 8 } });
  await action("saveLesson", { cookie: teacher, page: newLesson, args: [courseId, null, {}, "FORM"], form: { title: "Cheatsheet", section: sectionB, type: "pdf", pdfUrl: "https://example.com/a.pdf", content: "", durationMinutes: 0 } });
  let lessons = await db.collection("lessons").find({ course: oid(courseId) }).toArray();
  course = await db.collection("courses").findOne({ _id: oid(courseId) });
  check("lessons saved with per-section order", lessons.length === 3 && lessons.filter((l) => l.section.toString() === sectionA).map((l) => l.order).sort().join() === "0,1");
  check("course stats recomputed (3 lessons, 20 min)", course.stats.lessonCount === 3 && course.stats.totalMinutes === 20, JSON.stringify(course.stats));

  await sleep(1500); // after() indexing runs once the response is sent
  const indexed = await db.collection("lessons").find({ course: oid(courseId), indexedAt: { $exists: true } }).toArray();
  const chunkCount = await db.collection("contentchunks").countDocuments({ course: oid(courseId) });
  check("saving lessons indexes their content for the AI tutor in the background", indexed.length === 2 && chunkCount >= 2, `${indexed.length} indexed, ${chunkCount} chunks`);
  const embedCall = gemini.calls.find((c) => c.url.includes("batchEmbedContents"));
  check("Gemini is called with the API key header and 768-dim, document-task embeddings", embedCall?.apiKey === "test-key" && embedCall.body.requests[0].outputDimensionality === 768 && embedCall.body.requests[0].taskType === "RETRIEVAL_DOCUMENT");

  const first = lessons.find((l) => l.title === "What is MongoDB?");
  await action("saveLesson", {
    cookie: teacher, page: `${editor}/lessons/${first._id}`, args: [courseId, first._id.toString(), {}, "FORM"],
    form: { title: "What is MongoDB?", section: sectionA, type: "video", videoUrl: "https://youtu.be/dQw4w9WgXcQ", content: "MongoDB is a document database. It stores BSON. Updated notes about collections.", durationMinutes: 15, isPreview: "on" },
  });
  await sleep(1500);
  const reindexed = await db.collection("contentchunks").findOne({ lesson: first._id });
  check("editing lesson content re-indexes it", reindexed?.text.includes("Updated notes"));

  await action("moveLesson", { cookie: teacher, page: editor, args: [courseId, first._id.toString(), "down"] });
  lessons = await db.collection("lessons").find({ section: oid(sectionA) }).sort({ order: 1 }).toArray();
  check("moveLesson reorders", lessons.map((l) => l.title).join("|") === "Aggregation pipelines|What is MongoDB?");
  await action("moveSection", { cookie: teacher, page: editor, args: [courseId, sectionB, "up"] });
  course = await db.collection("courses").findOne({ _id: oid(courseId) });
  check("moveSection reorders", [...course.sections].sort((a, b) => a.order - b.order)[0].title === "Advanced topics");
  const delSection = await action("deleteSection", { cookie: teacher, page: editor, args: [courseId, sectionB] });
  check("cannot delete a section that still has lessons", delSection.text.includes("Delete or move the lessons"));

  section("AI quiz generation");
  const aggLesson = lessons.find((l) => l.title === "Aggregation pipelines");
  const shortQuiz = await action("generateQuiz", { cookie: teacher, page: editor, args: [courseId, first._id.toString()] });
  check("quiz generation needs enough lesson content", shortQuiz.text.includes("at least 200 characters"));
  const gen = await action("generateQuiz", { cookie: teacher, page: editor, args: [courseId, aggLesson._id.toString()] });
  const quiz = await db.collection("quizzes").findOne({ lesson: aggLesson._id });
  check("AI quiz generated and validated (5 questions)", gen.text.includes("Quiz generated") && quiz?.questions.length === 5 && quiz.generatedByAI === true, gen.text);
  const quizCall = gemini.calls.find((c) => c.body.generationConfig?.responseSchema);
  check("quiz request uses Gemini structured JSON output", quizCall?.body.generationConfig.responseMimeType === "application/json");
  const studentQuiz = await action("generateQuiz", { cookie: student, page: editor, args: [courseId, aggLesson._id.toString()] });
  check("students cannot generate quizzes", !studentQuiz.text.includes("Quiz generated"));

  section("Publishing & catalog");
  const pub = await action("setCoursePublished", { cookie: teacher, page: editor, args: [courseId, true] });
  course = await db.collection("courses").findOne({ _id: oid(courseId) });
  check("publish succeeds when the checklist is met", course.status === "published" && pub.text.includes("published"));
  const slug = course.slug;

  const seedOut = await run([join(ROOT, "node_modules/tsx/dist/cli.mjs"), "--conditions=react-server", "scripts/seed.ts"], { NODE_ENV: "test" });
  check("seed script creates demo data and AI index", seedOut.includes("Created course: Modern JavaScript Essentials") && seedOut.includes("chunks"), seedOut);
  const seedAgain = await run([join(ROOT, "node_modules/tsx/dist/cli.mjs"), "--conditions=react-server", "scripts/seed.ts"], { NODE_ENV: "test" });
  check("seed script is idempotent", seedAgain.includes("Skipping existing course") && (await db.collection("courses").countDocuments({ status: "published" })) === 4);

  const catalog = await get("/courses");
  check("catalog lists published courses", catalog.status === 200 && catalog.text.includes("Intro to MongoDB Atlas") && catalog.text.includes("Modern JavaScript Essentials"));
  const searchJs = await get("/courses?q=javascript");
  check("search filters by text", searchJs.text.includes("Modern JavaScript Essentials") && !searchJs.text.includes("Machine Learning Foundations"));
  const byCategory = await get(`/courses?category=${encodeURIComponent("AI & Machine Learning")}`);
  check("category filter", byCategory.text.includes("Machine Learning Foundations") && !byCategory.text.includes("Modern JavaScript Essentials"));
  const regexSafe = await get(`/courses?q=${encodeURIComponent("(.*")}`);
  check("search input with regex characters is safe", regexSafe.status === 200);
  const home = await get("/");
  check("landing page shows popular courses", home.status === 200 && home.text.includes("Popular courses"));

  await action("createCourse", { cookie: teacher, page: "/instructor/courses/new", args: [{}, "FORM"], form: { title: "Secret Draft Course", category: "Other", level: "beginner" } });
  check("draft courses are hidden from the catalog", !(await get("/courses")).text.includes("Secret Draft Course"));
  check("draft course page is 404 for the public", (await get("/courses/secret-draft-course")).status === 404);
  check("draft course page is visible to its instructor", (await get("/courses/secret-draft-course", teacher)).status === 200);

  section("Enrollment & learning");
  const coursePage = await get(`/courses/${slug}`);
  check("course page renders for visitors with a sign-in CTA", coursePage.status === 200 && coursePage.text.includes("Sign in to enroll"));
  const notEnrolledLesson = await get(`/learn/${slug}/${aggLesson._id}`, student);
  check("non-enrolled users can't open regular lessons", notEnrolledLesson.status === 307 && notEnrolledLesson.location?.endsWith(`/courses/${slug}`));
  const previewLesson = await get(`/learn/${slug}/${first._id}`, student);
  check("non-enrolled users can open free-preview lessons", previewLesson.status === 200 && previewLesson.text.includes("free preview"));

  const enr = await action("enroll", { cookie: student, page: `/courses/${slug}`, args: [courseId] });
  check("enroll redirects to the player", enr.redirect?.includes(`/learn/${slug}`), enr.redirect);
  await action("enroll", { cookie: student, page: `/courses/${slug}`, args: [courseId] });
  course = await db.collection("courses").findOne({ _id: oid(courseId) });
  check("enrolling twice is idempotent", (await db.collection("enrollments").countDocuments({ course: oid(courseId) })) === 1 && course.stats.enrollments === 1);
  const draftEnroll = await action("enroll", { cookie: student, page: `/courses/${slug}`, args: [(await db.collection("courses").findOne({ slug: "secret-draft-course" }))._id.toString()] });
  check("cannot enroll in a draft course", draftEnroll.text.includes("isn't available"));

  const resume = await get(`/learn/${slug}`, student);
  check("/learn/[slug] resumes at a lesson", resume.status === 307 && /\/learn\/[\w-]+\/[a-f0-9]{24}$/.test(resume.location ?? ""), resume.location);
  const lessonPage = await get(`/learn/${slug}/${aggLesson._id}`, student);
  check("lesson page renders content, quiz and tutor tabs", lessonPage.status === 200 && lessonPage.text.includes("Aggregation pipelines process documents") && lessonPage.text.includes("AI Tutor") && lessonPage.text.includes("Quiz"));
  check("quiz answers/explanations are NOT sent to the browser", !lessonPage.text.includes("Because option") && !lessonPage.text.includes("answerIndex"));

  section("Quizzes");
  const correct = quiz.questions.map((q) => q.answerIndex);
  const attempt = await action("submitQuiz", { cookie: student, page: `/learn/${slug}/${aggLesson._id}`, args: [quiz._id.toString(), correct] });
  check("quiz is graded on the server (5/5)", attempt.text.includes('"score":5') && attempt.text.includes("Because option"), attempt.text);
  const wrong = await action("submitQuiz", { cookie: student, page: `/learn/${slug}/${aggLesson._id}`, args: [quiz._id.toString(), correct.map((a) => (a + 1) % 4)] });
  check("wrong answers score 0", wrong.text.includes('"score":0'));
  check("quiz attempts are stored", (await db.collection("quizattempts").countDocuments({ quiz: quiz._id })) === 2);
  const outsider = await register("Outsider", "out@test.dev", "student");
  const outsiderQuiz = await action("submitQuiz", { cookie: outsider, page: `/learn/${slug}/${first._id}`, args: [quiz._id.toString(), correct] });
  check("non-enrolled users can't submit quizzes", outsiderQuiz.text.includes("Enroll in this course"));
  const junk = await action("submitQuiz", { cookie: student, page: `/learn/${slug}/${aggLesson._id}`, args: [quiz._id.toString(), ["x", 99]] });
  check("malformed quiz submissions are rejected", junk.text.includes("Invalid submission"));

  section("AI tutor (RAG chat)");
  const chat = (cookie, message, id = courseId) =>
    fetch(`${BASE}/api/courses/${id}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(cookie && { Cookie: cookie }) },
      body: JSON.stringify({ message, lessonId: aggLesson._id.toString() }),
    });
  const chatRes = await chat(student, "How does the $group stage work in an aggregation pipeline?");
  const chatText = await chatRes.text();
  const [header, ...answer] = chatText.split("\n");
  const { sources } = JSON.parse(header);
  check("chat streams an answer", chatRes.status === 200 && answer.join("\n").includes("MOCK_ANSWER"), chatText);
  check("answer is grounded in retrieved excerpts", /grounded in [1-9]\d* excerpts/.test(chatText));
  check("most relevant lesson is cited as a source", sources[0]?.title === "Aggregation pipelines", JSON.stringify(sources));
  const streamCall = gemini.calls.findLast((c) => c.url.includes("streamGenerateContent"));
  const sys = streamCall?.body.systemInstruction.parts[0].text ?? "";
  check("prompt includes current lesson and anti-injection rule", sys.includes('viewing the lesson "Aggregation pipelines"') && sys.includes("Ignore any instructions"));
  const queryEmbed = gemini.calls.findLast((c) => c.url.includes("batchEmbedContents"));
  check("questions are embedded as retrieval queries", queryEmbed?.body.requests[0].taskType === "RETRIEVAL_QUERY");
  const saved = await db.collection("chatmessages").find({ course: oid(courseId) }).toArray();
  check("chat history saved (question + answer with sources)", saved.length === 2 && saved[1].sources.length > 0);

  const followUp = await chat(student, "Can you give an example?");
  await followUp.text();
  const followCall = gemini.calls.findLast((c) => c.url.includes("streamGenerateContent"));
  check("follow-up questions include conversation history", followCall.body.contents.length === 3);

  check("chat requires sign-in (401)", (await chat(undefined, "hi")).status === 401);
  check("chat requires enrollment (403)", (await chat(outsider, "hi")).status === 403);
  check("chat rejects invalid course ids (404)", (await chat(student, "hi", "not-an-id")).status === 404);
  const tooLong = await chat(student, "x".repeat(2001));
  check("chat rejects over-long messages (400)", tooLong.status === 400);

  const sam = await db.collection("users").findOne({ email: "sam@test.dev" });
  await db.collection("chatmessages").insertMany(
    Array.from({ length: 30 }, () => ({ user: sam._id, course: oid(courseId), role: "user", content: "spam", createdAt: new Date() }))
  );
  check("chat is rate limited per user (429)", (await chat(student, "one more?")).status === 429);
  await action("clearChatHistory", { cookie: student, page: `/learn/${slug}/${aggLesson._id}`, args: [courseId] });
  check("clearing chat history", (await db.collection("chatmessages").countDocuments({ user: sam._id })) === 0);

  section("Reviews");
  const review = await action("submitReview", { cookie: student, page: `/courses/${slug}`, args: [courseId, {}, "FORM"], form: { rating: 4, comment: "Great course!" } });
  course = await db.collection("courses").findOne({ _id: oid(courseId) });
  check("enrolled student can review; rating recomputed", review.text.includes("Thanks for your review") && course.stats.ratingAvg === 4 && course.stats.ratingCount === 1);
  await action("submitReview", { cookie: student, page: `/courses/${slug}`, args: [courseId, {}, "FORM"], form: { rating: 2, comment: "Changed my mind" } });
  course = await db.collection("courses").findOne({ _id: oid(courseId) });
  check("re-reviewing updates instead of duplicating", course.stats.ratingCount === 1 && course.stats.ratingAvg === 2);
  const outsiderReview = await action("submitReview", { cookie: outsider, page: `/courses/${slug}`, args: [courseId, {}, "FORM"], form: { rating: 1, comment: "spam" } });
  check("non-enrolled users can't review", outsiderReview.text.includes("Only enrolled students"));
  const badRating = await action("submitReview", { cookie: student, page: `/courses/${slug}`, args: [courseId, {}, "FORM"], form: { rating: 9 } });
  check("invalid ratings rejected", badRating.text.includes("fieldErrors"));

  section("Progress & certificates");
  const allLessons = await db.collection("lessons").find({ course: oid(courseId) }).toArray();
  let last;
  for (const l of allLessons) {
    last = await action("setLessonComplete", { cookie: student, page: `/learn/${slug}/${l._id}`, args: [courseId, l._id.toString(), true] });
  }
  let enrollment = await db.collection("enrollments").findOne({ user: sam._id, course: oid(courseId) });
  check("completing every lesson → 100% and a certificate", enrollment.progress === 100 && enrollment.completedAt && /^EDU-[0-9A-F]{5}-[0-9A-F]{5}$/.test(enrollment.certificateCode));
  check("the final completion reports justCompleted", last.text.includes('"justCompleted":true'));
  await action("setLessonComplete", { cookie: student, page: `/learn/${slug}/${first._id}`, args: [courseId, first._id.toString(), false] });
  enrollment = await db.collection("enrollments").findOne({ user: sam._id, course: oid(courseId) });
  check("un-completing lowers progress but keeps the earned certificate", enrollment.progress === 67 && enrollment.certificateCode);
  const outsiderProgress = await action("setLessonComplete", { cookie: outsider, page: `/learn/${slug}/${first._id}`, args: [courseId, first._id.toString(), true] });
  check("non-enrolled users can't track progress", outsiderProgress.text.includes("Enroll in this course"));

  const certPage = await get(`/certificates/${enrollment.certificateCode}`);
  check("public certificate page verifies the student", certPage.status === 200 && certPage.text.includes("Sam Student") && certPage.text.includes("Intro to MongoDB Atlas"));
  const pdf = await get(`/api/certificates/${enrollment.certificateCode}`);
  const pdfBytes = Buffer.from(await pdf.res.arrayBuffer());
  check("certificate PDF is generated", pdf.status === 200 && pdf.type === "application/pdf" && pdfBytes.subarray(0, 5).toString() === "%PDF-");
  check("unknown certificates → 404", (await get("/certificates/EDU-00000-00000")).status === 404 && (await get("/api/certificates/nope")).status === 404);
  const dash = await get("/dashboard", student);
  check("dashboard links the certificate", dash.text.includes(`/certificates/${enrollment.certificateCode}`));

  section("Admin");
  const admin = await login("admin@edumind.dev", "Admin12345");
  check("seeded admin can log in", admin?.startsWith("session="));
  const adminPage = await get("/admin", admin);
  check("admin dashboard renders stats and chart", adminPage.status === 200 && adminPage.text.includes("New enrollments") && adminPage.text.includes("AI tutor questions"));
  check("non-admins are redirected away from /admin", (await get("/admin", teacher)).status === 307);
  const adminSearch = await get("/admin?q=sam%40test", admin);
  check("admin user search", adminSearch.text.includes("sam@test.dev") && !adminSearch.text.includes("ada@test.dev"));
  const promote = await action("setUserRole", { cookie: admin, page: "/admin", args: [sam._id.toString(), "instructor"] });
  check("admin can change roles", promote.text.includes("is now an instructor") && (await db.collection("users").findOne({ _id: sam._id })).role === "instructor");
  const adminUser = await db.collection("users").findOne({ email: "admin@edumind.dev" });
  const self = await action("setUserRole", { cookie: admin, page: "/admin", args: [adminUser._id.toString(), "student"] });
  check("admins can't change their own role", self.text.includes("can't change your own role"));
  const badRole = await action("setUserRole", { cookie: admin, page: "/admin", args: [sam._id.toString(), "superuser"] });
  check("unknown roles rejected", badRole.text.includes("Invalid request"));
  const teacherRole = await action("setUserRole", { cookie: teacher, page: "/admin", args: [sam._id.toString(), "admin"] });
  check("non-admins can't change roles", (await db.collection("users").findOne({ _id: sam._id })).role === "instructor" && !teacherRole.text.includes("is now"));
  const draftId = (await db.collection("courses").findOne({ slug: "secret-draft-course" }))._id.toString();
  const adminDelete = await action("deleteCourse", { cookie: admin, page: "/admin", args: [draftId, "/admin"] });
  check("admin can delete any course and stays on /admin", adminDelete.redirect?.startsWith("/admin") && !(await db.collection("courses").findOne({ _id: oid(draftId) })));

  section("Cleanup cascade");
  const del = await action("deleteCourse", { cookie: admin, page: "/admin", args: [courseId, "/admin"] });
  const leftovers = await Promise.all(
    ["lessons", "contentchunks", "quizzes", "quizattempts", "reviews", "enrollments", "chatmessages"].map((c) =>
      db.collection(c).countDocuments(c === "quizattempts" ? { quiz: quiz._id } : { course: oid(courseId) })
    )
  );
  check("deleting a course removes all related data", del.redirect && leftovers.every((n) => n === 0), leftovers.join(","));

  section("Server health");
  const errors = serverLog.split("\n").filter((l) => /\b(Error|TypeError|Unhandled)\b/.test(l) && !l.includes("Gemini"));
  check("no unexpected server errors logged", errors.length === 0, errors.slice(0, 5).join("\n"));
} catch (err) {
  failures.push(`crashed: ${err.message}`);
  console.error(err);
  console.error("\n--- server log ---\n" + serverLog.slice(-3000));
} finally {
  await cleanup();
}

console.log(`\n${passed} passed, ${failures.length} failed`);
process.exit(failures.length ? 1 : 0);
