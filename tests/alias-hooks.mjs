import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const file = path.join(root, `${specifier.slice(2)}.ts`);
    return nextResolve(pathToFileURL(file).href, context);
  }
  return nextResolve(specifier, context);
}
