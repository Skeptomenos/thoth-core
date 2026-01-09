import { z } from "zod";

const SkillParameterSchema = z.object({
  name: z.string(),
  type: z.enum(["string", "number", "boolean", "array", "object"]),
  description: z.string(),
  required: z.boolean().default(true),
  default: z.any().optional(),
});

export const SkillFrontmatterSchema = z.object({
  name: z.string().min(3).regex(/^[a-z0-9-]+$/, "Name must be kebab-case"),
  description: z.string().min(10, "Description must be meaningful"),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, "Version must be semver (x.y.z)"),
  author: z.string().optional(),
  
  triggers: z.array(z.string()).min(1, "At least one trigger is required"),
  
  inputs: z.array(SkillParameterSchema).optional(),
  output: z.object({
    type: z.enum(["text", "json", "markdown", "code"]),
    schema: z.record(z.string(), z.any()).optional(),
  }).optional(),
  
  constraints: z.object({
    models: z.array(z.string()).optional(),
    tools: z.array(z.string()).optional(),
    memory: z.boolean().default(false),
    permissions: z.array(z.string()).optional(),
  }).optional(),

  created: z.string().optional(),
  updated: z.string().optional(),
}).strict();

export const SkillSchema = z.object({
  path: z.string(),
  frontmatter: SkillFrontmatterSchema,
  content: z.string().min(50, "Skill content prompt must be substantial"),
});

export type SkillFrontmatter = z.infer<typeof SkillFrontmatterSchema>;
export type SkillParameter = z.infer<typeof SkillParameterSchema>;
export type Skill = z.infer<typeof SkillSchema>;
