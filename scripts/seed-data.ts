// Demo content for `npm run seed`. Lessons are articles so the AI tutor has real text to learn from.
import type { CATEGORIES, LEVELS } from "../src/lib/constants";

export type SeedLesson = {
  title: string;
  minutes: number;
  preview?: boolean;
  content: string;
  quiz?: { question: string; options: string[]; answerIndex: number; explanation: string }[];
};
export type SeedCourse = {
  title: string;
  subtitle: string;
  category: (typeof CATEGORIES)[number];
  level: (typeof LEVELS)[number];
  tags: string[];
  description: string;
  whatYouWillLearn: string[];
  sections: { title: string; lessons: SeedLesson[] }[];
};

export const courses: SeedCourse[] = [
  {
    title: "MongoDB Fundamentals: From Documents to Atlas",
    subtitle: "Model data, query it efficiently and scale with MongoDB Atlas",
    category: "Data Science",
    level: "beginner",
    tags: ["mongodb", "database", "nosql", "atlas"],
    description:
      "A practical introduction to MongoDB for developers. You will learn how the document model works, how to design schemas that match your application's access patterns, how to write queries and aggregation pipelines, and how indexes make them fast. The course finishes with MongoDB Atlas features such as Atlas Search and Vector Search.",
    whatYouWillLearn: [
      "Explain the document model and when to embed vs. reference",
      "Write CRUD queries with filters, projections and sorting",
      "Build aggregation pipelines with $match, $group and $lookup",
      "Choose indexes using the ESR (Equality, Sort, Range) rule",
      "Use Atlas Search and Vector Search in real applications",
    ],
    sections: [
      {
        title: "The document model",
        lessons: [
          {
            title: "What is MongoDB?",
            minutes: 8,
            preview: true,
            content: `# What is MongoDB?

MongoDB is a **document database**. Instead of storing rows in tables, it stores **documents** — JSON-like objects — in **collections**.

\`\`\`json
{
  "_id": "652f...",
  "name": "Ada Lovelace",
  "skills": ["math", "programming"],
  "address": { "city": "London" }
}
\`\`\`

Documents are stored in **BSON** (Binary JSON), which adds types such as \`ObjectId\`, \`Date\` and \`Decimal128\`.

## Why developers like it

- **Flexible schema** — documents in one collection can have different fields, so the data model can evolve with the application.
- **Natural mapping to code** — a document looks like the objects in your programming language, so there is little translation work.
- **Rich queries** — filter on any field, including nested fields and arrays.
- **Horizontal scale** — sharding spreads data across many servers.

## Key terms

| Relational | MongoDB |
|---|---|
| Database | Database |
| Table | Collection |
| Row | Document |
| Column | Field |
| JOIN | Embedding or \`$lookup\` |

Every document has a unique \`_id\` field. If you don't provide one, MongoDB generates an **ObjectId**, which also encodes the creation time.`,
            quiz: [
              {
                question: "In MongoDB, what is the equivalent of a table in a relational database?",
                options: ["A document", "A collection", "A field", "A cluster"],
                answerIndex: 1,
                explanation: "Collections group documents the way tables group rows.",
              },
              {
                question: "What format does MongoDB use to store documents internally?",
                options: ["XML", "CSV", "BSON", "YAML"],
                answerIndex: 2,
                explanation: "BSON is a binary JSON format that adds extra types like ObjectId and Date.",
              },
              {
                question: "What happens if you insert a document without an _id?",
                options: [
                  "The insert fails",
                  "MongoDB generates an ObjectId for it",
                  "The document is stored without an _id",
                  "MongoDB uses the first field as the id",
                ],
                answerIndex: 1,
                explanation: "MongoDB automatically adds a unique ObjectId as the _id field.",
              },
            ],
          },
          {
            title: "Embedding vs. referencing",
            minutes: 12,
            content: `# Embedding vs. referencing

The most important schema decision in MongoDB is whether related data should be **embedded** in one document or **referenced** from another collection.

## Embed when…

- The data is **read together** (e.g. an order and its line items).
- The child data is **owned** by the parent and doesn't make sense alone.
- The embedded array is **bounded** — it won't grow without limit.

\`\`\`json
{ "_id": 1, "title": "Intro to MongoDB", "sections": [{ "title": "Basics", "order": 0 }] }
\`\`\`

## Reference when…

- The related data is **large** or **grows without bound** (comments, logs, lessons with long content).
- The data is **shared** by many parents (a user who is the author of many courses).
- You often need the child data **on its own**.

\`\`\`json
{ "_id": 42, "course": 1, "title": "Lesson 1", "content": "..." }
\`\`\`

## Rules of thumb

1. **Design for your queries.** Model data the way the application reads it.
2. A single document is limited to **16 MB** — unbounded arrays are a warning sign.
3. **Denormalize counters** (like "number of students") when they are read far more often than they change.

EduMind itself embeds course *sections* in the course document but stores *lessons* in their own collection, because lesson content can be large and is loaded one lesson at a time.`,
          },
        ],
      },
      {
        title: "Querying and performance",
        lessons: [
          {
            title: "Aggregation pipelines",
            minutes: 15,
            content: `# Aggregation pipelines

An **aggregation pipeline** processes documents through a sequence of **stages**. Each stage transforms the documents and passes the result to the next one.

\`\`\`js
db.enrollments.aggregate([
  { $match: { createdAt: { $gte: ISODate("2026-01-01") } } },
  { $group: { _id: "$course", students: { $sum: 1 } } },
  { $sort: { students: -1 } },
  { $limit: 5 },
  { $lookup: { from: "courses", localField: "_id", foreignField: "_id", as: "course" } }
])
\`\`\`

## Common stages

- **$match** — filter documents (put it early so indexes can be used).
- **$group** — group by a key and compute accumulators like \`$sum\`, \`$avg\`, \`$max\`.
- **$project / $set** — reshape documents or compute new fields.
- **$sort, $skip, $limit** — order and paginate.
- **$lookup** — join documents from another collection.
- **$unwind** — turn each array element into its own document.
- **$facet** — run several sub-pipelines on the same input (e.g. results + total count).

## Tips

- Filter with \`$match\` **before** \`$group\` or \`$lookup\` to reduce work.
- Use \`$facet\` to return a page of results and the total count in one round trip.
- Use \`explain()\` to see whether a pipeline uses an index.`,
            quiz: [
              {
                question: "Why should $match usually come early in a pipeline?",
                options: [
                  "It is required to be the first stage",
                  "It reduces the documents later stages process and can use indexes",
                  "It sorts the documents",
                  "It joins other collections",
                ],
                answerIndex: 1,
                explanation: "Filtering early means less work downstream, and an initial $match can use an index.",
              },
              {
                question: "Which stage joins documents from another collection?",
                options: ["$group", "$unwind", "$lookup", "$facet"],
                answerIndex: 2,
                explanation: "$lookup performs a left outer join with another collection.",
              },
              {
                question: "What does $facet let you do?",
                options: [
                  "Create an index",
                  "Run multiple sub-pipelines over the same input documents",
                  "Delete documents in bulk",
                  "Encrypt fields",
                ],
                answerIndex: 1,
                explanation: "$facet runs several pipelines in parallel, e.g. to get a page of results and a total count together.",
              },
            ],
          },
          {
            title: "Indexes and the ESR rule",
            minutes: 12,
            content: `# Indexes and the ESR rule

Without an index, MongoDB must scan **every document** in a collection (a *COLLSCAN*). An index is a sorted data structure (a B-tree) that lets MongoDB find matching documents quickly (an *IXSCAN*).

\`\`\`js
db.lessons.createIndex({ course: 1, section: 1, order: 1 })
\`\`\`

## Compound indexes and ESR

For compound indexes, order the fields using the **ESR rule**:

1. **E**quality fields first — fields matched exactly (\`status: "published"\`).
2. **S**ort fields next — fields you sort on (\`createdAt: -1\`).
3. **R**ange fields last — fields filtered with \`$gt\`, \`$lt\`, \`$in\`.

## Unique and partial indexes

- A **unique** index prevents duplicates, e.g. one enrollment per user per course: \`{ user: 1, course: 1 }, { unique: true }\`.
- A **sparse** or **partial** index only includes documents that have the field — useful for optional unique values like certificate codes.

## Costs

Indexes speed up reads but **slow down writes** and use memory. Index the queries your application actually runs, and check with \`explain("executionStats")\`.`,
          },
          {
            title: "Atlas Search and Vector Search",
            minutes: 14,
            content: `# Atlas Search and Vector Search

MongoDB Atlas adds two powerful search engines that run next to your database — no separate search cluster needed.

## Atlas Search (full-text)

Atlas Search is built on Apache Lucene. It supports **relevance ranking**, **fuzzy matching** (typo tolerance), autocomplete and facets.

\`\`\`js
{ $search: {
    index: "course_search",
    text: { query: "mongdb", path: "title", fuzzy: { maxEdits: 1 } }
} }
\`\`\`

The query above still finds "MongoDB" even though it is misspelled.

## Vector Search (semantic)

Vector Search finds documents by **meaning** instead of keywords. Text is converted into an **embedding** — a list of numbers — by an AI model. Similar meanings produce vectors that are close together.

\`\`\`js
{ $vectorSearch: {
    index: "chunk_vector_index",
    path: "embedding",
    queryVector: [0.12, -0.03, ...],
    numCandidates: 100,
    limit: 5,
    filter: { course: courseId }
} }
\`\`\`

## Retrieval-Augmented Generation (RAG)

RAG combines vector search with a large language model:

1. Split documents into **chunks** and store each chunk's embedding.
2. When a user asks a question, embed the question and use **Vector Search** to find the most relevant chunks.
3. Send those chunks to the LLM as context so its answer is **grounded** in your data.

This is exactly how EduMind's AI tutor works.`,
          },
        ],
      },
    ],
  },
  {
    title: "Modern JavaScript Essentials",
    subtitle: "The JavaScript every web developer needs in 2026",
    category: "Web Development",
    level: "beginner",
    tags: ["javascript", "es2025", "async", "web"],
    description:
      "Learn the modern JavaScript features that power today's web apps: let/const, arrow functions, destructuring, modules, promises and async/await. Each lesson is short, practical, and full of examples you can run in your browser console.",
    whatYouWillLearn: [
      "Use let, const, arrow functions and template literals",
      "Destructure objects and arrays and use spread/rest",
      "Write asynchronous code with promises and async/await",
      "Organize code with ES modules",
    ],
    sections: [
      {
        title: "Language basics",
        lessons: [
          {
            title: "Variables, functions and template literals",
            minutes: 10,
            preview: true,
            content: `# Variables, functions and template literals

## let and const

Use \`const\` by default and \`let\` when a variable must be reassigned. Avoid \`var\` — it is function-scoped and hoisted in surprising ways.

\`\`\`js
const name = "Ada";
let count = 0;
count += 1;
\`\`\`

## Arrow functions

Arrow functions are shorter and don't have their own \`this\`, which makes them great for callbacks.

\`\`\`js
const double = (n) => n * 2;
[1, 2, 3].map(double); // [2, 4, 6]
\`\`\`

## Template literals

Backticks allow interpolation and multi-line strings:

\`\`\`js
const greeting = \`Hello, \${name}! You have \${count} new message(s).\`;
\`\`\``,
            quiz: [
              {
                question: "Which keyword should you use by default for variables that are not reassigned?",
                options: ["var", "let", "const", "static"],
                answerIndex: 2,
                explanation: "const communicates that the binding won't be reassigned and prevents accidental changes.",
              },
              {
                question: "What is a key difference of arrow functions?",
                options: [
                  "They cannot take parameters",
                  "They don't have their own this",
                  "They are always async",
                  "They must be named",
                ],
                answerIndex: 1,
                explanation: "Arrow functions inherit this from the surrounding scope.",
              },
              {
                question: "Which syntax creates a template literal?",
                options: ["'single quotes'", '"double quotes"', "`backticks`", "/slashes/"],
                answerIndex: 2,
                explanation: "Template literals use backticks and support ${} interpolation.",
              },
            ],
          },
          {
            title: "Destructuring, spread and rest",
            minutes: 10,
            content: `# Destructuring, spread and rest

## Destructuring

Pull values out of objects and arrays into variables:

\`\`\`js
const user = { name: "Ada", role: "student", city: "London" };
const { name, role } = user;

const [first, second] = ["a", "b", "c"];
\`\`\`

You can rename and set defaults: \`const { city: town = "Unknown" } = user;\`

## Spread (...)

Copy or merge arrays and objects:

\`\`\`js
const merged = { ...user, role: "instructor" }; // override one field
const all = [...[1, 2], ...[3, 4]];            // [1, 2, 3, 4]
\`\`\`

## Rest (...)

Collect "the rest" of values:

\`\`\`js
const { password, ...safeUser } = userFromDb; // remove a field
function sum(...numbers) { return numbers.reduce((a, b) => a + b, 0); }
\`\`\``,
          },
        ],
      },
      {
        title: "Async JavaScript",
        lessons: [
          {
            title: "Promises and async/await",
            minutes: 14,
            content: `# Promises and async/await

JavaScript is single-threaded, so slow work (network requests, timers, file reads) is **asynchronous**.

## Promises

A **Promise** represents a value that will be available later. It is *pending*, then either *fulfilled* or *rejected*.

\`\`\`js
fetch("/api/courses")
  .then((res) => res.json())
  .then((courses) => console.log(courses))
  .catch((err) => console.error(err));
\`\`\`

## async/await

\`async\` functions let you write asynchronous code that reads like synchronous code. \`await\` pauses the function until the promise settles.

\`\`\`js
async function loadCourses() {
  try {
    const res = await fetch("/api/courses");
    if (!res.ok) throw new Error("Request failed");
    return await res.json();
  } catch (err) {
    console.error(err);
    return [];
  }
}
\`\`\`

## Running things in parallel

Awaiting in sequence is slow when the tasks are independent. Use \`Promise.all\`:

\`\`\`js
const [user, courses] = await Promise.all([getUser(), getCourses()]);
\`\`\`

Use \`Promise.allSettled\` when you want every result even if some fail.`,
            quiz: [
              {
                question: "What does await do inside an async function?",
                options: [
                  "Blocks the whole browser",
                  "Pauses that function until the promise settles",
                  "Converts a value to a string",
                  "Runs code in a new thread",
                ],
                answerIndex: 1,
                explanation: "await pauses only the async function; the rest of the app keeps running.",
              },
              {
                question: "How do you run two independent async tasks in parallel?",
                options: ["await each one in sequence", "Promise.all([...])", "setTimeout", "JSON.parse"],
                answerIndex: 1,
                explanation: "Promise.all starts all tasks at once and waits for all of them.",
              },
              {
                question: "How do you handle errors from an awaited promise?",
                options: ["try/catch", "if/else", "switch", "They can't be handled"],
                answerIndex: 0,
                explanation: "A rejected awaited promise throws, so wrap it in try/catch.",
              },
            ],
          },
          {
            title: "ES modules",
            minutes: 8,
            content: `# ES modules

Modules let you split code into files with explicit imports and exports.

\`\`\`js
// math.js
export const PI = 3.14159;
export function area(r) { return PI * r * r; }
export default function circumference(r) { return 2 * PI * r; }

// app.js
import circumference, { area, PI } from "./math.js";
\`\`\`

- **Named exports** — many per file, imported with braces.
- **Default export** — one per file, imported without braces and with any name.
- Modules are **strict mode** by default and each has its own scope.
- **Dynamic import** loads code on demand: \`const { area } = await import("./math.js");\`

Frameworks like Next.js use modules everywhere and can split your code into smaller bundles automatically.`,
          },
        ],
      },
    ],
  },
  {
    title: "Machine Learning Foundations",
    subtitle: "Understand how machines learn — no heavy math required",
    category: "AI & Machine Learning",
    level: "intermediate",
    tags: ["machine learning", "ai", "python", "llm"],
    description:
      "A conceptual introduction to machine learning. You will learn the difference between supervised and unsupervised learning, how models are trained and evaluated, what overfitting is, and how modern large language models and embeddings fit into the picture.",
    whatYouWillLearn: [
      "Distinguish supervised, unsupervised and reinforcement learning",
      "Explain training, validation and test splits",
      "Recognize and prevent overfitting",
      "Understand embeddings and large language models",
    ],
    sections: [
      {
        title: "Core concepts",
        lessons: [
          {
            title: "Types of machine learning",
            minutes: 10,
            preview: true,
            content: `# Types of machine learning

Machine learning (ML) is about building systems that **learn patterns from data** instead of following hand-written rules.

## Supervised learning

The model learns from **labeled examples** — inputs paired with the correct output.

- **Classification** predicts a category: *is this email spam?*
- **Regression** predicts a number: *what will this house sell for?*

## Unsupervised learning

The data has **no labels**. The model finds structure on its own.

- **Clustering** groups similar items: customer segments.
- **Dimensionality reduction** compresses data while keeping its structure.

## Reinforcement learning

An **agent** takes actions in an environment and learns from **rewards** — used for games, robotics, and fine-tuning language models with human feedback (RLHF).`,
            quiz: [
              {
                question: "Predicting a house price from its features is an example of…",
                options: ["Clustering", "Regression", "Reinforcement learning", "Dimensionality reduction"],
                answerIndex: 1,
                explanation: "Regression is supervised learning that predicts a continuous number.",
              },
              {
                question: "What makes learning 'unsupervised'?",
                options: ["It has no training data", "The data has no labels", "No computer is used", "It uses rewards"],
                answerIndex: 1,
                explanation: "Unsupervised learning finds structure in unlabeled data.",
              },
              {
                question: "Which type of learning uses rewards from an environment?",
                options: ["Supervised", "Unsupervised", "Reinforcement", "Transfer"],
                answerIndex: 2,
                explanation: "Reinforcement learning agents learn by maximizing reward.",
              },
            ],
          },
          {
            title: "Training, evaluation and overfitting",
            minutes: 13,
            content: `# Training, evaluation and overfitting

## Splitting the data

To know whether a model really works, never evaluate it on the data it trained on. Split your dataset:

- **Training set** (~70–80%) — the model learns from it.
- **Validation set** (~10–15%) — used to tune settings (hyperparameters).
- **Test set** (~10–15%) — used **once** at the end to estimate real-world performance.

## Overfitting and underfitting

- **Overfitting**: the model memorizes the training data, including noise. Training accuracy is high, but test accuracy is poor.
- **Underfitting**: the model is too simple to capture the pattern. It performs poorly everywhere.

## How to reduce overfitting

1. Get **more data**, or augment it.
2. Use a **simpler model** or **regularization** (penalize complexity).
3. **Early stopping** — stop training when validation error starts rising.
4. **Cross-validation** — rotate which data is used for validation.

## Metrics

- **Accuracy** — share of correct predictions (misleading for imbalanced classes).
- **Precision / Recall** — how many predicted positives are right / how many real positives are found.
- **MAE / RMSE** — average error size for regression.`,
          },
        ],
      },
      {
        title: "Modern AI",
        lessons: [
          {
            title: "Embeddings and large language models",
            minutes: 15,
            content: `# Embeddings and large language models

## Embeddings

An **embedding** is a list of numbers (a vector) that represents the **meaning** of a piece of text, an image or other data. Texts with similar meanings have vectors that are close together, which we can measure with **cosine similarity**.

- "How do I reset my password?" and "I forgot my login" → close vectors.
- "How do I reset my password?" and "Best pizza in Rome" → far apart.

Embeddings power **semantic search**, recommendations, clustering and **RAG**.

## Large language models (LLMs)

LLMs such as Gemini, Claude and GPT are neural networks (transformers) trained to **predict the next token** on huge amounts of text. With enough scale, this produces models that can answer questions, write code and summarize documents.

## Limitations

- **Hallucinations** — LLMs can produce confident but wrong answers.
- **Knowledge cutoff** — they don't know about data they weren't trained on, including your private documents.

## Retrieval-Augmented Generation

RAG fixes both problems by **retrieving** relevant documents with embeddings and vector search, then asking the LLM to answer **using only that context** and to cite it. EduMind's AI tutor uses RAG over each course's lessons.`,
            quiz: [
              {
                question: "What does an embedding represent?",
                options: [
                  "The file size of a document",
                  "The meaning of data as a vector of numbers",
                  "A database index",
                  "An encrypted password",
                ],
                answerIndex: 1,
                explanation: "Embeddings map data to vectors so similar meanings are close together.",
              },
              {
                question: "What problem does RAG help solve?",
                options: [
                  "Slow internet connections",
                  "LLMs lacking your private or recent data and hallucinating",
                  "Database backups",
                  "Image compression",
                ],
                answerIndex: 1,
                explanation: "RAG grounds answers in retrieved documents the model otherwise wouldn't know.",
              },
              {
                question: "Which measure is commonly used to compare embeddings?",
                options: ["Cosine similarity", "Word count", "File hash", "Alphabetical order"],
                answerIndex: 0,
                explanation: "Cosine similarity measures the angle between vectors.",
              },
            ],
          },
        ],
      },
    ],
  },
];
