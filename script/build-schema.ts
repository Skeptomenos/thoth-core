import { zodToJsonSchema } from "zod-to-json-schema";
import { ThothPluginConfigSchema } from "../src/config/schema";
import * as fs from "fs";
import * as path from "path";

const schema = zodToJsonSchema(ThothPluginConfigSchema, "ThothPluginConfig");

const distDir = path.join(import.meta.dir, "..", "dist");
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

const outputPath = path.join(distDir, "thoth-plugin.schema.json");
fs.writeFileSync(outputPath, JSON.stringify(schema, null, 2));

console.log(`Schema written to ${outputPath}`);
