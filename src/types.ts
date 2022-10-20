import { Work } from "@prisma/client";

interface WorkI extends Work {
  files: {
    images: string[];
    videos?: string[];
  };
  skills: string[];
}

export { WorkI };
