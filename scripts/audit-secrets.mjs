import { readdir, readFile } from "node:fs/promises"
import path from "node:path"

const ROOT = process.cwd()

const CLIENT_DIRS = [".next/static"]
const SERVER_DIRS = [".next/server"]

const SECRET_PATTERNS = [
  /sk_live_[a-zA-Z0-9]+/,
  /sk_test_[a-zA-Z0-9]+/,
  /whsec_[a-zA-Z0-9]+/,
  /re_[a-zA-Z0-9]{20,}/,
  /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/,
]

const CLIENT_PATTERNS = [
  ...SECRET_PATTERNS,
  /service_role/,
]

function shouldSkipFile(filePath) {
  return filePath.endsWith(".map")
}

async function collectFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      if (entry.name === "node_modules") {
        continue
      }

      files.push(...(await collectFiles(fullPath)))
    } else if (!shouldSkipFile(fullPath)) {
      files.push(fullPath)
    }
  }

  return files
}

function findMatches(content, filePath, patterns) {
  const matches = []

  for (const pattern of patterns) {
    const globalPattern = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`)
    let match

    while ((match = globalPattern.exec(content)) !== null) {
      matches.push({
        filePath,
        pattern: pattern.source,
      })
    }
  }

  return matches
}

async function scanDirs(dirs, patterns, label) {
  const matches = []

  for (const targetDir of dirs) {
    const absoluteDir = path.join(ROOT, targetDir)

    try {
      const files = await collectFiles(absoluteDir)

      for (const filePath of files) {
        if (filePath.includes(`${path.sep}node_modules${path.sep}`)) {
          continue
        }

        const content = await readFile(filePath, "utf8")
        matches.push(
          ...findMatches(content, `${label}:${path.relative(ROOT, filePath)}`, patterns)
        )
      }
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
        continue
      }

      throw error
    }
  }

  return matches
}

async function main() {
  const clientMatches = await scanDirs(CLIENT_DIRS, CLIENT_PATTERNS, "client")
  const serverMatches = await scanDirs(SERVER_DIRS, SECRET_PATTERNS, "server")
  const allMatches = [...clientMatches, ...serverMatches]

  if (allMatches.length === 0) {
    console.log("audit:secrets passed — no secret patterns found in production .next output.")
    return
  }

  console.error("audit:secrets failed — possible secret leakage in production bundle:")
  for (const match of allMatches.slice(0, 20)) {
    console.error(`  ${match.filePath} (pattern: ${match.pattern})`)
  }

  if (allMatches.length > 20) {
    console.error(`  ... and ${allMatches.length - 20} more matches`)
  }

  process.exit(1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
