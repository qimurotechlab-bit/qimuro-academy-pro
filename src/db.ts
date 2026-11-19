import Dexie, { type Table } from "dexie";

export type Lang = "python" | "javascript";
export type Project = { id: string; name: string; language: Lang; code: string; updatedAt: number };

class AcademyDB extends Dexie {
  projects!: Table<Project, string>;
  constructor() {
    super("qimuro-academy-pro");
    this.version(1).stores({ projects: "id, updatedAt" });
  }
}
export const db = new AcademyDB();

export const starter: Record<Lang, string> = {
  python: 'name = "Qimuro"\nprint(f"Hello from {name}")\n',
  javascript: 'const name = "Qimuro";\nconsole.log(`Hello from ${name}`);\n',
};
