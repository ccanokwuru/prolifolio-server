import { Job, Work } from "@prisma/client";

interface WorkI extends Work {
  files: {
    images: string[];
    videos?: string[];
  };
  skills: string[];
}

interface JobI extends Job {
  budget: {
    start: number;
    end: number;
    currency: string;
  };
}

export { WorkI, JobI };
