---
title: The Pipeline Pattern in JavaScript
date: 2026-08-14
type: post
description: "Use a JavaScript pipeline pattern to process large data workflows with small, composable task classes inspired by Laravel middleware."
image: ./featured.webp
imageAlt: "Abstract data pipeline moving from databases and RSS feed cards through modular processing stages into a destination database."
tags:
  - JavaScript
  - Laravel
  - WordPress
  - Web Development
  - Software Development
  - pipeline
  - data migration
schemaType: BlogPosting
---

When you are processing a large amount of data, the work usually stops being a single clean operation pretty quickly. Migrating an MSSQL database with millions of articles, consuming articles from an RSS feed, normalizing that content, and then inserting it into a MySQL database for WordPress (or other applications) all involve a chain of smaller steps that need to happen in a predictable order.

That kind of workflow can become difficult to maintain when every step is packed into one long script. One import might need HTML cleanup, another might need category mapping, another might need duplicate detection, and another might need custom image handling. The more the application grows, the more useful it becomes to break the process into small, focused tasks that can be added, removed, or reordered.

I liked the structure of Laravel's pipelines, especially how middleware can pass a request through a series of classes where each class handles one concern. This JavaScript version follows the same general idea: define a common task interface, register the available tasks, and compose different pipelines depending on what the application needs.

The result is a pattern that can adapt across projects. A migration script, an RSS importer, a cleanup utility, or a publishing workflow can all share the same pipeline runner while using different task lists.

The examples below show one way to structure that pattern in Node.js. They start with a task registry that loads available task classes from a directory, then define a pipeline runner that executes those tasks in order, followed by a basic task class and an application entry point that decides which tasks belong in the workflow.

The task registry is responsible for discovering every task module in the `pipeline/tasks` directory and exposing them by filename. It reads the directory synchronously to find JavaScript files, imports each file asynchronously with a file URL, stores each default export in a plain object, and exports the completed registry after loading finishes.

```javascript
// pipeline/tasks.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

class Tasks {
  constructor() {
    this.tasks = {};
  }

  async load() {
    const dir = this.getDirname(import.meta.url) + '/tasks';

    try {
      const files = fs
        .readdirSync(dir)
        .filter((file) => file.endsWith('.js'));

      await Promise.all(files.map((file) => this.importModule(file, dir)));
    } catch (error) {
      console.error(`Failed to load tasks:`, error);
    }

    return this.tasks;
  }

  async importModule(file, dir) {
    const modulePath = path.join(dir, file);
    const moduleName = path.basename(file, '.js');

    try {
      const module = await import(pathToFileURL(modulePath).href);
      this.tasks[moduleName] = module.default;
    } catch (error) {
      console.error(`Failed to import ${moduleName}:`, error);
    }
  }

  getTask(name) {
    return this.tasks[name];
  }
  
  getDirname(url) {
    return path.dirname(fileURLToPath(url));
  }
}

const task = await new Tasks().load();
export default task;
```

The pipeline class receives an ordered list of task constructors and validates that each entry can be instantiated. Its `run` method passes a shared `context` object through each task in sequence, replacing the context with the result of every `execute` call so each task can transform or enrich the data before the next task runs.

```javascript
// pipeline/pipeline.js

export default class Pipeline {
  constructor(tasks) {
    this.tasks = tasks.map((task) => typeof task === 'function'
      ? task 
      : this.functionError('Task is not a constructor', task)
    );
  }

  async run(context) {
    for (const Task of this.tasks) {
      const task = new Task();

      if (typeof task.execute !== 'function') {
        this.functionError('Task missing execute method', task);
      }

      context = await task.execute(context);
    }

    return context;
  }

  functionError(message, task) {
    console.error(message, task);
    throw new Error(message);
  }
}
```

Each task is a small class with a standard `execute` method. The pipeline only depends on this method contract, so new task files can be added as the application grows, and old ones can be removed without changing the pipeline runner itself.

```javascript
// pipeline/tasks/task.js

export default class Task {
  async execute(context) {

    // Task logic goes here

    return context;
  }
}
```

The application code chooses which registered task classes should run, builds a pipeline from that ordered list, and executes the pipeline once for each item in the input data. As the workflow changes, tasks can be added, removed, or reordered in this array without changing the task classes or the pipeline runner.

```javascript
// app.js

import Pipeline from './pipeline/pipeline.js';
import task from './pipeline/tasks.js';

const processData = async (data) => {
  const tasks = [
    task.task,
    // Add or remove task classes here as your application needs grow.
    // task.validateInput,
    // task.saveResult,
  ];

  for await (let item of data) {
    const pipeline = new Pipeline(tasks);

    await pipeline.run(item);
  }
}

await processData(data);
```

This pattern is useful because it keeps each step small while still making the overall workflow easy to understand. Whether the job is migrating millions of records, importing articles from a feed, or building a custom publishing process, the pipeline becomes the stable structure around changing application needs. When a new requirement appears, you can usually add another task, reorder the list, or remove a step without rewriting the entire process.
